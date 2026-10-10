const app = document.getElementById('app');
const money = n => Number(n).toLocaleString('vi-VN') + ' đ';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits = n => String(n).replace(/\D/g, '');
const formatted = n => digits(n).replace(/^(\d{4})(\d{3})(\d{3})$/, '$1.$2.$3');
const statuses = {available:'Còn hàng',reserved:'Đang giữ chỗ',sold:'Đã bán'};
let config={...window.STORE_CONFIG}, settingsLoading=true, connectionNotice='', catalogTypes=[], renderVersion=0;
const simModels=new Map(), pageModels=new Map(), inFlight=new Map(), requestKeys=new WeakMap();
let settingsPromise, activeState;
let favorites = [];
try { favorites = JSON.parse(localStorage.getItem('favorites') || '[]'); if (!Array.isArray(favorites)) favorites=[]; } catch {}
const randomKey=()=>crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
let toastTimer;
function toast(message) { const t=document.getElementById('toast'); t.textContent=message; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('visible'),6000); }
const routePath=()=>location.hash.startsWith('#/')?location.hash.slice(1).split('?')[0]:'/';
const routeSearch=()=>location.hash.includes('?')?location.hash.slice(location.hash.indexOf('?')):'';
const siteBase=new URL('./',location.href);
const routeHref=url=>new URL('#'+url,siteBase).href;
async function api(path,data) {
  if(!SheetsClient.configured()) {
    if(path==='/api/settings')return {...window.STORE_CONFIG};
    if(path.startsWith('/api/sims?'))return {items:[],total:0,page:1,size:24};
    if(path==='/api/sim-options')return {types:[]};
    throw new Error('Kho sim đang được cập nhật. Vui lòng gọi cửa hàng.');
  }
  if(data)return SheetsClient.submit(data);
  const u=new URL(path,'https://local.invalid');
  const params=Object.fromEntries(u.searchParams);
  const action=u.pathname==='/api/settings'?'settings':u.pathname==='/api/sim-options'?'options':/^\/api\/sims\/\d+$/.test(u.pathname)?'sim':'sims';
  if(action==='sim')params.id=u.pathname.split('/').pop();
  const requestId=action+'?'+new URLSearchParams(params);
  if(!inFlight.has(requestId))inFlight.set(requestId,SheetsClient.read(action,params).finally(()=>inFlight.delete(requestId)));
  const response=await inFlight.get(requestId);
  if(action==='settings'&&(!response||!Array.isArray(response.branches)||typeof response.phone!=='string'))throw new Error('Kết nối kho sim đang được cập nhật. Vui lòng gọi cửa hàng.');
  if(action==='sims'&&(!response||!Array.isArray(response.items)))throw new Error('Kho sim đang được cập nhật. Vui lòng gọi cửa hàng.');
  return response;
}
function navigate(url,replace=false) { history[replace?'replaceState':'pushState']({},'',routeHref(url)); closeConsult();render();window.scrollTo(0,0); }
function fixStaticLinks(root=app) {
  root.querySelectorAll('a[href^="/"]').forEach(a=>a.href=routeHref(a.getAttribute('href')));
  root.querySelectorAll('[src^="/"]').forEach(img=>img.src=new URL(img.getAttribute('src').slice(1),siteBase).href);
}
const link=(url,text,cls='')=>`<a class="${cls}" href="${url}">${text}</a>`;
function branchesSelect(name='branch',value='cs1') {return `<label>Cơ sở hỗ trợ<select name="${name}">${config.branches.map(b=>`<option value="${esc(b.id)}" ${value===b.id?'selected':''}>${esc(b.name)} — ${esc(b.address)}</option>`).join('')}</select></label>`;}
const phoneHref=()=>`tel:${digits(config.phone)}`;
function header() { const path=routePath(); return `<div class="top"><div class="container"><span>Viettel Phú Hà · Sim số đẹp · Hỗ trợ đăng ký chính chủ</span><span>⌖ 3 cơ sở tại Phú Thọ</span></div></div><header><div class="container nav"><a class="brand" href="/"><b>viettel</b><span><strong>${esc(config.name)}</strong><small>${esc(config.tagline)}</small></span></a><a class="hotline" href="${phoneHref()}">☎ <span><small>Hotline tư vấn</small><b>${esc(config.phone)}</b></span></a><button class="menu-toggle outline" aria-label="Mở menu" aria-expanded="false">☰</button><nav id="main-nav">${[['/','⌂ Trang chủ'],['/kho-sim','Sim số đẹp'],['/sim-phong-thuy','Sim phong thủy'],['/lien-he','Giới thiệu & Liên hệ']].map(([p,t])=>link(p,t,path===p?'active':'')).join('')}</nav><a class="button support" href="/lien-he">☎ Hỗ trợ nhanh</a></div></header>`; }
function searchForm(value='') {return `<form class="search"><span aria-hidden="true">⌕</span><input name="q" type="search" inputmode="numeric" aria-label="Tìm số sim" placeholder="Nhập số cần tìm: 0868, 999, 6868…" maxlength="30" value="${esc(value)}"><button>Tìm sim</button></form>`;}
function hero(title,subtitle,kind='home') {return `<section class="hero ${kind}">${config.banner_url?`<img class="real-banner" src="${esc(config.banner_url)}" alt="${esc(config.name)}">`:'<div class="scenery"></div>'}<div class="container hero-inner"><div class="hero-copy"><div class="eyebrow">VIETTEL PHÚ HÀ · PHÚ THỌ</div><h1>${title}</h1><h2>${subtitle}</h2>${['home','catalog'].includes(kind)?searchForm(new URLSearchParams(routeSearch()).get('q')||''):''}${kind==='home'?'<div class="quick">Tìm nhanh: <a href="/kho-sim?type=Sim%20tứ%20quý">Tứ quý</a><a href="/kho-sim?type=Sim%20lộc%20phát">Lộc phát</a><a href="/kho-sim?max_price=5000000">Dưới 5 triệu</a></div>':''}</div><div class="hero-art"><div class="script">Chọn số đẹp<br>Chọn điều phù hợp</div><img src="/assets/sim.svg" alt="Thẻ SIM Viettel"></div></div></section>`;}
function card(s,detail=true) {const available=s.status==='available';return `<article class="sim-card"><button class="heart ${favorites.includes(s.id)?'saved':''}" data-save="${s.id}" aria-label="Lưu sim ${esc(formatted(s.number))}" aria-pressed="${favorites.includes(s.id)}">${favorites.includes(s.id)?'♥':'♡'}</button><a class="sim-top" href="/sim/${s.id}"><img src="/assets/sim.svg" alt="SIM Viettel" loading="lazy"><div><h3>${esc(formatted(s.number).slice(0,5))}<em>${esc(formatted(s.number).slice(5))}</em></h3><div class="tags"><span>${esc(s.type)}</span>${s.element?`<span>Mệnh ${esc(s.element)}</span>`:''}</div><b class="price">${money(s.price)}</b><small class="stock ${available?'green':''}">${esc(statuses[s.status])}</small></div></a><div class="card-actions">${detail?link('/sim/'+s.id,'Chi tiết','outline'):''}${available?`<button type="button" class="button purchase" data-buy="${s.id}" aria-label="Mua sim ${esc(formatted(s.number))}">Mua sim</button>`:link('/sim/'+s.id,'Xem sim','outline')}</div></article>`;}
function empty() {return '<div class="empty"><h3>Chưa có sim phù hợp</h3><p>Thử thay đổi bộ lọc hoặc liên hệ để được tìm số theo yêu cầu.</p><a class="outline" href="/lien-he">Nhờ tư vấn chọn sim</a></div>';}
function guarantees() {return `<div class="guarantees container">${[['♢','Sim Viettel','Tư vấn chọn số'],['▣','Đăng ký chính chủ','Hướng dẫn theo quy định'],['♧','Giao sim tận nơi','Xác nhận với cửa hàng'],['▤','Gọi lại tư vấn','Theo yêu cầu của bạn'],['☎','Liên hệ tư vấn',config.phone],['✓','3 cơ sở','Phú Thọ · Việt Trì · Lâm Thao']].map(([i,t,d])=>`<div><i aria-hidden="true">${i}</i><span><b>${esc(t)}</b><small>${esc(d)}</small></span></div>`).join('')}</div>`;}
function footer() {return `${guarantees()}<footer><div class="container footer"><div><h2>${esc(config.name)}</h2><p>${esc(config.tagline)}</p></div><div>${config.branches.map(b=>`<p>⌖ ${esc(b.name)}: ${esc(b.address)}</p>`).join('')}<p>☎ <a href="${phoneHref()}">${esc(config.phone)}</a></p><p>✉ <a href="mailto:${esc(config.email)}">${esc(config.email)}</a></p><p>◷ ${esc(config.hours||'Liên hệ để xác nhận giờ mở cửa')}</p></div><div><b>Hỗ trợ khách hàng</b>${link('/lien-he','Liên hệ & bản đồ')}${link('/chinh-sach','Chính sách cửa hàng')}</div><div><b>Kết nối với chúng tôi</b><p class="social"><a href="${phoneHref()}" aria-label="Gọi cửa hàng">☎</a><a href="mailto:${esc(config.email)}" aria-label="Email cửa hàng">✉</a>${config.zalo_url?`<a href="${esc(config.zalo_url)}" target="_blank" rel="noopener" aria-label="Zalo cửa hàng">Z</a>`:''}</p></div></div></footer><div class="mobile-actions">${link('/kho-sim','▦<span>Kho sim</span>')}${link('/sim-phong-thuy','☯<span>Phong thủy</span>')}<a href="${phoneHref()}">☎<span>Gọi tư vấn</span></a>${config.zalo_url?`<a href="${esc(config.zalo_url)}" target="_blank" rel="noopener">Z<span>Zalo</span></a>`:link('/lien-he','✉<span>Liên hệ</span>')}</div>`;}
function promo() {return `<a class="promo" href="/lien-he"><span class="gift" aria-hidden="true">🎁</span><div><h3>ĐĂNG KÝ CHÍNH CHỦ<br>HỖ TRỢ TẬN TÂM</h3><p>✓ Tư vấn chọn số phù hợp<br>✓ Hướng dẫn thủ tục đăng ký<br>✓ Liên hệ ${esc(config.phone)}</p></div></a>`;}
function home(data=null) {return `${hero('Sim số đẹp - Kết nối thành công','Tìm số sim phù hợp, kết nối giá trị tại Phú Thọ')}<main class="container"><div class="categories">${[['♛','Sim số đẹp','Dễ nhớ - Khẳng định giá trị','/kho-sim'],['☯','Sim phong thủy','Chọn số theo ngũ hành tham khảo','/sim-phong-thuy'],['♙','Sim thần tài','Tìm số theo ý nghĩa bạn yêu thích','/kho-sim?type=Sim%20thần%20tài'],['＄','Sim lộc phát','Khám phá những dãy số 68, 86','/kho-sim?type=Sim%20lộc%20phát']].map(([i,t,d,p])=>`<a href="${p}"><i>${i}</i><div><h3>${t}</h3><small>${d}</small></div><span>›</span></a>`).join('')}</div><div class="home-columns"><section class="panel"><div class="section-heading"><h3>♨ SIM SỐ ĐẸP NỔI BẬT</h3>${link('/kho-sim','Xem tất cả →')}</div><div class="sim-grid home-grid">${data?data.items.map(s=>card(s,false)).join('')||empty():inventoryLoading()}</div></section><aside>${promo()}<a class="consult" href="/lien-he"><h3>☎ TƯ VẤN CHỌN SIM</h3><p>✓ Chọn số phù hợp nhu cầu</p><p>✓ Hỗ trợ tại 3 cơ sở</p><p>✓ Gọi lại theo yêu cầu</p><b>Liên hệ ngay →</b></a></aside></div><section class="store-intro panel"><h3>Viettel Phú Hà — Đồng hành cùng bạn</h3><p>Chọn sim, để lại tên và số điện thoại. Cửa hàng sẽ gọi tư vấn và trao đổi trực tiếp với bạn. Giá bán và tình trạng sim được cập nhật từ kho quản lý.</p><a href="/lien-he" class="outline">Xem 3 cơ sở của chúng tôi →</a></section></main>`;}
function select(name,label,options,value='') {return `<label>${label}<select name="${name}"><option value="">Tất cả</option>${options.map(([v,t])=>`<option value="${esc(v)}" ${value===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function filters(params,feng=false) {return `<form class="filter-row filters"><label class="filter-query">Số cần tìm<input name="q" type="search" inputmode="numeric" placeholder="Ví dụ: 999" value="${esc(params.get('q')||'')}"></label>${select('prefix','Đầu số',['086','096','097','098','032','033','034','035','036','037','038','039'].map(v=>[v,v]),params.get('prefix'))}${select('type','Loại sim',catalogTypes.map(v=>[v,v]),params.get('type'))}${select('max_price','Giá tối đa',[[1000000,'1 triệu'],[5000000,'5 triệu'],[10000000,'10 triệu'],[50000000,'50 triệu']],params.get('max_price'))}${feng?select('element','Ngũ hành',['Kim','Mộc','Thủy','Hỏa','Thổ'].map(v=>[v,v]),params.get('element')):select('branch','Cơ sở',config.branches.map(b=>[b.id,b.name]),params.get('branch'))}${select('status','Tình trạng',[['available','Còn hàng'],['reserved','Đang giữ chỗ'],['sold','Đã bán']],params.get('status'))}${select('sort','Sắp xếp',[['asc','Giá tăng dần'],['desc','Giá giảm dần']],params.get('sort'))}<div class="filter-buttons"><button>Lọc sim</button><a class="outline" href="${feng?'/sim-phong-thuy':'/kho-sim'}">Xóa bộ lọc</a></div></form>`;}
function pager(data,base,params) {const pages=Math.ceil(data.total/data.size);if(pages<2)return '';const pageLink=n=>{const p=new URLSearchParams(params);p.set('page',n);return base+'?'+p};return `<nav class="pagination" aria-label="Phân trang">${data.page>1?link(pageLink(data.page-1),'← Trước','outline'):''}<span>Trang ${data.page} / ${pages}</span>${data.page<pages?link(pageLink(data.page+1),'Tiếp →','outline'):''}</nav>`;}
function catalog(feng=false,data=null) {const params=new URLSearchParams(routeSearch());params.set('size',24);return `${hero(feng?'Sim phong thủy':'Kho sim số đẹp',feng?'Chọn số phù hợp với mong muốn của bạn':'Kho sim Viettel — Cập nhật từ cửa hàng',feng?'feng':'catalog')}<main class="container"><div class="breadcrumb">${link('/','Trang chủ')} › ${feng?'Sim phong thủy':'Kho sim số đẹp'}</div>${feng?`<div class="elements">${[['Kim','✦','#dba900'],['Mộc','❧','#13814b'],['Thủy','≋','#1376bd'],['Hỏa','♨','#e6002d'],['Thổ','△','#97571d']].map(([e,i,c])=>link('/sim-phong-thuy?element='+encodeURIComponent(e),`<i style="background:${c}">${i}</i><div><h2 style="color:${c}">${e}</h2><b>Sim mệnh ${e}</b></div>`,'element '+(params.get('element')===e?'chosen':''))).join('')}</div><p class="notice">Ngũ hành do cửa hàng cung cấp, chỉ mang tính tham khảo; không bảo đảm tài lộc hay thành công.</p>`:''}<div class="section-heading"><h2>${feng?'Chọn sim theo ngũ hành':'Tìm số sim của bạn'}</h2><button class="outline filter-toggle" aria-expanded="false">⚙ Bộ lọc</button></div>${filters(params,feng)}<p class="results">${data?`Tìm thấy ${data.total.toLocaleString('vi-VN')} sim${data.total?` · Hiển thị ${(data.page-1)*data.size+1}–${Math.min(data.page*data.size,data.total)}`:''}`:'Đang cập nhật danh sách sim…'}</p><div class="sim-grid ${feng?'feng-grid':''}">${data?data.items.map(s=>card(s)).join('')||empty():inventoryLoading()}</div>${data?pager(data,feng?'/sim-phong-thuy':'/kho-sim',params):''}</main>`;}
function consent() {return `<label class="consent"><input type="checkbox" name="consent" required><span>Tôi đồng ý <a href="/chinh-sach" target="_blank" rel="noopener">chính sách cửa hàng và xử lý thông tin cá nhân</a> để cửa hàng gọi tư vấn.</span></label><label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>`;}
function formReady() {return !settingsLoading&&Boolean(config.privacy_policy)&&SheetsClient.configured();}
function formNotice() {return settingsLoading?'Đang kết nối cửa hàng. Bạn có thể điền thông tin trước.':!config.privacy_policy?'Cửa hàng đang cập nhật biểu mẫu tư vấn. Vui lòng gọi hotline để được hỗ trợ.':'';}
function orderForm(s,modal=false) {const available=s.status==='available';return `<section class="panel order" id="${modal?'modal-order':'order-form'}"><h3>THÔNG TIN KHÁCH MUA SIM</h3><p>Sim <b class="red">${esc(formatted(s.number))}</b> · ${money(s.price)}</p>${available?`<form class="request-form" data-kind="sim-consult" data-sim-id="${s.id}"><label>Họ và tên *<input name="name" required maxlength="100" autocomplete="name" placeholder="Tên của bạn"></label><label>Số điện thoại *<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" maxlength="30" placeholder="Số để cửa hàng gọi lại"></label><label>Ghi chú (không bắt buộc)<textarea name="message" maxlength="2000" placeholder="Giờ tiện nghe máy hoặc điều bạn muốn hỏi…"></textarea></label><p class="notice">Cửa hàng sẽ gọi tư vấn về sim này và trao đổi các bước tiếp theo với bạn.</p>${consent()}<p class="form-availability notice" ${formReady()?'hidden':''}>${esc(formNotice())}</p><p class="form-error" role="alert"></p><button class="buy" ${formReady()?'':'disabled'}>Gửi thông tin mua sim</button><a class="form-call" href="${phoneHref()}">☎ Gọi ${esc(config.phone)}</a></form>`:`<p class="notice">${esc(statuses[s.status])}. Vui lòng chọn sim khác hoặc liên hệ cửa hàng.</p><a class="button" href="${phoneHref()}">☎ Gọi ${esc(config.phone)}</a>`}</section>`;}
function inventoryLoading(){return '<div class="inventory-loading" role="status"><span class="loading-dot" aria-hidden="true"></span> Đang cập nhật sim từ cửa hàng…</div>';}
function detail(s=null,related=null) {if(!s)return `<main class="container"><div class="breadcrumb">${link('/','Trang chủ')} › ${link('/kho-sim','Kho sim')}</div><section class="panel"><h1>Thông tin sim</h1>${inventoryLoading()}<a class="outline" href="${phoneHref()}">Gọi tư vấn ${esc(config.phone)}</a></section></main>`;return `<main class="container"><div class="breadcrumb">${link('/','Trang chủ')} › ${link('/kho-sim','Kho sim')} › ${esc(formatted(s.number))}</div><div class="detail-layout"><section><div class="product"><div class="product-image"><span>♛ Sim Viettel</span><img src="/assets/sim.svg" alt="Sim ${esc(formatted(s.number))}"></div><div class="product-info"><span class="tag">${esc(s.type)}</span><h1>${esc(formatted(s.number))}</h1><p>${esc(s.description||'Chọn số dễ nhớ, phù hợp với nhu cầu của bạn.')}</p><div class="price-box"><div>Giá bán<strong>${money(s.price)}</strong></div><div>Hỗ trợ<b>Cửa hàng gọi tư vấn</b></div></div><dl><dt>Nhà mạng</dt><dd>Viettel</dd><dt>Loại sim</dt><dd>${esc(s.type)}</dd><dt>Ngũ hành</dt><dd>${esc(s.element||'Chưa phân loại')} (tham khảo)</dd><dt>Cơ sở phụ trách</dt><dd>${esc(s.branch.toUpperCase())}</dd><dt>Tình trạng</dt><dd class="${s.status==='available'?'green':''}">${esc(statuses[s.status])}</dd></dl><button class="outline" data-save="${s.id}" aria-pressed="${favorites.includes(s.id)}">${favorites.includes(s.id)?'♥ Đã lưu':'♡ Lưu sim'}</button> <button class="outline" id="share">↗ Chia sẻ</button><button type="button" class="button mobile-order-link" data-buy="${s.id}" ${s.status!=='available'?'disabled':''}>Mua sim · Nhờ tư vấn</button></div></div><section class="panel detail-description"><h3>HỖ TRỢ KHI MUA SIM</h3><p>Đăng ký chính chủ theo quy định nhà mạng; tư vấn hình thức nhận sim phù hợp.</p><a href="/chinh-sach">Xem thông tin và chính sách cửa hàng →</a></section></section><aside>${orderForm(s)}</aside></div><h3 class="section-title">SIM CÙNG LOẠI</h3><div class="sim-grid related">${related?related.items.filter(x=>x.id!==s.id).map(x=>card(x,false)).join('')||empty():inventoryLoading()}</div></main>`;}
function mapLink(b) {return b.map_url||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.address);}
function contact() {return `${hero(esc(config.name),esc(config.tagline),'contact')}<main class="container"><div class="contact-grid live-contact"><section class="panel contact-info"><h3>Thông tin liên hệ</h3><dl><dt>☎ Hotline</dt><dd><a class="red" href="${phoneHref()}"><b>${esc(config.phone)}</b></a></dd><dt>✉ Email</dt><dd><a href="mailto:${esc(config.email)}">${esc(config.email)}</a></dd><dt>◷ Giờ làm việc</dt><dd>${esc(config.hours||'Vui lòng liên hệ để xác nhận')}</dd></dl>${config.zalo_url?`<a href="${esc(config.zalo_url)}" class="button" target="_blank" rel="noopener">Nhắn Zalo cửa hàng</a>`:''}<div class="branch-cards">${config.branches.map(b=>`<article><b>${esc(b.name)}</b><p>${esc(b.address)}</p><a class="outline" href="${esc(mapLink(b))}" target="_blank" rel="noopener">Chỉ đường Google Maps ↗</a>${b.map_url?'':'<small>Đường dẫn tìm kiếm theo địa chỉ; cửa hàng chưa cập nhật ghim chính xác.</small>'}</article>`).join('')}</div></section><section class="panel"><h3>Gửi yêu cầu tư vấn</h3><p>Nhân viên cơ sở đã chọn sẽ tiếp nhận yêu cầu.</p>${`<form class="request-form" data-kind="contact"><label>Họ tên *<input name="name" required maxlength="100" autocomplete="name"></label><label>Số điện thoại *<input name="phone" type="tel" required maxlength="30" inputmode="tel" autocomplete="tel"></label>${branchesSelect()}<label>Nội dung cần tư vấn *<textarea name="message" required maxlength="2000" placeholder="Số sim, mức giá hoặc dịch vụ bạn quan tâm…"></textarea></label>${consent()}<p class="form-availability notice" ${formReady()?'hidden':''}>${esc(formNotice())}</p><p class="form-error" role="alert"></p><button ${formReady()?'':'disabled'}>Gửi yêu cầu tư vấn</button><a class="form-call" href="${phoneHref()}">☎ Gọi ${esc(config.phone)}</a></form>`}</section></div><section class="panel faq"><h3>Câu hỏi thường gặp</h3>${[['Làm thế nào để chọn sim?','Chọn sim bạn thích, nhập tên và số điện thoại rồi gửi yêu cầu. Cửa hàng sẽ gọi lại để tư vấn và trao đổi trực tiếp.'],['Tôi cần làm gì để đăng ký chính chủ?','Cửa hàng sẽ hướng dẫn thủ tục theo quy định nhà mạng. Website không yêu cầu tải ảnh giấy tờ tùy thân.'],['Gửi yêu cầu có giữ sim cho tôi không?','Yêu cầu giúp cửa hàng biết sim bạn quan tâm. Tình trạng sim và việc giữ sim được trao đổi khi nhân viên gọi lại.']].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section></main>`;}
function policies() {return `<main class="container policy-page"><h1>Chính sách ${esc(config.name)}</h1><p>Vui lòng đọc trước khi gửi thông tin tư vấn. Liên hệ ${esc(config.phone)} để được giải đáp.</p>${[['registration_policy','Hỗ trợ đăng ký chính chủ'],['privacy_policy','Bảo mật & xử lý thông tin cá nhân']].map(([k,t])=>`<section class="panel"><h2>${t}</h2><p class="policy-text">${esc(config[k]||'Cửa hàng đang cập nhật chính sách này. Vui lòng liên hệ trực tiếp để xác nhận trước khi giao dịch.')}</p></section>`).join('')}</main>`;}
function pageContent(state) {
  if(state.path==='/kho-sim')return catalog(false,state.data);
  if(state.path==='/sim-phong-thuy')return catalog(true,state.data);
  if(state.path==='/lien-he')return contact();
  if(state.path==='/chinh-sach')return policies();
  if(state.path.startsWith('/sim/'))return detail(state.data,state.related);
  return home(state.data);
}
function paint(state,preserve=true) {
  if(activeState!==state)return;
  const kept=[];
  if(preserve)app.querySelectorAll('form.request-form[data-kind],form.search,form.filters').forEach(form=>kept.push(form));
  const focused=document.activeElement;
  const selection=focused&&'selectionStart' in focused?[focused.selectionStart,focused.selectionEnd]:null;
  const menuOpen=app.querySelector('.menu-toggle')?.getAttribute('aria-expanded')==='true';
  const filterOpen=app.querySelector('.filters')?.classList.contains('open');
  app.innerHTML=header()+(connectionNotice?`<div class="container notice inventory-error" role="status">${esc(connectionNotice)} <button class="outline" data-retry>Thử lại</button></div>`:'')+(state.error?`<div class="container notice inventory-error" role="alert">${esc(state.error)} <button class="outline" data-retry>Thử lại</button></div>`:'')+pageContent(state)+footer();
  for(const old of kept){
    let replacement;
    if(old.dataset.kind)replacement=app.querySelector(`form[data-kind="${old.dataset.kind}"][data-sim-id="${old.dataset.simId||''}"]`)||(!old.dataset.simId?app.querySelector(`form[data-kind="${old.dataset.kind}"]`):null);
    else replacement=app.querySelector(old.classList.contains('search')?'form.search':'form.filters');
    if(replacement){if(old.classList.contains('filters')){const current=old.querySelector('[name=type]'),fresh=replacement.querySelector('[name=type]');if(current&&fresh){const selected=current.value;current.innerHTML=fresh.innerHTML;current.value=selected;}}replacement.replaceWith(old);}
  }
  fixStaticLinks();bind();updateFormAvailability();
  if(menuOpen){app.querySelector('.menu-toggle')?.setAttribute('aria-expanded','true');app.querySelector('#main-nav')?.classList.add('open');}
  if(filterOpen){app.querySelector('.filters')?.classList.add('open');app.querySelector('.filter-toggle')?.setAttribute('aria-expanded','true');}
  if(focused?.isConnected){focused.focus({preventScroll:true});if(selection&&typeof focused.setSelectionRange==='function')try{focused.setSelectionRange(...selection);}catch{}}
  const title=state.path.startsWith('/sim/')&&state.data?'Sim '+formatted(state.data.number):({'/kho-sim':'Kho sim số đẹp','/sim-phong-thuy':'Sim phong thủy','/lien-he':'Liên hệ','/chinh-sach':'Chính sách'}[state.path]||'Trang chủ');
  document.title=title+' | '+config.name;
  app.querySelectorAll('[data-retry]').forEach(button=>button.onclick=()=>{settingsPromise=null;settingsLoading=true;render(true);});
}
function refreshSettings() {
  if(!settingsPromise){settingsLoading=true;settingsPromise=api('/api/settings').then(fresh=>{config={...window.STORE_CONFIG,...fresh};connectionNotice='';},()=>{connectionNotice='Kết nối cửa hàng chưa ổn định. Vui lòng thử lại hoặc gọi '+config.phone+'.';}).finally(()=>{settingsLoading=false;updateFormAvailability();});}
  return settingsPromise;
}
function remember(data){for(const item of data?.items||[])simModels.set(Number(item.id),item);if(data?.id)simModels.set(Number(data.id),data);}
async function render(preserve=false) {
  const path=routePath();if(path==='/tra-cuu'){navigate('/lien-he',true);return;}
  const version=++renderVersion,key=path+routeSearch();
  const state={path,version,data:pageModels.get(key)||(/^\/sim\/\d+$/.test(path)?simModels.get(Number(path.split('/')[2])):null),related:null,error:''};
  activeState=state;app.setAttribute('aria-busy','true');paint(state,preserve);
  const tasks=[refreshSettings().then(()=>{if(activeState===state)paint(state);})];
  let dataPath;
  if(path==='/kho-sim'||path==='/sim-phong-thuy'){const params=new URLSearchParams(routeSearch());params.set('size',24);dataPath='/api/sims?'+params;tasks.push(api('/api/sim-options').then(result=>{catalogTypes=result.types;if(activeState===state)paint(state);}).catch(()=>{}));}
  else if(/^\/sim\/\d+$/.test(path))dataPath='/api/sims/'+path.split('/')[2];
  else if(!['/lien-he','/chinh-sach'].includes(path))dataPath='/api/sims?size=8&status=available';
  if(dataPath)tasks.push(api(dataPath).then(async data=>{
    remember(data);pageModels.set(key,data);state.data=data;if(activeState===state)paint(state);
    if(path.startsWith('/sim/')){try{state.related=await api('/api/sims?size=4&type='+encodeURIComponent(data.type));remember(state.related);if(activeState===state)paint(state);}catch{state.related={items:[]};if(activeState===state)paint(state);}}
  }).catch(error=>{state.error=error.message;if(!state.data)state.data=path.startsWith('/sim/')?null:{items:[],total:0,page:1,size:24};if(activeState===state)paint(state);}));
  await Promise.allSettled(tasks);if(activeState===state)app.removeAttribute('aria-busy');
}
function updateFormAvailability() {
  document.querySelectorAll('.request-form[data-kind]').forEach(form=>{
    const button=form.querySelector('.buy,button:not([type])');
    if(button&&!form.dataset.submitting)button.disabled=!formReady();
    const note=form.querySelector('.form-availability');if(note){note.hidden=formReady();note.textContent=formNotice();}
    const call=form.querySelector('.form-call');if(call){call.href=phoneHref();call.textContent='☎ Gọi '+config.phone;}
  });
}
function closeConsult(){const dialog=document.getElementById('consult-dialog');if(dialog?.open)dialog.close();}
function openConsult(id) {
  const sim=simModels.get(Number(id));if(!sim||sim.status!=='available'){toast('Vui lòng chọn sim còn hàng.');return;}
  const dialog=document.getElementById('consult-dialog');
  dialog.innerHTML=`<div class="consult-dialog-head"><h2 id="consult-title">Mua sim · Nhờ cửa hàng tư vấn</h2><button type="button" class="outline" id="close-consult" aria-label="Đóng biểu mẫu">✕</button></div>${orderForm(sim,true)}`;
  fixStaticLinks(dialog);bindRequests(dialog);
  dialog.querySelector('#close-consult').onclick=()=>closeConsult();
  dialog.oncancel=event=>{if(dialog.querySelector('[data-submitting]'))event.preventDefault();};
  dialog.onclose=()=>document.body.classList.remove('consult-open');
  document.body.classList.add('consult-open');
  dialog.showModal();dialog.querySelector('[name=name]')?.focus({preventScroll:true});
}
function bindRequests(root) {
  root.querySelectorAll('.request-form[data-kind]').forEach(f=>f.onsubmit=async e=>{
    e.preventDefault();if(f.dataset.submitting||!formReady())return;
    const button=f.querySelector('.buy,button:not([type])'),error=f.querySelector('.form-error');error.textContent='';
    const d=Object.fromEntries(new FormData(f));d.consent=f.elements.consent.checked;
    const phone=String(d.phone).replace(/[\s.+()-]/g,'').replace(/^84/,'0');
    if(!/^0[35789]\d{8}$/.test(phone)){error.textContent='Số điện thoại Việt Nam chưa hợp lệ. Vui lòng kiểm tra lại.';f.elements.phone.focus();return;}
    if(!String(d.name).trim()){error.textContent='Vui lòng nhập họ và tên.';f.elements.name.focus();return;}
    button.disabled=true;f.dataset.submitting='true';
    const fields=[...f.querySelectorAll('input,textarea,select')];fields.forEach(field=>field.disabled=true);
    const close=document.getElementById('close-consult');if(close)close.disabled=true;
    const original=button.textContent;button.textContent='Đang gửi…';
    try{
      if(!requestKeys.has(f))requestKeys.set(f,randomKey());
      await api('/api/leads',{...d,request_key:requestKeys.get(f),...(f.dataset.kind==='sim-consult'?{sim_id:Number(f.dataset.simId)}:{})});
      f.innerHTML='<div class="success-message" role="status" tabindex="-1"><h2>'+(f.dataset.kind==='sim-consult'?'Đã nhận yêu cầu mua sim':'Đã nhận yêu cầu tư vấn')+'</h2><p>Cửa hàng sẽ gọi lại qua số điện thoại bạn đã cung cấp để tư vấn và trao đổi trực tiếp.</p></div>';
      if(f.isConnected)f.querySelector('.success-message').focus({preventScroll:true});else toast('Đã nhận yêu cầu. Cửa hàng sẽ gọi tư vấn.');
    }catch(err){error.textContent=err.message;if(error.isConnected)error.scrollIntoView({block:'center',behavior:'smooth'});}
    finally{delete f.dataset.submitting;fields.forEach(field=>field.disabled=false);if(close)close.disabled=false;if(button.isConnected){button.disabled=!formReady();button.textContent=original;}}
  });
}
function bind() {
  const menu=document.querySelector('.menu-toggle');if(menu)menu.onclick=()=>{const opened=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!opened));document.querySelector('#main-nav').classList.toggle('open',!opened)};
  document.querySelectorAll('.search').forEach(f=>f.onsubmit=e=>{e.preventDefault();navigate('/kho-sim?q='+encodeURIComponent(new FormData(f).get('q')))});
  document.querySelectorAll('.filters').forEach(f=>f.onsubmit=e=>{e.preventDefault();const p=new URLSearchParams();for(const [k,v]of new FormData(f))if(v)p.set(k,v);navigate(routePath()+'?'+p)});
  const filterToggle=document.querySelector('.filter-toggle');if(filterToggle)filterToggle.onclick=()=>{const f=document.querySelector('.filters');const open=f.classList.toggle('open');filterToggle.setAttribute('aria-expanded',String(open))};
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.save);favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];try{localStorage.setItem('favorites',JSON.stringify(favorites))}catch{toast('Trình duyệt không cho lưu trên thiết bị này.')}document.querySelectorAll(`[data-save="${id}"]`).forEach(btn=>{btn.classList.toggle('saved',favorites.includes(id));btn.setAttribute('aria-pressed',String(favorites.includes(id)));btn.textContent=btn.classList.contains('heart')?(favorites.includes(id)?'♥':'♡'):(favorites.includes(id)?'♥ Đã lưu':'♡ Lưu sim')})});
  const share=document.getElementById('share');if(share)share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Đã sao chép liên kết sim')}}catch(e){if(e.name!=='AbortError')toast('Bạn có thể sao chép địa chỉ trên thanh trình duyệt.')}};
  app.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>openConsult(button.dataset.buy));
  bindRequests(app);

}
document.addEventListener('click',e=>{
  const a=e.target.closest('a');
  if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download')||e.button!==0)return;
  if(a.getAttribute('href')==='#order-form'){e.preventDefault();document.getElementById('order-form')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const url=new URL(a.href,location.href);
  if(url.origin!==location.origin||url.pathname!==siteBase.pathname||!url.hash.startsWith('#/'))return;
  e.preventDefault();navigate(url.hash.slice(1));
});
window.addEventListener('popstate',()=>{closeConsult();render()});
window.addEventListener('hashchange',()=>{closeConsult();render()});
if(!window.STATIC_BUILD)render();
