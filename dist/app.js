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
  minPrice:0,maxPrice:null,spice:'any',diet:'any',preferences:clone(defaultPreferences),search:'',sort:'match',pageSize:8,
  restaurantId:null,carts:{},pendingFavourites:new Set(),ordering:false,authenticated:false,preferencesRequired:false};
try{const carts=JSON.parse(readStorage(cartStorageKey));if(carts&&typeof carts==='object'&&!Array.isArray(carts))state.carts=carts;}catch{/* Giỏ trống. */}
let loadSequence=0;

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
function getRecommendation(id) { return state.dashboard?.recommendations.find(m=>m.id===id); }
function showDialog(id) { const dialog=$('#'+id); if (!dialog.open) dialog.showModal(); }
function closeDialog(id) { const dialog=$('#'+id); if (dialog.open) dialog.close(); }
function hideSidebar() { $('#sidebar').classList.remove('open');$('#sidebarBackdrop').classList.remove('open');$('#mobileMenu').setAttribute('aria-expanded','false'); }

async function refreshDashboard() {
  const sequence=++loadSequence;
  const dashboard=await api.dashboard(state.userId,{category:state.category,minPrice:state.minPrice,maxPrice:state.maxPrice,spice:state.spice,diet:state.diet});
  if (sequence!==loadSequence) return;
  state.dashboard=dashboard; render();
}
function navigate(view) {
  state.view=view;state.category='Tất cả';state.search='';state.sort='match';state.pageSize=8;state.restaurantId=null;
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
  if (popularity(food.id)) return `${popularity(food.id)} lượt đặt từ cộng đồng`;
  return 'Một hương vị mới đang chờ bạn khám phá';
}
function foodCard(food,index) {
  const rec=getRecommendation(food.id);
  const personalised=!!rec && rec.phuong_phap!=='Khám phá' && state.view==='discover';
  const badge=personalised?({'Lịch sử của bạn':'Theo gu của bạn','Khẩu vị':'Hợp khẩu vị','Lọc cộng tác':'Người cùng gu'})[rec.phuong_phap]:popularity(food.id)?'Được yêu thích':'Món mới';
  const saved=favouriteIds().includes(food.id);
  return `<article class="food-card" style="animation-delay:${Math.min(index,8)*.025}s">
    <div class="food-image-wrap"><button class="food-image-button" data-detail="${food.id}" aria-label="Xem ${esc(food.ten)}"><img class="food-image" src="${esc(food.image)}" alt="Ảnh minh họa ${esc(food.ten)}" ${index>2?'loading="lazy"':'fetchpriority="high"'} width="720" height="480"></button><span class="food-badge ${personalised?'personal':''}">${icon(personalised?'sparkles':'flame',11)}${esc(badge)}</span><button class="heart-button ${saved?'saved':''}" data-favourite="${food.id}" aria-label="${saved?'Bỏ yêu thích':'Yêu thích'} ${esc(food.ten)}" aria-pressed="${saved}">${icon('heart',15)}</button></div>
    <div class="food-body"><div class="food-kind"><span>${esc(food.nhom.toLocaleUpperCase('vi'))}</span><span class="food-orders">${icon('users',10)}${popularity(food.id)?popularity(food.id)+' lượt đặt':'Chưa có lượt đặt'}</span></div><button class="food-title" data-detail="${food.id}" title="${esc(food.ten)}">${esc(food.ten)}</button><div class="food-restaurant">${icon('store',11)}${esc(food.nha_hang)}<span class="food-tags"><span class="food-tag ${food.cay?'hot':''}">${food.nhom==='Đồ uống'?'Đồ uống':food.chay?'Chay':'Mặn'}${food.nhom!=='Đồ uống'?' · '+['Không cay','Cay nhẹ','Cay nhiều'][food.cay]:''}</span></span></div><div class="food-bottom"><div class="food-price">${money(food.gia)}<span>/ phần</span></div><button class="add-button" data-add="${food.id}" aria-label="Thêm ${esc(food.ten)} vào giỏ">${icon('plus',19)}</button></div></div><button class="food-reason" data-detail="${food.id}" aria-label="Vì sao gợi ý ${esc(food.ten)}">${icon(personalised?'sparkles':'info',12)}<span>${esc(reason(food,rec))}</span>${icon('chevron-down',11)}</button>
  </article>`;
}

