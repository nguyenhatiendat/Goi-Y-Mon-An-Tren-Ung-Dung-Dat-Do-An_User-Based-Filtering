"""Kiểm tra xuyên suốt khách đặt -> đúng quán nhận -> khách thấy trạng thái."""
import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path
from app import create_app
from database import DuLieu
from setup_demo import setup


class RestaurantTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'app.db'
        self.app=create_app({'TESTING':True,'SECRET_KEY':'test','DATABASE':str(self.path)})
        self.customer=self.app.test_client();self.seller=self.app.test_client();self.other=self.app.test_client();self.admin=self.app.test_client()
        for client,email in [(self.customer,'customer@test.vn'),(self.seller,'seller@test.vn'),(self.other,'other@test.vn'),(self.admin,'admin@test.vn')]:
            self.send(client,'/api/auth/register',{'name':'Kiểm tra','email':email,'password':'password123','confirm_password':'password123'})
        with sqlite3.connect(self.path) as conn:
            conn.execute("UPDATE nguoi_dung SET role='merchant' WHERE id IN (2,3)")
            conn.execute("UPDATE nguoi_dung SET role='admin' WHERE id=4")
            conn.executemany('INSERT INTO chu_nha_hang VALUES (?,?)',[(2,1),(3,2)])

    def tearDown(self): self.tmp.cleanup()

    def send(self,client,path,body=None,method='post'):
        csrf=client.get('/api/session').get_json()['csrf_token']
        return getattr(client,method)(path,json=body or {},headers={'X-CSRF-Token':csrf})

    def place(self):
        response=self.send(self.customer,'/api/me/orders',{'items':[{'dish_id':1,'quantity':2},{'dish_id':2,'quantity':1},{'dish_id':5,'quantity':1}]})
        self.assertEqual(response.status_code,201)
        return self.seller.get('/api/merchant/dashboard').get_json()['orders'][0]['id']

    def test_cart_splits_by_restaurant_and_hides_other_orders(self):
        self.place()
        first=self.seller.get('/api/merchant/dashboard').get_json()
        second=self.other.get('/api/merchant/dashboard').get_json()
        self.assertEqual(len(first['orders']),1);self.assertEqual(len(first['orders'][0]['items']),2)
        self.assertEqual(first['orders'][0]['total'],138000)
        self.assertEqual(len(second['orders']),1);self.assertEqual(second['orders'][0]['total'],45000)
        self.assertEqual({x['nha_hang_id'] for x in first['foods']},{1})
        self.assertNotIn('password_hash',str(first));self.assertNotIn('customer@test.vn',str(first))

    def test_customer_forbidden_and_csrf_required(self):
        self.assertEqual(self.customer.get('/api/merchant/dashboard').status_code,403)
        self.assertEqual(self.app.test_client().get('/api/merchant/dashboard').status_code,401)
        self.assertEqual(self.seller.post('/api/merchant/restaurants/1/foods',json={}).status_code,403)
        rid=self.place()
        self.assertEqual(self.send(self.other,'/api/merchant/orders/'+rid,{'status':'accepted'},'patch').status_code,403)

    def test_status_lifecycle_customer_history_and_revenue(self):
        rid=self.place()
        self.assertEqual(self.send(self.seller,'/api/merchant/orders/'+rid,{'status':'completed'},'patch').status_code,400)
        for state in ['accepted','preparing','ready','completed']:
            self.assertEqual(self.send(self.seller,'/api/merchant/orders/'+rid,{'status':state},'patch').status_code,200)
            history=self.customer.get('/api/me/dashboard').get_json()['history']
            self.assertEqual({h['status'] for h in history if h['receipt_id']==rid},{state})
        summary=self.seller.get('/api/merchant/dashboard').get_json()['summary']
        self.assertEqual(summary['revenue'],138000)
        self.assertEqual(self.send(self.seller,'/api/merchant/orders/'+rid,{'status':'cancelled'},'patch').status_code,400)

    def test_cancellation_removes_signal_but_preserves_history(self):
        rid=self.place();self.send(self.seller,'/api/merchant/orders/'+rid,{'status':'cancelled'},'patch')
        dashboard=self.customer.get('/api/me/dashboard').get_json()
        self.assertEqual(dashboard['matrix']['1'],{})
        with sqlite3.connect(self.path) as c:c.execute("UPDATE phieu_dat SET status='completed' WHERE nha_hang_id=2")
        self.assertEqual(self.customer.get('/api/me/dashboard').get_json()['matrix']['1'],{'5':1})
        self.assertEqual(len(dashboard['history']),3)
        self.assertEqual(self.seller.get('/api/merchant/dashboard').get_json()['summary']['revenue'],0)

    def test_food_changes_catalog_and_blocks_order_when_unavailable(self):
        payload={'ten':'Cơm kiểm tra','nhom':'Cơm','gia':42000,'cay':0,'chay':0,'image':'assets/food-01.webp','available':1}
        self.assertEqual(self.send(self.other,'/api/merchant/restaurants/1/foods',payload).status_code,403)
        response=self.send(self.seller,'/api/merchant/restaurants/1/foods',payload)
        self.assertEqual(response.status_code,201);fid=response.get_json()['id']
        self.assertIn(fid,[f['id'] for f in self.customer.get('/api/catalog').get_json()['foods']])
        self.assertEqual(self.send(self.seller,f'/api/merchant/foods/{fid}',{**payload,'gia':39000},'put').status_code,200)
        self.assertEqual(self.send(self.customer,'/api/me/orders',{'items':[{'dish_id':fid,'quantity':2}]}).get_json()['total'],78000)
        self.assertEqual(self.send(self.seller,f'/api/merchant/foods/{fid}',method='delete').status_code,200)
        result=self.send(self.customer,'/api/me/orders',{'items':[{'dish_id':fid,'quantity':1}]})
        self.assertEqual(result.status_code,400)
        self.assertNotIn(fid,[f['id'] for f in self.customer.get('/api/me/dashboard').get_json()['recommendations']])
        self.assertTrue(self.customer.get('/api/me/dashboard').get_json()['history'])

    def test_name_and_price_snapshots_survive_edit(self):
        self.place();food=self.seller.get('/api/merchant/dashboard').get_json()['foods'][0]
        old=food['ten'];food.update(ten='Đổi tên món',gia=99000)
        self.assertEqual(self.send(self.seller,'/api/merchant/foods/1',food,'put').status_code,200)
        line=next(h for h in self.customer.get('/api/me/dashboard').get_json()['history'] if h['mon_an_id']==1)
        self.assertEqual(line['mon_an'],old);self.assertEqual(line['don_gia'],45000)
        self.assertEqual(self.customer.get('/api/catalog').get_json()['foods'][0]['ten'],'Đổi tên món')

    def test_closed_restaurant_blocks_entire_cart_atomically(self):
        profile={'ten':'Cơm Nhà 88','dia_chi':'Địa chỉ kiểm tra','is_open':0}
        self.assertEqual(self.send(self.seller,'/api/merchant/restaurants/1',profile,'put').status_code,200)
        r=self.send(self.customer,'/api/me/orders',{'items':[{'dish_id':5,'quantity':1},{'dish_id':1,'quantity':1}]})
        self.assertEqual(r.status_code,400)
        self.assertEqual(self.customer.get('/api/me/dashboard').get_json()['history'],[])
        self.assertTrue(all(f['nha_hang_id']!=1 for f in self.customer.get('/api/me/dashboard').get_json()['recommendations']))

    def test_admin_can_assign_and_revoke_ownership(self):
        self.assertEqual(self.seller.get('/api/admin/users').status_code,403)
        self.assertEqual(self.send(self.customer,'/api/admin/users/1/role',{'role':'admin'},'put').status_code,403)
        self.assertEqual(self.send(self.admin,'/api/admin/users/1/role',{'role':'merchant','restaurant_ids':[3]},'put').status_code,200)
        self.assertEqual([r['id'] for r in self.customer.get('/api/merchant/dashboard').get_json()['restaurants']],[3])
        self.send(self.admin,'/api/admin/users/1/role',{'role':'customer'},'put')
        self.assertEqual(self.customer.get('/api/merchant/dashboard').status_code,403)
        self.assertEqual(self.send(self.admin,'/api/admin/users/4/role',{'role':'customer'},'put').status_code,400)

    def test_validation_rejects_bad_prices_and_fields(self):
        base={'ten':'Món mới','nhom':'Cơm','gia':42000,'cay':0,'chay':0}
        for change in [{'gia':True},{'gia':-10},{'nhom':'x'},{'image':'https://external.example/pic'},{'ten':'x'},{'available':'yes'},{'cay':7}]:
            self.assertEqual(self.send(self.seller,'/api/merchant/restaurants/1/foods',{**base,**change}).status_code,400)

    def test_demo_csv_integrity_and_idempotent_import(self):
        path=Path(self.tmp.name)/'demo.db';setup(path,True)
        db=DuLieu(path);before=db.conn.execute('SELECT COUNT(*) FROM don_hang').fetchone()[0]
        self.assertEqual(before,1440);db.dong();setup(path,True)
        db=DuLieu(path);self.assertEqual(db.conn.execute('SELECT COUNT(*) FROM don_hang').fetchone()[0],before)
        self.assertEqual(db.conn.execute('PRAGMA foreign_key_check').fetchall(),[])
        self.assertEqual(db.conn.execute('SELECT COUNT(*) FROM chu_nha_hang').fetchone()[0],20);db.dong()
        for name,expected in [('foods.csv',80),('restaurants.csv',20),('users_demo.csv',60),('interactions_demo.csv',1440)]:
            with (Path(__file__).resolve().parents[1]/'data'/name).open(encoding='utf-8-sig') as f:self.assertEqual(len(list(csv.DictReader(f))),expected)

    def test_old_database_migration_keeps_password_and_orders(self):
        old=Path(self.tmp.name)/'old.db'
        conn=sqlite3.connect(old)
        conn.executescript('''CREATE TABLE nguoi_dung(id INTEGER PRIMARY KEY,ten TEXT,email TEXT,password_hash TEXT,preferences TEXT DEFAULT '{}',onboarded INTEGER DEFAULT 0);
        CREATE TABLE nha_hang(id INTEGER PRIMARY KEY,ten TEXT,dia_chi TEXT,loai TEXT);
        CREATE TABLE mon_an(id INTEGER PRIMARY KEY,ten TEXT,nha_hang_id INTEGER,nhom TEXT,gia INTEGER,cay INTEGER,chay INTEGER,image TEXT);
        CREATE TABLE don_hang(id INTEGER PRIMARY KEY,nguoi_dung_id INTEGER,mon_an_id INTEGER,so_luong INTEGER,don_gia INTEGER,ngay_dat TEXT);
        INSERT INTO nguoi_dung(id,ten,email,password_hash) VALUES(1,'Admin cũ','old@test.vn','KEEP');
        INSERT INTO nha_hang VALUES(1,'Quán cũ','Địa chỉ','Cơm');
        INSERT INTO mon_an VALUES(1,'Món cũ',1,'Cơm',40000,0,0,'assets/food-01.webp');
        INSERT INTO don_hang VALUES(1,1,1,2,40000,'2026-10-01T12:00:00+00:00');''');conn.close()
        db=DuLieu(old);self.assertEqual(db.tai_khoan(1)['password_hash'],'KEEP')
        self.assertEqual(db.lich_su(1)[0]['status'],'completed');self.assertEqual(db.lich_su(1)[0]['thanh_tien'],80000)
        self.assertEqual(db.ma_tran()[1],{1:1});db.dong()


if __name__=='__main__': unittest.main(verbosity=2)
