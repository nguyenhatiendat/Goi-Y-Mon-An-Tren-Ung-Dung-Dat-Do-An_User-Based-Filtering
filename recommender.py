"""Gợi ý dựa trên lịch sử trong SQLite, kết hợp khẩu vị cho người mới."""
import math
from collections import Counter
from catalog import matches, matches_category, validate_preferences, DEFAULT_PREFERENCES

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


# Bản raw ở goi_y() bên trên là baseline để đối chiếu công thức trong bài học.
# Ứng dụng dùng UserBasedIndex và build_recommendations bên dưới.
DISCOVERY_LIMIT = 48
DEFAULT_K = 5
SHRINKAGE = 2.0


class UserBasedIndex:
    """Chỉ mục thưa, chuẩn vector tính một lần; chỉ so người có món giao nhau.

    Mặc định đúng User-based CF cổ điển:
      r(u,i) = số đơn hoàn tất chứa món i.
      sim(u,v) = Cosine(r(u),r(v)) trên TOÀN BỘ vector.
      score(u,i) = sum(sim(u,v)*r(v,i))/sum(sim(u,v)), top K hàng xóm.
    regularized=True là biến thể thí nghiệm: log1p, L2 và common/(common+2).
    Không dùng tên món, nhóm, giá hoặc ảnh để tính điểm CF.
    """
    def __init__(self, matrix, regularized=False):
        self.matrix=matrix
        self.regularized=regularized
        self.vectors={}
        self.norms={}
        self.postings={}
        self.popularity=Counter()
        for uid, counts in matrix.items():
            values={fid:math.log1p(n) if regularized else float(n) for fid,n in sorted(counts.items()) if n>0}
            norm=math.sqrt(sum(x*x for x in values.values()))
            self.norms[uid]=norm
            self.vectors[uid]={fid:value/norm for fid,value in values.items()} if norm else {}
            for fid in values:
                self.postings.setdefault(fid,set()).add(uid)
                self.popularity[fid]+=counts[fid]

    def neighbours(self, uid, k=DEFAULT_K):
        if uid not in self.vectors:
            raise ValueError('Người dùng không có trong dữ liệu.')
        if type(k) is not int or k<1:
            raise ValueError('K phải là số nguyên dương.')
        target=self.vectors[uid]
        possible=set()
        for fid in target:possible.update(self.postings[fid])
        possible.discard(uid)
        result=[]
        for other_id in possible:
            other=self.vectors[other_id]
            common=sum(fid in other for fid in target)
            raw=(sum(value*other.get(fid,0) for fid,value in target.items()) if self.regularized else
                 sum(self.matrix[uid][fid]*self.matrix[other_id].get(fid,0) for fid in target)/(self.norms[uid]*self.norms[other_id]))
            raw=max(0.0,min(1.0,raw))
            reliability=common/(common+SHRINKAGE) if self.regularized else 1.0
            weight=raw*reliability
            if weight>0:
                result.append({'ma_nguoi':other_id,'tuong_dong':weight,'cosine_goc':raw,
                               'so_mon_chung':common,'he_so_tin_cay':reliability})
        result.sort(key=lambda n:(-n['tuong_dong'],-n['so_mon_chung'] if self.regularized else 0,n['ma_nguoi']))
        return result[:k]

    def recommend(self, uid, foods, k=DEFAULT_K, limit=DISCOVERY_LIMIT):
        neighbours=self.neighbours(uid,k)
        denominator=sum(n['tuong_dong'] for n in neighbours)
        seen=self.vectors[uid]
        allowed={f['id']:f for f in foods if f['id'] not in seen}
        evidence={}
        # Chỉ duyệt món thực sự có ở hàng xóm, không duyệt toàn bộ thực đơn × K.
        for n in neighbours:
            for fid,value in self.vectors[n['ma_nguoi']].items():
                if fid in allowed:
                    preference=value if self.regularized else self.matrix[n['ma_nguoi']][fid]
                    evidence.setdefault(fid,[]).append({**n,'so_lan':self.matrix[n['ma_nguoi']][fid],
                        'gia_tri_chuan_hoa':value,'gia_tri_tinh_diem':preference,'dong_gop':n['tuong_dong']*preference})
        results=[]
        for fid,rows in evidence.items():
            score=sum(n['dong_gop'] for n in rows)/denominator
            results.append({**allowed[fid],'diem':score,'diem_xep_hang':score,'diem_lich_su':0,
                            'bang_chung':rows,'tong_tuong_dong':denominator,'pho_bien':self.popularity[fid],
                            'phuong_phap':'Lọc cộng tác','reason':f"{len(rows)} người có lịch sử hoàn tất tương tự bạn đã đặt món này."})
        results.sort(key=lambda f:(-f['diem'],-f['pho_bien'],f['id']))
        return results[:limit],neighbours


