"""Hồi quy lỗi Khám phá biến thành danh sách món chưa đặt theo mã món."""
import unittest
from collections import Counter

from catalog import catalog, DEFAULT_PREFERENCES, matches
from recommender import goi_y_ca_nhan


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.foods = catalog()[1]
        # Bộ số kiểm thử: một người, 19 lượt thuộc ba nhóm, không có hàng xóm.
        self.vector = {3:1, 4:1, 5:1, 6:1, 7:1, 41:1, 42:1, 43:1, 44:2,
                       47:1, 48:1, 57:1, 59:1, 60:1, 62:1, 64:1, 70:1, 71:1}
        self.matrix = {1:self.vector}

    def recommend(self, prefs=None, category='Tất cả'):
        return goi_y_ca_nhan(1, self.matrix, self.foods, prefs, category)[0]

    def test_one_account_learns_rice_korean_drinks_without_neighbours(self):
        result, neighbours = goi_y_ca_nhan(1, self.matrix, self.foods)
        self.assertEqual(neighbours, [])
        self.assertEqual(Counter(f['nhom'] for f in result), {'Cơm':3, 'Món Hàn':2, 'Đồ uống':4})
        self.assertEqual(len(result), 9)
        self.assertTrue(all(f['phuong_phap'] == 'Lịch sử của bạn' for f in result))
        self.assertTrue(all(f['diem'] == 0 and f['diem_lich_su'] > 0 for f in result))
        self.assertEqual({f['nhom'] for f in result[:3]}, {'Cơm', 'Món Hàn', 'Đồ uống'})

    def test_reasons_use_events_not_dish_count_or_fake_people(self):
        expected = {'Cơm':5, 'Món Hàn':7, 'Đồ uống':7}
        for food in self.recommend():
            self.assertIn(f"{expected[food['nhom']]} lượt {food['nhom']}", food['reason'])
            self.assertFalse(food['bang_chung'])

    def test_never_repeat_seen_or_duplicate_dishes(self):
        ids = [f['id'] for f in self.recommend()]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(set(ids).isdisjoint(self.vector))

    def test_history_recommendations_obey_all_hard_filters(self):
        prefs = {**DEFAULT_PREFERENCES, 'min_price':35000, 'max_price':45000,
                 'spice':'none', 'diet':'vegetarian'}
        result = self.recommend(prefs)
        self.assertTrue(result)
        self.assertTrue(all(matches(f, prefs) for f in result))
        self.assertTrue(all(f['nhom'] in ('Cơm','Món Hàn','Đồ uống') for f in result))

    def test_no_unrelated_padding_when_category_has_no_signal(self):
        self.assertEqual(self.recommend(category='Bún / phở'), [])
        self.assertEqual(self.recommend({**DEFAULT_PREFERENCES, 'max_price':100}), [])

    def test_saved_category_can_introduce_a_new_group(self):
        result = self.recommend({**DEFAULT_PREFERENCES, 'categories':['Món chay']})
        self.assertIn('Món chay', {f['nhom'] for f in result})
        self.assertTrue(all(f['nhom'] in ('Cơm','Món Hàn','Đồ uống','Món chay') for f in result))

    def test_real_collaborative_evidence_can_introduce_a_new_group(self):
        matrix = {1:self.vector, 2:{3:1, 9:4}}
        result, neighbours = goi_y_ca_nhan(1, matrix, self.foods)
        self.assertTrue(neighbours)
        self.assertEqual(result[0]['id'], 9)
        self.assertEqual(result[0]['phuong_phap'], 'Lọc cộng tác')
        self.assertGreater(result[0]['diem'], 0)

    def test_cold_start_is_small_and_diverse_without_fake_history(self):
        result, neighbours = goi_y_ca_nhan(1, {1:{}}, self.foods)
        self.assertEqual(len(result), 12)
        self.assertGreaterEqual(len({f['nhom'] for f in result}), 6)
        self.assertFalse(neighbours)
        self.assertTrue(all(f['diem'] == 0 and f['phuong_phap'] == 'Khám phá' for f in result))

    def test_cap_per_group_and_restaurant(self):
        result = self.recommend()
        self.assertLessEqual(max(Counter(f['nhom'] for f in result).values()), 4)
        self.assertLessEqual(max(Counter(f['nha_hang_id'] for f in result).values()), 2)

    def test_exhausted_familiar_groups_do_not_turn_into_full_menu(self):
        vector = {f['id']:1 for f in self.foods if f['nhom'] in ('Cơm','Món Hàn','Đồ uống')}
        result, _ = goi_y_ca_nhan(1, {1:vector}, self.foods)
        self.assertEqual(result, [])

    def test_uses_full_history_before_filtering(self):
        drinks = self.recommend(category='Đồ uống')
        self.assertTrue(drinks)
        self.assertTrue(all('7 lượt Đồ uống' in f['reason'] for f in drinks))

    def test_limit_validation(self):
        for limit in (0, 25, True, 3.5):
            with self.assertRaises(ValueError):
                goi_y_ca_nhan(1, self.matrix, self.foods, limit=limit)

    def test_history_change_updates_rank_without_manual_preferences(self):
        rice = goi_y_ca_nhan(1, {1:{1:3}}, self.foods)[0]
        drinks = goi_y_ca_nhan(1, {1:{57:3}}, self.foods)[0]
        self.assertTrue(rice); self.assertTrue(drinks)
        self.assertEqual({f['nhom'] for f in rice}, {'Cơm'})
        self.assertEqual({f['nhom'] for f in drinks}, {'Đồ uống'})
