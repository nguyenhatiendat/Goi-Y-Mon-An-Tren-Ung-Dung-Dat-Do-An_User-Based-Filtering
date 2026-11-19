/* FoodMatch: giao diện dùng chung cho Flask và bản HTML xem thử.
   Flask = gọi API Python / SQLite. HTML tĩnh = chạy cùng công thức trên trình duyệt. */
"use strict";

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const money = value => new Intl.NumberFormat("vi-VN").format(value) + "đ";
const normalise = text => String(text).toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const clone = value => JSON.parse(JSON.stringify(value));
const isFlask = document.body.dataset.runtime === "flask";
const paths = {
  compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  menu:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 12h8M8 17h5"/>',
  store:'<path d="m4 9 2-6h12l2 6M4 9v2a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0V9ZM5 13v8h14v-8M10 21v-6h4v6"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sparkles:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM20 2v4M18 4h4"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bag:'<path d="M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-left':'<path d="M20 12H4m6 6-6-6 6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  external:'<path d="M14 3h7v7m0-7L11 13M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  hamburger:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  bowl:'<path d="M3 12h18a9 9 0 0 1-18 0Zm2 9h14M8 4c-3 3 3 3 0 6m5-8c-3 3 3 3 0 6m5-4c-3 3 3 3 0 6"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  rice:'<path d="M3 13h18c-1 6-4 8-9 8s-8-2-9-8Zm2-1c-1-4 3-5 4-4-1-5 7-5 7-1 4-2 5 3 3 5M9 3v2m5-3v2"/>',
  chicken:'<path d="M15 3c5 0 7 5 5 9s-7 5-10 3l-4 4a2 2 0 1 1-3-3l4-4c-2-4 3-9 8-9Z"/><path d="m9 13 2 2M3 16l3 3"/>',
  pizza:'<path d="m3 20 6-17c5 0 10 4 12 9L3 20Zm6-17L7 8c4 0 8 3 10 6"/><circle cx="9" cy="13" r="1"/><circle cx="12" cy="16" r="1"/>',
  leaf:'<path d="M20 3C9 2 3 7 4 14s12 9 16-11Z"/><path d="M3 22 16 8M10 15V9m0 6h6"/>',
  cup:'<path d="M5 8h14l-2 13H7L5 8Zm7 0 2-6h4M4 8h16M5 4h5"/>',
  cookie:'<path d="M20 12a5 5 0 0 1-5-3 4 4 0 0 1-4-6 9 9 0 1 0 10 10Z"/><path d="M8 8h.01M7 14h.01M12 17h.01M12 12h.01"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  filter:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="2" fill="currentColor" stroke="none"/>',
  flame:'<path d="M13 2c1 6-4 6-3 11 2 0 3-2 4-4 5 3 6 6 4 10-3 4-11 3-12-2C4 11 9 9 13 2Z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-18a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5v2"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  receipt:'<path d="M5 3h14v19l-3-2-4 2-4-2-3 2V3ZM8 7h8m-8 4h8m-8 4h5"/>',
  wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4M4 7v13h17V7Zm17 5h-6v4h6"/>',
};
function icon(name, size=20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.bowl}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon, el.closest('.brand') ? 28 : 19));

