"""Kiểm chứng User-based bằng công thức tay và tính độc lập với nội dung món."""
import math
import unittest
from copy import deepcopy
from catalog import catalog,DEFAULT_PREFERENCES
from recommender import UserBasedIndex,build_recommendations


class UserBasedTests(unittest.TestCase):
    def setUp(self):
        self.foods=catalog()[1]
        self.matrix={1:{1:1,2:3},2:{1:1,2:3,3:2},3:{1:1,4:4},4:{9:2}}

    def test_hand_calculation_full_vector_normalization_and_shrinkage(self):
        model=UserBasedIndex(self.matrix,regularized=True);result=model.recommend(1,self.foods)[0]
        log=math.log1p
        norms={u:math.sqrt(sum(log(n)**2 for n in v.values())) for u,v in self.matrix.items()}
        cos2=(log(1)**2+log(3)**2)/(norms[1]*norms[2]);cos3=log(1)**2/(norms[1]*norms[3])
        w2=cos2*2/(2+2);w3=cos3*1/(1+2)
        expected3=w2*(log(2)/norms[2])/(w2+w3)
        expected4=w3*(log(4)/norms[3])/(w2+w3)
        byid={f['id']:f for f in result}
        self.assertAlmostEqual(byid[3]['diem'],expected3,places=12)
        self.assertAlmostEqual(byid[4]['diem'],expected4,places=12)
        self.assertEqual(set(byid),{3,4})
        self.assertEqual(byid[3]['diem'],byid[3]['diem_xep_hang'])
        self.assertAlmostEqual(byid[3]['bang_chung'][0]['cosine_goc'],cos2)
        self.assertLess(cos2,1) # Món riêng của hàng xóm vẫn nằm trong độ dài vector.

    def test_default_is_classic_weighted_user_based_formula(self):
        model=UserBasedIndex(self.matrix);items,neighbours=model.recommend(1,self.foods)
        denom=sum(n['tuong_dong'] for n in neighbours)
        for item in items:
            expected=sum(n['tuong_dong']*self.matrix[n['ma_nguoi']].get(item['id'],0) for n in neighbours)/denom
            self.assertAlmostEqual(item['diem'],expected,places=12)
        self.assertEqual(build_recommendations(1,self.matrix,self.foods)['model']['transform'],'raw_counts')

    def test_only_positive_neighbours_not_self_or_disjoint(self):
        rows=UserBasedIndex(self.matrix).neighbours(1)
        self.assertEqual({n['ma_nguoi'] for n in rows},{2,3})
        self.assertTrue(all(0<n['tuong_dong']<=1 for n in rows))
        self.assertEqual(rows[0]['so_mon_chung'],2)

    def test_less_common_means_lower_reliability(self):
        rows=UserBasedIndex(self.matrix,regularized=True).neighbours(1)
        byid={r['ma_nguoi']:r for r in rows}
        self.assertEqual(byid[2]['he_so_tin_cay'],.5)
        self.assertAlmostEqual(byid[3]['he_so_tin_cay'],1/3)

    def test_cf_invariant_to_names_categories_prices_and_other_user_popularity(self):
        a=build_recommendations(1,self.matrix,self.foods)['recommendations']
        changed=deepcopy(self.foods)
        for food in changed:food.update(ten='Đổi tên '+str(food['id']),nhom='Đồ uống',gia=10000)
        matrix=deepcopy(self.matrix);matrix[999]={3:10000,4:50000}
        b=build_recommendations(1,matrix,changed)['recommendations']
        self.assertEqual([(f['id'],f['diem']) for f in a],[(f['id'],f['diem']) for f in b])

    def test_filters_do_not_change_similarity_or_reweight_other_candidates(self):
        before=build_recommendations(1,self.matrix,self.foods)
        filtered=build_recommendations(1,self.matrix,self.foods,{**DEFAULT_PREFERENCES,'max_price':50000})
        self.assertEqual(before['neighbours'],filtered['neighbours'])
        expected={f['id']:f['diem'] for f in before['recommendations'] if f['gia']<=50000}
        self.assertEqual(expected,{f['id']:f['diem'] for f in filtered['recommendations']})

    def test_no_seen_closed_or_unavailable_candidates(self):
        foods=deepcopy(self.foods);foods[2]['available']=0;foods[3]['is_open']=0
        result=UserBasedIndex(self.matrix)
        # Constraint filtering belongs to the public recommendation entry point.
        data=build_recommendations(1,self.matrix,foods)
        self.assertNotEqual(data['recommendation_mode'],'user_based')
        self.assertTrue(all(f['id'] not in {1,2,3,4} for f in data['recommendations']))

    def test_cf_descending_and_every_item_has_neighbour_evidence(self):
        data=build_recommendations(1,self.matrix,self.foods)
        self.assertEqual(data['recommendation_mode'],'user_based')
        scores=[f['diem'] for f in data['recommendations']]
        self.assertEqual(scores,sorted(scores,reverse=True))
        for f in data['recommendations']:
            self.assertTrue(f['bang_chung']);self.assertEqual(f['phuong_phap'],'Lọc cộng tác')
            self.assertTrue(all(self.matrix[n['ma_nguoi']].get(f['id'],0)>0 for n in f['bang_chung']))
        self.assertFalse(set(f['id'] for f in data['recommendations'])&set(f['id'] for f in data['fallback_recommendations']))

    def test_cold_start_and_no_neighbours_have_explicit_mode(self):
        for matrix,mode in [({1:{},2:{1:1}},'cold_start'),({1:{1:1},2:{2:1}},'no_matching_neighbours')]:
            data=build_recommendations(1,matrix,self.foods)
            self.assertEqual(data['recommendation_mode'],mode)
            self.assertTrue(data['recommendations'])
            self.assertTrue(all(f['diem']==0 and f['phuong_phap']!='Lọc cộng tác' for f in data['recommendations']))

    def test_limit_and_ties_are_stable(self):
        matrix={1:{1:1},2:{1:1,3:1,4:1},3:{1:1,3:1,4:1}}
        for i in range(3):
            result=build_recommendations(1,matrix,self.foods,limit=1)
            self.assertEqual([f['id'] for f in result['recommendations']],[3])
        for value in [0,49,True,1.5]:
            with self.assertRaises(ValueError):build_recommendations(1,matrix,self.foods,limit=value)


