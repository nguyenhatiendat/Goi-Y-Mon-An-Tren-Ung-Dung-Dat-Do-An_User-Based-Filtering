/* Lọc cộng tác cho bản xem thử chạy hoàn toàn trong trình duyệt.
   Khi chạy bằng Flask, giao diện gọi API Python ở app.py. */
(function (global) {
  "use strict";

  function cosine(a, b) {
    const dot = Object.entries(a).reduce((sum, [id, n]) => sum + n * (b[id] || 0), 0);
    const normA = Math.sqrt(Object.values(a).reduce((sum, n) => sum + n * n, 0));
    const normB = Math.sqrt(Object.values(b).reduce((sum, n) => sum + n * n, 0));
    return normA && normB ? Math.max(0, Math.min(1, dot / (normA * normB))) : 0;
  }

  function buildMatrix(users, orders) {
    const matrix = Object.fromEntries(users.map(u => [u.id, {}]));
    for (const order of orders) {
      const vector = matrix[order.nguoi_dung_id];
      if (vector) vector[order.mon_an_id] = (vector[order.mon_an_id] || 0) + 1;
    }
    return matrix;
  }

  function recommendations(userId, matrix, foods, options = {}) {
    if (!matrix[userId]) throw new Error("Người dùng không có trong dữ liệu.");
    const k = options.k === undefined ? 5 : options.k;
    const topN = options.topN === undefined ? 24 : options.topN;
    const category = options.category || "Tất cả";
    const maxPrice = options.maxPrice === undefined ? null : options.maxPrice;
    if (!Number.isInteger(k) || k < 1 || !Number.isInteger(topN) || topN < 1) throw new Error("K và Top N phải là số nguyên dương.");
    if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) throw new Error("Giá tối đa không hợp lệ.");
    const vector = matrix[userId];
    const popularity = {};
    const neighbours = [];
    for (const [id, other] of Object.entries(matrix)) {
      for (const [dish, count] of Object.entries(other)) popularity[dish] = (popularity[dish] || 0) + count;
      if (Number(id) !== Number(userId)) {
        const similarity = cosine(vector, other);
        if (similarity > 0) neighbours.push({ ma_nguoi: Number(id), tuong_dong: similarity });
      }
    }
    neighbours.sort((a, b) => b.tuong_dong - a.tuong_dong || a.ma_nguoi - b.ma_nguoi);
    const nearest = neighbours.slice(0, k);
    const denominator = nearest.reduce((sum, n) => sum + n.tuong_dong, 0);
    const personalised = [], fallback = [];
    for (const food of foods) {
      if (Object.hasOwn(vector, food.id) || (category !== "Tất cả" && category !== food.nhom) || (maxPrice !== null && food.gia > maxPrice)) continue;
      const evidence = nearest.filter(n => matrix[n.ma_nguoi][food.id] > 0).map(n => ({
        ...n, so_lan: matrix[n.ma_nguoi][food.id], dong_gop: n.tuong_dong * matrix[n.ma_nguoi][food.id],
      }));
      const numerator = evidence.reduce((sum, e) => sum + e.dong_gop, 0);
      const score = denominator ? numerator / denominator : 0;
      const result = { ...food, diem: score, bang_chung: evidence, tong_tuong_dong: denominator,
        pho_bien: popularity[food.id] || 0,
        phuong_phap: score > 0 ? "Lọc cộng tác" : popularity[food.id] ? "Phổ biến" : "Khám phá" };
      (score > 0 ? personalised : fallback).push(result);
    }
    personalised.sort((a, b) => b.diem - a.diem || b.pho_bien - a.pho_bien || a.id - b.id);
    fallback.sort((a, b) => b.pho_bien - a.pho_bien || a.id - b.id);
    return { recommendations: [...personalised, ...fallback].slice(0, topN), neighbours: nearest };
  }

  function matches(food,prefs){
    if(food.gia<prefs.min_price||(prefs.max_price!==null&&food.gia>prefs.max_price))return false;
    if(food.nhom!=='Đồ uống'){
      if(prefs.diet==='vegetarian'&&!food.chay)return false;
      if(prefs.diet==='nonvegetarian'&&food.chay)return false;
      if(prefs.spice==='none'&&food.cay!==0)return false;
      if(prefs.spice==='mild'&&food.cay>1)return false;
      if(prefs.spice==='hot'&&food.cay===0)return false;
    }
    return true;
  }
  function personalised(id,matrix,foods,prefs,category='Tất cả',limit=12){
    if(!Number.isInteger(limit)||limit<1||limit>24)throw new Error('Số món gợi ý phải là số nguyên từ 1 đến 24.');
    const pool=foods.filter(f=>matches(f,prefs)&&(category==='Tất cả'||f.nhom===category));
    const result=recommendations(id,matrix,pool,{topN:foods.length||1,k:5});
    const groups={},restaurants={},vector=matrix[id];
    for(const food of foods){
      const count=vector[food.id]||0;
      if(count>0){groups[food.nhom]=(groups[food.nhom]||0)+count;restaurants[food.nha_hang_id]=(restaurants[food.nha_hang_id]||0)+count;}
    }
    const maxGroup=Math.max(1,...Object.values(groups)),maxRestaurant=Math.max(1,...Object.values(restaurants));
    const maxCF=Math.max(0,...result.recommendations.map(m=>m.diem))||1;
    const activePrefs=prefs.categories.length||prefs.diet!=='any'||prefs.spice!=='any'||prefs.min_price||prefs.max_price!==null;
    const candidates=[];
    for(const item of result.recommendations){
      const count=groups[item.nhom]||0,preferred=prefs.categories.includes(item.nhom);
      if(item.diem<=0&&!count&&!preferred&&(Object.keys(groups).length||prefs.categories.length))continue;
      const affinity=0.8*count/maxGroup+0.2*(restaurants[item.nha_hang_id]||0)/maxRestaurant;
      item.diem_lich_su=affinity;
      item.diem_xep_hang=Math.max(0.1,item.diem/maxCF+affinity+(preferred?0.25:0));
      if(item.diem>0)item.reason='Người có lịch sử đặt món tương tự bạn đã thử món này.';
      else if(count){item.phuong_phap='Lịch sử của bạn';item.reason=`Bạn đã đặt ${count} lượt ${item.nhom}; thử một món mới cùng nhóm.`;}
      else if(preferred){item.phuong_phap='Khẩu vị';item.reason=`Thuộc nhóm ${item.nhom} bạn đã chọn yêu thích, phù hợp bộ lọc hiện tại.`;}
      else{
        item.phuong_phap=activePrefs?'Khẩu vị':'Khám phá';
        item.reason=activePrefs?'Gợi ý khởi đầu theo mức giá và khẩu vị đã chọn.':'Gợi ý khởi đầu đa dạng; đặt món để FoodMatch học khẩu vị của bạn.';
      }
      candidates.push(item);
    }
    const groupCount=new Set(candidates.map(m=>m.nhom)).size;
    const groupCap=groupCount?Math.ceil(limit/Math.min(3,groupCount)):limit,restaurantCap=Math.max(2,Math.ceil(limit/6));
    const usedGroups={},usedRestaurants={},selected=[];
    const adjusted=m=>m.diem_xep_hang/(1+0.6*(usedGroups[m.nhom]||0)+0.35*(usedRestaurants[m.nha_hang_id]||0));
    while(selected.length<limit){
      const available=candidates.filter(m=>(usedGroups[m.nhom]||0)<groupCap&&(usedRestaurants[m.nha_hang_id]||0)<restaurantCap);
      if(!available.length)break;
      available.sort((a,b)=>(a.diem>0?0:1)-(b.diem>0?0:1)||adjusted(b)-adjusted(a)||b.pho_bien-a.pho_bien||a.id-b.id);
      const best=available[0];selected.push(best);usedGroups[best.nhom]=(usedGroups[best.nhom]||0)+1;
      usedRestaurants[best.nha_hang_id]=(usedRestaurants[best.nha_hang_id]||0)+1;candidates.splice(candidates.indexOf(best),1);
    }
    result.recommendations=selected;
    return result;
  }
  const api = { cosine, buildMatrix, recommendations, matches, personalised };
  global.FoodEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