let toastTimer;
function toast(message, error=false) {
  const dialog=document.querySelector('dialog[open]');
  if(dialog){
    dialog.querySelector('.dialog-toast')?.remove();
    const messageBox=document.createElement('div');messageBox.className='dialog-toast'+(error?' error':'');messageBox.setAttribute('role','status');messageBox.textContent=message;dialog.appendChild(messageBox);setTimeout(()=>messageBox.remove(),3800);return;
  }
  const el = $('#toast'); el.textContent = message; el.className = `toast visible${error ? ' error' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3800);
}
function readStorage(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeStorage(key,value) { try { localStorage.setItem(key,value); } catch { toast('Trình duyệt không lưu được dữ liệu. Dữ liệu chỉ còn trong phiên này.',true); } }

const defaultPreferences={min_price:0,max_price:null,spice:'any',diet:'any',categories:[]};
let csrfToken='';
function checkedPreferences(input){
  const p={...clone(defaultPreferences),...input};
  if(!Number.isInteger(p.min_price)||p.min_price<0||p.min_price>100000000)throw new Error('Giá tối thiểu chưa hợp lệ.');
  if(p.max_price!==null&&(!Number.isInteger(p.max_price)||p.max_price<p.min_price||p.max_price>100000000))throw new Error('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
  if(!['any','none','mild','hot'].includes(p.spice)||!['any','vegetarian','nonvegetarian'].includes(p.diet))throw new Error('Lựa chọn khẩu vị chưa hợp lệ.');
  if(!Array.isArray(p.categories)||p.categories.some(c=>!['Cơm','Bún / phở','Món gà','Món Âu','Ăn vặt','Món Hàn','Món chay','Đồ uống'].includes(c)))throw new Error('Nhóm món chưa hợp lệ.');
  if(p.categories.includes('Món chay')&&p.categories.every(c=>['Món chay','Đồ uống'].includes(c)))p.diet='vegetarian';
  return p;
}
function createPreviewAPI(){
  let preferences=clone(defaultPreferences),onboarded=false,likes=[];
  try{const saved=JSON.parse(readStorage('foodmatch.guest.preferences.v3'));if(saved){preferences=checkedPreferences(saved);onboarded=true;}}catch{/* Bỏ cấu hình không hợp lệ. */}
  const guest=()=>({id:0,ten:'Bạn',email:'Bản xem trước — chưa đăng nhập',onboarded});
  return{
    session:async()=>({user:null}),
    init:async()=>({users:[guest()],foods:clone(FoodMatchCatalog.foods),favourites:{'0':likes},preferences}),
    dashboard:async(id,options)=>{const prefs=checkedPreferences({...preferences,min_price:options.minPrice,max_price:options.maxPrice,spice:options.spice,diet:options.diet});return{
      ...FoodEngine.personalised(0,{0:{}},FoodMatchCatalog.foods,prefs,options.category),matrix:{0:{}},history:[],popularity:{},neighbour_labels:{},filters:prefs};},
    favourite:async(id,dish)=>{likes=likes.includes(dish)?likes.filter(x=>x!==dish):[...likes,dish];return{favourites:{'0':likes}};},
    checkout:async()=>{throw new Error('Để lưu đơn và lịch sử thật, hãy đăng ký trên bản chạy Flask.');},
    preferences:async p=>{preferences=checkedPreferences(p);onboarded=true;writeStorage('foodmatch.guest.preferences.v3',JSON.stringify(preferences));return{preferences,user:guest()};},
    logout:async()=>({user:null}),
  };
}
async function fetchJSON(url,options={}){
  const response=await fetch(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken,...options.headers}});
  const data=await response.json();
  if(data.csrf_token)csrfToken=data.csrf_token;
  if(!response.ok){
    if(response.status===401&&!url.includes('/auth/'))showAuth('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    if(response.status===401&&!url.includes('/auth/')||response.status===403&&data.error_type==='CSRF'){
      try{const fresh=await fetch('/api/session',{credentials:'same-origin'});const current=await fresh.json();csrfToken=current.csrf_token||'';}catch{/* Người dùng có thể tải lại trang. */}
    }
    throw new Error(data.error||'Chưa kết nối được máy chủ.');
  }
  return data;
}
const api=isFlask?{
  session:()=>fetchJSON('/api/session'),
  init:()=>fetchJSON('/api/state'),
  dashboard:(id,o)=>fetchJSON('/api/me/dashboard?'+new URLSearchParams({category:o.category,min_price:o.minPrice,max_price:o.maxPrice??'',spice:o.spice,diet:o.diet})),
  favourite:(id,dish_id)=>fetchJSON('/api/me/favourites',{method:'POST',body:JSON.stringify({dish_id})}),
  checkout:(id,items)=>fetchJSON('/api/me/orders',{method:'POST',body:JSON.stringify({items})}),
  preferences:preferences=>fetchJSON('/api/me/preferences',{method:'PUT',body:JSON.stringify(preferences)}),
  logout:()=>fetchJSON('/api/auth/logout',{method:'POST',body:'{}'}),
}:createPreviewAPI();
const cartStorageKey=`foodmatch.carts.v3.${isFlask?'flask':'preview'}`;
const state={users:[],foods:[],favourites:{},userId:null,dashboard:null,view:'discover',category:'Tất cả',
  minPrice:0,maxPrice:null,spice:'any',diet:'any',preferences:clone(defaultPreferences),search:'',sort:'match',pageSize:18,
  restaurantId:null,carts:{},pendingFavourites:new Set(),ordering:false,authenticated:false,preferencesRequired:false};
try{const carts=JSON.parse(readStorage(cartStorageKey));if(carts&&typeof carts==='object'&&!Array.isArray(carts))state.carts=carts;}catch{/* Giỏ trống. */}
let loadSequence=0;
let reviewSequence=0;
let orderSequence=0;

const categoryIcons={'Tất cả':'grid','Cơm':'rice','Bún / phở':'bowl','Món gà':'chicken','Món Âu':'pizza','Ăn vặt':'cookie','Món Hàn':'rice','Món chay':'leaf','Đồ uống':'cup'};
const categories=Object.keys(categoryIcons);
const user = () => state.users.find(u=>u.id===state.userId) || state.users[0];
const favouriteIds = () => state.favourites[state.userId] || [];
const foodById = id => state.foods.find(m=>m.id===Number(id));
function userName(id) { return state.dashboard?.neighbour_labels?.[id] || (Number(id)===state.userId?user().ten:'Người cùng gu'); }
function shortName(name) { return name.length > 18 ? name.slice(0,17)+'…' : name; }
function initial(name) { return name.trim().split(/\s+/).at(-1).charAt(0).toUpperCase(); }
function cartItems() {
  const cart=state.carts[state.userId] || {};
  return Object.entries(cart).filter(([id,n])=>foodById(id) && Number.isInteger(n) && n>=1 && n<=20)
    .map(([id,quantity])=>({dish_id:Number(id),quantity,food:foodById(id)}));
}
function popularity(id) { return state.dashboard?.popularity?.[id] || 0; }
function getRecommendation(id) {return [...(state.dashboard?.recommendations||[]),...(state.dashboard?.fallback_recommendations||[])].find(m=>m.id===id);}
function showDialog(id) { const dialog=$('#'+id); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog=$('#'+id); if (dialog.open) dialog.close(); if(id==='orderDialog'){orderSequence++;state.orderId=null;$('#orderContent').innerHTML='';} }
function hideSidebar() { $('#sidebar').classList.remove('open');$('#sidebarBackdrop').classList.remove('open');$('#mobileMenu').setAttribute('aria-expanded','false'); }

async function refreshDashboard() {
  const sequence=++loadSequence;
  const dashboard=await api.dashboard(state.userId,{category:state.category,minPrice:state.minPrice,maxPrice:state.maxPrice,spice:state.spice,diet:state.diet});
  if (sequence!==loadSequence) return;
  if(isFlask){const fresh=await api.init();if(sequence!==loadSequence)return;state.foods=fresh.foods;state.users=fresh.users;}
  state.dashboard=dashboard;if(dashboard.filters)state.diet=dashboard.filters.diet; render();
}
function navigate(view) {
  state.view=view;state.category='Tất cả';state.search='';state.sort='match';state.pageSize=18;state.fallbackPage=12;state.restaurantId=null;
  $('#searchInput').value='';hideSidebar();
  refreshDashboard().catch(e=>toast(e.message,true));window.scrollTo({top:0,behavior:'smooth'});
}

function categoriesHTML() { return `<div class="category-row" aria-label="Chọn nhóm món">${categories.map(c=>`<button class="category-chip ${state.category===c?'active':''}" data-category="${esc(c)}" aria-pressed="${state.category===c}">${icon(categoryIcons[c],18)}${esc(c==='Bún / phở'?'Bún & phở':c)}</button>`).join('')}</div>`; }
function controlsHTML() { return `<div class="section-controls"><select id="sortSelect" aria-label="Sắp xếp món ăn"><option value="match" ${state.sort==='match'?'selected':''}>Phù hợp nhất</option><option value="price-asc" ${state.sort==='price-asc'?'selected':''}>Giá thấp đến cao</option><option value="price-desc" ${state.sort==='price-desc'?'selected':''}>Giá cao đến thấp</option></select><button class="filter-button ${(state.maxPrice!==null||state.minPrice||state.spice!=='any'||state.diet!=='any')?'selected':''}" data-action="filter">${icon('filter',16)}Bộ lọc</button></div>`; }
function filtersHTML() {
  const pieces=[];
  if(state.minPrice)pieces.push('Từ '+money(state.minPrice));
  if(state.maxPrice!==null)pieces.push('Đến '+money(state.maxPrice));
  if(state.spice!=='any')pieces.push(({none:'Không cay',mild:'Không cay / cay nhẹ',hot:'Thích ăn cay'})[state.spice]);
  if(state.diet!=='any')pieces.push(state.diet==='vegetarian'?'Món chay':'Món mặn');
  return pieces.length?`<div class="filter-summary">${esc(pieces.join(' · '))}<button data-action="clear-all">${icon('close',12)}Bỏ bộ lọc đang duyệt</button></div>`:'';
}

function reason(food, recommendation) {
  if (recommendation?.phuong_phap==='Lọc cộng tác') {
    const names=recommendation.bang_chung.map(b=>userName(b.ma_nguoi));
    return names.length===1 ? `${names[0]} có khẩu vị giống bạn đã thử` : `${names[0]} & ${names.length-1} người cùng gu đã thử`;
  }
  if(recommendation?.reason)return recommendation.reason;
  if (favouriteIds().includes(food.id) && state.view==='favourites') return 'Một món ngon trong danh sách của bạn';
  if (food.completed_orders) return `${food.completed_orders} đơn đã hoàn tất cho món này`;
  return 'Một hương vị mới đang chờ bạn khám phá';
}
function foodCard(food,index) {
  const rec=getRecommendation(food.id)||food.discoveryEvidence;
  const personalised=!!rec && rec.phuong_phap!=='Khám phá' && state.view==='discover';
  const badge=personalised?({'Lịch sử của bạn':'Theo gu của bạn','Khẩu vị':'Hợp khẩu vị','Lọc cộng tác':'Người cùng gu','Khám phá đa dạng':'Đổi vị hôm nay'})[rec.phuong_phap]:food.completed_orders?'Đã có người đặt':'Khám phá món';
  const saved=favouriteIds().includes(food.id);
  return `<article class="food-card" style="animation-delay:${Math.min(index,8)*.025}s">
    <div class="food-image-wrap"><button class="food-image-button" data-detail="${food.id}" aria-label="Xem ${esc(food.ten)}"><img class="food-image" src="${esc(food.image)}" alt="Ảnh minh họa ${esc(food.ten)}" ${index>2?'loading="lazy"':'fetchpriority="high"'} width="720" height="480"></button><span class="food-badge ${personalised?'personal':''}">${icon(personalised?'sparkles':'flame',11)}${esc(badge)}</span><button class="heart-button ${saved?'saved':''}" data-favourite="${food.id}" aria-label="${saved?'Bỏ yêu thích':'Yêu thích'} ${esc(food.ten)}" aria-pressed="${saved}">${icon('heart',15)}</button></div>
    <div class="food-body"><div class="food-kind"><span>${esc(food.nhom.toLocaleUpperCase('vi'))}</span><span class="food-orders">${icon('bag',10)}${food.sold_portions?'Đã bán '+food.sold_portions+' phần':'Chưa có đơn hoàn tất'}</span></div><button class="food-title" data-detail="${food.id}" title="${esc(food.ten)}">${esc(food.ten)}</button><div class="food-restaurant">${icon('store',11)}${esc(food.nha_hang)}<span class="food-tags"><span class="food-tag ${food.cay?'hot':''}">${food.nhom==='Đồ uống'?'Đồ uống':food.chay?'Chay':'Mặn'}${food.nhom!=='Đồ uống'?' · '+['Không cay','Cay nhẹ','Cay nhiều'][food.cay]:''}${food.available===0?' · Hết món':''}${food.is_open===0?' · Quán đóng cửa':''}</span></span></div>${ratingLink(food)}<div class="food-bottom"><div class="food-price">${money(food.gia)}<span>/ phần</span></div><button class="add-button" data-add="${food.id}" ${food.available===0||food.is_open===0?'disabled title="Món tạm ngừng bán hoặc quán đóng cửa"':''} aria-label="Thêm ${esc(food.ten)} vào giỏ">${icon('plus',19)}</button></div></div><button class="food-reason" data-ai-detail="${food.id}" aria-label="Vì sao gợi ý ${esc(food.ten)}">${icon(personalised?'sparkles':'info',12)}<span>${esc(reason(food,rec))}</span>${icon('chevron-down',11)}</button>
  </article>`;
}

function visibleFoods() {
  let foods=state.view==='discover' ? discoveryFeed() : state.foods.slice();
  if (state.view==='favourites') foods=foods.filter(f=>favouriteIds().includes(f.id));
  if (state.restaurantId) foods=foods.filter(f=>f.nha_hang_id===state.restaurantId);
  foods=foods.filter(f=>FoodEngine.matchesCategory(f,state.category)&&FoodEngine.matches(f,currentFoodFilters()));
  if (state.search.trim()) { const query=normalise(state.search.trim());foods=foods.filter(f=>normalise(`${f.ten} ${f.nha_hang} ${f.nhom}`).includes(query)); }
  if (state.sort==='price-asc') foods.sort((a,b)=>a.gia-b.gia || a.id-b.id);
  else if (state.sort==='price-desc') foods.sort((a,b)=>b.gia-a.gia || a.id-b.id);
  else if (state.view!=='discover') foods=diverseRank(foods,f=>1+Math.log1p(popularity(f.id)),foods.length);
  return foods;
}
function emptyHTML(title,message,action='menu',button='Khám phá thực đơn') { return `<div class="empty-state"><div class="empty-icon">${icon('bowl',32)}</div><h3>${esc(title)}</h3><p>${esc(message)}</p><button class="primary-button" data-view="${action}">${esc(button)}${icon('arrow-right',16)}</button></div>`; }

function tasteSnapshot(){
  const counts={},vector=state.dashboard?.matrix?.[state.userId]||{};
  for(const f of state.foods){const n=vector[f.id]||0;if(n>0)counts[f.nhom]=(counts[f.nhom]||0)+n;}
  const groups=Object.entries(counts).sort((a,b)=>b[1]-a[1]||categories.indexOf(a[0])-categories.indexOf(b[0]));
  return {groups,total:groups.reduce((n,g)=>n+g[1],0)};
}

function renderFoodPage() {
  const discovery=state.view==='discover';
  const favourites=state.view==='favourites';
  const restaurant=state.foods.find(f=>f.nha_hang_id===state.restaurantId);
  const foods=visibleFoods();
  const currentName=shortName(user().ten);
  const firstName=user().ten.split(/\s+/).at(-1);
  const taste=tasteSnapshot();
  let header='';
  if (discovery) {
    const neighbours=state.dashboard.neighbours.slice(0,3);
    const heroFood=foods[0]||state.foods.find(f=>isOrderable(f)&&FoodEngine.matches(f,currentFoodFilters())&&FoodEngine.matchesCategory(f,state.category));
    const insight=state.dashboard.recommendation_mode==='user_based'?'Từ lịch sử hoàn tất của người cùng gu,<br>tìm thêm món bạn chưa đặt.':taste.total?`Từ ${taste.total} lượt đặt của bạn,<br>tìm món mới trong những nhóm quen.`:neighbours.length?'Từ những người có khẩu vị giống bạn,<br>tìm thêm một món yêu thích.':'Bắt đầu từ khẩu vị và mức giá đã chọn.<br>Món phù hợp đang chờ bạn.';
    header=`<div class="page-intro"><div><div class="greeting">${icon('sun',14)}CHÀO ${esc(currentName.toLocaleUpperCase('vi'))}, BỮA NGON ĐANG ĐỢI</div><h1>Hôm nay, ăn gì nhỉ<span class="orange">?</span></h1></div><div class="intro-aside">${icon('leaf',13)}Một bữa ngon, một ngày vui.</div></div>
    <section class="hero-row" aria-label="Khám phá món ăn"><div class="hero">${heroFood?`<img class="hero-image" src="${esc(heroFood.image)}" alt="Ảnh minh họa ${esc(heroFood.ten)}" width="1100" height="720">`:''}<div class="hero-copy"><span class="hero-tag">${icon('sparkles',11)}MỖI NGÀY, MỘT CHÚT MỚI</span><h2>Bữa ngon đúng gu,<br>chẳng cần nghĩ lâu.</h2><p>Khám phá món ngon dành riêng cho bạn.<br>Chọn món, còn lại để FoodMatch lo.</p><button class="hero-button" data-action="scroll-foods">Khám phá ngay ${icon('arrow-right',13)}</button></div><div class="hero-circle"></div></div>
    <div class="insight-card"><span class="insight-label">${icon('sparkles',12)}KHÁM PHÁ CÙNG FOODMATCH</span><h2>Món mới,<br>hợp gu cũ.</h2><p>${insight}</p><div class="insight-bottom"><div class="avatar-stack">${neighbours.length?neighbours.map(n=>`<span class="mini-avatar" title="${esc(userName(n.ma_nguoi))}">${esc(initial(userName(n.ma_nguoi)))}</span>`).join(''):`<span class="mini-avatar">${icon(taste.total?'receipt':'users',14)}</span>`}</div><button class="insight-link" data-view="ai">Cách AI gợi ý ${icon('arrow-right',13)}</button></div></div></section>`;
  } else {
    const title=favourites?'Những món thương mến':restaurant?restaurant.nha_hang:state.search?'Tìm đúng món bạn thèm':'Một thế giới món ngon';
    const description=favourites?'Lưu lại một món ngon, để lần sau chẳng phải tìm xa.':restaurant?restaurant.dia_chi:state.search?`Kết quả cho “${state.search}” — có thể tìm món và nhà hàng không cần dấu.`:'Từ một bát phở quen đến một hương vị mới. Bữa ngon tiếp theo đang ở đây.';
    header=`<div class="inner-page-header">${restaurant?`<button class="back-link" data-view="restaurants">${icon('arrow-left',14)}Tất cả nhà hàng</button>`:`<span class="eyebrow">${favourites?'LƯU GIỮ KHẨU VỊ':'TÌM THÊM MỘT MÓN YÊU THÍCH'}</span>`}<h1>${esc(title)}<span class="orange">.</span></h1><p>${esc(description)}</p></div>`;
  }
  const cold=!Object.keys(state.dashboard.matrix[state.userId] || {}).length;
  const notice=discovery && cold ? `<div class="notice">${icon('sparkles',17)}<div>Bạn chưa có đơn hoàn tất để tính CF. Gợi ý khởi đầu dựa trên khẩu vị, bộ lọc và độ phổ biến trong dữ liệu ứng dụng; xen kẽ các nhóm để bạn dễ chọn.</div></div>`:'';
  const title=discovery?(state.dashboard.recommendation_mode==='user_based'?`Người cùng gu gợi ý cho ${firstName}`:'Khám phá theo khẩu vị'):favourites?'Danh sách yêu thích':restaurant?'Thực đơn nhà hàng':'Chọn món bạn thích';
  const subtitle=discovery?(state.dashboard.recommendation_mode==='user_based'?'Xếp theo điểm User-based CF từ lịch sử hoàn tất của người tương đồng; hiển thị 18 món đầu, xem thêm mỗi lần 12 món.':'Chưa đủ bằng chứng User-based CF phù hợp. Đây là gợi ý dự phòng theo khẩu vị và dữ liệu hoàn tất, có nhãn riêng.'):favourites?'Nhấn trái tim để thêm hoặc bỏ món đã lưu.':`${foods.length} món ngon đang chờ bạn khám phá.`;
  const profile=discovery&&taste.total?`<div class="taste-profile"><div><span class="eyebrow">GU CỦA BẠN TỪ ${taste.total} LƯỢT ĐẶT</span><p>Những nhóm món bạn thường chọn</p></div><div class="taste-tags">${taste.groups.slice(0,3).map(([name,n])=>`<span>${icon(categoryIcons[name],15)}${esc(name)}<b>${n} lượt</b></span>`).join('')}</div></div>`:'';
  const noFoods=favourites?emptyHTML('Chưa có món nào được lưu','Nhấn trái tim ở món bạn thích. Những món yêu thích sẽ xuất hiện tại đây.'):discovery?emptyHTML('Chưa có gợi ý mới đủ phù hợp','Các món còn lại chưa đủ cơ sở gợi ý hoặc không khớp bộ lọc. Bạn có thể xem thực đơn để chọn món khác hay đặt lại món quen.','menu','Xem thực đơn'):emptyHTML('Chưa tìm thấy món phù hợp','Thử đổi nhóm món, nới mức giá hoặc tìm một từ khóa khác nhé.');
  const shown=foods.slice(0,state.pageSize);
  const footer=(foods.length>state.pageSize?`<div class="load-more-row"><button class="load-more" data-action="load-more">Xem thêm ${Math.min(12,foods.length-state.pageSize)} món (${foods.length-state.pageSize} món còn lại) ${icon('chevron-down',15)}</button></div>`:'')+(discovery?`<div class="discovery-footer"><div><strong>Chưa biết chọn món nào?</strong><p>Chọn bữa ăn và ngân sách để nhận 3 lựa chọn phù hợp.</p></div><button class="filter-button" data-choose-meal="1">Chọn giúp mình</button></div>`:'');
  return `${header}${discovery?interestSection():''}${profile}${categoriesHTML()}${notice}<section id="foodSection"><div class="section-heading"><div><h2>${discovery?icon('sparkles',21):favourites?icon('heart',20):icon('bowl',20)}${esc(title)}<span class="results-count">(${foods.length})</span></h2><p class="section-subtitle">${esc(subtitle)}</p></div>${controlsHTML()}</div>${filtersHTML()}<div class="food-grid">${foods.length?shown.map(foodCard).join(''):noFoods}</div>${footer}</section>${discovery?fallbackSection():''}`;
}

function renderRestaurants() {
  const eligible=state.foods.filter(f=>FoodEngine.matches(f,currentFoodFilters()));
  const allRestaurants=[...new Map(eligible.map(f=>[f.nha_hang_id,f])).values()];
  const restaurants=state.restaurantKind==='milk-tea'?allRestaurants.filter(r=>r.loai_quan==='Trà sữa'):allRestaurants;
  return `<div class="inner-page-header"><span class="eyebrow">TỪ NHỮNG CĂN BẾP QUEN</span><h1>Ghé một quán ngon<span class="orange">.</span></h1><p>${allRestaurants.length} quán có món phù hợp bộ lọc hiện tại. Chọn một nhà hàng để xem thực đơn của quán.</p></div><div class="restaurant-filterbar"><button data-restaurant-kind="all" class="${state.restaurantKind!=='milk-tea'?'active':''}">Tất cả ${allRestaurants.length} quán</button><button data-restaurant-kind="milk-tea" class="${state.restaurantKind==='milk-tea'?'active':''}">Trà sữa</button></div><div class="restaurant-grid">${restaurants.map(r=>{
    const foods=eligible.filter(f=>f.nha_hang_id===r.nha_hang_id);
    return `<button class="restaurant-card" data-restaurant="${r.nha_hang_id}"><div class="restaurant-cover"><img src="${esc(r.image)}" alt="Món ăn minh họa tại ${esc(r.nha_hang)}" loading="lazy"><span class="restaurant-type">${esc(r.loai_quan)}${r.is_open===0?' · Tạm đóng cửa':''}</span><span class="restaurant-label">${esc(r.nha_hang)}</span></div><div class="restaurant-body"><div class="restaurant-address">${icon('pin',13)}${esc(r.dia_chi)}</div><div class="restaurant-bottom"><span>${foods.length} món <span class="footer-separator">/</span> Từ <strong>${money(Math.min(...foods.map(f=>f.gia)))}</strong></span>${icon('arrow-right',18)}</div></div></button>`;
  }).join('')}</div>`;
}

function statCard(symbol,label,value) {return `<div class="stat-card"><div class="stat-icon">${icon(symbol,20)}</div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;}
function orderStatusLabel(status){return ({pending:'Chờ nhà hàng xác nhận',accepted:'Đã xác nhận',preparing:'Đang chuẩn bị',ready:'Quán đã chuẩn bị xong',completed:'Hoàn tất',cancelled:'Đã hủy'})[status]||'Đang cập nhật';}
function renderHistory() {
 const history=state.dashboard.history;
 const sum=history.filter(o=>o.status==='completed').reduce((n,o)=>n+o.thanh_tien,0);
 const receipts=new Set(history.map(o=>o.receipt_id||o.id)).size;
 const completed=new Set(history.filter(o=>o.status==='completed').map(o=>o.receipt_id||o.id)).size;
 return `<div class="inner-page-header"><span class="eyebrow">THEO DÕI BỮA ĂN CỦA BẠN</span><h1>Lịch sử đặt món<span class="orange">.</span></h1><p>Bấm tên món để xem chi tiết. Khi quán chuẩn bị xong, xác nhận đã nhận món để mở đánh giá.</p></div><div class="stats-row">${statCard('receipt','Tổng số đơn',receipts)}${statCard('check','Đơn hoàn tất',completed)}${statCard('wallet','Tiền đơn hoàn tất',money(sum))}</div>${history.length?`<div class="panel"><div class="panel-title"><h3>Lịch sử đặt món</h3><button class="export-button" data-action="export">${icon('download',14)}Xuất CSV</button></div><p class="activity-note">Một đơn có thể chứa nhiều món. Nút Xem đơn mở tiến trình và toàn bộ món của cùng nhà hàng. Chỉ đơn hoàn tất mới viết đánh giá được.</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Món ăn</th><th>Ngày đặt</th><th>Số phần</th><th>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${history.map(o=>{
  const f=foodById(o.mon_an_id),date=new Date(o.ngay_dat),demo=String(o.receipt_id||'').startsWith('demo-');
  return `<tr><td><button class="history-dish history-dish-button" data-detail="${o.mon_an_id}" aria-label="Xem ${esc(o.mon_an)}"><img src="${esc(f?.image||'assets/food-01.webp')}" alt="" loading="lazy"><span><strong>${esc(o.mon_an)}</strong><small>${esc(o.nha_hang)} · #${esc(String(o.receipt_id||o.id).slice(0,8))}</small></span></button></td><td>${esc(date.toLocaleDateString('vi-VN'))}<small>${esc(date.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}))}</small></td><td>${o.so_luong}</td><td class="money-cell">${money(o.thanh_tien)}</td><td><span class="pill order-status-${esc(o.status)}">${icon(o.status==='completed'?'check':o.status==='cancelled'?'close':'clock',10)}${esc(orderStatusLabel(o.status))}</span></td><td><div class="history-actions"><button class="filter-button" data-open-order="${esc(o.receipt_id)}">Xem đơn</button>${o.status==='ready'&&!demo?`<button class="primary-button" data-receive-order="${esc(o.receipt_id)}">Đã nhận món</button>`:''}<button class="review-history-link" data-review-detail="${o.mon_an_id}">${o.status==='completed'&&!demo?'Viết / xem đánh giá':'Xem món / đánh giá'}</button>${o.status!=='completed'&&!demo?'<small>Đánh giá mở khi đơn hoàn tất</small>':''}</div></td></tr>`;
 }).join('')}</tbody></table></div></div>`:emptyHTML('Bạn chưa có đơn nào','Chọn một món để bắt đầu.','menu','Xem thực đơn')}`;
}

