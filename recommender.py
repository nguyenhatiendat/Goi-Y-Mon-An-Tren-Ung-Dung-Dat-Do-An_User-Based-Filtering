"""Gợi ý dựa trên lịch sử thật, kết hợp khẩu vị cho người chưa có dữ liệu."""
import math
from collections import Counter
from database import DuLieu
from catalog import matches, validate_preferences, DEFAULT_PREFERENCES

#3. THUẬT TOÁN LỌC CỘNG TÁC THEO NGƯỜI DÙNG
def cosine(vector_a, vector_b):
    """Tính trên TOÀN BỘ các món; món chưa đặt được xem là 0."""
    tich_vo_huong = sum(so_lan * vector_b.get(ma_mon, 0)
                       for ma_mon, so_lan in vector_a.items())
    do_dai_a = math.sqrt(sum(x * x for x in vector_a.values()))
    do_dai_b = math.sqrt(sum(x * x for x in vector_b.values()))
    if do_dai_a == 0 or do_dai_b == 0:
        return 0.0
    return max(0.0, min(1.0, tich_vo_huong / (do_dai_a * do_dai_b)))


def goi_y(ma_nguoi, ma_tran, thuc_don, top_n=6, k=5,
          nhom="Tất cả", gia_toi_da=None):
    """Trả về danh sách gợi ý và K người dùng gần nhất.

    Điểm(u, i) = sum(sim(u,v) * r[v,i]) / sum(sim(u,v)).
    Mẫu số lấy TẤT CẢ K hàng xóm có độ tương đồng > 0.
    Điểm là số lần đặt có trọng số, không phải xác suất hay điểm sao.
    """
    if ma_nguoi not in ma_tran:
        raise ValueError("Người dùng không có trong dữ liệu.")
    if (isinstance(top_n, bool) or not isinstance(top_n, int) or top_n < 1 or
            isinstance(k, bool) or not isinstance(k, int) or k < 1):
        raise ValueError("Top N và K phải là số nguyên dương.")
    if gia_toi_da is not None and (not math.isfinite(gia_toi_da) or gia_toi_da < 0):
        raise ValueError("Giá tối đa phải là số hữu hạn không âm.")

    lich_su_ban = ma_tran[ma_nguoi]
    hang_xom = []
    do_pho_bien = {}
    for ma_khac, vector in ma_tran.items():
        for ma_mon, so_lan in vector.items():
            do_pho_bien[ma_mon] = do_pho_bien.get(ma_mon, 0) + so_lan
        if ma_khac != ma_nguoi:
            tuong_dong = cosine(lich_su_ban, vector)
            if tuong_dong > 0:
                hang_xom.append({"ma_nguoi": ma_khac, "tuong_dong": tuong_dong})
    hang_xom.sort(key=lambda x: (-x["tuong_dong"], x["ma_nguoi"]))
    hang_xom = hang_xom[:k]
    tong_tuong_dong = sum(x["tuong_dong"] for x in hang_xom)

    ung_vien = [m for m in thuc_don
               if m["id"] not in lich_su_ban
               and (nhom == "Tất cả" or m["nhom"] == nhom)
               and (gia_toi_da is None or m["gia"] <= gia_toi_da)]
    ca_nhan_hoa = []
    du_phong = []
    for mon in ung_vien:
        bang_chung = []
        for x in hang_xom:
            so_lan = ma_tran[x["ma_nguoi"]].get(mon["id"], 0)
            if so_lan > 0:
                bang_chung.append({**x, "so_lan": so_lan,
                                   "dong_gop": x["tuong_dong"] * so_lan})
        tu_so = sum(b["dong_gop"] for b in bang_chung)
        diem = tu_so / tong_tuong_dong if tong_tuong_dong else 0.0
        ket_qua = {**mon, "diem": diem, "bang_chung": bang_chung,
                   "tong_tuong_dong": tong_tuong_dong,
                   "pho_bien": do_pho_bien.get(mon["id"], 0),
                   "phuong_phap": "Lọc cộng tác" if diem > 0 else "Phổ biến"}
        if diem > 0:
            ca_nhan_hoa.append(ket_qua)
        else:
            if ket_qua["pho_bien"] == 0:
                ket_qua["phuong_phap"] = "Khám phá"
            du_phong.append(ket_qua)

    ca_nhan_hoa.sort(key=lambda m: (-m["diem"], -m["pho_bien"], m["id"]))
    du_phong.sort(key=lambda m: (-m["pho_bien"], m["id"]))
    return (ca_nhan_hoa + du_phong)[:top_n], hang_xom


DISCOVERY_LIMIT = 12


def ho_so_khau_vi(user_id, matrix, foods):
    """Học từ số LƯỢT đặt của chính tài khoản, kể cả khi chỉ có một người dùng."""
    groups, restaurants = Counter(), Counter()
    vector = matrix.get(user_id, {})
    for food in foods:
        count = vector.get(food['id'], 0)
        if count > 0:
            groups[food['nhom']] += count
            restaurants[food['nha_hang_id']] += count
    return groups, restaurants


