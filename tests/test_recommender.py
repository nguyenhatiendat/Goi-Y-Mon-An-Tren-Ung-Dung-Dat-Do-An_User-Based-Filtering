"""Dữ liệu số trong kiểm thử không được nạp vào ứng dụng."""
import math
import unittest
from recommender import cosine, goi_y, goi_y_ca_nhan
from catalog import catalog, matches, validate_preferences, DEFAULT_PREFERENCES

class KiemTraThuatToan(unittest.TestCase):
    def setUp(self):
        self.ma_tran = {
            1: {1: 2, 2: 1},
            2: {1: 2, 2: 1, 3: 4},
            3: {1: 1, 4: 2},
        }
        self.mon = [
            {"id": 1, "nhom": "Cơm", "gia": 30000},
            {"id": 2, "nhom": "Cơm", "gia": 40000},
            {"id": 3, "nhom": "Bún", "gia": 50000},
            {"id": 4, "nhom": "Bún", "gia": 60000},
            {"id": 5, "nhom": "Chay", "gia": 35000},
        ]

    def test_cosine_tinh_tren_toan_bo_mon(self):
        # Dùng toàn vector nên kết quả < 1, dù hai món chung có cùng tỉ lệ.
        self.assertAlmostEqual(cosine(self.ma_tran[1], self.ma_tran[2]), 5 / math.sqrt(105))

    def test_cosine_vector_rong(self):
        self.assertEqual(cosine({}, {1: 3}), 0)
        self.assertEqual(cosine({}, {}), 0)

    def test_cosine_khong_trung_mon(self):
        self.assertEqual(cosine({1: 3}, {2: 3}), 0)

    def test_cosine_giong_nhau(self):
        self.assertAlmostEqual(cosine({1: 2, 2: 1}, {1: 4, 2: 2}), 1)

    def test_diem_trung_binh_co_trong_so(self):
        ket_qua, _ = goi_y(1, self.ma_tran, self.mon)
        sim_12 = 5 / math.sqrt(105)
        sim_13 = 2 / 5
        theo_id = {m["id"]: m for m in ket_qua}
        self.assertAlmostEqual(theo_id[3]["diem"], sim_12 * 4 / (sim_12 + sim_13))
        self.assertAlmostEqual(theo_id[4]["diem"], sim_13 * 2 / (sim_12 + sim_13))
        self.assertEqual(ket_qua[0]["id"], 3)

    def test_loai_mon_da_dat_va_chinh_nguoi_dung(self):
        ket_qua, hang_xom = goi_y(1, self.ma_tran, self.mon)
        self.assertTrue(all(m["id"] not in {1, 2} for m in ket_qua))
        self.assertTrue(all(x["ma_nguoi"] != 1 for x in hang_xom))

    def test_chon_k_nguoi_gan_nhat(self):
        ket_qua, hang_xom = goi_y(1, self.ma_tran, self.mon, k=1)
        self.assertEqual([x["ma_nguoi"] for x in hang_xom], [2])
        self.assertAlmostEqual(ket_qua[0]["diem"], 4)

    def test_bo_loc_gia_va_nhom(self):
        ket_qua, _ = goi_y(1, self.ma_tran, self.mon, nhom="Bún", gia_toi_da=50000)
        self.assertEqual([m["id"] for m in ket_qua], [3])

    def test_bo_loc_khong_co_ket_qua(self):
        ket_qua, _ = goi_y(1, self.ma_tran, self.mon, gia_toi_da=1000)
        self.assertEqual(ket_qua, [])

    def test_nguoi_moi_duoc_goi_y_pho_bien(self):
        ma_tran = {**self.ma_tran, 4: {}}
        ket_qua, hang_xom = goi_y(4, ma_tran, self.mon)
        self.assertEqual(hang_xom, [])
        self.assertEqual(ket_qua[0]["id"], 1)  # 5 lượt, cao nhất.
        self.assertEqual(ket_qua[0]["phuong_phap"], "Phổ biến")
        self.assertEqual(ket_qua[-1]["phuong_phap"], "Khám phá")

    def test_nguoi_co_lich_su_nhung_khong_co_hang_xom(self):
        ma_tran = {1: {1: 1}, 2: {3: 8, 4: 2}}
        ket_qua, hang_xom = goi_y(1, ma_tran, self.mon, top_n=2)
        self.assertEqual(hang_xom, [])
        self.assertEqual([m["id"] for m in ket_qua], [3, 4])
        self.assertTrue(all(m["phuong_phap"] == "Phổ biến" for m in ket_qua))

    def test_da_dat_tat_ca_mon(self):
        ket_qua, _ = goi_y(1, {1: {m["id"]: 1 for m in self.mon}}, self.mon)
        self.assertEqual(ket_qua, [])

    def test_gioi_han_top_n(self):
        ket_qua, _ = goi_y(1, self.ma_tran, self.mon, top_n=1)
        self.assertEqual(len(ket_qua), 1)

    def test_tham_so_khong_hop_le(self):
        for thay_doi in [{"k": 0}, {"top_n": 0}, {"k": 1.5},
                         {"top_n": True}, {"gia_toi_da": -1},
                         {"gia_toi_da": float("inf")}, {"gia_toi_da": float("nan")}]:
            with self.subTest(tham_so=thay_doi), self.assertRaises(ValueError):
                goi_y(1, self.ma_tran, self.mon, **thay_doi)
        with self.assertRaises(ValueError):
            goi_y(99, self.ma_tran, self.mon)

    def test_hoa_diem_xep_theo_ma_mon(self):
        ket_qua, _ = goi_y(1, {1: {}, 2: {3: 2, 4: 2}}, self.mon)
        self.assertEqual([m["id"] for m in ket_qua[:2]], [3, 4])