function aiOverview(){
 const f=foodById(state.aiFoodId)||interestedFood();const rec=f?getRecommendation(f.id):null;
 return `<section class="ai-overview"><span class="eyebrow">CÁCH GỢI Ý HOẠT ĐỘNG</span><h2>Từ món bạn quan tâm đến bữa ăn tiếp theo</h2><ol><li><strong>Xem một món:</strong> Khám phá lưu món vừa xem và tìm lựa chọn cùng nhóm, gần tên món và mức giá. Xem món không được tính thành lượt đặt.</li><li><strong>Chọn khẩu vị:</strong> Bộ lọc giá, cay và chay/mặn tiếp tục áp dụng cho các món tương tự.</li><li><strong>Đặt món:</strong> Đơn hoàn tất mới tạo tín hiệu sở thích. Mỗi đơn hoàn tất chứa món tính một lượt. So sánh toàn bộ vector lượt đặt giữa người dùng bằng Cosine, chọn 5 người gần nhất và tính điểm món bằng trung bình có trọng số.</li><li><strong>Nhận gợi ý:</strong> Mục “Vì bạn vừa xem” là gợi ý theo thuộc tính món. Mục “Người cùng gu” chỉ xếp theo điểm User-based CF. Khi thiếu dữ liệu, gợi ý khẩu vị/đổi vị được ghi riêng, không gọi là CF. Mỗi món đều ghi tên quán để bạn chọn nơi đặt.</li></ol>${f?`<div class="ai-selected"><h3>Đang tìm hiểu: ${esc(f.ten)}</h3><p>Nhà hàng: ${esc(f.nha_hang)}</p><p>${esc(rec?.reason||'Bạn đã chọn xem món này. Các món tương tự được tìm trong cùng nhóm và xếp theo tên món, giá, chế độ ăn, độ cay.')}</p>${rec?`<p>Phương pháp cá nhân hóa: <strong>${esc(rec.phuong_phap)}</strong>. Điểm cơ sở: ${Number(rec.diem).toFixed(4)}. Điểm không phải tỷ lệ chính xác hay xác suất thích.</p>`:''}<button class="filter-button" data-detail="${f.id}">Quay lại xem món</button></div>`:''}</section>`;
}
function myOrderActivity(){
 const grouped=new Map();
 for(const o of state.dashboard.history){
  if(o.status==='cancelled'||String(o.receipt_id||'').startsWith('demo-'))continue;
  if(!grouped.has(o.mon_an_id))grouped.set(o.mon_an_id,{id:o.mon_an_id,ten:o.mon_an,nha_hang:o.nha_hang,orders:new Set(),portions:0,completed:0,last:o.ngay_dat});
  const item=grouped.get(o.mon_an_id);item.orders.add(o.receipt_id||o.id);item.portions+=o.so_luong;
  if(o.status==='completed')item.completed+=o.so_luong;
  if(o.ngay_dat>item.last)item.last=o.ngay_dat;
 }
 return [...grouped.values()].sort((a,b)=>b.last.localeCompare(a.last));
}
function renderAI(){
 const activity=myOrderActivity(),recommendations=state.dashboard.recommendations.slice(0,6);
 const selected=getRecommendation(Number(state.aiFoodId));
 const calculation=selected?.phuong_phap==='Lọc cộng tác'?`<div class="panel"><h3>Phép tính cho ${esc(selected.ten)}</h3><p>${esc(selected.reason)}</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Người cùng gu</th><th>Cosine gốc / món chung</th><th>Trọng số Cosine</th><th>Lượt đặt dùng tính điểm</th><th>Đóng góp</th></tr></thead><tbody>${selected.bang_chung.map(n=>`<tr><td>${esc(userName(n.ma_nguoi))}</td><td>${n.cosine_goc.toFixed(4)} / ${n.so_mon_chung} món</td><td>${n.tuong_dong.toFixed(4)}</td><td>${n.gia_tri_tinh_diem.toFixed(0)} đơn</td><td>${n.dong_gop.toFixed(4)}</td></tr>`).join('')}</tbody></table></div><p>Điểm = ${selected.bang_chung.reduce((sum,n)=>sum+n.dong_gop,0).toFixed(4)} / ${selected.tong_tuong_dong.toFixed(4)} = ${selected.diem.toFixed(4)}.</p></div>`:'';
 return `<section class="panel"><div class="panel-title"><h3>Món bạn đã đặt</h3><span class="pill">${activity.length} món có đơn chưa hủy</span></div><p class="activity-note">Mỗi đơn chứa món tính 1 lượt, dù mua nhiều phần. Ví dụ: một đơn có 3 phần cơm = 1 lượt đặt và 3 phần. Đơn đang xử lý chỉ xuất hiện để theo dõi; chưa dùng tính CF. Phần hoàn tất được ghi ở cột riêng.</p>${activity.length?`<div class="table-scroll"><table class="data-table activity-table"><thead><tr><th>Món ăn / nhà hàng</th><th>Lượt đặt chưa hủy</th><th>Số phần đã đặt</th><th>Số phần hoàn tất</th><th>Đặt gần nhất</th></tr></thead><tbody>${activity.map(o=>`<tr><td><button class="score-link" data-detail="${o.id}">${esc(o.ten)}</button><small>${esc(o.nha_hang)}</small></td><td>${o.orders.size}</td><td>${o.portions}</td><td>${o.completed}</td><td>${esc(new Date(o.last).toLocaleDateString('vi-VN'))}</td></tr>`).join('')}</tbody></table></div>`:'<div class="activity-empty"><p>Bạn chưa có đơn món nào đang xử lý hoặc hoàn tất.</p><button class="filter-button" data-view="menu">Chọn món đầu tiên</button></div>'}</section>${calculation}<details class="panel ai-technical"><summary>Chi tiết thuật toán gợi ý</summary><p>Vector CF đếm số đơn hoàn tất chứa từng món. Đơn chờ, đơn hủy, xem món và thêm giỏ không tăng số lượt. Mỗi đơn 3 phần vẫn chỉ tạo 1 lượt cho món đó. Dữ liệu huấn luyện có thể gồm bộ lịch sử mô phỏng; doanh số và đánh giá hiển thị trên thẻ món chỉ tính đơn hoàn tất ngoài bộ mô phỏng.</p><div class="formula">r(u,i) = số đơn hoàn tất của người u có chứa món i; sim(u,v) = Cosine(r(u),r(v))</div><div class="formula">Điểm(u,i) = Σ sim(u,v) × r(v,i) / Σ sim(u,v)</div><p>Chọn 5 hàng xóm có Cosine cao nhất. So sánh trên toàn bộ món, không chỉ phần giao nhau. Mẫu số dùng tất cả hàng xóm đã chọn, kể cả người chưa đặt món đang xét. Chỉ xếp hạng món chưa đặt có bằng chứng từ hàng xóm. Giá/chay/cay chỉ là điều kiện lọc, không cộng vào điểm CF. Sao đánh giá được hiển thị riêng, không trộn vào số lần đặt.</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Món gợi ý</th><th>Cơ sở</th><th>Điểm cơ sở</th><th></th></tr></thead><tbody>${recommendations.map(r=>`<tr><td>${esc(r.ten)}<small>${esc(r.nha_hang)}</small></td><td>${esc(r.phuong_phap)}</td><td>${r.phuong_phap==='Lọc cộng tác'?r.diem.toFixed(4):r.phuong_phap==='Lịch sử của bạn'?r.diem_lich_su.toFixed(4):'Khẩu vị'}</td><td><button class="text-link" data-ai-detail="${r.id}">Xem lý do</button></td></tr>`).join('')||'<tr><td colspan="4">Chưa có gợi ý theo lịch sử phù hợp.</td></tr>'}</tbody></table></div></details>`;
}