function visibleFoods() {
  let foods=state.view==='discover' ? (state.dashboard?.recommendations || []).map(r=>({...foodById(r.id),...r})) : state.foods.slice();
  if (state.view==='favourites') foods=foods.filter(f=>favouriteIds().includes(f.id));
  if (state.restaurantId) foods=foods.filter(f=>f.nha_hang_id===state.restaurantId);
  foods=foods.filter(f=>(state.category==='Tất cả'||f.nhom===state.category)&&FoodEngine.matches(f,{min_price:state.minPrice,max_price:state.maxPrice,spice:state.spice,diet:state.diet}));
  if (state.search.trim()) { const query=normalise(state.search.trim());foods=foods.filter(f=>normalise(`${f.ten} ${f.nha_hang} ${f.nhom}`).includes(query)); }
  if (state.sort==='price-asc') foods.sort((a,b)=>a.gia-b.gia || a.id-b.id);
  else if (state.sort==='price-desc') foods.sort((a,b)=>b.gia-a.gia || a.id-b.id);
  else if (state.view!=='discover') foods.sort((a,b)=>popularity(b.id)-popularity(a.id) || a.id-b.id);
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
    const heroFood=state.dashboard.recommendations[0]||state.foods[0];
    const insight=taste.total?`Từ ${taste.total} lượt đặt của bạn,<br>tìm món mới trong những nhóm quen.`:neighbours.length?'Từ những người có khẩu vị giống bạn,<br>tìm thêm một món yêu thích.':'Bắt đầu từ khẩu vị và mức giá đã chọn.<br>Món phù hợp đang chờ bạn.';
    header=`<div class="page-intro"><div><div class="greeting">${icon('sun',14)}CHÀO ${esc(currentName.toLocaleUpperCase('vi'))}, BỮA NGON ĐANG ĐỢI</div><h1>Hôm nay, ăn gì nhỉ<span class="orange">?</span></h1></div><div class="intro-aside">${icon('leaf',13)}Một bữa ngon, một ngày vui.</div></div>
    <section class="hero-row" aria-label="Khám phá món ăn"><div class="hero"><img class="hero-image" src="${esc(heroFood.image)}" alt="Ảnh minh họa ${esc(heroFood.ten)}" width="1100" height="720"><div class="hero-copy"><span class="hero-tag">${icon('sparkles',11)}MỖI NGÀY, MỘT CHÚT MỚI</span><h2>Bữa ngon đúng gu,<br>chẳng cần nghĩ lâu.</h2><p>Khám phá món ngon dành riêng cho bạn.<br>Chọn món, còn lại để FoodMatch lo.</p><button class="hero-button" data-action="scroll-foods">Khám phá ngay ${icon('arrow-right',13)}</button></div><div class="hero-circle"></div></div>
    <div class="insight-card"><span class="insight-label">${icon('sparkles',12)}KHÁM PHÁ CÙNG FOODMATCH</span><h2>Món mới,<br>hợp gu cũ.</h2><p>${insight}</p><div class="insight-bottom"><div class="avatar-stack">${neighbours.length?neighbours.map(n=>`<span class="mini-avatar" title="${esc(userName(n.ma_nguoi))}">${esc(initial(userName(n.ma_nguoi)))}</span>`).join(''):`<span class="mini-avatar">${icon(taste.total?'receipt':'users',14)}</span>`}</div><button class="insight-link" data-view="ai">Cách AI gợi ý ${icon('arrow-right',13)}</button></div></div></section>`;
  } else {
    const title=favourites?'Những món thương mến':restaurant?restaurant.nha_hang:state.search?'Tìm đúng món bạn thèm':'Một thế giới món ngon';
    const description=favourites?'Lưu lại một món ngon, để lần sau chẳng phải tìm xa.':restaurant?restaurant.dia_chi:state.search?`Kết quả cho “${state.search}” — có thể tìm món và nhà hàng không cần dấu.`:'Từ một bát phở quen đến một hương vị mới. Bữa ngon tiếp theo đang ở đây.';
    header=`<div class="inner-page-header">${restaurant?`<button class="back-link" data-view="restaurants">${icon('arrow-left',14)}Tất cả nhà hàng</button>`:`<span class="eyebrow">${favourites?'LƯU GIỮ KHẨU VỊ':'TÌM THÊM MỘT MÓN YÊU THÍCH'}</span>`}<h1>${esc(title)}<span class="orange">.</span></h1><p>${esc(description)}</p></div>`;
  }
  const cold=!Object.keys(state.dashboard.matrix[state.userId] || {}).length;
  const notice=discovery && cold ? `<div class="notice">${icon('sparkles',17)}<div>Bạn chưa có lịch sử đặt món. Gợi ý hiện dựa trên khẩu vị và mức giá bạn đã chọn, chưa dùng lịch sử giả.</div></div>`:'';
  const title=discovery?`Dành riêng cho ${firstName}`:favourites?'Danh sách yêu thích':restaurant?'Thực đơn nhà hàng':'Chọn món bạn thích';
  const subtitle=discovery?(taste.total?'Món mới theo lịch sử và khẩu vị của bạn, chọn lọc tối đa 12 gợi ý.':'Chọn lọc tối đa 12 gợi ý khởi đầu theo khẩu vị của bạn.'):favourites?'Nhấn trái tim để thêm hoặc bỏ món đã lưu.':`${foods.length} món ngon đang chờ bạn khám phá.`;
  const profile=discovery&&taste.total?`<div class="taste-profile"><div><span class="eyebrow">GU CỦA BẠN TỪ ${taste.total} LƯỢT ĐẶT</span><p>Những nhóm món bạn thường chọn</p></div><div class="taste-tags">${taste.groups.slice(0,3).map(([name,n])=>`<span>${icon(categoryIcons[name],15)}${esc(name)}<b>${n} lượt</b></span>`).join('')}</div></div>`:'';
  const noFoods=favourites?emptyHTML('Chưa có món nào được lưu','Nhấn trái tim ở món bạn thích. Những món yêu thích sẽ xuất hiện tại đây.'):discovery?emptyHTML('Chưa có gợi ý mới đủ phù hợp','Các món còn lại chưa đủ cơ sở gợi ý hoặc không khớp bộ lọc. Bạn có thể xem thực đơn để chọn món khác hay đặt lại món quen.','menu','Xem thực đơn'):emptyHTML('Chưa tìm thấy món phù hợp','Thử đổi nhóm món, nới mức giá hoặc tìm một từ khóa khác nhé.');
  const shown=discovery?foods:foods.slice(0,state.pageSize);
  const footer=discovery?`<div class="discovery-footer"><div><strong>Muốn tự chọn món khác?</strong><p>Xem đủ 80 món hoặc đặt lại món quen trong Thực đơn.</p></div><button class="filter-button" data-view="menu">Xem thực đơn ${icon('arrow-right',15)}</button></div>`:foods.length>state.pageSize?`<div class="load-more-row"><button class="load-more" data-action="load-more">Xem thêm món ngon ${icon('chevron-down',15)}</button></div>`:'';
  return `${header}${profile}${categoriesHTML()}${notice}<section id="foodSection"><div class="section-heading"><div><h2>${discovery?icon('sparkles',21):favourites?icon('heart',20):icon('bowl',20)}${esc(title)}<span class="results-count">(${foods.length})</span></h2><p class="section-subtitle">${esc(subtitle)}</p></div>${controlsHTML()}</div>${filtersHTML()}<div class="food-grid">${foods.length?shown.map(foodCard).join(''):noFoods}</div>${footer}</section>`;
}