def goi_y_ca_nhan(user_id, matrix, foods, preferences=None, category='Tất cả', limit=DISCOVERY_LIMIT):
    """Chọn tối đa 12 món mới có cơ sở gợi ý, không trả lại cả thực đơn.

    CF vẫn dùng Cosine/số lượt đặt thật. Nếu chưa có hàng xóm, học nhóm món
    và quán từ lịch sử riêng. Bộ lọc luôn bắt buộc; đa dạng nhóm/quán ở bước
    chọn cuối. Không thêm món ít liên quan chỉ để đủ số lượng.
    """
    if type(limit) is not int or not 1 <= limit <= 24:
        raise ValueError('Số món gợi ý phải là số nguyên từ 1 đến 24.')
    prefs = validate_preferences(preferences or DEFAULT_PREFERENCES)
    pool = [f for f in foods if matches(f, prefs) and (category == 'Tất cả' or f['nhom'] == category)]
    items, neighbours = goi_y(user_id, matrix, pool, top_n=len(foods) or 1, k=5)
    groups, restaurants = ho_so_khau_vi(user_id, matrix, foods)
    max_group = max(groups.values(), default=1)
    max_restaurant = max(restaurants.values(), default=1)
    max_cf = max((m['diem'] for m in items), default=0) or 1
    active_prefs = (prefs['categories'] or prefs['diet'] != 'any' or prefs['spice'] != 'any'
                    or prefs['min_price'] or prefs['max_price'] is not None)
    candidates = []
    for item in items:
        count = groups[item['nhom']]
        preferred = item['nhom'] in prefs['categories']
        # Với người có lịch sử, chỉ giữ món có bằng chứng từ lịch sử/CF/khẩu vị.
        # Người mới chọn nhóm yêu thích cũng chỉ nhận gợi ý từ các nhóm đó.
        if item['diem'] <= 0 and not count and not preferred:
            if groups or prefs['categories']:
                continue
        affinity = (0.8 * count / max_group
                    + 0.2 * restaurants[item['nha_hang_id']] / max_restaurant)
        item['diem_lich_su'] = affinity
        item['diem_xep_hang'] = max(0.1, item['diem'] / max_cf + affinity + (0.25 if preferred else 0))
        if item['diem'] > 0:
            item['reason'] = 'Người có lịch sử đặt món tương tự bạn đã thử món này.'
        elif count:
            item['phuong_phap'] = 'Lịch sử của bạn'
            item['reason'] = f"Bạn đã đặt {count} lượt {item['nhom']}; thử một món mới cùng nhóm."
        elif preferred:
            item['phuong_phap'] = 'Khẩu vị'
            item['reason'] = f"Thuộc nhóm {item['nhom']} bạn đã chọn yêu thích, phù hợp bộ lọc hiện tại."
        else:
            item['phuong_phap'] = 'Khẩu vị' if active_prefs else 'Khám phá'
            item['reason'] = ('Gợi ý khởi đầu theo mức giá và khẩu vị đã chọn.' if active_prefs else
                              'Gợi ý khởi đầu đa dạng; đặt món để FoodMatch học khẩu vị của bạn.')
        candidates.append(item)

    group_count = len({m['nhom'] for m in candidates})
    group_cap = math.ceil(limit / min(3, group_count)) if group_count else limit
    restaurant_cap = max(2, math.ceil(limit / 6))
    used_groups, used_restaurants = Counter(), Counter()
    selected = []
    while len(selected) < limit:
        available = [m for m in candidates if used_groups[m['nhom']] < group_cap
                     and used_restaurants[m['nha_hang_id']] < restaurant_cap]
        if not available:
            break
        def rank(m):
            diversity = 1 + 0.6 * used_groups[m['nhom']] + 0.35 * used_restaurants[m['nha_hang_id']]
            return (0 if m['diem'] > 0 else 1, -m['diem_xep_hang'] / diversity, -m['pho_bien'], m['id'])
        best = min(available, key=rank)
        selected.append(best)
        used_groups[best['nhom']] += 1
        used_restaurants[best['nha_hang_id']] += 1
        candidates.remove(best)
    return selected, neighbours


def ly_do(mon, ten_nguoi):
    if mon["phuong_phap"] == "Lọc cộng tác":
        nhung_ten = [ten_nguoi[b["ma_nguoi"]] for b in mon["bang_chung"]]
        return (f"{', '.join(nhung_ten)} có lịch sử gần giống bạn và đã đặt món này. "
                f"Điểm xếp hạng: {mon['diem']:.3f}.")
    if mon["phuong_phap"] == "Phổ biến":
        return (f"Món có {mon['pho_bien']} lượt đặt trong toàn bộ dữ liệu. "
                "Dùng để bổ sung khi chưa đủ gợi ý từ người có sở thích tương tự.")
    return "Món chưa có lượt đặt; hiển thị để khám phá khi không còn món có dữ liệu phù hợp."


