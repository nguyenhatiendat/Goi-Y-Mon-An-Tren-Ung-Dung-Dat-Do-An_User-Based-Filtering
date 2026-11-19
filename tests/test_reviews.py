"""Đánh giá thật phải có đơn hoàn tất; doanh số tách khỏi tín hiệu CF."""
import sqlite3
import tempfile
import unittest
from pathlib import Path
from werkzeug.security import generate_password_hash
from app import create_app
from database import DuLieu


class ReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash=generate_password_hash('review-test-password')

    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'app.db'
        self.app=create_app({'TESTING':True,'SECRET_KEY':'review-test-only','DATABASE':str(self.path)})
        db=DuLieu(self.path)
        for name,email in [('Người mua A','a@review.test'),('Người mua B','b@review.test')]:
            db.them_tai_khoan(name,email,self.password_hash)
        db.dong()
        self.a=self.app.test_client();self.b=self.app.test_client()
        for c,email in [(self.a,'a@review.test'),(self.b,'b@review.test')]:
            self.assertEqual(self.send(c,'/api/auth/login',{'email':email,'password':'review-test-password'},'post').status_code,200)

    def tearDown(self):self.tmp.cleanup()

    def send(self,client,url,body=None,method='put'):
        csrf=client.get('/api/session').get_json()['csrf_token']
        return getattr(client,method)(url,json=body or {},headers={'X-CSRF-Token':csrf})

    def order(self,client,items=None,status='completed'):
        items=items or [{'dish_id':1,'quantity':3}]
        self.assertEqual(self.send(client,'/api/me/orders',{'items':items},'post').status_code,201)
        uid=client.get('/api/session').get_json()['user']['id']
        with sqlite3.connect(self.path) as c:
            ids=[r[0] for r in c.execute("SELECT id FROM phieu_dat WHERE nguoi_dung_id=? AND status='pending'",(uid,))]
            for rid in ids:c.execute('UPDATE phieu_dat SET status=? WHERE id=?',(status,rid))
        return ids

    def review(self,client,rating=5,comment='Ngon và vừa phần',dish=1):
        return self.send(client,f'/api/me/foods/{dish}/review',{'rating':rating,'comment':comment})

    def public(self,dish=1,page=1,client=None):
        return (client or self.app.test_client()).get(f'/api/foods/{dish}/reviews?page={page}')

    def test_empty_state_no_fabricated_stars(self):
        data=self.public().get_json()
        self.assertEqual(data['reviews'],[]);self.assertEqual(data['summary']['review_count'],0)
        self.assertIsNone(data['summary']['rating_average'])
        self.assertEqual(data['summary']['sold_portions'],0)
        self.assertFalse(data['can_review'])

    def test_no_order_pending_cancelled_and_other_dish_are_forbidden(self):
        self.assertEqual(self.review(self.a).status_code,403)
        ids=self.order(self.a,status='pending')
        self.assertEqual(self.review(self.a).status_code,403)
        with sqlite3.connect(self.path) as c:c.execute("UPDATE phieu_dat SET status='cancelled' WHERE id=?",(ids[0],))
        self.assertEqual(self.review(self.a).status_code,403)
        self.order(self.a)
        self.assertEqual(self.review(self.a,dish=2).status_code,403)
        self.assertEqual(self.review(self.b).status_code,403)
        self.assertTrue(self.public(client=self.a).get_json()['can_review'])

    def test_average_and_edit_do_not_duplicate(self):
        self.order(self.a);self.order(self.b)
        self.assertEqual(self.review(self.a,5).status_code,200)
        self.assertEqual(self.review(self.b,3).status_code,200)
        data=self.public().get_json()
        self.assertEqual(data['summary']['review_count'],2);self.assertEqual(data['summary']['rating_average'],4)
        self.assertEqual(data['histogram']['5'],1);self.assertEqual(data['histogram']['3'],1)
        self.assertEqual(self.review(self.a,1,'Đã sửa nhận xét').status_code,200)
        self.assertEqual(self.public().get_json()['summary']['rating_average'],2)
        self.assertEqual(self.public().get_json()['summary']['review_count'],2)
        self.assertEqual(self.public(client=self.a).get_json()['mine'],{'rating':1,'comment':'Đã sửa nhận xét'})
        fresh=create_app({'TESTING':True,'SECRET_KEY':'again','DATABASE':str(self.path)}).test_client()
        self.assertEqual(fresh.get('/api/foods/1/reviews').get_json()['summary']['review_count'],2)

    def test_quantity_receipts_and_status_counts(self):
        self.order(self.a,[{'dish_id':1,'quantity':3},{'dish_id':2,'quantity':2}])
        self.order(self.b,[{'dish_id':1,'quantity':2}])
        self.order(self.a,[{'dish_id':1,'quantity':20}],status='pending')
        self.order(self.b,[{'dish_id':1,'quantity':20}],status='cancelled')
        data=self.public().get_json()['summary']
        self.assertEqual(data['completed_orders'],2);self.assertEqual(data['sold_portions'],5)
        self.assertEqual(self.public(2).get_json()['summary']['completed_orders'],1)
        foods=self.a.get('/api/state').get_json()['foods'];self.assertEqual(foods[0]['sold_portions'],5)
        self.assertEqual(foods[1]['sold_portions'],2)

    def test_demo_history_not_public_sales_or_verifiable_review(self):
        ids=self.order(self.a)
        with sqlite3.connect(self.path) as c:
            c.execute("UPDATE phieu_dat SET id='demo-999' WHERE id=?",(ids[0],))
            c.execute("UPDATE don_hang SET receipt_id='demo-999' WHERE receipt_id=?",(ids[0],))
        self.assertEqual(self.public().get_json()['summary']['completed_orders'],0)
        self.assertEqual(self.review(self.a).status_code,403)
        self.assertEqual(self.a.get('/api/me/dashboard').get_json()['matrix']['1'],{'1':1})

    def test_invalid_rating_comment_and_csrf(self):
        self.order(self.a)
        for rating in [0,6,True,4.5,'5',None]:
            self.assertEqual(self.review(self.a,rating).status_code,400)
        for comment in [None,123,'x'*1001,'bad\x00text']:
            self.assertEqual(self.review(self.a,5,comment).status_code,400)
        self.assertEqual(self.a.put('/api/me/foods/1/review',json={'rating':5}).status_code,403)
        self.assertEqual(self.send(self.app.test_client(),'/api/me/foods/1/review',{'rating':5}).status_code,401)
        self.assertEqual(self.review(self.a,4,'').status_code,200)
        self.assertEqual(self.public().get_json()['reviews'][0]['comment'],'')

    def test_review_is_session_owned_and_does_not_expose_private_fields(self):
        self.order(self.a);self.order(self.b)
        response=self.send(self.a,'/api/me/foods/1/review',{'rating':5,'comment':'<script>alert(1)</script>','user_id':2,'receipt_id':'fake'})
        self.assertEqual(response.status_code,200)
        data=self.public().get_json();self.assertEqual(data['reviews'][0]['author'],'Người mua A')
        self.assertEqual(data['reviews'][0]['comment'],'<script>alert(1)</script>')
        for secret in ['a@review.test','b@review.test','password_hash','receipt_id','nguoi_dung_id']:
            self.assertNotIn(secret,str(data))
        self.assertIsNone(data['mine']);self.assertIsNone(self.public(client=self.b).get_json()['mine'])

    def test_pagination_and_missing_food(self):
        with sqlite3.connect(self.path) as c:
            for i in range(12):
                uid=c.execute('INSERT INTO nguoi_dung(ten,email,password_hash) VALUES (?,?,?)',(f'Khách {i}',f'user{i}@review.test','test-only')).lastrowid
                rid=f'test-order-{i}';dt=f'2026-11-{i+1:02d}T12:00:00+00:00'
                c.execute('INSERT INTO phieu_dat VALUES (?,?,?,?,?,?)',(rid,uid,1,dt,'completed',dt))
                c.execute('INSERT INTO don_hang(nguoi_dung_id,mon_an_id,so_luong,don_gia,ngay_dat,receipt_id) VALUES (?,?,?,?,?,?)',(uid,1,1,45000,dt,rid))
                c.execute('INSERT INTO danh_gia(nguoi_dung_id,mon_an_id,receipt_id,so_sao,binh_luan,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',(uid,1,rid,5,'Ngon',dt,dt))
        first=self.public().get_json();second=self.public(page=2).get_json()
        self.assertEqual(len(first['reviews']),10);self.assertEqual(len(second['reviews']),2)
        self.assertTrue(first['has_more']);self.assertFalse(second['has_more'])
        self.assertFalse(set(r['id'] for r in first['reviews'])&set(r['id'] for r in second['reviews']))
        self.assertEqual(first['summary']['review_count'],12)
        self.assertEqual(self.public(99999).status_code,404)
        self.assertEqual(self.review(self.a,dish=99999).status_code,404)
        for page in ['0','abc','-1','100001','1.1']:self.assertEqual(self.public(page=page).status_code,400)


if __name__=='__main__':unittest.main(verbosity=2)
