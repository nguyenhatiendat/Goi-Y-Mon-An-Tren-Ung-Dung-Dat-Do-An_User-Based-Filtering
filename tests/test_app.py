"""Kiểm tra bằng tài khoản tạm; không tạo dữ liệu vào DB sử dụng thật."""
import csv
import io
import sqlite3
import tempfile
import unittest
from pathlib import Path

from werkzeug.security import check_password_hash
from app import create_app


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.db=str(Path(self.folder.name)/'test.db')
        self.config={'TESTING':True,'DATABASE':self.db,'SECRET_KEY':'only-for-isolated-tests'}
        self.app=create_app(self.config);self.client=self.app.test_client()

    def tearDown(self):
        self.folder.cleanup()

    def send(self,path,data=None,client=None,method='post'):
        client=client or self.client
        token=client.get('/api/session').get_json()['csrf_token']
        return getattr(client,method)(path,json=data or {},headers={'X-CSRF-Token':token})

    def register(self,client=None,email='a@example.com',name='Tài khoản A'):
        return self.send('/api/auth/register',{'name':name,'email':email,'password':'password-123',
            'confirm_password':'password-123'},client)

    def sql(self,query,params=()):
        with sqlite3.connect(self.db) as db:
            return db.execute(query,params).fetchall()

    def test_empty_accounts_history_and_correct_catalog(self):
        self.assertEqual(self.sql('SELECT COUNT(*) FROM nguoi_dung')[0][0],0)
        self.assertEqual(self.sql('SELECT COUNT(*) FROM don_hang')[0][0],0)
        data=self.client.get('/api/catalog').get_json()
        self.assertEqual(len(data['foods']),80);self.assertEqual(len(data['restaurants']),20)
        self.assertEqual(sum(r['loai']=='Trà sữa' for r in data['restaurants']),3)

    def test_no_session_returns_no_account(self):
        self.assertIsNone(self.client.get('/api/session').get_json()['user'])
        self.assertEqual(self.client.get('/api/state').status_code,401)
        self.assertEqual(self.client.get('/api/me/dashboard').status_code,401)
        self.assertEqual(self.client.post('/api/me/orders',json={}).status_code,401)

    def test_csrf_is_required_even_for_registration(self):
        self.assertEqual(self.client.post('/api/auth/register',json={}).status_code,403)
        self.client.get('/api/session')
        self.assertEqual(self.client.post('/api/auth/register',json={},headers={'X-CSRF-Token':'wrong'}).status_code,403)

    def test_registration_hash_and_automatic_signin(self):
        result=self.register()
        self.assertEqual(result.status_code,201)
        self.assertFalse(result.get_json()['user']['onboarded'])
        stored=self.sql('SELECT password_hash FROM nguoi_dung')[0][0]
        self.assertNotEqual(stored,'password-123');self.assertTrue(stored.startswith('scrypt:'))
        self.assertTrue(check_password_hash(stored,'password-123'))
        data=self.client.get('/api/state').get_json()
        self.assertEqual(len(data['users']),1)
        self.assertNotIn('password_hash',str(data));self.assertNotIn('password-123',str(data))

    def test_registration_validation(self):
        base={'name':'Test','email':'test@example.com','password':'password-123','confirm_password':'password-123'}
        cases=[{'name':'a'},{'name':'x\nBad'},{'email':'invalid'},{'email':123},{'password':'short'},
               {'confirm_password':'different'},{'name':'x'*51},{'password':'x'*129}]
        for change in cases:
            with self.subTest(change=change):
                self.assertEqual(self.send('/api/auth/register',{**base,**change}).status_code,400)
        self.assertEqual(self.sql('SELECT COUNT(*) FROM nguoi_dung')[0][0],0)

    def test_duplicate_email_case_insensitive(self):
        self.register()
        self.assertEqual(self.register(email='A@EXAMPLE.COM').status_code,400)

    def test_names_do_not_have_to_be_unique(self):
        self.register()
        second=self.app.test_client()
        self.assertEqual(self.register(second,email='b@example.com').status_code,201)

    def test_wrong_login_is_generic(self):
        self.register();self.send('/api/auth/logout')
        for email in ['a@example.com','unknown@example.com']:
            response=self.send('/api/auth/login',{'email':email,'password':'incorrect'})
            self.assertEqual(response.status_code,401)
            self.assertEqual(response.get_json()['error'],'Email hoặc mật khẩu chưa đúng.')

    def test_logout_and_login_again(self):
        self.register();self.send('/api/auth/logout')
        self.assertEqual(self.client.get('/api/state').status_code,401)
        response=self.send('/api/auth/login',{'email':'A@EXAMPLE.COM','password':'password-123'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get('/api/state').status_code,200)

    def test_logout_revokes_copied_session(self):
        self.register();cookie=self.client.get_cookie('foodmatch_session_v2')
        replay=self.app.test_client();replay.set_cookie('foodmatch_session_v2',cookie.value)
        self.assertEqual(replay.get('/api/state').status_code,200)
        self.send('/api/auth/logout')
        self.assertEqual(replay.get('/api/state').status_code,401)

    def test_session_expiration(self):
        self.register();self.sql('UPDATE phien_dang_nhap SET expires=0')
        self.assertEqual(self.client.get('/api/state').status_code,401)
        self.assertIsNone(self.client.get('/api/session').get_json()['user'])
        self.assertEqual(self.send('/api/auth/login',{'email':'a@example.com','password':'password-123'}).status_code,200)

    def test_login_rate_limit(self):
        for _ in range(6):
            self.assertEqual(self.send('/api/auth/login',{'email':'none@example.com','password':'bad'}).status_code,401)
        self.assertEqual(self.send('/api/auth/login',{'email':'none@example.com','password':'bad'}).status_code,429)

    def test_session_cookie_flags(self):
        self.register();cookie=self.client.get_cookie('foodmatch_session_v2')
        self.assertTrue(cookie.http_only);self.assertEqual(cookie.same_site,'Lax')

    def test_preferences_finish_onboarding(self):
        self.register()
        prefs={'min_price':30000,'max_price':50000,'spice':'none','diet':'vegetarian','categories':['Món chay']}
        response=self.send('/api/me/preferences',prefs,method='put')
        self.assertEqual(response.status_code,200);self.assertTrue(response.get_json()['user']['onboarded'])
        self.assertEqual(self.client.get('/api/state').get_json()['preferences'],prefs)
        result=self.client.get('/api/me/dashboard').get_json()
        self.assertTrue(result['recommendations'])
        for food in result['recommendations']:
            self.assertTrue(30000<=food['gia']<=50000)
            if food['nhom']!='Đồ uống':self.assertEqual(food['chay'],1);self.assertEqual(food['cay'],0)
        self.assertTrue(all(f['phuong_phap']=='Khẩu vị' for f in result['recommendations']))

    def test_invalid_preferences_do_not_complete_onboarding(self):
        self.register()
        for prefs in [{'min_price':50000,'max_price':20000},{'max_price':-1},{'min_price':True},
                      {'spice':'bad'},{'diet':'bad'},{'categories':['unknown']},{'categories':'Cơm'}]:
            with self.subTest(prefs=prefs):
                self.assertEqual(self.send('/api/me/preferences',prefs,method='put').status_code,400)
        self.assertFalse(self.client.get('/api/session').get_json()['user']['onboarded'])

    def test_only_own_account_is_visible(self):
        self.register();other=self.app.test_client();self.register(other,'b@example.com','Bí mật B')
        self.send('/api/me/orders',{'items':[{'dish_id':1,'quantity':2}]},client=other)
        data=self.client.get('/api/state').get_json()
        self.assertEqual(len(data['users']),1);self.assertNotIn('b@example.com',str(data))
        dashboard=self.client.get('/api/me/dashboard').get_json()
        self.assertEqual(dashboard['history'],[]);self.assertEqual(list(dashboard['matrix']),['1'])
        self.assertNotIn('Bí mật B',str(dashboard))
        self.assertEqual(self.client.get('/api/users/2/dashboard').status_code,404)

    def test_order_uses_server_price_and_one_event_per_dish(self):
        self.register()
        response=self.send('/api/me/orders',{'user_id':999,'items':[{'dish_id':1,'quantity':3,'price':1},{'dish_id':57,'quantity':1}]})
        self.assertEqual(response.status_code,201);self.assertEqual(response.get_json()['total'],170000)
        data=self.client.get('/api/me/dashboard').get_json()
        self.assertEqual(data['matrix']['1'],{'1':1,'57':1});self.assertEqual(len(data['history']),2)
        self.assertNotIn(1,[f['id'] for f in data['recommendations']])

    def test_invalid_cart_is_atomic(self):
        self.register()
        cases=[[],[None],[{'dish_id':1,'quantity':1},{'dish_id':5,'quantity':0}],
               [{'dish_id':1,'quantity':True}],[{'dish_id':999,'quantity':1}],
               [{'dish_id':1,'quantity':1},{'dish_id':1,'quantity':1}]]
        for items in cases:
            self.assertEqual(self.send('/api/me/orders',{'items':items}).status_code,400)
        self.assertEqual(self.sql('SELECT COUNT(*) FROM don_hang')[0][0],0)

    def test_favourites_are_separate(self):
        self.register();other=self.app.test_client();self.register(other,'b@example.com')
        self.send('/api/me/favourites',{'dish_id':57})
        self.assertEqual(self.client.get('/api/state').get_json()['favourites']['1'],[57])
        self.assertEqual(other.get('/api/state').get_json()['favourites']['2'],[])
        self.send('/api/me/favourites',{'dish_id':57})
        self.assertEqual(self.client.get('/api/state').get_json()['favourites']['1'],[])

    def test_csv_only_current_user(self):
        self.register();self.send('/api/me/orders',{'items':[{'dish_id':1,'quantity':2}]})
        response=self.client.get('/api/me/history.csv')
        rows=list(csv.reader(io.StringIO(response.data.decode('utf-8-sig'))))
        self.assertEqual(len(rows),2);self.assertEqual(rows[1][-1],'90000')

    def test_restart_preserves_accounts_preferences_history(self):
        self.register();self.send('/api/me/preferences',{'max_price':60000},method='put')
        self.send('/api/me/orders',{'items':[{'dish_id':57,'quantity':1}]})
        fresh=create_app(self.config).test_client()
        self.assertEqual(self.sql('SELECT COUNT(*) FROM nguoi_dung')[0][0],1)
        response=self.send('/api/auth/login',{'email':'a@example.com','password':'password-123'},fresh)
        self.assertEqual(response.status_code,200);self.assertTrue(response.get_json()['user']['onboarded'])
        self.assertEqual(len(fresh.get('/api/me/dashboard').get_json()['history']),1)

    def test_temporary_filters_and_empty_results(self):
        self.register()
        self.assertEqual(self.client.get('/api/me/dashboard?min_price=0&max_price=100').get_json()['recommendations'],[])
        self.assertEqual(self.client.get('/api/me/dashboard?max_price=abc').status_code,400)
        self.assertEqual(self.client.get('/api/me/dashboard?spice=bad').status_code,400)

    def test_discovery_learns_after_checkout_with_only_one_account(self):
        self.register()
        before=self.client.get('/api/me/dashboard').get_json()
        self.assertLessEqual(len(before['recommendations']),12)
        self.assertEqual(self.send('/api/me/orders',{'items':[
            {'dish_id':3,'quantity':3}, {'dish_id':41,'quantity':1},
            {'dish_id':57,'quantity':2}]}).status_code,201)
        after=self.client.get('/api/me/dashboard').get_json()
        self.assertEqual(after['neighbours'],[])
        self.assertEqual(len(after['history']),3)
        self.assertEqual({f['nhom'] for f in after['recommendations']},{'Cơm','Món Hàn','Đồ uống'})
        self.assertTrue(all(f['phuong_phap']=='Lịch sử của bạn' for f in after['recommendations']))
        self.assertEqual(len(self.client.get('/api/state').get_json()['foods']),80)

    def test_index_routes_and_assets(self):
        for path in ['/','/index.html']:
            self.assertIn('data-runtime="flask"',self.client.get(path).get_data(as_text=True))
        for path in ['/account.css','/styles.css','/app.js','/data.js','/assets/food-22.webp']:
            response=self.client.get(path);self.assertEqual(response.status_code,200);response.close()
        self.assertIn('no-store',self.client.get('/api/session').headers['Cache-Control'])


if __name__=='__main__':
    unittest.main(verbosity=2)