function updateHeader() {
  $('#profileName').textContent=shortName(user().ten);
  $('#profileAvatar').textContent=initial(user().ten);
  $('#favouriteCount').textContent=favouriteIds().length;
  const count=cartItems().reduce((n,item)=>n+item.quantity,0);
  $('#floatingCartTotal').textContent=money(cartItems().reduce((n,i)=>n+i.food.gia*i.quantity,0));
  $('#cartCount').textContent=count;$('#cartCount').hidden=count===0;
  $('#cartButton').setAttribute('aria-label',`Mở giỏ món, ${count} phần`);
  document.querySelectorAll('.nav-item[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===state.view);if(el.dataset.view===state.view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
}
function render() {
  $('#merchantLink').hidden=!isFlask||!['admin','merchant'].includes(user()?.role);
  if (!state.dashboard) return;
  updateHeader();
  $('#pageContent').innerHTML=state.view==='history'?renderHistory():state.view==='ai'?aiOverview()+renderAI():state.view==='restaurants'?renderRestaurants():renderFoodPage();
  document.title=`${({discover:'Hôm nay ăn gì?',menu:'Thực đơn',favourites:'Yêu thích',history:'Lịch sử đặt món',restaurants:'Nhà hàng',ai:'Cách AI gợi ý'})[state.view]} — FoodMatch`;
}

function interestKey(){return 'foodmatch.interest.v1.'+(isFlask?'flask.':'preview.')+state.userId;}
function interestedFood(){return foodById(Number(readStorage(interestKey())));}
function similarFoods(source,limit=8){
 if(!source)return [];
 const vegetarianSource=source.nhom!=='Đồ uống'&&!!source.chay;
 const tokens=f=>new Set(normalise(f.ten).split(/\s+/).filter(w=>w.length>1)),a=tokens(source);
 const current=currentFoodFilters();
 const prefs={...current,diet:vegetarianSource&&current.diet==='any'?'vegetarian':current.diet};
 return state.foods.filter(f=>f.id!==source.id&&isOrderable(f)&&FoodEngine.matches(f,prefs)&&
   (vegetarianSource?(!!f.chay&&f.nhom!=='Đồ uống'):f.nhom===source.nhom))
  .map(f=>{const b=tokens(f),overlap=[...a].filter(w=>b.has(w)).length;
   return {food:f,score:4*overlap/new Set([...a,...b]).size+(f.nhom===source.nhom?2:0)+
    1-Math.abs(f.gia-source.gia)/Math.max(f.gia,source.gia)+(f.cay===source.cay?.25:0)};})
  .sort((a,b)=>b.score-a.score||a.food.id-b.food.id).slice(0,limit).map(x=>x.food);
}

function interestSection(){
 const f=interestedFood();if(!f)return '';
 const foods=similarFoods(f,8);
 return `<section class="interest-section"><div class="section-heading"><div><span class="eyebrow">VÌ BẠN VỪA XEM</span><h2>${esc(f.ten)}</h2><p class="section-subtitle">Từ ${esc(f.nha_hang)} · Những lựa chọn tương tự theo tên món, nhóm và mức giá.</p></div><button class="filter-button" data-clear-interest="1">Xóa quan tâm</button></div><div class="food-grid">${foods.length?foods.map(foodCard).join(''):'<p>Chưa có món tương tự phù hợp bộ lọc hiện tại.</p>'}</div></section>`;
}
function openDetail(id,options={}) {
  const food=foodById(id);if(!food)return;
  state.detailFoodId=food.id;
  const descriptions={'Cơm':'Một bữa ăn thân quen và đủ đầy, dành cho những lúc muốn nạp lại năng lượng.','Bún / phở':'Một tô ngon với những hương vị Việt quen thuộc. Thêm chút mới mẻ cho bữa ăn hôm nay.','Món gà':'Một lựa chọn đậm đà, thích hợp cho bữa chính hoặc chia sẻ cùng bạn bè.','Món Âu':'Đổi vị một chút với một món ăn mang cảm hứng từ căn bếp phương Tây.','Ăn vặt':'Dành cho lúc thèm một chút vui miệng giữa những bữa ăn.','Món Hàn':'Khám phá những hương vị quen thuộc từ căn bếp Hàn Quốc.','Món chay':'Một bữa ăn từ thực vật, nhẹ nhàng mà vẫn đầy hương vị.','Đồ uống':'Thêm một thức uống để bữa ăn trọn vẹn hơn.'};
  $('#detailContent').innerHTML=`<div class="detail-image-wrap"><img src="${esc(food.image)}" alt="Ảnh minh họa ${esc(food.ten)}"><button class="icon-button" data-close="detailDialog" aria-label="Đóng chi tiết">${icon('close',19)}</button></div><div class="detail-body"><span class="eyebrow">${esc(food.nhom.toLocaleUpperCase('vi'))}</span><div class="detail-heading"><h2>${esc(food.ten)}</h2><strong class="detail-price">${money(food.gia)}</strong></div><div class="detail-meta">${icon('store',14)}<button class="restaurant-link" data-open-restaurant="${food.nha_hang_id}">${esc(food.nha_hang)}</button><span>·</span>${salesText(food)}</div><div id="detailRating">${ratingLink(food,true)}</div><p class="detail-description">${esc(descriptions[food.nhom])}</p><div class="detail-actions"><div class="quantity-input"><button data-action="detail-minus" aria-label="Giảm số phần">${icon('minus',14)}</button><input id="detailQuantity" type="number" value="1" min="1" max="20" aria-label="Số phần"><button data-action="detail-plus" aria-label="Tăng số phần">${icon('plus',14)}</button></div><button class="primary-button" data-detail-add="${food.id}" ${food.available===0||food.is_open===0?'disabled':''}>${icon('bag',17)}Thêm vào giỏ món</button></div></div>`;
  $('#detailContent').insertAdjacentHTML('beforeend',`<section id="dishReviews" class="dish-reviews" aria-labelledby="reviewsTitle" aria-busy="true"><h3 id="reviewsTitle">Đánh giá từ người đã đặt</h3><p role="status">Đang tải đánh giá…</p></section>`);
  writeStorage(interestKey(),String(food.id));
  const related=similarFoods(food,6);
  $('#detailContent').insertAdjacentHTML('beforeend',`<section class="detail-related"><div class="section-heading"><div><h3>Món tương tự bạn có thể thích</h3><p>${food.chay&&food.nhom!=='Đồ uống'?'Chỉ gợi ý món chay, ưu tiên nhóm và mức giá gần nhau.':`Cùng nhóm ${esc(food.nhom)}, ưu tiên tên món và giá gần nhau.`}</p></div></div><div class="related-grid">${related.length?related.map(f=>`<article class="related-card"><button data-detail="${f.id}" class="related-open"><img src="${esc(f.image)}" alt="${esc(f.ten)}"><strong>${esc(f.ten)}</strong></button><button class="restaurant-link" data-open-restaurant="${f.nha_hang_id}">${esc(f.nha_hang)}</button>${ratingLink(f)}<div class="related-bottom"><b>${money(f.gia)}</b><button class="add-button" data-add="${f.id}" aria-label="Thêm ${esc(f.ten)} vào giỏ">${icon('plus',17)}</button></div></article>`).join(''):'<p>Chưa có món tương tự phù hợp bộ lọc.</p>'}</div><div class="related-links"><button class="filter-button" data-discover-interest="1">Xem gợi ý trong Khám phá</button><button class="text-link" data-ai-detail="${food.id}">Cách AI chọn các món này</button></div></section>`);
  if(state.view==='discover')render();
  showDialog('detailDialog');$('#detailDialog').scrollTop=0;
  loadDishReviews(food.id,1,!!options.reviewFocus);
}

function addToCart(id,quantity=1) {
  const food=foodById(id);if(!food)return;
  if(food.available===0||food.is_open===0){toast('Món tạm hết hoặc nhà hàng đang đóng cửa.',true);return;}
  if(!Number.isInteger(quantity)||quantity<1||quantity>20){toast('Mỗi món cần từ 1 đến 20 phần.',true);return;}
  const cart=state.carts[state.userId] ||= {};
  if((cart[id]||0)+quantity>20){toast('Mỗi món chỉ được có tối đa 20 phần trong giỏ.',true);return;}
  cart[id]=(cart[id]||0)+quantity;saveCart();closeDialog('detailDialog');toast(`Đã thêm ${quantity} phần ${food.ten} vào giỏ.`);
}
function saveCart(){writeStorage(cartStorageKey,JSON.stringify(state.carts));updateHeader();if($('#cartDialog').open)renderCart();}
function renderCart() {
  const items=cartItems();
  $('#cartContent').innerHTML=items.length?items.map(({food,quantity})=>`<div class="cart-item"><img src="${esc(food.image)}" alt="${esc(food.ten)}"><div class="cart-item-body"><h3>${esc(food.ten)}</h3><p>${esc(food.nha_hang)}</p><div class="cart-item-bottom"><strong>${money(food.gia)}</strong><div class="cart-quantity"><button data-cart-quantity="${food.id}" data-delta="-1" aria-label="Giảm ${esc(food.ten)}">${icon('minus',12)}</button><span>${quantity}</span><button data-cart-quantity="${food.id}" data-delta="1" aria-label="Tăng ${esc(food.ten)}">${icon('plus',12)}</button></div></div></div><button class="remove-item" data-remove="${food.id}" aria-label="Xóa ${esc(food.ten)} khỏi giỏ">${icon('trash',15)}</button></div>`).join(''):`<div class="cart-empty"><div class="empty-icon">${icon('bag',30)}</div><h3>Chưa có món ngon nào</h3><p>Chọn vài món bạn thích.<br>Một bữa ngon sắp được bắt đầu.</p><button class="primary-button" data-action="cart-browse">Khám phá thực đơn ${icon('arrow-right',15)}</button></div>`;
  const total=items.reduce((sum,i)=>sum+i.food.gia*i.quantity,0);
  $('#cartSummary').innerHTML=items.length?`<div class="cart-total"><span>Tổng tiền món</span><strong>${money(total)}</strong></div><button class="primary-button" id="checkoutButton" ${state.ordering?'disabled':''}>${state.ordering?'Đang lưu đơn…':'Xác nhận đặt món'} ${icon('arrow-right',17)}</button><p>Gửi đơn thử nghiệm tới nhà hàng cho <strong>${esc(user().ten)}</strong>.<br>Không thanh toán và không giao hàng thực tế.</p>`:`<p>Thêm món bằng nút dấu cộng trên thực đơn.</p>`;
}
function renderProfiles(){
  $('#accountSummary').innerHTML=`${esc(user().ten)}<small>${esc(user().email||'')}</small>`;
}
function openFilters(){
  $('#minPrice').value=state.minPrice;$('#maxPrice').value=state.maxPrice??'';
  $('#filterSpice').value=state.spice;$('#filterDiet').value=state.diet;showDialog('filterDialog');
}

function exportHistory(){
  if(!state.dashboard.history.length){toast('Bạn chưa có lịch sử để xuất.');return;}
  if(isFlask){const a=document.createElement('a');a.href='/api/me/history.csv';a.download=`lich_su_U${state.userId}.csv`;a.click();return;}
  const csvCell=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const rows=[['Mã đơn','Ngày đặt','Món ăn','Nhà hàng','Số phần','Đơn giá','Thành tiền'],...state.dashboard.history.map(o=>[o.id,o.ngay_dat,o.mon_an,o.nha_hang,o.so_luong,o.don_gia,o.thanh_tien])];
  const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`lich_su_U${state.userId}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
}

async function checkout(){
  if(state.ordering)return;const items=cartItems().map(({dish_id,quantity})=>({dish_id,quantity}));if(!items.length)return;
  state.ordering=true;renderCart();const userId=state.userId;
  try { await api.checkout(userId,items);state.carts[userId]={};saveCart();closeDialog('cartDialog');await refreshDashboard();toast('Đã gửi đơn tới nhà hàng. Xem trạng thái tại Lịch sử đặt món.'); }
  catch(e){toast(e.message,true);}
  finally{state.ordering=false;if($('#cartDialog').open)renderCart();}
}

// Một bộ xử lý sự kiện cho các thành phần được tạo bằng JavaScript.
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  try{
    if(button.dataset.openOrder){await openOrder(button.dataset.openOrder);return;}
    if(button.dataset.receiveOrder){await confirmReceived(button.dataset.receiveOrder,button);return;}
    if(button.dataset.goHistory){closeDialog('detailDialog');navigate('history');return;}
    if(button.dataset.reviewDetail){closeDialog('orderDialog');openDetail(Number(button.dataset.reviewDetail),{reviewFocus:true});return;}
    if(button.dataset.scrollReviews){$('#dishReviews')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(button.dataset.reviewPage){await loadDishReviews(state.detailFoodId,Number(button.dataset.reviewPage),true);return;}
    if(button.dataset.retryReviews){await loadDishReviews(state.detailFoodId);return;}
    if(button.dataset.moreFallback){state.fallbackPage=(state.fallbackPage||12)+12;render();return;}
    if(button.dataset.chooseMeal){openMealChooser();return;}
    if(button.dataset.openRestaurant){closeDialog('detailDialog');state.view='menu';state.restaurantId=Number(button.dataset.openRestaurant);state.category='Tất cả';state.pageSize=18;state.search='';$('#searchInput').value='';await refreshDashboard();return;}
    if(button.dataset.discoverInterest){closeDialog('detailDialog');navigate('discover');return;}
    if(button.dataset.clearInterest){writeStorage(interestKey(),'');render();return;}
    if(button.dataset.aiDetail){state.aiFoodId=Number(button.dataset.aiDetail);closeDialog('detailDialog');navigate('ai');return;}
    if(button.dataset.close){closeDialog(button.dataset.close);return;}
    if(button.dataset.view){navigate(button.dataset.view);return;}
    if(button.dataset.category){state.category=button.dataset.category;state.pageSize=18;await refreshDashboard();return;}
    if(button.dataset.detail){closeDialog('orderDialog');openDetail(Number(button.dataset.detail));return;}
    if(button.dataset.add){addToCart(Number(button.dataset.add));return;}
    if(button.dataset.detailAdd){addToCart(Number(button.dataset.detailAdd),Number($('#detailQuantity').value));return;}
    if(button.dataset.favourite){
      const id=Number(button.dataset.favourite);if(state.pendingFavourites.has(id))return;state.pendingFavourites.add(id);button.disabled=true;
      try{const result=await api.favourite(state.userId,id);state.favourites=result.favourites;render();}
      finally{state.pendingFavourites.delete(id);button.disabled=false;}
      return;
    }
    if(button.dataset.restaurantKind){state.restaurantKind=button.dataset.restaurantKind;render();return;}
    if(button.dataset.restaurant){state.view='menu';state.restaurantId=Number(button.dataset.restaurant);state.pageSize=18;state.category='Tất cả';state.search='';$('#searchInput').value='';await refreshDashboard();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(button.dataset.cartQuantity){const id=Number(button.dataset.cartQuantity);const cart=state.carts[state.userId]||{};const qty=(cart[id]||0)+Number(button.dataset.delta);if(qty>20){toast('Mỗi món tối đa 20 phần.',true);return;}if(qty<=0)delete cart[id];else cart[id]=qty;saveCart();return;}
    if(button.dataset.remove){delete state.carts[state.userId][Number(button.dataset.remove)];saveCart();return;}
    if(Object.hasOwn(button.dataset,'price')){$('#maxPrice').value=button.dataset.price;return;}
    const action=button.dataset.action;
    if(action==='filter'){openFilters();return;}
    if(action==='scroll-foods'){$('#foodSection').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(action==='load-more'){const before=window.scrollY;state.pageSize+=12;render();window.scrollTo(0,before);return;}
    if(action==='clear-all'){state.minPrice=0;state.maxPrice=null;state.spice='any';state.diet=state.preferences.diet;state.category='Tất cả';state.pageSize=18;await refreshDashboard();return;}
    if(action==='export'){exportHistory();return;}
    if(action==='cart-browse'){closeDialog('cartDialog');navigate('menu');return;}
    if(action==='detail-minus'||action==='detail-plus'){const input=$('#detailQuantity');input.value=Math.max(1,Math.min(20,(Number(input.value)||1)+(action==='detail-plus'?1:-1)));return;}
    if(button.id==='checkoutButton'){await checkout();return;}
  }catch(e){toast(e.message,true);}
});

$('#cartButton').addEventListener('click',()=>{if(!state.users.length)return;renderCart();showDialog('cartDialog');});
$('#profileButton').addEventListener('click',()=>{if(!state.users.length)return;renderProfiles();showDialog('profileDialog');});
$('#surpriseButton').addEventListener('click',openMealChooser);
$('#brandLink').addEventListener('click',event=>{event.preventDefault();if(state.users.length)navigate('discover');});
$('#mobileMenu').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#sidebarBackdrop').classList.toggle('open',open);$('#mobileMenu').setAttribute('aria-expanded',String(open));});
$('#sidebarBackdrop').addEventListener('click',hideSidebar);
document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('#searchInput').focus();}if(event.key==='Escape')hideSidebar();});

let searchTimer;
$('#searchInput').addEventListener('input',event=>{
  clearTimeout(searchTimer);const value=event.target.value;
  searchTimer=setTimeout(()=>{if(!state.dashboard)return;state.search=value;state.view='menu';state.restaurantId=null;state.category='Tất cả';state.pageSize=18;refreshDashboard().catch(e=>toast(e.message,true));},180);
});
document.addEventListener('change',event=>{if(event.target.id==='sortSelect'){state.sort=event.target.value;render();}});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog||dialog.id==='preferencesDialog'&&state.preferencesRequired)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
// ĐĂNG NHẬP / ĐĂNG KÝ: chỉ API Flask lưu tài khoản và băm mật khẩu.
let authMode='login';
function setAuthMode(mode){
  authMode=mode;
  const registering=mode==='register';
  $('#authNameRow').hidden=!registering;$('#authConfirmRow').hidden=!registering;
  $('#authName').required=registering;$('#authConfirm').required=registering;
  $('#authPassword').autocomplete=registering?'new-password':'current-password';
  $('#authTitle').innerHTML=registering?'Bữa ngon bắt đầu từ bạn<span class="orange">.</span>':'Mừng bạn trở lại<span class="orange">.</span>';
  $('#authSubtitle').textContent=registering?'Tạo tài khoản để lưu khẩu vị và những món bạn yêu thích.':'Đăng nhập để tiếp tục những bữa ngon của bạn.';
  $('#authSubmit').innerHTML=(registering?'Tạo tài khoản':'Đăng nhập')+icon('arrow-right',17);
  $('#authError').textContent='';
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode));
}
function showAuth(message=''){
  loadSequence++;reviewSequence++;orderSequence++;state.detailFoodId=null;state.orderId=null;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  hideSidebar();document.body.classList.add('auth-screen');
  $('#merchantLink').hidden=true;
  state.authenticated=false;state.users=[];state.favourites={};state.dashboard=null;state.userId=null;
  $('#pageContent').innerHTML='';$('#cartContent').innerHTML='';$('#cartSummary').innerHTML='';$('#accountSummary').innerHTML='';
  $('#authForm').reset();setAuthMode('login');$('#authError').textContent=message;
  $('#authPreviewNotice').hidden=isFlask;
  $('#authForm').querySelectorAll('input').forEach(i=>i.disabled=!isFlask);
  $('#authSubmit').disabled=!isFlask;
  document.title='Đăng nhập / Đăng ký — FoodMatch';window.scrollTo(0,0);
}
function applySavedPreferences(){
  state.minPrice=state.preferences.min_price;state.maxPrice=state.preferences.max_price;
  state.spice=state.preferences.spice;state.diet=state.preferences.diet;
}
async function enterApp(){
  const data=await api.init();Object.assign(state,data);state.userId=data.users[0].id;
  state.preferences=checkedPreferences(data.preferences);state.authenticated=isFlask;
  state.view='discover';state.category='Tất cả';state.search='';state.restaurantId=null;state.pageSize=18;
  $('#searchInput').value='';applySavedPreferences();document.body.classList.remove('auth-screen');
  await refreshDashboard();
  if(!user().onboarded)openPreferences(true);
}
function openPreferences(required=false){
  closeDialog('profileDialog');state.preferencesRequired=required;const p=state.preferences;
  $('#preferencesCancel').hidden=required;$('#skipPreferences').textContent=required?'Để sau, khám phá tất cả':'Đặt về khẩu vị bất kỳ';
  $('#prefMinPrice').value=p.min_price;$('#prefMaxPrice').value=p.max_price??'';
  document.querySelectorAll('input[name="prefSpice"]').forEach(i=>i.checked=i.value===p.spice);
  document.querySelectorAll('input[name="prefDiet"]').forEach(i=>i.checked=i.value===p.diet);
  $('#preferenceCategories').innerHTML=categories.filter(c=>c!=='Tất cả').map(c=>`<label class="preference-category"><input type="checkbox" name="prefCategory" value="${esc(c)}" ${p.categories.includes(c)?'checked':''}><span>${esc(c==='Bún / phở'?'Bún & phở':c)}</span></label>`).join('');
  $('#preferencesError').textContent='';showDialog('preferencesDialog');
}
async function savePreferences(prefs){
  prefs=checkedPreferences(prefs);const result=await api.preferences(prefs);
  state.preferences=result.preferences;state.users=[result.user];state.preferencesRequired=false;applySavedPreferences();
  state.category='Tất cả';state.pageSize=18;closeDialog('preferencesDialog');await refreshDashboard();toast('Đã lưu khẩu vị. Những món hợp gu đang chờ bạn!');
}
document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.authMode)));
$('#showPassword').addEventListener('click',()=>{const input=$('#authPassword');input.type=input.type==='password'?'text':'password';$('#showPassword').textContent=input.type==='password'?'Hiện':'Ẩn';$('#showPassword').setAttribute('aria-label',input.type==='password'?'Hiện mật khẩu':'Ẩn mật khẩu');});
$('#authForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!isFlask)return;const submit=$('#authSubmit');submit.disabled=true;$('#authError').textContent='';
  try{
    const payload={email:$('#authEmail').value,password:$('#authPassword').value};
    if(authMode==='register'){payload.name=$('#authName').value;payload.confirm_password=$('#authConfirm').value;if(payload.password!==payload.confirm_password)throw new Error('Hai mật khẩu chưa trùng nhau.');}
    await fetchJSON('/api/auth/'+authMode,{method:'POST',body:JSON.stringify(payload)});
    $('#authForm').reset();$('#authPassword').type='password';await enterApp();
  }catch(e){$('#authError').textContent=e.message;}
  finally{submit.disabled=false;}
});
$('#previewGuestButton').addEventListener('click',()=>enterApp().catch(e=>toast(e.message,true)));
$('#logoutButton').addEventListener('click',async()=>{try{await api.logout();showAuth();}catch(e){toast(e.message,true);}});
$('#editPreferences').addEventListener('click',()=>openPreferences(false));
$('#preferencesCancel').addEventListener('click',()=>{if(!state.preferencesRequired)closeDialog('preferencesDialog');});
$('#preferencesDialog').addEventListener('cancel',event=>{if(state.preferencesRequired)event.preventDefault();});
document.addEventListener('click',event=>{const button=event.target.closest('[data-pref-price]');if(button){$('#prefMinPrice').value=0;$('#prefMaxPrice').value=button.dataset.prefPrice;}});
$('#preferencesForm').addEventListener('submit',async event=>{
  event.preventDefault();const submit=$('#preferencesSave');submit.disabled=true;$('#preferencesError').textContent='';
  try{await savePreferences({min_price:Number($('#prefMinPrice').value),max_price:$('#prefMaxPrice').value===''?null:Number($('#prefMaxPrice').value),spice:document.querySelector('input[name="prefSpice"]:checked').value,diet:document.querySelector('input[name="prefDiet"]:checked').value,categories:[...document.querySelectorAll('input[name="prefCategory"]:checked')].map(i=>i.value)});}
  catch(e){$('#preferencesError').textContent=e.message;}
  finally{submit.disabled=false;}
});
$('#skipPreferences').addEventListener('click',async()=>{try{await savePreferences(clone(defaultPreferences));}catch(e){$('#preferencesError').textContent=e.message;}});
$('#filterForm').addEventListener('submit',async event=>{
  event.preventDefault();
  try{const p=checkedPreferences({min_price:Number($('#minPrice').value),max_price:$('#maxPrice').value===''?null:Number($('#maxPrice').value),spice:$('#filterSpice').value,diet:$('#filterDiet').value,categories:state.preferences.categories});if(state.preferences.diet==='vegetarian'&&p.diet==='nonvegetarian')throw new Error('Bạn đang chọn chế độ chay trong tài khoản. Hãy đổi khẩu vị tài khoản trước khi chọn món mặn.');state.minPrice=p.min_price;state.maxPrice=p.max_price;state.spice=p.spice;state.diet=p.diet;state.pageSize=18;closeDialog('filterDialog');await refreshDashboard();}
  catch(e){toast(e.message,true);}
});
$('#clearFilters').addEventListener('click',async()=>{state.category='Tất cả';state.minPrice=0;state.maxPrice=null;state.spice='any';state.diet=state.preferences.diet;state.pageSize=18;closeDialog('filterDialog');try{await refreshDashboard();}catch(e){toast(e.message,true);}});

async function start(){
  showAuth();
  if(!isFlask)return;
  try{const data=await api.session();if(data.user)await enterApp();}
  catch(e){$('#authError').textContent=e.message;}
}
start();


// Khi khách theo dõi đơn, lấy trạng thái mới từ nhà hàng mỗi 10 giây.
setInterval(()=>{if(isFlask&&state.authenticated&&state.view==='history'&&!document.hidden&&!document.querySelector('dialog[open]'))refreshDashboard().catch(e=>toast(e.message,true));},10000);

// Lớp xếp hạng giao diện: ưu tiên cá nhân, bổ sung khám phá và đa dạng hóa.
// Không tạo đánh giá sao, vị trí GPS, ETA hoặc dữ liệu dị ứng không có trong dataset.
function currentFoodFilters(){return {min_price:state.minPrice,max_price:state.maxPrice,spice:state.spice,diet:state.category==='Món chay'||state.preferences.diet==='vegetarian'?'vegetarian':state.diet,categories:state.preferences.categories};}
function isOrderable(f){return f.available!==0&&f.is_open!==0;}
function diverseRank(foods,score,limit){
 const remaining=foods.slice(),result=[],groups={},shops={};
 while(remaining.length&&result.length<limit){
  remaining.sort((a,b)=>score(b)/(1+1.1*(groups[b.nhom]||0)+.9*(shops[b.nha_hang_id]||0))-score(a)/(1+1.1*(groups[a.nhom]||0)+.9*(shops[a.nha_hang_id]||0))||a.id-b.id);
  const f=remaining.shift();result.push(f);groups[f.nhom]=(groups[f.nhom]||0)+1;shops[f.nha_hang_id]=(shops[f.nha_hang_id]||0)+1;
 }
 return result;
}
function discoveryFeed(){
 // Giữ nguyên thứ tự backend; không ghi đè điểm CF bằng thuộc tính món hoặc độ phổ biến.
 return (state.dashboard?.recommendations||[]).map(f=>({...foodById(f.id),...f}));
}
function fallbackSection(){
 const items=state.dashboard?.fallback_recommendations||[];
 if(!items.length)return '';
 const shown=state.fallbackPage||12;
 return `<section class="interest-section"><div class="section-heading"><div><span class="eyebrow">ĐỔI VỊ THÊM</span><h2>Khám phá theo khẩu vị</h2><p class="section-subtitle">Các món bổ sung theo khẩu vị hoặc độ phổ biến; chưa có điểm User-based CF.</p></div></div><div class="food-grid">${items.slice(0,shown).map(foodCard).join('')}</div>${items.length>shown?'<div class="load-more-row"><button class="load-more" data-more-fallback="1">Xem thêm món đổi vị</button></div>':''}</section>`;
}
function openMealChooser(){
 if(!state.dashboard)return;hideSidebar();
 let dialog=$('#mealChooser');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='mealChooser';dialog.className='meal-chooser';document.body.appendChild(dialog);}
 const hour=new Date().getHours(),meal=hour<10?'breakfast':hour<15?'lunch':'dinner';
 dialog.innerHTML=`<div class="section-heading"><div><span class="eyebrow">CHỌN BỮA ĂN PHÙ HỢP</span><h2>Hôm nay bạn muốn ăn gì?</h2></div><button class="icon-button" data-close="mealChooser" aria-label="Đóng">${icon('close',20)}</button></div><p>Chọn bữa và ngân sách. Khẩu vị cay, chay/mặn cùng bộ lọc hiện tại vẫn được áp dụng.</p><form id="mealForm"><div class="meal-inputs"><label>Bữa ăn<select name="meal"><option value="breakfast">Bữa sáng</option><option value="lunch">Bữa trưa</option><option value="dinner">Bữa tối</option><option value="snack">Ăn vặt</option><option value="drink">Đồ uống</option><option value="any">Bất kỳ</option></select></label><label>Tối đa mỗi món (đồng)<input name="budget" type="number" min="1000" max="100000000" step="1000" value="${state.maxPrice||60000}" required></label><label>Nhóm món<select name="group"><option value="all">Nhiều nhóm món</option>${categories.filter(c=>c!=='Tất cả').map(c=>`<option>${esc(c)}</option>`).join('')}</select></label></div><p class="small-text">Ngân sách chỉ tính tiền món, chưa gồm phí giao hàng. Bữa ăn theo giờ thiết bị, bạn có thể đổi.</p><button class="primary-button" type="submit">Tìm 3 món phù hợp</button></form><div id="mealResults" aria-live="polite"></div>`;
 dialog.querySelector('[name="meal"]').value=meal;
 let used=new Set(),lastKey='';
 dialog.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();const form=e.target,m=form.elements.meal.value,group=form.elements.group.value,budget=Number(form.elements.budget.value);
  if(!Number.isFinite(budget)||budget<1000)return;
  const key=[m,group,budget].join('|');if(key!==lastKey){used=new Set();lastKey=key;}
  const foods=state.foods.filter(f=>isOrderable(f)&&f.gia<=budget&&FoodEngine.matches(f,currentFoodFilters())&&(group==='all'||FoodEngine.matchesCategory(f,group))&&(m==='drink'?f.nhom==='Đồ uống':m==='snack'?f.nhom==='Ăn vặt':m==='any'||!['Đồ uống','Ăn vặt'].includes(f.nhom)));
  const preferred={breakfast:['Bún / phở','Cơm'],lunch:['Cơm','Món chay','Món Hàn'],dinner:['Món gà','Món Âu','Món Hàn','Bún / phở'],snack:['Ăn vặt'],drink:['Đồ uống'],any:[]}[m];
  const fresh=foods.filter(f=>!used.has(f.id));
  const cfOrder=new Map((state.dashboard.recommendations||[]).filter(f=>f.phuong_phap==='Lọc cộng tác').map((f,i)=>[f.id,i]));
  const cfPicks=fresh.filter(f=>cfOrder.has(f.id)).sort((a,b)=>cfOrder.get(a.id)-cfOrder.get(b.id)).slice(0,3);
  const picks=[...cfPicks,...diverseRank(fresh.filter(f=>!cfOrder.has(f.id)),f=>1+(preferred.includes(f.nhom)?1:0)+Math.log1p(popularity(f.id))*.1,3-cfPicks.length)];
  picks.forEach(f=>used.add(f.id));
  $('#mealResults').innerHTML=picks.length?`<h3>${picks.length} lựa chọn cho bạn</h3><p>Trong ngân sách, quán đang mở và món đang bán. Ưu tiên khẩu vị, lịch sử và nhóm phù hợp bữa bạn chọn.</p><div class="meal-picks">${picks.map(f=>`<article><button class="related-open" data-meal-detail="${f.id}"><img src="${esc(f.image)}" alt="${esc(f.ten)}"><strong>${esc(f.ten)}</strong></button><p>${esc(f.nha_hang)}</p><p>${esc(f.nhom)} · ${money(f.gia)}</p><small>${getRecommendation(f.id)?.phuong_phap==='Lọc cộng tác'?'Được người có lịch sử tương đồng gợi ý (User-based CF)':preferred.includes(f.nhom)?'Ưu tiên cho bữa đã chọn':'Lựa chọn đổi vị trong ngân sách'}</small><button class="primary-button" data-meal-add="${f.id}">Thêm vào giỏ</button></article>`).join('')}</div><p class="small-text">Nhấn Tìm 3 món phù hợp lần nữa để đổi lựa chọn, không lặp lại trong lượt chọn này.</p>`:foods.length?'<p>Đã xem hết lựa chọn phù hợp. Đổi điều kiện hoặc đóng và mở lại để chọn từ đầu.</p>':'<p>Không có món phù hợp tất cả điều kiện. Thử tăng ngân sách hoặc đổi nhóm món; kiểm tra thêm bộ lọc cay/chay đang áp dụng.</p>';
 });
 dialog.removeEventListener('click',mealChoiceClick);dialog.addEventListener('click',mealChoiceClick);
 showDialog('mealChooser');
}
function mealChoiceClick(e){
 const b=e.target.closest('button');
 if(b?.dataset.mealDetail){closeDialog('mealChooser');openDetail(Number(b.dataset.mealDetail));}
 if(b?.dataset.mealAdd){closeDialog('mealChooser');addToCart(Number(b.dataset.mealAdd));}
 // Delegation stays active throughout this dialog instance, including result refreshes.

}

// Thống kê bán hàng và đánh giá được lấy từ đơn hoàn tất trên máy chủ.
function salesText(food){
 const orders=food.completed_orders||0,parts=food.sold_portions||0;
 return orders?`${orders} đơn hoàn tất · ${parts} phần đã bán`:'Chưa có đơn hoàn tất';
}
function starsHTML(value){
 const score=Math.max(0,Math.min(5,Number(value)||0));
 return `<span class="review-stars-display" role="img" aria-label="${score.toFixed(1)} trên 5 sao"><span aria-hidden="true">★★★★★</span><span aria-hidden="true" class="review-stars-fill" style="width:${score/5*100}%">★★★★★</span></span>`;
}
function ratingLink(food,inDetail=false){
 const count=food.review_count||0,value=Number(food.rating_average)||0;
 return `<button class="food-rating ${inDetail?'detail-rating-link':''}" ${inDetail?'data-scroll-reviews="1"':`data-review-detail="${food.id}"`} aria-label="Xem đánh giá ${esc(food.ten)}">${count?`${starsHTML(value)}<strong>${value.toFixed(1)}/5</strong><span>(${count} đánh giá)</span>`:'<span class="unrated-star" aria-hidden="true">☆</span><span>Chưa có đánh giá</span>'}</button>`;
}
function reviewFormHTML(data){
 if(!isFlask)return '<p class="review-gate">Chạy bản Flask để xem và gửi đánh giá từ người mua.</p>';
 if(!data.can_review){
  const own=state.dashboard.history.find(o=>o.mon_an_id===data.dish_id&&o.status!=='cancelled'&&!String(o.receipt_id).startsWith('demo-'));
  return `<div class="review-gate"><p>${own?`Đơn của bạn: ${esc(orderStatusLabel(own.status))}. `:''}Bạn có thể đánh giá món này khi đơn của bạn đã hoàn tất.</p>${own?`<button class="filter-button" data-open-order="${esc(own.receipt_id)}">Theo dõi đơn / xác nhận nhận món</button>`:'<button class="filter-button" data-go-history="1">Xem lịch sử đặt món</button>'}</div>`;
 }
 const mine=data.mine;
 return `<form id="reviewForm" data-dish-id="${data.dish_id}" class="review-form"><h4>${mine?'Đánh giá của bạn':'Chia sẻ trải nghiệm của bạn'}</h4><p>Mỗi người đánh giá một lần cho mỗi món; bạn có thể chỉnh sửa sau.</p><fieldset><legend>Chọn số sao</legend><div class="review-star-options">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating" value="${n}" ${mine?.rating===n?'checked':''} required><span>${n} ★</span></label>`).join('')}</div></fieldset><label class="review-comment-label" for="reviewComment">Nhận xét (không bắt buộc)</label><textarea id="reviewComment" name="comment" rows="3" maxlength="1000" placeholder="Bạn thấy hương vị và khẩu phần thế nào?">${esc(mine?.comment||'')}</textarea><p class="review-form-status" role="status" aria-live="polite"></p><button type="submit" class="primary-button">${mine?'Cập nhật đánh giá':'Gửi đánh giá'}</button></form>`;
}
function reviewSectionHTML(data){
 const summary=data.summary,count=summary.review_count||0;
 return `<div class="section-heading"><div><span class="eyebrow">TRẢI NGHIỆM CỦA NGƯỜI MUA</span><h3 id="reviewsTitle">Đánh giá từ người đã đặt</h3></div><span class="verified-purchase">Chỉ đánh giá từ đơn hoàn tất</span></div><div class="review-summary"><div class="review-average">${count?`<strong>${Number(summary.rating_average).toFixed(1)}<small>/5</small></strong>${starsHTML(summary.rating_average)}<p>${count} đánh giá</p>`:'<strong class="no-rating">Chưa có đánh giá</strong><p>Hãy là người đầu tiên chia sẻ trải nghiệm sau khi nhận món.</p>'}<p class="review-sales">${salesText(summary)}</p></div><div class="rating-distribution" aria-label="Phân bố số sao">${[5,4,3,2,1].map(n=>`<div><span>${n} ★</span><span class="rating-track"><span style="width:${count?(data.histogram[n]||0)/count*100:0}%"></span></span><small>${data.histogram[n]||0}</small></div>`).join('')}</div></div>${reviewFormHTML(data)}<div class="review-list">${data.reviews.map(r=>`<article class="buyer-review"><div class="buyer-review-header"><div class="review-author"><span class="mini-avatar">${esc(initial(r.author))}</span><div><strong>${esc(r.author)}</strong><small>Đã mua món · Đơn hoàn tất</small></div></div>${starsHTML(r.rating)}</div>${r.comment?`<p class="review-comment">${esc(r.comment)}</p>`:'<p class="review-no-comment">Người mua đã chấm sao, chưa viết nhận xét.</p>'}${r.reply?`<aside class="restaurant-reply"><strong>Phản hồi từ ${esc(r.reply.restaurant_name)}</strong><p>${esc(r.reply.comment)}</p><small>${esc(new Date(r.reply.updated_at).toLocaleDateString('vi-VN'))}</small></aside>`:''}<small class="review-date">${esc(new Date(r.updated_at).toLocaleDateString('vi-VN'))}${r.created_at!==r.updated_at?' · Đã chỉnh sửa':''}</small></article>`).join('')}</div>${data.page>1||data.has_more?`<div class="review-pagination"><button class="filter-button" data-review-page="${data.page-1}" ${data.page===1?'disabled':''}>Trước</button><span>Trang ${data.page}</span><button class="filter-button" data-review-page="${data.page+1}" ${data.has_more?'':'disabled'}>Tiếp</button></div>`:''}`;
}
async function loadDishReviews(dishId,page=1,focus=false){
 const sequence=++reviewSequence,userId=state.userId;
 const section=$('#dishReviews');if(!section)return;
 section.setAttribute('aria-busy','true');
 try{
  const data=isFlask?await fetchJSON(`/api/foods/${dishId}/reviews?page=${page}`):{
   dish_id:dishId,summary:{completed_orders:0,sold_portions:0,review_count:0,rating_average:null},histogram:{},reviews:[],mine:null,can_review:false,page:1,has_more:false};
  if(sequence!==reviewSequence||state.detailFoodId!==dishId||state.userId!==userId||!$('#detailDialog').open)return;
  section.innerHTML=reviewSectionHTML(data);section.setAttribute('aria-busy','false');
  const food=foodById(dishId);Object.assign(food,data.summary);
  const rec=getRecommendation(dishId);if(rec)Object.assign(rec,data.summary);
  $('#detailRating').innerHTML=ratingLink(food,true);
  const meta=$('#detailContent .detail-meta');if(meta)meta.innerHTML=`${icon('store',14)}<button class="restaurant-link" data-open-restaurant="${food.nha_hang_id}">${esc(food.nha_hang)}</button><span>·</span>${salesText(food)}`;
  if(focus)section.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){
  if(sequence!==reviewSequence||state.detailFoodId!==dishId||state.userId!==userId||!$('#detailDialog').open)return;
  section.setAttribute('aria-busy','false');section.innerHTML=`<h3 id="reviewsTitle">Đánh giá từ người đã đặt</h3><p role="alert">${esc(e.message)}</p><button class="filter-button" data-retry-reviews="1">Thử tải lại</button>`;
 }
}
document.addEventListener('submit',async event=>{
 if(event.target.id!=='reviewForm')return;event.preventDefault();
 const form=event.target,button=form.querySelector('button[type="submit"]'),message=form.querySelector('.review-form-status');
 if(button.disabled)return;button.disabled=true;message.textContent='Đang lưu đánh giá…';
 const dishId=Number(form.dataset.dishId),uid=state.userId;
 try{
  const selected=form.querySelector('input[name="rating"]:checked');if(!selected)throw Error('Bạn hãy chọn từ 1 đến 5 sao.');
  await fetchJSON(`/api/me/foods/${dishId}/review`,{method:'PUT',body:JSON.stringify({rating:Number(selected.value),comment:form.elements.comment.value})});
  if(uid!==state.userId)return;
  await refreshDashboard();
  if(state.detailFoodId===dishId&&$('#detailDialog').open){await loadDishReviews(dishId);const status=$('#reviewForm .review-form-status');if(status)status.textContent='Đã lưu đánh giá của bạn.';}
 }catch(e){message.textContent=e.message;}
 finally{button.disabled=false;}
});

// Khách theo dõi đơn và xác nhận nhận món, sau đó mới mở quyền đánh giá.
async function openOrder(receiptId){
 closeDialog('detailDialog');state.orderId=receiptId;
 $('#orderContent').innerHTML=`<div class="modal-heading"><h2>Đơn hàng của bạn</h2><button class="icon-button" data-close="orderDialog" aria-label="Đóng">${icon('close',20)}</button></div><p role="status">Đang tải đơn…</p>`;
 showDialog('orderDialog');await loadOrder(receiptId);
}
function orderDetailHTML(order){
 const stages=['pending','accepted','preparing','ready','completed'],index=stages.indexOf(order.status);
 const help=({pending:'Quán chưa xác nhận đơn này. Khi chuẩn bị xong, bạn sẽ có nút Đã nhận món.',accepted:'Nhà hàng đã xác nhận, đang chờ chuẩn bị món.',preparing:'Nhà hàng đang chuẩn bị món. Bạn chưa thể xác nhận đã nhận ở bước này.',ready:'Nhà hàng đã chuẩn bị xong. Sau khi nhận được món, bấm Đã nhận món để hoàn tất và đánh giá.',completed:'Đơn đã hoàn tất. Chọn Viết / xem đánh giá ở món bên dưới.',cancelled:'Đơn đã hủy nên không mở đánh giá.'})[order.status]||'';
 return `<div class="modal-heading"><div><span class="eyebrow">THEO DÕI ĐƠN HÀNG</span><h2>${esc(order.nha_hang)}</h2><p>Đơn #${esc(order.id.slice(0,8))}</p></div><button class="icon-button" data-close="orderDialog" aria-label="Đóng">${icon('close',20)}</button></div><span class="pill order-status-${esc(order.status)}">${esc(orderStatusLabel(order.status))}</span>${order.status==='cancelled'?'':`<ol class="order-progress">${stages.map((step,i)=>`<li class="${i<=index?'reached':''}" ${i===index?'aria-current="step"':''}><span>${i<index?'✓':i+1}</span>${esc(orderStatusLabel(step))}</li>`).join('')}</ol>`}<p class="order-help">${esc(help)}</p><div class="receipt-items">${order.items.map(item=>`<article><button class="receipt-dish-link" data-detail="${item.mon_an_id}"><strong>${esc(item.ten)}</strong><span>${item.so_luong} phần × ${money(item.don_gia)}</span></button><div><b>${money(item.thanh_tien)}</b><button class="review-history-link" data-review-detail="${item.mon_an_id}">${order.can_review?'Viết / xem đánh giá':'Xem món / đánh giá'}</button></div></article>`).join('')}</div><div class="receipt-total"><span>Tổng tiền món</span><strong>${money(order.total)}</strong></div>${order.can_receive?`<button class="primary-button receipt-receive" data-receive-order="${esc(order.id)}">Đã nhận món – hoàn tất đơn</button>`:''}<p class="order-action-status" role="status" aria-live="polite"></p>`;
}
async function loadOrder(receiptId){
 const sequence=++orderSequence,uid=state.userId;
 try{
  const result=await fetchJSON('/api/me/orders/'+encodeURIComponent(receiptId));
  if(sequence!==orderSequence||state.orderId!==receiptId||state.userId!==uid||!$('#orderDialog').open)return;
  $('#orderContent').innerHTML=orderDetailHTML(result.order);
 }catch(e){
  if(sequence!==orderSequence||state.orderId!==receiptId||state.userId!==uid||!$('#orderDialog').open)return;
  $('#orderContent').innerHTML=`<div class="modal-heading"><h2>Đơn hàng</h2><button class="icon-button" data-close="orderDialog" aria-label="Đóng">${icon('close',20)}</button></div><p role="alert">${esc(e.message)}</p>`;
 }
}
async function confirmReceived(receiptId,button){
 state.receivingOrders||=new Set();if(state.receivingOrders.has(receiptId))return;
 state.receivingOrders.add(receiptId);button.disabled=true;const uid=state.userId;
 try{
  await fetchJSON('/api/me/orders/'+encodeURIComponent(receiptId)+'/received',{method:'POST',body:'{}'});
  if(uid!==state.userId)return;
  await refreshDashboard();
  if(state.orderId===receiptId&&$('#orderDialog').open)await loadOrder(receiptId);
  toast('Đã nhận món và hoàn tất đơn. Bạn có thể đánh giá ngay.');
 }catch(e){toast(e.message,true);}
 finally{state.receivingOrders.delete(receiptId);button.disabled=false;}
}
setInterval(()=>{if(isFlask&&!document.hidden&&$('#orderDialog').open&&state.orderId&&!state.receivingOrders?.size)loadOrder(state.orderId);},10000);