function renderRestaurants() {
  const allRestaurants=[...new Map(state.foods.map(f=>[f.nha_hang_id,f])).values()];
  const restaurants=state.restaurantKind==='milk-tea'?allRestaurants.filter(r=>r.loai_quan==='Trà sữa'):allRestaurants;
  return `<div class="inner-page-header"><span class="eyebrow">TỪ NHỮNG CĂN BẾP QUEN</span><h1>Ghé một quán ngon<span class="orange">.</span></h1><p>20 căn bếp, thật nhiều hương vị — gồm 3 quán trà sữa riêng biệt. Chọn một nhà hàng để xem thực đơn của quán.</p></div><div class="restaurant-filterbar"><button data-restaurant-kind="all" class="${state.restaurantKind!=='milk-tea'?'active':''}">Tất cả 20 quán</button><button data-restaurant-kind="milk-tea" class="${state.restaurantKind==='milk-tea'?'active':''}">3 quán trà sữa</button></div><div class="restaurant-grid">${restaurants.map(r=>{
    const foods=state.foods.filter(f=>f.nha_hang_id===r.nha_hang_id);
    return `<button class="restaurant-card" data-restaurant="${r.nha_hang_id}"><div class="restaurant-cover"><img src="${esc(r.image)}" alt="Món ăn minh họa tại ${esc(r.nha_hang)}" loading="lazy"><span class="restaurant-type">${esc(r.loai_quan)}</span><span class="restaurant-label">${esc(r.nha_hang)}</span></div><div class="restaurant-body"><div class="restaurant-address">${icon('pin',13)}${esc(r.dia_chi)}</div><div class="restaurant-bottom"><span>${foods.length} món <span class="footer-separator">/</span> Từ <strong>${money(Math.min(...foods.map(f=>f.gia)))}</strong></span>${icon('arrow-right',18)}</div></div></button>`;
  }).join('')}</div>`;
}

