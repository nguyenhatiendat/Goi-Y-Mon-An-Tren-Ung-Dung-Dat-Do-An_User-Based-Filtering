"""Hồi quy: lịch sử mở được đánh giá sau nhận món; món chay không bị CF ghi đè."""
import json
import sqlite3
import unittest
from tests import test_reviews as fixtures
from catalog import catalog,DEFAULT_PREFERENCES,validate_preferences,matches_category
from recommender import build_recommendations


class ReceiveOrderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):fixtures.ReviewTests.setUpClass.__func__(cls)
    setUp=fixtures.ReviewTests.setUp
    tearDown=fixtures.ReviewTests.tearDown
    send=fixtures.ReviewTests.send
    order=fixtures.ReviewTests.order
    public=fixtures.ReviewTests.public
    review=fixtures.ReviewTests.review

    def test_receive_only_when_ready_then_reviews_and_cf_unlock(self):
        rid=self.order(self.a,[{'dish_id':1,'quantity':3},{'dish_id':2,'quantity':2}],status='pending')[0]
        for state in ['pending','accepted','preparing']:
            with sqlite3.connect(self.path) as c:c.execute('UPDATE phieu_dat SET status=? WHERE id=?',(state,rid))
            order=self.a.get('/api/me/orders/'+rid).get_json()['order']
            self.assertFalse(order['can_receive']);self.assertFalse(order['can_review'])
            self.assertEqual(self.send(self.a,'/api/me/orders/'+rid+'/received',method='post').status_code,400)
            self.assertEqual(self.review(self.a).status_code,403)
        with sqlite3.connect(self.path) as c:c.execute("UPDATE phieu_dat SET status='ready' WHERE id=?",(rid,))
        order=self.a.get('/api/me/orders/'+rid).get_json()['order']
        self.assertTrue(order['can_receive']);self.assertEqual(len(order['items']),2)
        self.assertEqual(self.a.get('/api/me/dashboard').get_json()['matrix']['1'],{})
        self.assertEqual(self.send(self.a,'/api/me/orders/'+rid+'/received',method='post').status_code,200)
        completed=self.a.get('/api/me/orders/'+rid).get_json()['order']
        self.assertFalse(completed['can_receive']);self.assertTrue(completed['can_review'])
        self.assertEqual(completed['status'],'completed')
        self.assertEqual(self.a.get('/api/me/dashboard').get_json()['matrix']['1'],{'1':1,'2':1})
        self.assertTrue(self.public(client=self.a).get_json()['can_review'])
        self.assertEqual(self.review(self.a,5).status_code,200)
        self.assertEqual(self.send(self.a,'/api/me/orders/'+rid+'/received',method='post').status_code,200)
        self.assertEqual(self.public().get_json()['summary']['completed_orders'],1)
        self.assertEqual(self.public().get_json()['summary']['sold_portions'],3)

    def test_owner_only_and_csrf(self):
        rid=self.order(self.a,status='ready')[0]
        self.assertEqual(self.b.get('/api/me/orders/'+rid).status_code,404)
        self.assertEqual(self.send(self.b,'/api/me/orders/'+rid+'/received',method='post').status_code,404)
        self.assertEqual(self.a.post('/api/me/orders/'+rid+'/received',json={}).status_code,403)
        self.assertEqual(self.app.test_client().get('/api/me/orders/'+rid).status_code,401)
        self.assertEqual(self.a.get('/api/me/orders/no-such-order').status_code,404)
        self.assertFalse(self.a.get('/api/me/orders/'+rid).get_json()['order']['can_review'])

    def test_cancelled_order_cannot_be_received(self):
        rid=self.order(self.a,status='cancelled')[0]
        self.assertEqual(self.send(self.a,'/api/me/orders/'+rid+'/received',method='post').status_code,400)
        self.assertEqual(self.a.get('/api/me/orders/'+rid).get_json()['order']['status'],'cancelled')

    def test_saved_vegetarian_cannot_be_cleared_by_query_defaults(self):
        raw=json.dumps({'diet':'any','categories':['Món chay']})
        with sqlite3.connect(self.path) as c:c.execute('UPDATE nguoi_dung SET preferences=? WHERE id=1',(raw,))
        self.assertEqual(self.a.get('/api/session').get_json()['preferences']['diet'],'vegetarian')
        data=self.a.get('/api/me/dashboard?diet=any').get_json()
        self.assertEqual(data['filters']['diet'],'vegetarian')
        self.assertTrue(data['recommendations'])
        self.assertTrue(all(f['chay'] or f['nhom']=='Đồ uống' for f in data['recommendations']+data['fallback_recommendations']))
        self.assertEqual(self.a.get('/api/me/dashboard?diet=nonvegetarian').status_code,400)
        with sqlite3.connect(self.path) as c:self.assertEqual(c.execute('SELECT preferences FROM nguoi_dung WHERE id=1').fetchone()[0],raw)


class VegetarianRecommendationTests(unittest.TestCase):
    def setUp(self):self.foods=catalog()[1]

    def test_only_vegetarian_preference_blocks_dominant_beef_neighbour(self):
        prefs={**DEFAULT_PREFERENCES,'categories':['Món chay']}
        data=build_recommendations(1,{1:{8:1},2:{8:1,10:20,49:1}},self.foods,prefs)
        self.assertEqual(data['recommendation_mode'],'user_based')
        self.assertEqual([f['id'] for f in data['recommendations']],[49])
        self.assertTrue(all(f['chay'] or f['nhom']=='Đồ uống' for f in data['recommendations']+data['fallback_recommendations']))
        self.assertNotIn(10,[f['id'] for f in data['recommendations']])

    def test_category_is_vegetarian_attribute_across_cuisines(self):
        self.assertTrue(matches_category(self.foods[7],'Món chay')) # Cơm rau nấm, nhóm Cơm
        self.assertTrue(matches_category(self.foods[45],'Món chay')) # Kimbap rau củ, nhóm Hàn
        self.assertFalse(matches_category(self.foods[9],'Món chay')) # Bún bò
        self.assertFalse(matches_category(self.foods[56],'Món chay')) # Đồ uống ở nhóm riêng
        data=build_recommendations(1,{1:{}},self.foods,category='Món chay')
        self.assertTrue(data['recommendations'])
        self.assertTrue(all(f['chay'] and f['nhom']!='Đồ uống' for f in data['recommendations']))

    def test_vegetarian_profile_cold_start_and_explicit_drink_preference(self):
        for categories in [['Món chay'],['Món chay','Đồ uống']]:
            p=validate_preferences({'categories':categories})
            self.assertEqual(p['diet'],'vegetarian')
            for matrix in [{1:{}},{1:{1:1},2:{1:1,10:50,49:1,57:1}}]:
                data=build_recommendations(1,matrix,self.foods,p)
                self.assertTrue(all(f['chay'] or f['nhom']=='Đồ uống' for f in data['recommendations']+data['fallback_recommendations']))


if __name__=='__main__':unittest.main(verbosity=2)
