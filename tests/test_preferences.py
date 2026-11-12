import unittest
from collections import Counter
from pathlib import Path
from catalog import catalog, matches, validate_preferences, DEFAULT_PREFERENCES
from recommender import goi_y_ca_nhan


class PreferenceTests(unittest.TestCase):
    def setUp(self):
        self.restaurants,self.foods=catalog()

    def test_80_foods_20_restaurants_three_milk_tea_shops(self):
        self.assertEqual(len(self.foods),80);self.assertEqual(len(self.restaurants),20)
        self.assertEqual(Counter(f['nha_hang_id'] for f in self.foods),{i:4 for i in range(1,21)})
        self.assertEqual([r['ten'] for r in self.restaurants if r['loai']=='Trà sữa'],['Tea Cloud','Trà Sữa Mây','Trà Sữa Lá Nhỏ'])
        for food in self.foods:
            self.assertTrue((Path(__file__).parents[1]/'dist'/food['image']).is_file())

    def test_cold_start_uses_only_preferences(self):
        prefs={**DEFAULT_PREFERENCES,'diet':'vegetarian','spice':'none','max_price':45000,'categories':['Món chay']}
        result,neighbours=goi_y_ca_nhan(1,{1:{}},self.foods,prefs)
        self.assertFalse(neighbours);self.assertTrue(result);self.assertEqual(result[0]['nhom'],'Món chay')
        for food in result:
            self.assertEqual(food['diem'],0);self.assertEqual(food['phuong_phap'],'Khẩu vị')
            self.assertTrue(matches(food,prefs))

    def test_drinks_not_excluded_by_spice_or_meat_choice(self):
        drink=self.foods[56]
        self.assertEqual(drink['nhom'],'Đồ uống')
        self.assertTrue(matches(drink,{**DEFAULT_PREFERENCES,'diet':'nonvegetarian','spice':'hot'}))

    def test_price_bounds_are_inclusive(self):
        food=self.foods[0]
        self.assertTrue(matches(food,{**DEFAULT_PREFERENCES,'min_price':45000,'max_price':45000}))
        self.assertFalse(matches(food,{**DEFAULT_PREFERENCES,'min_price':45001}))

    def test_spice_means_no_hot_when_mild(self):
        for food in self.foods:
            if food['nhom']!='Đồ uống':
                self.assertEqual(matches(food,{**DEFAULT_PREFERENCES,'spice':'mild'}),food['cay']<=1)
                self.assertEqual(matches(food,{**DEFAULT_PREFERENCES,'spice':'hot'}),food['cay']>=1)

    def test_filters_still_apply_to_collaborative_results(self):
        matrix={1:{1:2},2:{1:2,10:5,9:2}}
        result,neighbours=goi_y_ca_nhan(1,matrix,self.foods,{**DEFAULT_PREFERENCES,'spice':'none'})
        self.assertTrue(neighbours)
        self.assertNotIn(10,[f['id'] for f in result])
        self.assertEqual(result[0]['id'],9);self.assertGreater(result[0]['diem'],0)

    def test_category_filters_and_no_results(self):
        result,_=goi_y_ca_nhan(1,{1:{}},self.foods,DEFAULT_PREFERENCES,'Đồ uống')
        self.assertTrue(result);self.assertTrue(all(f['nhom']=='Đồ uống' for f in result))
        empty,_=goi_y_ca_nhan(1,{1:{}},self.foods,{**DEFAULT_PREFERENCES,'max_price':100})
        self.assertEqual(empty,[])

    def test_duplicate_categories_are_normalized(self):
        self.assertEqual(validate_preferences({'categories':['Cơm','Cơm']})['categories'],['Cơm'])