function statCard(symbol,label,value) {return `<div class="stat-card"><div class="stat-icon">${icon(symbol,20)}</div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;}
function renderHistory() {
  const history=state.dashboard.history;
  const sum=history.reduce((n,o)=>n+o.thanh_tien,0);
  const distinct=new Set(history.map(o=>o.mon_an_id)).size;
  return `<div class="inner-page-header"><span class="eyebrow">MỖI BỮA ĂN LÀ MỘT KỶ NIỆM</span><h1>Những bữa ngon đã qua<span class="orange">.</span></h1><p>Lịch sử đặt món của ${esc(user().ten)}. Mỗi lần chọn món giúp FoodMatch hiểu bạn thêm một chút.</p></div><div class="stats-row">${statCard('receipt','Lượt đặt món',history.length)}${statCard('bowl','Món đã khám phá',distinct)}${statCard('wallet','Tổng tiền món',money(sum))}</div>${history.length?`<div class="panel"><div class="panel-title"><h3>Lịch sử đặt món</h3><button class="export-button" data-action="export">${icon('download',14)}Xuất CSV</button></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Món ăn</th><th>Ngày đặt</th><th>Số phần</th><th>Thành tiền</th><th>Trạng thái</th></tr></thead><tbody>${history.map(o=>{
    const f=foodById(o.mon_an_id);const date=new Date(o.ngay_dat);
    return `<tr><td><div class="history-dish"><img src="${esc(f.image)}" alt="" loading="lazy"><div><strong>${esc(o.mon_an)}</strong><small>${esc(o.nha_hang)} · #${o.id}</small></div></div></td><td>${esc(date.toLocaleDateString('vi-VN'))}<small>${esc(date.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}))}</small></td><td>${o.so_luong}</td><td class="money-cell">${money(o.thanh_tien)}</td><td><span class="pill">${icon('check',10)}Đã lưu mô phỏng</span></td></tr>`;
  }).join('')}</tbody></table></div></div>`:emptyHTML('Bữa ngon đầu tiên đang chờ','Bạn chưa đặt món nào. Khám phá thực đơn và chọn một món bạn thích nhé.')}`;
}