def ho_so_khau_vi(user_id,matrix,foods):
    groups,restaurants=Counter(),Counter()
    for food in foods:
        count=matrix.get(user_id,{}).get(food['id'],0)
        groups[food['nhom']]+=count
        restaurants[food['nha_hang_id']]+=count
    return groups,restaurants


def build_recommendations(user_id,matrix,foods,preferences=None,category='Tất cả',limit=DISCOVERY_LIMIT,index=None):
    if type(limit) is not int or not 1<=limit<=48:
        raise ValueError('Số món gợi ý phải là số nguyên từ 1 đến 48.')
    prefs=validate_preferences(preferences or DEFAULT_PREFERENCES)
    model=index if index is not None else UserBasedIndex(matrix)
    eligible=[f for f in foods if f.get('available',1) and f.get('is_open',1)
              and matches(f,prefs) and matches_category(f,category)]
    primary,neighbours=model.recommend(user_id,eligible,limit=limit)
    # Phần dự phòng có nhãn riêng, không cộng điểm thuộc tính vào điểm User-based.
    groups,_=ho_so_khau_vi(user_id,matrix,foods)
    positive_groups={g:n for g,n in groups.items() if n>0}
    used={f['id'] for f in primary}|set(model.vectors[user_id])
    fallback=[]
    for food in eligible:
        if food['id'] in used:continue
        preferred=any(matches_category(food,c) for c in prefs['categories'])
        if prefs['categories'] and not preferred:continue
        if positive_groups and not preferred and food['nhom'] not in positive_groups:continue
        method='Lịch sử của bạn' if groups[food['nhom']]>0 else 'Khẩu vị' if preferred else 'Phổ biến' if model.popularity[food['id']]>0 else 'Khám phá'
        reason=(f"Chưa có bằng chứng CF cho món này; bạn đã hoàn tất {groups[food['nhom']]} lượt {food['nhom']}." if groups[food['nhom']]>0 else
                'Gợi ý khởi đầu theo nhóm khẩu vị bạn chọn.' if preferred else
                'Lựa chọn khởi đầu theo lượt hoàn tất trong dữ liệu ứng dụng.' if model.popularity[food['id']]>0 else
                'Lựa chọn khám phá ban đầu, phù hợp bộ lọc hiện tại.')
        fallback.append({**food,'diem':0.0,'diem_xep_hang':0.0,'diem_lich_su':0.0,'bang_chung':[],
                         'tong_tuong_dong':0.0,'pho_bien':model.popularity[food['id']],
                         'phuong_phap':method,'reason':reason})
    used_groups,used_shops=Counter(),Counter();diverse=[]
    while fallback and len(diverse)<limit:
        def rank(f):
            score=1+math.log1p(f['pho_bien'])+(1 if any(matches_category(f,c) for c in prefs['categories']) else 0)
            return (-score/(1+.6*used_groups[f['nhom']]+.35*used_shops[f['nha_hang_id']]),f['id'])
        best=min(fallback,key=rank);fallback.remove(best);diverse.append(best)
        used_groups[best['nhom']]+=1;used_shops[best['nha_hang_id']]+=1
    mode='user_based' if primary else 'cold_start' if not model.vectors[user_id] else 'no_matching_neighbours' if not neighbours else 'no_cf_candidates'
    return {'recommendations':primary if primary else diverse,'fallback_recommendations':diverse if primary else [],
            'neighbours':neighbours,'recommendation_mode':mode,
            'model':{'algorithm':'User-based CF','k':DEFAULT_K,'shrinkage':SHRINKAGE if model.regularized else 0,
                     'interaction':'completed_orders','transform':'log1p + L2' if model.regularized else 'raw_counts',
                     'score':'weighted_mean_normalized_frequency' if model.regularized else 'weighted_mean_frequency'}}


def goi_y_ca_nhan(user_id,matrix,foods,preferences=None,category='Tất cả',limit=DISCOVERY_LIMIT):
    result=build_recommendations(user_id,matrix,foods,preferences,category,limit)
    return result['recommendations'],result['neighbours']


def ly_do(mon,ten_nguoi):
    return mon.get('reason','Gợi ý theo lịch sử của người dùng có khẩu vị tương đồng.')
