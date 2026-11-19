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

  function matchesCategory(food,category){
    if(category==='Món chay')return !!food.chay&&food.nhom!=='Đồ uống';
    return category==='Tất cả'||food.nhom===category;
  }
  function matches(food,prefs){
    if(food.gia<prefs.min_price||(prefs.max_price!==null&&food.gia>prefs.max_price))return false;
    let diet=prefs.diet;const categories=prefs.categories||[];
    if(categories.includes('Món chay')&&categories.every(c=>['Món chay','Đồ uống'].includes(c)))diet='vegetarian';
    if(food.nhom!=='Đồ uống'){
      if(diet==='vegetarian'&&!food.chay)return false;
      if(diet==='nonvegetarian'&&food.chay)return false;
      if(prefs.spice==='none'&&food.cay!==0)return false;
      if(prefs.spice==='mild'&&food.cay>1)return false;
      if(prefs.spice==='hot'&&food.cay===0)return false;
    }
    return true;
  }
  function personalised(id,matrix,foods,prefs,category='Tất cả',limit=48){
    if(!Number.isInteger(limit)||limit<1||limit>48)throw new Error('Số món gợi ý phải là số nguyên từ 1 đến 48.');
    if(!matrix[id])throw new Error('Người dùng không có trong dữ liệu.');
    const vectors={},norms={},postings={},popularity={};
    for(const [uid,counts] of Object.entries(matrix)){
      const values=Object.fromEntries(Object.entries(counts).filter(([fid,n])=>n>0).map(([fid,n])=>[fid,Number(n)]));
      const norm=Math.sqrt(Object.values(values).reduce((s,n)=>s+n*n,0));
      norms[uid]=norm;
      vectors[uid]=Object.fromEntries(Object.entries(values).map(([fid,n])=>[fid,n/norm]));
      for(const fid of Object.keys(values)){(postings[fid]||=new Set()).add(Number(uid));popularity[fid]=(popularity[fid]||0)+counts[fid];}
    }
    const target=vectors[id],possible=new Set();
    for(const fid of Object.keys(target))for(const uid of postings[fid]||[])possible.add(uid);
    possible.delete(Number(id));const neighbours=[];
    for(const uid of possible){
      const other=vectors[uid],common=Object.keys(target).filter(fid=>Object.hasOwn(other,fid)).length;
      const raw=Math.max(0,Math.min(1,Object.keys(target).reduce((s,fid)=>s+matrix[id][fid]*(matrix[uid][fid]||0),0)/(norms[id]*norms[uid]))),reliability=1;
      if(raw*reliability>0)neighbours.push({ma_nguoi:uid,tuong_dong:raw*reliability,cosine_goc:raw,so_mon_chung:common,he_so_tin_cay:reliability});
    }
    neighbours.sort((a,b)=>b.tuong_dong-a.tuong_dong||a.ma_nguoi-b.ma_nguoi);neighbours.splice(5);
    const eligible=foods.filter(f=>f.available!==0&&f.is_open!==0&&matches(f,prefs)&&matchesCategory(f,category));
    const allowed=new Map(eligible.filter(f=>!Object.hasOwn(target,f.id)).map(f=>[f.id,f]));
    const denominator=neighbours.reduce((s,n)=>s+n.tuong_dong,0),evidence=new Map();
    for(const n of neighbours)for(const [fid,value] of Object.entries(vectors[n.ma_nguoi])){
      if(!allowed.has(Number(fid)))continue;
      if(!evidence.has(Number(fid)))evidence.set(Number(fid),[]);
      evidence.get(Number(fid)).push({...n,so_lan:matrix[n.ma_nguoi][fid],gia_tri_chuan_hoa:value,gia_tri_tinh_diem:matrix[n.ma_nguoi][fid],dong_gop:n.tuong_dong*matrix[n.ma_nguoi][fid]});
    }
    const primary=[];
    for(const [fid,rows] of evidence){const score=rows.reduce((s,n)=>s+n.dong_gop,0)/denominator;primary.push({...allowed.get(fid),diem:score,diem_xep_hang:score,diem_lich_su:0,bang_chung:rows,tong_tuong_dong:denominator,pho_bien:popularity[fid]||0,phuong_phap:'Lọc cộng tác',reason:`${rows.length} người có lịch sử hoàn tất tương tự bạn đã đặt món này.`});}
    primary.sort((a,b)=>b.diem-a.diem||b.pho_bien-a.pho_bien||a.id-b.id);primary.splice(limit);
    const groups={};for(const f of foods)groups[f.nhom]=(groups[f.nhom]||0)+(matrix[id][f.id]||0);
    const hasHistory=Object.values(groups).some(n=>n>0),used=new Set([...primary.map(f=>f.id),...Object.keys(target).map(Number)]),fallback=[];
    for(const food of eligible){
      if(used.has(food.id))continue;const preferred=prefs.categories.some(c=>matchesCategory(food,c)),count=groups[food.nhom]||0,pop=popularity[food.id]||0;
      if(prefs.categories.length&&!preferred)continue;if(hasHistory&&!preferred&&!count)continue;
      const method=count?'Lịch sử của bạn':preferred?'Khẩu vị':pop?'Phổ biến':'Khám phá';
      const reason=count?`Chưa có bằng chứng CF cho món này; bạn đã hoàn tất ${count} lượt ${food.nhom}.`:preferred?'Gợi ý khởi đầu theo nhóm khẩu vị bạn chọn.':pop?'Lựa chọn khởi đầu theo lượt hoàn tất trong dữ liệu ứng dụng.':'Lựa chọn khám phá ban đầu, phù hợp bộ lọc hiện tại.';
      fallback.push({...food,diem:0,diem_xep_hang:0,diem_lich_su:0,bang_chung:[],tong_tuong_dong:0,pho_bien:pop,phuong_phap:method,reason});
    }
    const diverse=[],usedGroups={},usedShops={};
    const rank=f=>(1+Math.log1p(f.pho_bien)+(prefs.categories.some(c=>matchesCategory(f,c))?1:0))/(1+.6*(usedGroups[f.nhom]||0)+.35*(usedShops[f.nha_hang_id]||0));
    while(fallback.length&&diverse.length<limit){fallback.sort((a,b)=>rank(b)-rank(a)||a.id-b.id);const best=fallback.shift();diverse.push(best);usedGroups[best.nhom]=(usedGroups[best.nhom]||0)+1;usedShops[best.nha_hang_id]=(usedShops[best.nha_hang_id]||0)+1;}
    const mode=primary.length?'user_based':!Object.keys(target).length?'cold_start':!neighbours.length?'no_matching_neighbours':'no_cf_candidates';
    return{recommendations:primary.length?primary:diverse,fallback_recommendations:primary.length?diverse:[],neighbours,recommendation_mode:mode,model:{algorithm:'User-based CF',k:5,shrinkage:0,interaction:'completed_orders',transform:'raw_counts',score:'weighted_mean_frequency'}};
  }
  const api = { cosine, buildMatrix, recommendations, matches, matchesCategory, personalised };
  global.FoodEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
