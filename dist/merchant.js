'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>new Intl.NumberFormat('vi-VN').format(x)+'đ';
let csrf='',current=null,data=null,rid=0,tab='orders',pendingIds=null,busy=false,adminData=null;
function notice(text,error=false){$('#notice').textContent=text;$('#notice').className=error?'error':'';}
async function api(url,method='GET',body){
 const r=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json();if(result.csrf_token)csrf=result.csrf_token;
 if(!r.ok){if(r.status===403&&url==='/api/merchant/dashboard')$('#app').hidden=true;if(r.status===401){$('#app').hidden=true;$('#login').hidden=false;$('#logout').hidden=true;}throw Error(result.error||'Lỗi kết nối');}return result;
}
const selectedOrders=()=>data.orders.filter(o=>o.nha_hang_id===rid);
function drawOrders(){
 const orders=selectedOrders(),pending=orders.filter(o=>o.status==='pending').length;
 $('#stats').innerHTML=[['Chờ xác nhận',pending],['Đơn hoàn tất',orders.filter(o=>o.status==='completed').length],['Doanh thu hoàn tất',money(orders.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total,0))]].map(([a,b])=>`<div class="card">${a}<strong>${b}</strong></div>`).join('');
 $('#newCount').textContent=pending?`(${pending} mới)`:'';
 const filtered=orders.filter(o=>$('#statusFilter').value==='all'||o.status===$('#statusFilter').value);
 $('#orderList').innerHTML=filtered.length?filtered.map(o=>`<article class="card"><div class="order-top"><div><h3>Đơn #${esc(o.id.slice(0,10))}${o.id.startsWith('demo-')?' · Mô phỏng':''}</h3><p>${esc(o.khach_hang)} · ${esc(new Date(o.ngay_dat).toLocaleString('vi-VN'))}</p><small>${esc(o.nha_hang)}</small></div><span class="pill ${esc(o.status)}">${esc(o.status_label)}</span></div><div class="items">${o.items.map(i=>`<div class="item"><span>${i.so_luong} × ${esc(i.ten)} <small>(${money(i.don_gia)}/phần)</small></span><strong>${money(i.thanh_tien)}</strong></div>`).join('')}</div><div class="actions"><strong>Tổng ${money(o.total)}</strong>${o.next_statuses.map(s=>`<button class="${s==='cancelled'?'danger':'primary'}" data-order="${esc(o.id)}" data-status="${esc(s)}">${s==='cancelled'?'Hủy đơn':esc(data.statuses[s])}</button>`).join('')}</div></article>`).join(''):'<div class="card"><h3>Chưa có đơn phù hợp</h3><p>Khách đặt món của quán sẽ xuất hiện tại đây. Trang tự kiểm tra mỗi 10 giây.</p></div>';
}
function drawMenu(){
 const foods=data.foods.filter(f=>f.nha_hang_id===rid);
 $('#foodList').innerHTML=foods.map(f=>`<article class="card"><img src="${esc(f.image)}" alt="Ảnh minh họa ${esc(f.ten)}"><h3>${esc(f.ten)}</h3><p>${esc(f.nhom)} · ${money(f.gia)}</p><p class="muted">${f.chay?'Chay':'Mặn'} · ${['Không cay','Cay nhẹ','Cay nhiều'][f.cay]} · ${f.available?'Đang bán':'Hết món / ẩn'}</p><div class="actions"><button data-edit="${f.id}">Sửa món</button><button data-toggle="${f.id}">${f.available?'Báo hết món':'Mở bán lại'}</button></div></article>`).join('')||'<p>Quán chưa có món. Nhấn Thêm món để tạo thực đơn.</p>';
}
function drawProfile(){const r=data.restaurants.find(r=>r.id===rid);if(!r)return;for(const k of ['ten','dia_chi','is_open'])$('#profileForm').elements[k].value=r[k];}
async function load(quiet=false){
 if(busy)return;busy=true;
 try{
  data=await api('/api/merchant/dashboard');
  const newIds=new Set(data.orders.filter(o=>o.status==='pending').map(o=>o.id));
  if(pendingIds&&[...newIds].some(id=>!pendingIds.has(id)))notice('Có đơn mới! Mở mục Đơn hàng để xác nhận.');
  pendingIds=newIds;
  if(!data.restaurants.some(r=>r.id===rid))rid=data.restaurants[0]?.id||0;
  $('#restaurant').innerHTML=data.restaurants.map(r=>`<option value="${r.id}" ${r.id===rid?'selected':''}>${esc(r.ten)}${r.is_open?'':' (Tạm đóng)'}</option>`).join('');
  $('#app').hidden=false;$('#login').hidden=true;$('#logout').hidden=false;
  $('#greeting').textContent='Xin chào, '+current.ten;
  $('#adminTab').hidden=current.role!=='admin';
  drawOrders();
  if(!quiet){drawMenu();drawProfile();}
 }catch(e){notice(e.message,true);}finally{busy=false;}
}
async function switchTab(value){
 tab=value;for(const t of ['orders','menu','profile','admin','reviews'])$('#'+t).hidden=t!==tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 if(tab==='admin')await loadAdmin();
 if(tab==='reviews')await loadReviews();
}
async function loadAdmin(){
 adminData=await api('/api/admin/users');const form=$('#roleForm');
 form.elements.uid.innerHTML=adminData.users.filter(u=>u.id!==current.id).map(u=>`<option value="${u.id}">${esc(u.ten)} — ${esc(u.email)} (${esc(u.role)})</option>`).join('');
 form.elements.restaurant_ids.innerHTML=data.restaurants.map(r=>`<option value="${r.id}">${esc(r.ten)}</option>`).join('');
 syncRole();
}
function syncRole(){
 const form=$('#roleForm'),uid=Number(form.elements.uid.value),u=adminData.users.find(u=>u.id===uid);if(!u)return;
 form.elements.role.value=u.role;const ids=adminData.ownership.filter(o=>o.nguoi_dung_id===uid).map(o=>o.nha_hang_id);
 for(const o of form.elements.restaurant_ids.options)o.selected=ids.includes(Number(o.value));
}
function openFood(fid){
 const form=$('#foodForm');form.reset();$('#foodError').textContent='';
 form.elements.nhom.innerHTML=data.categories.map(c=>`<option>${esc(c)}</option>`).join('');
 form.elements.image.innerHTML=[...new Map(data.foods.map(f=>[f.image,f])).values()].map(f=>`<option value="${esc(f.image)}">${esc(f.ten)}</option>`).join('')+Array.from({length:24},(_,i)=>`<option value="assets/food-${String(i+1).padStart(2,'0')}.webp">Ảnh ${i+1}</option>`).join('');
 const food=data.foods.find(f=>f.id===fid);if(food){for(const k of ['id','ten','nhom','gia','cay','chay','image','available'])form.elements[k].value=food[k];}else form.elements.id.value='';
 $('#foodTitle').textContent=food?'Sửa món':'Thêm món';$('#foodDialog').showModal();
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{const a=await api('/api/auth/login','POST',{email:f.elements.email.value,password:f.elements.password.value});current=a.user;f.reset();notice('');await load();}catch(e){notice(e.message,true);}finally{b.disabled=false;}});
$('#logout').onclick=async()=>{try{await api('/api/auth/logout','POST',{});location.href='/';}catch(e){notice(e.message,true);}};
$('#restaurant').onchange=()=>{rid=Number($('#restaurant').value);drawOrders();drawMenu();drawProfile();if(tab==='reviews')loadReviews().catch(e=>notice(e.message,true));};
$('#statusFilter').onchange=drawOrders;
$('#refresh').onclick=()=>load();
$('#addFood').onclick=()=>openFood(0);
$('#closeFood').onclick=()=>$('#foodDialog').close();
$('#roleForm').elements.uid.onchange=syncRole;
// Các nút được dựng lại sau mỗi lần nhận dữ liệu, dùng một listener chung.
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 try{
  if(b.dataset.tab){await switchTab(b.dataset.tab);return;}
  if(b.dataset.edit){openFood(Number(b.dataset.edit));return;}
  if(b.dataset.order){b.disabled=true;await api('/api/merchant/orders/'+b.dataset.order,'PATCH',{status:b.dataset.status});notice('Đã cập nhật trạng thái đơn.');await load();}
  if(b.dataset.toggle){b.disabled=true;const f=data.foods.find(f=>f.id===Number(b.dataset.toggle));await api('/api/merchant/foods/'+f.id,'PUT',{...f,available:f.available?0:1});notice('Đã cập nhật trạng thái bán.');await load();}
 }catch(e){notice(e.message,true);}finally{b.disabled=false;}
});
$('#foodForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;
 try{const body=Object.fromEntries(new FormData(f));let fid=body.id;delete body.id;delete body.photo;for(const k of ['gia','cay','chay','available'])body[k]=Number(body[k]);
 const saved=await api(fid?'/api/merchant/foods/'+fid:'/api/merchant/restaurants/'+rid+'/foods',fid?'PUT':'POST',body);fid=fid||saved.id;f.elements.id.value=fid;
 const file=f.elements.photo.files[0];if(file){const upload=new FormData();upload.append('image',file);const response=await fetch('/api/merchant/foods/'+fid+'/image',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf},body:upload});const result=await response.json();if(!response.ok)throw Error('Món đã lưu. '+(result.error||'Chưa tải được ảnh.'));}
 $('#foodDialog').close();notice('Đã lưu món và ảnh.');await load();
 }catch(e){$('#foodError').textContent=e.message;}finally{b.disabled=false;}
});
$('#profileForm').addEventListener('submit',async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const body=Object.fromEntries(new FormData(e.target));body.is_open=Number(body.is_open);await api('/api/merchant/restaurants/'+rid,'PUT',body);notice('Đã lưu thông tin quán.');await load();}catch(e){notice(e.message,true);}finally{b.disabled=false;}});
$('#roleForm').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{await api('/api/admin/users/'+f.elements.uid.value+'/role','PUT',{role:f.elements.role.value,restaurant_ids:[...f.elements.restaurant_ids.selectedOptions].map(o=>Number(o.value))});notice('Đã cấp quyền. Người bán có thể vào Quản lý nhà hàng.');await loadAdmin();}catch(e){notice(e.message,true);}finally{b.disabled=false;}});
async function start(){try{const a=await api('/api/session');current=a.user;$('#logout').hidden=!current;if(current)await load();else $('#login').hidden=false;}catch(e){notice(e.message,true);}}
setInterval(()=>{if(current&&data&&!document.hidden&&!$('#foodDialog').open)load(true);},10000);
start();

