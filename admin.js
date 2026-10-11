/* Viettel Phú Hà - Bảng điều khiển HTML (chỉ đọc).
 * QUAN TRỌNG: Trang tĩnh không lưu tài khoản/mật khẩu và không gửi lệnh quản trị
 * qua API công khai. Mọi thay đổi được chuyển sang Google Apps Script có xác thực.
 */
(() => {
'use strict';
const SCRIPT_URL='https://script.google.com/macros/s/AKfycbyOqVfgrtxYXDyoE5iES7JOr6CAghE0cxqqhdgcfrFP-GY6_PS4mySO5gno7xhWVDPx/exec';
const ADMIN_URL=SCRIPT_URL+'?view=admin';
const money=n=>Number(n||0).toLocaleString('vi-VN')+' đ';
const formatNumber=n=>String(n??'').replace(/\D/g,'').replace(/^(\d{4})(\d{3})(\d{3})$/,'$1.$2.$3');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const statLabel={available:'Còn hàng',reserved:'Đang giữ',sold:'Đã bán'};
const titles={overview:'Tổng quan',inventory:'Kho SIM',orders:'Đơn hàng',reports:'Báo cáo',settings:'Cài đặt'};
const state={page:1,pageSize:15,total:0,items:[],params:new URLSearchParams(),loaded:false,loading:false,serial:0,next:false,pattern:null,cachedScans:new Map(),overviewLoaded:false};
let timeoutToast=0;
function notify(msg){const t=$('admin-toast');t.textContent=String(msg);t.classList.add('is-visible');clearTimeout(timeoutToast);timeoutToast=setTimeout(()=>t.classList.remove('is-visible'),3800);}
// JSONP is used because the existing Google Apps Script read API returns
// ContentService responses via redirects. No administrator credentials here.
let callId=0;
function sheetRead(action, params={}, timeoutMs=20000){return new Promise((resolve,reject)=>{
 const cb='ph_admin_'+Date.now()+'_'+(++callId);
 const url=new URL(SCRIPT_URL);url.search=new URLSearchParams({...params,action,callback:cb}).toString();
 const el=document.createElement('script');let timer,finished=false;
 const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);el.remove();try{delete window[cb];}catch{window[cb]=undefined;}};
 window[cb]=(response)=>{cleanup();if(response?.error)reject(new Error(String(response.error)));else resolve(response);};
 el.onerror=()=>{cleanup();reject(new Error('Không thể kết nối Google Sheets.'))};
 timer=setTimeout(()=>{cleanup();reject(new Error('Kết nối Google Sheets quá lâu.'))},timeoutMs);
 el.src=url.toString();document.head.appendChild(el);
 });}
function fmtStatus(s){const cl=['available','reserved','sold'].includes(s)?s:'sold';return `<span class="status-badge ${cl}">${safe(statLabel[s]||'Đang cập nhật')}</span>`;}
function simHref(item){const id=Number(item.id);return Number.isSafeInteger(id)&&id>0?'./sim.html?id='+id:'./kho-sim.html';}
function simNumberHtml(n){const formatted=formatNumber(n);return formatted.length>4?safe(formatted.slice(0,-3))+'<em>'+safe(formatted.slice(-3))+'</em>':safe(formatted);}
function recentItem(s){return `<div class="recent-item"><span class="mini-sim">viettel</span><div class="recent-info"><b>${simNumberHtml(s.number)}</b><span>${safe(s.type||'Sim Viettel')}</span></div><div class="recent-right"><b>${money(s.price)}</b>${fmtStatus(s.status)}</div></div>`;}
function tableItem(s){const num=safe(formatNumber(s.number)),type=safe(s.type||'Sim Viettel');return `<tr><td class="sim-no">${simNumberHtml(s.number)}</td><td>${type}${s.element?' · Mệnh '+safe(s.element):''}</td><td><span class="table-price">${money(s.price)}</span></td><td>${fmtStatus(s.status)}</td><td><div class="table-actions"><a href="${safe(simHref(s))}" target="_blank" rel="noopener" aria-label="Xem SIM ${num}">Xem</a><a href="${safe(ADMIN_URL)}" target="_blank" rel="noopener noreferrer" aria-label="Quản lý SIM ${num} trong hệ thống bảo mật">Sửa ↗</a></div></td></tr>`;}
function setSync(ok,msg){$('metric-connection').textContent=ok?'Đã kết nối':'Gián đoạn';$('metric-connection').style.color=ok?'#bd002d':'#ae650b';$('metric-sync-note').textContent=msg||'Google Sheets';$('settings-sync').textContent=ok?'Đã kết nối':'Chưa kết nối';}
async function initOverview(force=false){if(state.overviewLoaded&&!force)return;state.overviewLoaded=true;
 $('metric-total-note').textContent='Đang kiểm tra kho dữ liệu...';$('metric-available-note').textContent='Đang lấy tình trạng...';
 try{const r=await sheetRead('sims',{page:'1',size:'6'});if(!Array.isArray(r.items))throw new Error('Dữ liệu kho SIM chưa đúng định dạng.');
 const items=r.items;state.latest=items;
 const total=Number(r.total);$('metric-total').textContent=Number.isFinite(total)?total.toLocaleString('vi-VN'):'—';$('metric-total-note').textContent='Dữ liệu theo kho SIM hiện tại';$('metric-visible').textContent=items.length.toLocaleString('vi-VN');
 $('recent-list').innerHTML=items.length?items.slice(0,5).map(recentItem).join(''):'<p class="loading-message">Kho SIM hiện chưa có dữ liệu.</p>';
 setSync(true,'Kết nối dữ liệu công khai');
 }catch(e){state.overviewLoaded=false;$('metric-total').textContent='—';$('metric-visible').textContent='—';$('metric-total-note').textContent='Chưa tải được dữ liệu';$('recent-list').innerHTML=`<p class="loading-message">${safe(e.message)} <button type="button" class="text-action" id="retry-overview">Thử lại</button></p>`;$('retry-overview')?.addEventListener('click',()=>initOverview(true));setSync(false,'Nhấn thử lại sau');}
 try{const r=await sheetRead('sims',{page:'1',size:'1',status:'available'});if(!Array.isArray(r.items))throw new Error();const count=Number(r.total);$('metric-available').textContent=Number.isFinite(count)?count.toLocaleString('vi-VN'):'—';$('metric-available-note').textContent='Theo trạng thái còn hàng';}
 catch{$('metric-available').textContent='—';$('metric-available-note').textContent='Chưa lấy được số lượng';}
}
async function initSettings(){try{const data=await sheetRead('settings');if(data&&typeof data==='object'){
 if(typeof data.name==='string')$('settings-name').textContent=data.name;
 if(typeof data.phone==='string')$('settings-phone').textContent=data.phone;
 if(typeof data.email==='string')$('settings-email').textContent=data.email;
 }}catch{/* Using public site defaults; no credentials. */}}