function renderAI() {
  const neighbours=state.dashboard.neighbours;
  const recommendations=state.dashboard.recommendations.slice(0,6);
  const steps=[['Lịch sử đặt món','Mỗi món là một cột, mỗi người là một dòng. Số lần đặt biểu diễn sở thích.'],['Tìm khẩu vị giống bạn','Cosine so sánh toàn bộ vector. Chọn tối đa 5 người có độ tương đồng lớn hơn 0.'],['Tính điểm món mới','Tính trung bình số lượt đặt của những người tương tự, có trọng số Cosine.'],['Chọn lọc đúng gu','Học nhóm món và quán từ lịch sử riêng. Lọc khẩu vị, chọn tối đa 12 món và xen kẽ nhóm/quán.']];
  return `<div class="inner-page-header"><span class="eyebrow">KHÔNG CHỈ LÀ MỘT GỢI Ý NGẪU NHIÊN</span><h1>Vì sao món này hợp gu<span class="orange">?</span></h1><p>FoodMatch học từ lịch sử của chính bạn và kết hợp người cùng gu khi có đủ dữ liệu. Khám phá chỉ chọn những món mới có cơ sở phù hợp.</p></div><div class="ai-steps">${steps.map((s,i)=>`<div class="step-card"><div class="step-number">0${i+1}</div><strong>${s[0]}</strong><p>${s[1]}</p></div>`).join('')}</div><div class="ai-intro"><div class="ai-summary"><h3>Khẩu vị của bạn, dưới dạng con số.</h3><p><strong>r(u,i)</strong> là số lượt người dùng u đặt món i. Chưa đặt được ghi là 0, không có nghĩa là không thích. Một lượt đặt 3 phần vẫn chỉ tính một lượt cho món đó.</p><div class="formula">Cosine(u,v) = Σ r(u,i) × r(v,i) / (√Σr(u,i)² × √Σr(v,i)²)</div><div class="formula">Điểm CF(u,i) = Σ Cosine(u,v) × r(v,i) / Σ Cosine(u,v)</div><p class="ai-note">Khi chưa có người tương tự, điểm lịch sử = 0,8 × lượt đặt nhóm / lượt nhóm cao nhất + 0,2 × lượt đặt quán / lượt quán cao nhất. Món ngoài nhóm quen chỉ được thêm nếu có bằng chứng CF hoặc thuộc nhóm bạn chọn yêu thích. Bộ lọc vẫn là điều kiện bắt buộc.</p><p class="ai-note">Mẫu số gồm tất cả người tương tự đã chọn. Điểm dùng để xếp hạng, không phải phần trăm yêu thích hay điểm đánh giá sao.</p></div><div class="neighbour-panel"><h3>Khẩu vị gần ${esc(shortName(user().ten))}</h3>${neighbours.length?neighbours.map(n=>`<div class="neighbour-row"><span class="mini-avatar">${esc(initial(userName(n.ma_nguoi)))}</span><div class="neighbour-name">${esc(userName(n.ma_nguoi))}<div class="neighbour-bar"><span style="width:${n.tuong_dong*100}%"></span></div></div><span class="neighbour-value">${(n.tuong_dong*100).toFixed(1)}%</span></div>`).join(''):'<p class="small-text">Web lỏ chưa có tính năng GPS thông cảm</p>'}<p class="ai-note">Tỷ lệ trên là độ tương đồng Cosine, không phải độ chính xác dự đoán.</p></div></div><div class="panel"><div class="panel-title"><h3>Điểm của những món đang gợi ý</h3><span class="pill">Tối đa 12 gợi ý · K = 5</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Món ăn</th><th>Cơ sở gợi ý</th><th>Điểm cơ sở</th><th>Lượt đặt cộng đồng</th></tr></thead><tbody>${recommendations.length?recommendations.map(r=>`<tr><td><button class="score-link" data-detail="${r.id}">${esc(r.ten)}</button><small>Nhấn tên món để xem phép tính cụ thể.</small></td><td>${esc(r.phuong_phap)}</td><td class="money-cell">${r.phuong_phap==='Lọc cộng tác'?r.diem.toFixed(4)+' (CF)':r.phuong_phap==='Lịch sử của bạn'?r.diem_lich_su.toFixed(4)+' (lịch sử)':'Khẩu vị ban đầu'}</td><td>${r.pho_bien}</td></tr>`).join(''):'<tr><td colspan="4">Không có món chưa đặt phù hợp. Hãy xem thực đơn để đặt lại món quen.</td></tr>'}</tbody></table></div></div><div class="panel matrix-panel"><div class="panel-title"><h3>Lượt đặt món của chính bạn</h3><span class="muted small-text">Kéo ngang để xem đủ 80 món</span></div><div class="table-scroll" tabindex="0" aria-label="Bảng số lần đặt từng món"><table class="data-table matrix-table"><thead><tr><th>Người dùng</th>${state.foods.map(f=>`<th title="${esc(f.ten)}">M${f.id}</th>`).join('')}</tr></thead><tbody>${state.users.map(u=>`<tr class="${u.id===state.userId?'current-user':''}"><td>${esc(shortName(u.ten))}</td>${state.foods.map(f=>{const n=state.dashboard.matrix[u.id]?.[f.id]||0;return `<td class="${n?'has-order':''}" title="${esc(u.ten)} — ${esc(f.ten)}: ${n} lượt">${n||'·'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div></div><p class="ai-note">Danh mục món/quán minh họa cho bài tập. Tài khoản và lịch sử do người dùng tự tạo. Chưa đánh giá chất lượng gợi ý trên tập dữ liệu thực tế độc lập. Gợi ý chọn từ món chưa đặt và được đa dạng theo nhóm món/nhà hàng. Điểm cơ sở trước bước đa dạng không phải xác suất thích món.</p>`;
}

function updateHeader() {
  $('#profileName').textContent=shortName(user().ten);
  $('#profileAvatar').textContent=initial(user().ten);
  $('#favouriteCount').textContent=favouriteIds().length;
  const count=cartItems().reduce((n,item)=>n+item.quantity,0);
  $('#cartCount').textContent=count;$('#cartCount').hidden=count===0;
  $('#cartButton').setAttribute('aria-label',`Mở giỏ món, ${count} phần`);
  document.querySelectorAll('.nav-item[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===state.view);if(el.dataset.view===state.view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
}
function render() {
  if (!state.dashboard) return;
  updateHeader();
  $('#pageContent').innerHTML=state.view==='history'?renderHistory():state.view==='ai'?renderAI():state.view==='restaurants'?renderRestaurants():renderFoodPage();
  document.title=`${({discover:'Hôm nay ăn gì?',menu:'Thực đơn',favourites:'Yêu thích',history:'Lịch sử đặt món',restaurants:'Nhà hàng',ai:'Cách AI gợi ý'})[state.view]} — FoodMatch`;
}

function openDetail(id) {
  const food=foodById(id);if(!food)return;
  const rec=getRecommendation(food.id);
  let explanation='Món ăn đã được đặt '+popularity(food.id)+' lượt trong dữ liệu cộng đồng. Bạn có thể lưu hoặc đặt lại bất kỳ món nào trong thực đơn.';
  let calculation='';
  if (rec?.phuong_phap==='Lọc cộng tác') {
    explanation=`${rec.bang_chung.map(e=>userName(e.ma_nguoi)).join(', ')} có lịch sử đặt món gần giống bạn và đã thử món này. FoodMatch ưu tiên món bạn chưa từng đặt để giúp bạn khám phá thêm.`;
    const sum=rec.bang_chung.reduce((n,b)=>n+b.dong_gop,0);
    calculation=rec.bang_chung.map(e=>`${userName(e.ma_nguoi)}: ${e.tuong_dong.toFixed(6)} × ${e.so_lan} lượt = ${e.dong_gop.toFixed(6)}`).join('\n');
    calculation+=`\n\nĐiểm = ${sum.toFixed(6)} / ${rec.tong_tuong_dong.toFixed(6)} = ${rec.diem.toFixed(6)}\nMẫu số gồm tất cả người tương tự, kể cả người chưa đặt món này.\nĐiểm chỉ dùng để xếp hạng, không phải xác suất.`;
  } else if(rec?.reason){
    explanation=rec.reason;
    if(rec.phuong_phap==='Lịch sử của bạn')calculation=`Điểm lịch sử = 0,8 × lượt đặt nhóm / lượt nhóm cao nhất + 0,2 × lượt đặt quán / lượt quán cao nhất = ${rec.diem_lich_su.toFixed(6)}.\nLượt đặt của chính bạn, không phải lượt đặt giả.\nSau đó ưu tiên nhóm bạn chọn yêu thích và xen kẽ nhóm món/quán. Không phải xác suất hay điểm lọc cộng tác.`;
  }
  else if(rec) explanation=rec.phuong_phap==='Khám phá'?'Đây là món chưa có lượt đặt, được bổ sung để bạn khám phá khi chưa đủ món có dữ liệu phù hợp.':`Món này có ${rec.pho_bien} lượt đặt trong cộng đồng. FoodMatch dùng món phổ biến để bổ sung khi chưa đủ gợi ý từ người có khẩu vị giống bạn.`;
  const descriptions={'Cơm':'Một bữa ăn thân quen và đủ đầy, dành cho những lúc muốn nạp lại năng lượng.','Bún / phở':'Một tô ngon với những hương vị Việt quen thuộc. Thêm chút mới mẻ cho bữa ăn hôm nay.','Món gà':'Một lựa chọn đậm đà, thích hợp cho bữa chính hoặc chia sẻ cùng bạn bè.','Món Âu':'Đổi vị một chút với một món ăn mang cảm hứng từ căn bếp phương Tây.','Ăn vặt':'Dành cho lúc thèm một chút vui miệng giữa những bữa ăn.','Món Hàn':'Khám phá những hương vị quen thuộc từ căn bếp Hàn Quốc.','Món chay':'Một bữa ăn từ thực vật, nhẹ nhàng mà vẫn đầy hương vị.','Đồ uống':'Thêm một thức uống để bữa ăn trọn vẹn hơn.'};
  $('#detailContent').innerHTML=`<div class="detail-image-wrap"><img src="${esc(food.image)}" alt="Ảnh minh họa ${esc(food.ten)}"><button class="icon-button" data-close="detailDialog" aria-label="Đóng chi tiết">${icon('close',19)}</button></div><div class="detail-body"><span class="eyebrow">${esc(food.nhom.toLocaleUpperCase('vi'))}</span><div class="detail-heading"><h2>${esc(food.ten)}</h2><strong class="detail-price">${money(food.gia)}</strong></div><div class="detail-meta">${icon('store',14)}${esc(food.nha_hang)}<span>·</span>${popularity(food.id)} lượt đặt</div><p class="detail-description">${esc(descriptions[food.nhom])}</p><div class="explanation-box"><strong>${icon('sparkles',16)}${rec?.phuong_phap==='Lọc cộng tác'?'Vì sao hợp gu của bạn?':'Một chút về gợi ý này'}</strong><p>${esc(explanation)}</p>${calculation?`<details><summary>Xem cách tính điểm ${(rec.phuong_phap==='Lịch sử của bạn'?rec.diem_lich_su:rec.diem).toFixed(3)}</summary><div class="calculation">${esc(calculation)}</div></details>`:''}</div><div class="detail-actions"><div class="quantity-input"><button data-action="detail-minus" aria-label="Giảm số phần">${icon('minus',14)}</button><input id="detailQuantity" type="number" value="1" min="1" max="20" aria-label="Số phần"><button data-action="detail-plus" aria-label="Tăng số phần">${icon('plus',14)}</button></div><button class="primary-button" data-detail-add="${food.id}">${icon('bag',17)}Thêm vào giỏ món</button></div></div>`;
  showDialog('detailDialog');
}

function addToCart(id,quantity=1) {
  const food=foodById(id);if(!food)return;
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
  $('#cartSummary').innerHTML=items.length?`<div class="cart-total"><span>Tổng tiền món</span><strong>${money(total)}</strong></div><button class="primary-button" id="checkoutButton" ${state.ordering?'disabled':''}>${state.ordering?'Đang lưu đơn…':'Xác nhận đặt món'} ${icon('arrow-right',17)}</button><p>Đặt món mô phỏng cho <strong>${esc(user().ten)}</strong>.<br>Không thanh toán và không giao hàng thực tế.</p>`:`<p>Thêm món bằng nút dấu cộng trên thực đơn.</p>`;
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
  try { await api.checkout(userId,items);state.carts[userId]={};saveCart();closeDialog('cartDialog');await refreshDashboard();toast('Đã lưu đơn mô phỏng. Gợi ý của bạn đã được cập nhật!'); }
  catch(e){toast(e.message,true);}
  finally{state.ordering=false;if($('#cartDialog').open)renderCart();}
}

// Một bộ xử lý sự kiện cho các thành phần được tạo bằng JavaScript.
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  try{
    if(button.dataset.close){closeDialog(button.dataset.close);return;}
    if(button.dataset.view){navigate(button.dataset.view);return;}
    if(button.dataset.category){state.category=button.dataset.category;state.pageSize=6;await refreshDashboard();return;}
    if(button.dataset.detail){openDetail(Number(button.dataset.detail));return;}
    if(button.dataset.add){addToCart(Number(button.dataset.add));return;}
    if(button.dataset.detailAdd){addToCart(Number(button.dataset.detailAdd),Number($('#detailQuantity').value));return;}
    if(button.dataset.favourite){
      const id=Number(button.dataset.favourite);if(state.pendingFavourites.has(id))return;state.pendingFavourites.add(id);button.disabled=true;
      try{const result=await api.favourite(state.userId,id);state.favourites=result.favourites;render();}
      finally{state.pendingFavourites.delete(id);button.disabled=false;}
      return;
    }
    if(button.dataset.restaurantKind){state.restaurantKind=button.dataset.restaurantKind;render();return;}
    if(button.dataset.restaurant){state.view='menu';state.restaurantId=Number(button.dataset.restaurant);state.pageSize=6;state.category='Tất cả';state.search='';$('#searchInput').value='';await refreshDashboard();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(button.dataset.cartQuantity){const id=Number(button.dataset.cartQuantity);const cart=state.carts[state.userId]||{};const qty=(cart[id]||0)+Number(button.dataset.delta);if(qty>20){toast('Mỗi món tối đa 20 phần.',true);return;}if(qty<=0)delete cart[id];else cart[id]=qty;saveCart();return;}
    if(button.dataset.remove){delete state.carts[state.userId][Number(button.dataset.remove)];saveCart();return;}
    if(Object.hasOwn(button.dataset,'price')){$('#maxPrice').value=button.dataset.price;return;}
    const action=button.dataset.action;
    if(action==='filter'){openFilters();return;}
    if(action==='scroll-foods'){$('#foodSection').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(action==='load-more'){const before=window.scrollY;state.pageSize+=6;render();window.scrollTo(0,before);return;}
    if(action==='clear-all'){state.minPrice=0;state.maxPrice=null;state.spice='any';state.diet='any';state.category='Tất cả';state.pageSize=8;await refreshDashboard();return;}
    if(action==='export'){exportHistory();return;}
    if(action==='cart-browse'){closeDialog('cartDialog');navigate('menu');return;}
    if(action==='detail-minus'||action==='detail-plus'){const input=$('#detailQuantity');input.value=Math.max(1,Math.min(20,(Number(input.value)||1)+(action==='detail-plus'?1:-1)));return;}
    if(button.id==='checkoutButton'){await checkout();return;}
  }catch(e){toast(e.message,true);}
});

$('#cartButton').addEventListener('click',()=>{if(!state.users.length)return;renderCart();showDialog('cartDialog');});
$('#profileButton').addEventListener('click',()=>{if(!state.users.length)return;renderProfiles();showDialog('profileDialog');});
$('#surpriseButton').addEventListener('click',()=>{if(!state.dashboard)return;const pool=state.dashboard.recommendations.length?state.dashboard.recommendations:state.foods;if(!pool.length)return;hideSidebar();openDetail(pool[Math.floor(Math.random()*pool.length)].id);});
$('#brandLink').addEventListener('click',event=>{event.preventDefault();if(state.users.length)navigate('discover');});
$('#mobileMenu').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#sidebarBackdrop').classList.toggle('open',open);$('#mobileMenu').setAttribute('aria-expanded',String(open));});
$('#sidebarBackdrop').addEventListener('click',hideSidebar);
document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$('#searchInput').focus();}if(event.key==='Escape')hideSidebar();});

let searchTimer;
$('#searchInput').addEventListener('input',event=>{
  clearTimeout(searchTimer);const value=event.target.value;
  searchTimer=setTimeout(()=>{if(!state.dashboard)return;state.search=value;state.view='menu';state.restaurantId=null;state.category='Tất cả';state.pageSize=8;refreshDashboard().catch(e=>toast(e.message,true));},180);
});
document.addEventListener('change',event=>{if(event.target.id==='sortSelect'){state.sort=event.target.value;render();}});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog||dialog.id==='preferencesDialog'&&state.preferencesRequired)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
$('#creditsButton').addEventListener('click',()=>{
  const credits=window.FoodPhotoCredits || [];
  $('#creditsContent').innerHTML=`<p class="muted">Ảnh minh họa lấy từ Wikimedia Commons và các nguồn được ghi bên dưới. Món, giá và nhà hàng trong bài tập là dữ liệu giả lập.</p><ul class="credit-list">${credits.map(c=>{
    const used=state.foods.filter(f=>f.image===`assets/food-${String(c.dish_id).padStart(2,'0')}.webp`);if(!used.length)return'';
    const url=(c.source||c.article||'').startsWith('https://')?(c.source||c.article):'#';
    return `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(used.slice(0,2).map(f=>f.ten).join(' / '))}${used.length>2?' và món tương tự':''} ↗</a><small>${esc(c.author||'Tác giả và giấy phép: xem trang ảnh gốc')}${c.license?' · '+esc(c.license):''}${c.note?' · '+esc(c.note):''}</small></li>`;
  }).join('')}</ul>`;showDialog('creditsDialog');
});

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
  loadSequence++;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  hideSidebar();document.body.classList.add('auth-screen');
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
  state.view='discover';state.category='Tất cả';state.search='';state.restaurantId=null;state.pageSize=8;
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
  state.category='Tất cả';state.pageSize=8;closeDialog('preferencesDialog');await refreshDashboard();toast('Đã lưu khẩu vị. Những món hợp gu đang chờ bạn!');
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
  try{const p=checkedPreferences({min_price:Number($('#minPrice').value),max_price:$('#maxPrice').value===''?null:Number($('#maxPrice').value),spice:$('#filterSpice').value,diet:$('#filterDiet').value,categories:state.preferences.categories});state.minPrice=p.min_price;state.maxPrice=p.max_price;state.spice=p.spice;state.diet=p.diet;state.pageSize=8;closeDialog('filterDialog');await refreshDashboard();}
  catch(e){toast(e.message,true);}
});
$('#clearFilters').addEventListener('click',async()=>{state.category='Tất cả';state.minPrice=0;state.maxPrice=null;state.spice='any';state.diet='any';state.pageSize=8;closeDialog('filterDialog');try{await refreshDashboard();}catch(e){toast(e.message,true);}});

async function start(){
  showAuth();
  if(!isFlask)return;
  try{const data=await api.session();if(data.user)await enterApp();}
  catch(e){$('#authError').textContent=e.message;}
}
start();