class ModelCacheTests(unittest.TestCase):
    def test_revision_changes_on_completed_orders_and_not_on_reviews(self):
        import tempfile
        from pathlib import Path
        from app import create_app
        from database import DuLieu
        from werkzeug.security import generate_password_hash
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'cache.db';app=create_app({'DATABASE':str(path),'SECRET_KEY':'cache-only','TESTING':True})
            db=DuLieu(path);uid=db.them_tai_khoan('Cache user','cache@test.vn',generate_password_hash('password123'));db.dong()
            client=app.test_client()
            def send(url,body,method='post'):
                token=client.get('/api/session').get_json()['csrf_token']
                return getattr(client,method)(url,json=body,headers={'X-CSRF-Token':token})
            send('/api/auth/login',{'email':'cache@test.vn','password':'password123'})
            self.assertEqual(client.get('/api/me/dashboard').get_json()['matrix'][str(uid)],{})
            send('/api/me/orders',{'items':[{'dish_id':1,'quantity':3}]})
            self.assertEqual(client.get('/api/me/dashboard').get_json()['matrix'][str(uid)],{})
            db=DuLieu(path)
            with db.conn:db.conn.execute("UPDATE phieu_dat SET status='completed'")
            db.dong()
            self.assertEqual(client.get('/api/me/dashboard').get_json()['matrix'][str(uid)],{'1':1})
            db=DuLieu(path);revision=db.conn.execute('SELECT revision FROM recommendation_revision').fetchone()[0];db.dong()
            send('/api/me/foods/1/review',{'rating':5,'comment':'Good'},'put')
            db=DuLieu(path);self.assertEqual(db.conn.execute('SELECT revision FROM recommendation_revision').fetchone()[0],revision);db.dong()


if __name__=='__main__':unittest.main(verbosity=2)