async function initTypes(){try{const d=await sheetRead('options');if(!Array.isArray(d.types))return;const selected=$('filter-type').value;$('filter-type').innerHTML='<option value="">Tất cả loại SIM</option>'+d.types.map(t=>`<option value="${safe(t)}">${safe(t)}</option>`).join('');$('filter-type').value=selected;}catch{/* Filters remain usable without metadata. */}}
function parsePattern(raw){const q=String(raw||'').trim();let m;if((m=q.match(/^(\d+)\*$/)))return {prefix:m[1],suffix:''};if((m=q.match(/^\*(\d+)$/)))return {prefix:'',suffix:m[1]};if((m=q.match(/^(\d+)\*(\d+)$/)))return {prefix:m[1],suffix:m[2]};return null;}
async function fetchInventory(params,page){const q=(params.get('q')||'').trim(),pattern=parsePattern(q);
 const query=new URLSearchParams(params);query.delete('q');
 if(!pattern){if(q)query.set('q',q);query.set('page',String(page));query.set('size',String(state.pageSize));return {...await sheetRead('sims',Object.fromEntries(query)),partial:false};}
 if(pattern.prefix)query.set('prefix',pattern.prefix);
 if(!pattern.suffix){query.set('page',String(page));query.set('size',String(state.pageSize));return {...await sheetRead('sims',Object.fromEntries(query)),partial:false};}
 // The existing Sheets API can search for a substring but cannot filter by suffix.
 // Scan matching records and verify endsWith() in the browser. Cache pages per filter.
 query.set('q',pattern.suffix);query.set('size','100');const key=query.toString();
 let scan=state.cachedScans.get(key);if(!scan){scan={rows:[],seen:new Set(),next:1,done:false};state.cachedScans.set(key,scan);if(state.cachedScans.size>20)state.cachedScans.delete(state.cachedScans.keys().next().value);}
 const needed=page*state.pageSize+1;
 while(scan.rows.length<needed&&!scan.done){const request=new URLSearchParams(query);request.set('page',String(scan.next));const resp=await sheetRead('sims',Object.fromEntries(request));const rows=Array.isArray(resp.items)?resp.items:[];
 const before=scan.seen.size;
 for(const row of rows){const value=String(row.number||'').replace(/\D/g,''),id=String(row.id??value);if(scan.seen.has(id))continue;scan.seen.add(id);if(value.endsWith(pattern.suffix)&&(!pattern.prefix||value.startsWith(pattern.prefix)))scan.rows.push(row);}
 const pageNum=Math.max(1,Number(resp.page)||scan.next),size=Math.max(1,Number(resp.size)||100),total=Number(resp.total);
 scan.next++;
 if(!rows.length||(scan.next>2&&before===scan.seen.size)||(Number.isFinite(total)&&pageNum*size>=total)||scan.next>200)scan.done=true;
 }
 const start=(page-1)*state.pageSize;
 return {items:scan.rows.slice(start,start+state.pageSize),total:scan.rows.length,page,size:state.pageSize,partial:!scan.done,hasNext:scan.rows.length>start+state.pageSize};
}
async function loadInventory(){const req=++state.serial;const feedback=$('inventory-feedback');state.loading=true;state.loaded=true;
 $('inventory-count').textContent='Đang tìm dữ liệu SIM...';$('inventory-body').innerHTML='<tr><td class="loading-cell" colspan="5">Đang cập nhật kho SIM...</td></tr>';
 feedback.textContent='';$('page-prev').disabled=true;$('page-next').disabled=true;$('export-current').disabled=true;
 try{const result=await fetchInventory(state.params,state.page);if(req!==state.serial)return;
 if(!result||!Array.isArray(result.items))throw new Error('Dữ liệu kho SIM chưa đúng định dạng.');
 state.items=result.items;state.total=Number(result.total)||0;state.next=result.partial?Boolean(result.hasNext):state.page*state.pageSize<state.total;
 $('inventory-body').innerHTML=state.items.length?state.items.map(tableItem).join(''):'<tr><td colspan="5" class="loading-cell">Không tìm thấy SIM phù hợp. Hãy thay đổi bộ lọc.</td></tr>';
 const label=result.partial?`Đã tìm thấy ít nhất ${state.total.toLocaleString('vi-VN')} SIM khớp đuôi`:`${state.total.toLocaleString('vi-VN')} SIM phù hợp`;
 $('inventory-count').textContent=label;
 if(result.partial)feedback.textContent='Đang quét thêm các trang dữ liệu để kiểm tra đuôi số chính xác. Số lượng có thể tăng khi chuyển trang.';
 $('page-counter').textContent=result.partial?`Trang ${state.page} · Chưa quét hết kho`:`Trang ${state.page} / ${Math.max(1,Math.ceil(state.total/state.pageSize))}`;
 $('page-prev').disabled=state.page<=1;$('page-next').disabled=!state.next;
 $('export-current').disabled=state.items.length===0;
 }catch(e){if(req!==state.serial)return;state.items=[];state.next=false;
 $('inventory-count').textContent='Không tải được kho SIM';$('inventory-body').innerHTML=`<tr><td class="loading-cell" colspan="5">${safe(e.message)}</td></tr>`;
 $('page-counter').textContent='—';feedback.textContent='Bạn vẫn có thể mở trang quản trị chính để làm việc.';
 }finally{if(req===state.serial)state.loading=false;}
}
function activateView(id,updateHash=true){if(!titles[id])id='overview';
 document.querySelectorAll('.view').forEach(view=>{view.hidden=view.id!=='view-'+id;view.classList.toggle('is-active',view.id==='view-'+id);});
 document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===id;b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('topbar-title').textContent=titles[id];document.title=titles[id]+' | Quản trị Viettel Phú Hà';
 if(updateHash)history.replaceState(null,'','#'+id);
 closeMenu();window.scrollTo({top:0,behavior:'instant'});
 if(id==='overview')initOverview();if(id==='inventory'&&!state.loaded)loadInventory();
}
function closeMenu(){$('sidebar').classList.remove('is-open');$('mobile-shade').hidden=true;$('open-sidebar').setAttribute('aria-expanded','false');}
function openMenu(){$('sidebar').classList.add('is-open');$('mobile-shade').hidden=false;$('open-sidebar').setAttribute('aria-expanded','true');}
function csvExport(){if(!state.items.length)return;const rows=[['ID','Số SIM','Loại SIM','Giá VND','Trạng thái','Mệnh'],...state.items.map(s=>[s.id,formatNumber(s.number),s.type||'',s.price||0,statLabel[s.status]||s.status||'',s.element||''])];
 const csv='\ufeff'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='viettel-phu-ha-sim-trang-'+state.page+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Đã xuất danh sách SIM trên trang hiện tại.');}
function setup(){document.querySelectorAll('[data-admin-link]').forEach(a=>{a.href=ADMIN_URL;a.target='_blank';a.rel='noopener noreferrer';});
 document.querySelectorAll('button[data-view]').forEach(btn=>btn.addEventListener('click',()=>activateView(btn.dataset.view)));
 document.querySelectorAll('[data-view-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();activateView(a.dataset.viewLink);}));
 $('open-sidebar').addEventListener('click',openMenu);$('close-sidebar').addEventListener('click',closeMenu);$('mobile-shade').addEventListener('click',closeMenu);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 $('filters-form').addEventListener('submit',e=>{e.preventDefault();state.params=new URLSearchParams(new FormData(e.currentTarget));for(const [key,value] of [...state.params])if(!value)state.params.delete(key);state.page=1;loadInventory();});
 $('page-prev').addEventListener('click',()=>{if(!state.loading&&state.page>1){state.page--;loadInventory();}});
 $('page-next').addEventListener('click',()=>{if(!state.loading&&state.next){state.page++;loadInventory();}});
 $('export-current').addEventListener('click',csvExport);
 window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(titles[view])activateView(view,false);});
 activateView(titles[location.hash.slice(1)]?location.hash.slice(1):'overview',false);
 initSettings();initTypes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