let merchantReviewSequence=0;
async function loadReviews(page=1){
 const sequence=++merchantReviewSequence,restaurantId=rid;
 $('#merchantReviewList').innerHTML='<p>Đang tải đánh giá…</p>';
 const result=await api('/api/merchant/reviews?restaurant_id='+rid+'&page='+page);
 if(sequence!==merchantReviewSequence||restaurantId!==rid)return;
 $('#merchantReviewList').innerHTML=result.reviews.map(r=>`<article class="card"><div class="heading"><div><h3>${esc(r.dish_name)}</h3><p>${esc(r.author)} · ${r.rating}/5 ★ · ${esc(new Date(r.updated_at).toLocaleDateString('vi-VN'))}</p></div><span class="pill">Đã mua món</span></div><p class="customer-review-text">${esc(r.comment||'Khách chỉ chấm sao, chưa viết nhận xét.')}</p>${r.reply?`<div class="reply-saved"><strong>Phản hồi đang hiển thị</strong><p>${esc(r.reply.comment)}</p></div>`:''}<form class="replyForm" data-review-id="${r.id}"><label>Phản hồi của nhà hàng<textarea name="comment" rows="3" minlength="1" maxlength="2000" required>${esc(r.reply?.comment||'')}</textarea></label><p class="reply-status" role="status"></p><button class="primary" type="submit">${r.reply?'Cập nhật phản hồi':'Gửi phản hồi'}</button></form></article>`).join('')||'<div class="card">Quán chưa có đánh giá từ khách đã hoàn tất đơn.</div>';
 if(result.page>1||result.has_more)$('#merchantReviewList').insertAdjacentHTML('beforeend',`<div class="review-pages"><button data-merchant-review-page="${result.page-1}" ${result.page===1?'disabled':''}>Trước</button><span>Trang ${result.page}</span><button data-merchant-review-page="${result.page+1}" ${result.has_more?'':'disabled'}>Tiếp</button></div>`);
}
document.addEventListener('click',event=>{const b=event.target.closest('[data-merchant-review-page]');if(b)loadReviews(Number(b.dataset.merchantReviewPage)).catch(e=>notice(e.message,true));});
document.addEventListener('submit',async event=>{
 if(!event.target.classList.contains('replyForm'))return;event.preventDefault();
 const form=event.target,b=form.querySelector('button'),status=form.querySelector('.reply-status');
 if(b.disabled)return;b.disabled=true;status.textContent='Đang lưu…';
 try{await api('/api/merchant/reviews/'+form.dataset.reviewId+'/reply','PUT',{comment:form.elements.comment.value});status.textContent='Đã lưu. Khách xem được phản hồi trong chi tiết món.';}
 catch(e){status.textContent=e.message;}finally{b.disabled=false;}
});
