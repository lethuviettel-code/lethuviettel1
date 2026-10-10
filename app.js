/* ===== 1. CẤU HÌNH CỬA HÀNG (sửa scriptUrl ở đây khi đổi Apps Script) ===== */
/* Dán URL Web App /exec của Apps Script vào đây. Không đặt mật khẩu trong tệp này. */
window.STORE_CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbyaN6CyCGo4Jjo-BUIy-ojGnSopHLBaxCBkzLMDcC3gg7sISl0mbVYFIRfRWVgi__Yq/exec',
  name: 'Viettel Phú Hà', phone: '0344.639.666', email: 'thuntlpto.9x@gmail.com',
  tagline: 'Kết nối giá trị - Đồng hành cùng bạn',
  hours: '', zalo_url: '', site_url: '', banner_url: '', privacy_policy: '', registration_policy: '',
  branches: [
    {id:'cs1',name:'CS1',address:'KCN Phú Hà, thị xã Phú Thọ, Phú Thọ',map_url:''},
    {id:'cs2',name:'CS2',address:'Thanh Miếu, Việt Trì, Phú Thọ',map_url:''},
    {id:'cs3',name:'CS3',address:'Cao Mại, Lâm Thao, Phú Thọ',map_url:''}
  ]
};

/* ===== 2. KẾT NỐI GOOGLE SHEETS ===== */
/* Apps Script ContentService redirects across origins. JSONP reads and confirmed
   no-cors writes work without browser preflight or exposing admin credentials. */
(function () {
  let sequence = 0;
  function endpoint() {
    const value = String(window.STORE_CONFIG?.scriptUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value)) {
      throw new Error('Cửa hàng chưa kết nối Google Sheets. Vui lòng gọi 0344.639.666.');
    }
    return value;
  }
  function read(action, params = {}, timeout = 20000) {
    return new Promise((resolve, reject) => {
      let url;
      try { url = new URL(endpoint()); } catch (e) { reject(e); return; }
      const callback = 'phuha_' + Date.now() + '_' + (++sequence);
      url.search = new URLSearchParams({...params, action, callback}).toString();
      const script = document.createElement('script');
      let timer;
      const clean = () => {clearTimeout(timer); script.remove(); delete window[callback];};
      window[callback] = result => {clean(); if(result?.error){const error=new Error(result.error);error.fromSheet=true;reject(error);}else resolve(result);};
      script.onerror = () => {clean(); reject(new Error('Chưa kết nối được kho sim. Vui lòng thử lại hoặc gọi cửa hàng.'));};
      timer = setTimeout(() => {clean(); reject(new Error('Kết nối Google Sheets quá lâu. Vui lòng thử lại.'));}, timeout);
      script.src = url.toString(); document.head.appendChild(script);
    });
  }
  async function submit(data) {
    // The response is opaque: only show success after the Sheet confirms this key.
    const controller=new AbortController(), deadline=Date.now()+60000;
    const postTimer=setTimeout(()=>controller.abort(),12000);
    try {
      await fetch(endpoint(), {method:'POST',mode:'no-cors',credentials:'omit',
        signal:controller.signal,
        headers:{'Content-Type':'text/plain;charset=UTF-8'},
        body:JSON.stringify({action:'submitLead', ...data})});
    } catch { /* A lost response can still mean the Sheet saved the request. */ }
    finally {clearTimeout(postTimer);}
    for (let n=0;n<6&&Date.now()<deadline;n++) {
      try {
        const result=await read('receipt',{key:data.request_key},Math.min(15000,deadline-Date.now()));
        if(result.received) return result;
        if(result.error) throw new Error(result.error);
      } catch(e) { if(e.fromSheet||n===5) throw e; }
      if(n<5) await new Promise(resolve=>setTimeout(resolve,800));
    }
    throw new Error('Chưa xác nhận được yêu cầu đã lưu. Bấm gửi lại để kiểm tra; hệ thống tránh tạo trùng.');
  }
  window.SheetsClient={read,submit,configured:()=>Boolean(window.STORE_CONFIG?.scriptUrl)};
})();

/* ===== 3. GIAO DIỆN WEBSITE ===== */

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
const ic=(n,c='')=>`<svg class="ic ${c}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
const SITE='https://simdep68.vn';
const ROUTES=['/kho-sim','/sim-phong-thuy','/lien-he','/chinh-sach'];
const normPath=p=>(String(p).replace(/index\.html$/,'').replace(/\/+$/,''))||'/';
function routePath(){const p=normPath(location.pathname);if(p==='/sim'){const id=new URLSearchParams(location.search).get('id');return /^\d+$/.test(id||'')?'/sim/'+id:'/sim';}return p;}
const routeSearch=()=>routePath().startsWith('/sim')?'':location.search;
function toHref(url){const [path,...q]=String(url).split('?');const m=path.match(/^\/sim\/(\d+)\/?$/);if(m)return '/sim/?id='+m[1];const clean=path==='/'?'/':path.replace(/\/+$/,'')+'/';return clean+(q.length?'?'+q.join('?'):'');}
function internalFrom(u){const p=normPath(u.pathname);if(p==='/sim'){const id=u.searchParams.get('id');return /^\d+$/.test(id||'')?'/sim/'+id:null;}return p==='/'||ROUTES.includes(p)?p+u.search:null;}
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
function navigate(url,replace=false) { history[replace?'replaceState':'pushState']({},'',toHref(url)); closeConsult();render();window.scrollTo(0,0); }
function fixStaticLinks(root=app) {
  root.querySelectorAll('a[href^="/"]').forEach(a=>{const h=a.getAttribute('href');if(!h.startsWith('//'))a.setAttribute('href',toHref(h));});
}
const link=(url,text,cls='')=>`<a class="${cls}" href="${toHref(url)}"${cls.split(' ').includes('active')?' aria-current="page"':''}>${text}</a>`;
function branchesSelect(name='branch',value='cs1') {return `<label>Cơ sở hỗ trợ<select name="${name}">${config.branches.map(b=>`<option value="${esc(b.id)}" ${value===b.id?'selected':''}>${esc(b.name)} — ${esc(b.address)}</option>`).join('')}</select></label>`;}
const phoneHref=()=>`tel:${digits(config.phone)}`;
function header() { const path=routePath(); return `<a class="skip" href="#main">Bỏ qua điều hướng</a><header class="site-header"><div class="container nav"><a class="brand" href="/" aria-label="${esc(config.name)} - Trang chủ"><svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#e4002b"/><path d="M9.5 12h6.2l4.3 11.2L24.3 12h6.2L22.9 30h-5.8z" fill="#fff"/></svg><span><strong>${esc(config.name)}</strong><small>${esc(config.tagline)}</small></span></a><nav id="main-nav" aria-label="Menu chính">${[['/','Trang chủ'],['/kho-sim','Sim số đẹp'],['/sim-phong-thuy','Sim phong thủy'],['/lien-he','Liên hệ']].map(([p,t])=>link(p,t,path===p||(p==='/kho-sim'&&path.startsWith('/sim/'))?'active':'')).join('')}</nav><a class="hotline" href="${phoneHref()}" aria-label="Gọi hotline ${esc(config.phone)}">${ic('phone')}<span><small>Hotline tư vấn</small><b>${esc(config.phone)}</b></span></a><button type="button" class="menu-toggle outline" aria-label="Mở menu" aria-expanded="false" aria-controls="main-nav">${ic('menu')}</button></div></header>`; }
function searchForm(value='') {return `<form class="search" role="search" action="/kho-sim/" method="get">${ic('search')}<input name="q" type="search" inputmode="numeric" aria-label="Tìm số sim" placeholder="Nhập dãy số: 6868, 999…" maxlength="30" value="${esc(value)}" autocomplete="off"><button>Tìm sim</button></form>`;}
const simNumber=n=>{const f=formatted(n);return esc(f.slice(0,-3))+'<em>'+esc(f.slice(-3))+'</em>';};
const SIM_PATH='M179 100H343L405 162V416a24 24 0 0 1-24 24H179a24 24 0 0 1-24-24V124a24 24 0 0 1 24-24Z';
const simCardArt=(label='')=>`<path d="${SIM_PATH}" fill="#e4002b"/><path d="${SIM_PATH}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2"/><rect x="195" y="190" width="120" height="96" rx="14" fill="#f3dfae"/><path d="M195 222h120M195 254h120M243 190v96M267 190v96" stroke="#b58a2e" stroke-width="3" fill="none"/><rect x="243" y="222" width="24" height="32" fill="#e4c880" stroke="#b58a2e" stroke-width="3"/>${label}`;
const ART_FONT="Bricolage Grotesque,Be Vietnam Pro,Arial,sans-serif";
function heroArt(){return `<svg viewBox="0 0 560 540" xmlns="http://www.w3.org/2000/svg" focusable="false"><rect width="560" height="540" fill="#2a0710"/><g font-family="${ART_FONT}" font-weight="800" fill="#fff" fill-opacity=".055" letter-spacing="-10"><text x="-24" y="222" font-size="250">6868</text><text x="-36" y="512" font-size="250">999</text></g><g transform="rotate(11 300 280)"><path d="${SIM_PATH}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/></g><g class="sim-front"><g transform="rotate(-8 280 270)">${simCardArt(`<text x="176" y="410" font-size="108" font-weight="800" fill="#fff" font-family="${ART_FONT}" letter-spacing="-5">68</text>`)}</g></g></svg>`;}
function productArt(f){const head=f.slice(0,-3),tail=f.slice(-3);return `<svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false"><rect width="400" height="500" fill="#2a0710"/><text x="-14" y="190" font-size="190" font-weight="800" fill="#fff" fill-opacity=".055" letter-spacing="-10" font-family="${ART_FONT}">${esc(digits(f).slice(-4))}</text><g transform="translate(-20 -8) scale(.86) rotate(-7 280 270)">${simCardArt()}</g><text x="200" y="468" text-anchor="middle" font-size="34" font-weight="800" fill="#fff" letter-spacing="-1" font-family="${ART_FONT}">${esc(head)}<tspan fill="#ff5470">${esc(tail)}</tspan></text></svg>`;}
function homeHero() {return `<section class="hero" aria-labelledby="hero-title"><div class="container hero-grid"><div class="hero-copy"><h1 id="hero-title">Sim số đẹp Viettel tại Phú Thọ</h1><p class="lede">Chọn số theo dãy số, mức giá hoặc ngũ hành. Cửa hàng gọi lại tư vấn và hướng dẫn đăng ký chính chủ tại 3 cơ sở: thị xã Phú Thọ, Việt Trì và Lâm Thao.</p>${searchForm('')}<div class="quick"><span>Tìm nhanh:</span>${link('/kho-sim?type=Sim%20tứ%20quý','Tứ quý')}${link('/kho-sim?type=Sim%20lộc%20phát','Lộc phát')}${link('/kho-sim?type=Sim%20thần%20tài','Thần tài')}${link('/kho-sim?max_price=5000000','Dưới 5 triệu')}</div></div><div class="hero-art" aria-hidden="true">${heroArt()}</div></div></section>`;}
function crumbs(items) {return `<nav class="breadcrumb" aria-label="Đường dẫn"><ol>${items.map(([h,t],i)=>`<li>${h&&i<items.length-1?link(h,t):`<span aria-current="page">${t}</span>`}</li>`).join('')}</ol></nav>`;}
function pageHead(title,sub,items,withSearch=false) {return `<section class="page-head"><div class="container">${crumbs(items)}<h1>${title}</h1>${sub?`<p class="lede">${sub}</p>`:''}${withSearch?searchForm(new URLSearchParams(routeSearch()).get('q')||''):''}</div></section>`;}
function card(s,detail=true) {const available=s.status==='available',saved=favorites.includes(s.id),f=formatted(s.number);return `<article class="sim-card"><button type="button" class="heart ${saved?'saved':''}" data-save="${s.id}" aria-label="Lưu sim ${esc(f)}" aria-pressed="${saved}">${ic('heart')}</button><a class="sim-top" href="/sim/${s.id}"><div class="tags"><span>${esc(s.type)}</span>${s.element?`<span>Mệnh ${esc(s.element)}</span>`:''}</div><h3 class="sim-number">${simNumber(s.number)}</h3><div class="sim-meta"><b class="price">${money(s.price)}</b><small class="stock ${available?'green':''}">${esc(statuses[s.status]||'')}</small></div></a><div class="card-actions">${detail?link('/sim/'+s.id,'Chi tiết','outline'):''}${available?`<button type="button" class="button purchase" data-buy="${s.id}" aria-label="Mua sim ${esc(f)}">Mua sim</button>`:link('/sim/'+s.id,'Xem sim','outline')}</div></article>`;}
function empty() {return `<div class="empty"><h3>Chưa có sim phù hợp</h3><p>Thử thay đổi bộ lọc hoặc liên hệ để được tìm số theo yêu cầu.</p>${link('/lien-he','Nhờ tư vấn chọn sim','outline')}</div>`;}
function guarantees() {return `<section class="guarantees" aria-label="Cam kết của cửa hàng">${[['shield','Đăng ký chính chủ','Hướng dẫn theo quy định'],['headset','Gọi lại tư vấn','Theo yêu cầu của bạn'],['truck','Giao sim tận nơi','Xác nhận với cửa hàng'],['pin','3 cơ sở','Phú Thọ, Việt Trì, Lâm Thao']].map(([i,t,d])=>`<div><i>${ic(i)}</i><span><b>${esc(t)}</b><small>${esc(d)}</small></span></div>`).join('')}</section>`;}
function footer() {return `<footer class="site-footer"><div class="container footer-grid"><div><strong>${esc(config.name)}</strong><p>${esc(config.tagline)}</p><a class="f-phone" href="${phoneHref()}">${ic('phone')}${esc(config.phone)}</a><p><a href="mailto:${esc(config.email)}">${esc(config.email)}</a></p><p>${esc(config.hours||'Liên hệ để xác nhận giờ mở cửa')}</p></div><div><p class="f-title">Cơ sở tại Phú Thọ</p><ul>${config.branches.map(b=>`<li><b>${esc(b.name)}</b><br>${esc(b.address)}</li>`).join('')}</ul></div><div><p class="f-title">Danh mục sim</p><ul><li>${link('/kho-sim','Sim số đẹp')}</li><li>${link('/sim-phong-thuy','Sim phong thủy')}</li><li>${link('/kho-sim?type=Sim%20tứ%20quý','Sim tứ quý')}</li><li>${link('/kho-sim?type=Sim%20lộc%20phát','Sim lộc phát')}</li><li>${link('/kho-sim?type=Sim%20thần%20tài','Sim thần tài')}</li></ul></div><div><p class="f-title">Hỗ trợ khách hàng</p><ul><li>${link('/lien-he','Liên hệ & bản đồ')}</li><li>${link('/chinh-sach','Chính sách cửa hàng')}</li>${config.zalo_url?`<li><a href="${esc(config.zalo_url)}" target="_blank" rel="noopener">Nhắn Zalo cửa hàng</a></li>`:''}</ul></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} ${esc(config.name)}. Giá và tình trạng sim do cửa hàng cập nhật.</span><span>Sim Viettel tại Phú Thọ, Việt Trì, Lâm Thao</span></div></footer><nav class="mobile-actions" aria-label="Thao tác nhanh">${link('/kho-sim',ic('search')+'<span>Kho sim</span>')}${link('/sim-phong-thuy',ic('compass')+'<span>Phong thủy</span>')}<a class="call" href="${phoneHref()}">${ic('phone')}<span>Gọi tư vấn</span></a>${config.zalo_url?`<a href="${esc(config.zalo_url)}" target="_blank" rel="noopener"><b class="ic" style="font-size:20px;line-height:1.1;text-align:center">Z</b><span>Zalo</span></a>`:link('/lien-he',ic('mail')+'<span>Liên hệ</span>')}</nav>`;}
function consultCard() {return `<aside class="consult-card" aria-labelledby="consult-card-title"><h3 id="consult-card-title">Cần tư vấn chọn sim?</h3><ul><li>${ic('check')}Chọn số phù hợp nhu cầu và ngân sách</li><li>${ic('check')}Hướng dẫn thủ tục đăng ký chính chủ</li><li>${ic('check')}Hỗ trợ tại 3 cơ sở, gọi lại theo yêu cầu</li></ul><a class="button" href="${phoneHref()}">${ic('phone')}Gọi ${esc(config.phone)}</a>${link('/lien-he','Gửi yêu cầu tư vấn','outline')}</aside>`;}
function branchesSection() {return `<section aria-labelledby="branch-title"><div class="section-head"><h2 id="branch-title">3 cơ sở tại Phú Thọ</h2>${link('/lien-he','Thông tin liên hệ')}</div><div class="branch-grid">${config.branches.map(b=>`<article class="branch"><h3>${ic('pin')}${esc(b.name)}</h3><p>${esc(b.address)}</p><a class="outline" href="${esc(mapLink(b))}" target="_blank" rel="noopener">Chỉ đường${ic('external')}</a></article>`).join('')}</div></section>`;}
function buyingSteps() {
  return `<section aria-labelledby="buying-title">
    <div class="section-head"><h2 id="buying-title">Mua sim trong 3 bước</h2></div>
    <ol class="step-cards">${[
      ['1','Chọn sim bạn thích','Tìm theo số, mức giá hoặc cơ sở. Bấm Mua sim để mở biểu mẫu.'],
      ['2','Để lại thông tin','Điền tên, số điện thoại và giờ tiện nghe máy. Gửi yêu cầu gọi lại.'],
      ['3','Cửa hàng gọi tư vấn','Nhân viên xác nhận sim, giá, thủ tục và cách nhận sim trực tiếp với bạn.']
    ].map(([n,title,text])=>`<li class="step-card"><span class="step-number" aria-hidden="true">${n}</span><div><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol>
    <p class="section-note">Gửi yêu cầu chưa giữ chỗ cho sim. Cửa hàng xác nhận tình trạng khi liên hệ với bạn.</p>
  </section>`;
}
function ctaBand() {return `<section class="cta-band" aria-labelledby="cta-title"><div class="container"><div class="cta-main"><div><h2 id="cta-title">Chưa thấy số ưng ý? Để cửa hàng tìm giúp bạn.</h2><p>Cho nhân viên biết dãy số và ngân sách bạn quan tâm. Cửa hàng gọi lại tư vấn, hướng dẫn đăng ký chính chủ tại 3 cơ sở ở Phú Thọ.</p></div><div class="cta-actions"><a class="button" href="${phoneHref()}">${ic('phone')}${esc(config.phone)}</a>${link('/lien-he','Gửi yêu cầu tư vấn','outline')}</div></div>${guarantees()}</div></section>`;}
const ELEMENT_DOTS=['#b8891f','#13814b','#1376bd','#e4002b','#8a5a2b'];
function home(data=null) {
  return `${homeHero()}
  <main id="main" class="container page-sections">
    <section aria-labelledby="cat-title"><div class="section-head"><h2 id="cat-title">Chọn sim theo nhu cầu</h2></div><div class="categories">${[
      ['88<b>88</b>','Sim số đẹp','Dễ nhớ, khẳng định giá trị','/kho-sim'],
      [ELEMENT_DOTS.map(c=>`<i style="background:${c}"></i>`).join(''),'Sim phong thủy','Chọn theo ngũ hành để tham khảo','/sim-phong-thuy'],
      ['39<b>79</b>','Sim thần tài','Tìm số theo ý nghĩa bạn thích','/kho-sim?type=Sim%20thần%20tài'],
      ['68<b>68</b>','Sim lộc phát','Khám phá các dãy số 68, 86','/kho-sim?type=Sim%20lộc%20phát']
    ].map(([art,t,d,p])=>`<a href="${toHref(p)}"><span class="cat-digits${art.startsWith('<i')?' cat-elements':''}" aria-hidden="true">${art}</span><div><h3>${t}</h3><small>${d}</small></div>${ic('chev','chev')}</a>`).join('')}</div></section>
    <div class="home-columns">
      <section aria-labelledby="stock-title"><div class="section-head"><h2 id="stock-title">Sim số đẹp đang có</h2>${link('/kho-sim','Xem tất cả')}</div>
        <div class="sim-grid home-grid">${data?data.items.map(s=>card(s,false)).join('')||empty():inventoryLoading()}</div>
      </section>
      ${consultCard()}
    </div>
    ${buyingSteps()}
    ${branchesSection()}
  </main>
  ${ctaBand()}
  <div class="container seo-block"><section class="seo-copy"><h2>Sim Viettel số đẹp tại Phú Thọ</h2><p>${esc(config.name)} có kho sim Viettel số đẹp và sim phong thủy tại thị xã Phú Thọ, Việt Trì và Lâm Thao. Bạn có thể tìm theo dãy số, đầu số, mức giá hoặc ngũ hành, rồi để lại thông tin để nhân viên gọi lại tư vấn.</p><p>Giá và tình trạng sim được cập nhật từ cửa hàng. Gửi yêu cầu chưa giữ chỗ cho sim; nhân viên xác nhận sim, giá, thủ tục đăng ký chính chủ và cách nhận sim khi liên hệ với bạn.</p></section></div>`;
}
function select(name,label,options,value='') {return `<label>${label}<select name="${name}"><option value="">Tất cả</option>${options.map(([v,t])=>`<option value="${esc(v)}" ${value===String(v)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function filters(params,feng=false) {return `<form class="filter-row filters"><label class="filter-query">Số cần tìm<input name="q" type="search" inputmode="numeric" placeholder="Ví dụ: 999" value="${esc(params.get('q')||'')}"></label>${select('prefix','Đầu số',['086','096','097','098','032','033','034','035','036','037','038','039'].map(v=>[v,v]),params.get('prefix'))}${select('type','Loại sim',catalogTypes.map(v=>[v,v]),params.get('type'))}${select('max_price','Giá tối đa',[[1000000,'1 triệu'],[5000000,'5 triệu'],[10000000,'10 triệu'],[50000000,'50 triệu']],params.get('max_price'))}${feng?select('element','Ngũ hành',['Kim','Mộc','Thủy','Hỏa','Thổ'].map(v=>[v,v]),params.get('element')):select('branch','Cơ sở',config.branches.map(b=>[b.id,b.name]),params.get('branch'))}${select('status','Tình trạng',[['available','Còn hàng'],['reserved','Đang giữ chỗ'],['sold','Đã bán']],params.get('status'))}${select('sort','Sắp xếp',[['asc','Giá tăng dần'],['desc','Giá giảm dần']],params.get('sort'))}<div class="filter-buttons"><button>Lọc sim</button><a class="outline" href="${feng?'/sim-phong-thuy':'/kho-sim'}">Xóa bộ lọc</a></div></form>`;}
function pager(data,base,params) {const pages=Math.ceil(data.total/data.size);if(pages<2)return '';const pageLink=n=>{const p=new URLSearchParams(params);p.set('page',n);return base+'?'+p};return `<nav class="pagination" aria-label="Phân trang">${data.page>1?link(pageLink(data.page-1),'← Trước','outline'):''}<span>Trang ${data.page} / ${pages}</span>${data.page<pages?link(pageLink(data.page+1),'Tiếp →','outline'):''}</nav>`;}
function catalog(feng=false,data=null) {
  const params=new URLSearchParams(routeSearch());params.delete('size');
  return `${pageHead(feng?'Sim phong thủy Viettel':'Kho sim số đẹp Viettel',feng?'Chọn số theo ngũ hành để tham khảo. Cửa hàng phân loại và tư vấn thêm theo nhu cầu của bạn.':'Kho sim Viettel cập nhật từ cửa hàng. Lọc theo đầu số, loại sim, mức giá và cơ sở.',[['/','Trang chủ'],[null,feng?'Sim phong thủy':'Kho sim số đẹp']],true)}
  <main id="main" class="container page-sections">
    ${feng?`<section class="panel element-section"><h2>Chọn ngũ hành</h2><div class="elements">${[['Kim','金','#9a7412'],['Mộc','木','#13814b'],['Thủy','水','#1376bd'],['Hỏa','火','#e4002b'],['Thổ','土','#8a5a2b']].map(([e,i,c])=>link('/sim-phong-thuy?element='+encodeURIComponent(e),`<i style="background:${c}" aria-hidden="true">${i}</i><div><h3>${e}</h3><b>Sim mệnh ${e}</b></div>`,'element '+(params.get('element')===e?'chosen':''))).join('')}</div><p class="section-note">Ngũ hành do cửa hàng phân loại để tham khảo, không bảo đảm tài lộc hoặc thành công. Nhân viên có thể giúp bạn chọn số theo nhu cầu.</p></section>`:''}
    <section class="panel catalog-filters" aria-labelledby="filter-title"><div class="section-head"><h2 id="filter-title">${feng?'Tìm sim theo ngũ hành':'Tìm số sim của bạn'}</h2><button type="button" class="outline filter-toggle" aria-expanded="false">${ic('filter')}Bộ lọc</button></div>${filters(params,feng)}</section>
    <section class="catalog-stock" aria-labelledby="list-title"><div class="section-head"><h2 id="list-title">Danh sách sim</h2></div>
      <p class="results" aria-live="polite">${data?`Tìm thấy ${data.total.toLocaleString('vi-VN')} sim${data.total?` · Hiển thị ${(data.page-1)*data.size+1}–${Math.min(data.page*data.size,data.total)}`:''}`:'Đang cập nhật danh sách sim…'}</p>
      <div class="sim-grid ${feng?'feng-grid':''}">${data?data.items.map(s=>card(s)).join('')||empty():inventoryLoading()}</div>
      ${data?pager(data,feng?'/sim-phong-thuy':'/kho-sim',params):''}
    </section>
    <section class="panel help-card"><div><h2>Chưa tìm được số phù hợp?</h2><p>Cho cửa hàng biết dãy số và mức giá bạn quan tâm để được tư vấn.</p></div>${link('/lien-he','Nhờ cửa hàng tìm sim','outline')}</section>
    <section class="seo-copy"><h2>${feng?'Cách chọn sim phong thủy':'Cách chọn sim số đẹp Viettel'}</h2>${feng?'<p>Sim phong thủy được phân loại theo ngũ hành Kim, Mộc, Thủy, Hỏa, Thổ để bạn tham khảo khi chọn số. Đây là phân loại của cửa hàng, không phải cam kết về tài lộc hay thành công.</p><p>Nếu chưa chắc nên chọn mệnh nào, bạn có thể gửi yêu cầu để nhân viên gọi lại và gợi ý các số phù hợp với nhu cầu sử dụng.</p>':'<p>Bạn có thể lọc theo đầu số, loại sim như tứ quý, lộc phát, thần tài, mức giá và cơ sở phụ trách. Giá và tình trạng hiển thị được cập nhật từ cửa hàng.</p><p>Khi chọn được số ưng ý, bấm Mua sim và để lại tên, số điện thoại. Nhân viên sẽ gọi xác nhận tình trạng sim, giá, thủ tục đăng ký chính chủ và cách nhận sim.</p>'}</section>
  </main>`;
}
function consent() {return `<label class="consent"><input type="checkbox" name="consent" required><span>Tôi đồng ý <a href="/chinh-sach/" target="_blank" rel="noopener">chính sách cửa hàng và xử lý thông tin cá nhân</a> để cửa hàng gọi tư vấn.</span></label><label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>`;}
function formReady() {return !settingsLoading&&Boolean(config.privacy_policy)&&SheetsClient.configured();}
function formNotice() {return settingsLoading?'Đang kết nối cửa hàng. Bạn có thể điền thông tin trước.':!config.privacy_policy?'Cửa hàng đang cập nhật biểu mẫu tư vấn. Vui lòng gọi hotline để được hỗ trợ.':'';}
function orderForm(s,modal=false) {const available=s.status==='available';return `<section class="panel order" id="${modal?'modal-order':'order-form'}"><h3>Đăng ký tư vấn mua sim</h3><p>Sim <b class="red">${esc(formatted(s.number))}</b> · ${money(s.price)}</p>${available?`<form class="request-form" data-kind="sim-consult" data-sim-id="${s.id}"><label>Họ và tên *<input name="name" required maxlength="100" autocomplete="name" placeholder="Tên của bạn"></label><label>Số điện thoại *<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" maxlength="30" placeholder="Số để cửa hàng gọi lại"></label><label>Ghi chú (không bắt buộc)<textarea name="message" maxlength="2000" placeholder="Giờ tiện nghe máy hoặc điều bạn muốn hỏi…"></textarea></label><p class="notice">Cửa hàng sẽ gọi tư vấn về sim này và trao đổi các bước tiếp theo với bạn.</p>${consent()}<p class="form-availability notice" ${formReady()?'hidden':''}>${esc(formNotice())}</p><p class="form-error" role="alert"></p><button class="buy" ${formReady()?'':'disabled'}>Gửi thông tin mua sim</button><a class="form-call" href="${phoneHref()}">${ic('phone')}Gọi ${esc(config.phone)}</a></form>`:`<p class="notice">${esc(statuses[s.status])}. Vui lòng chọn sim khác hoặc liên hệ cửa hàng.</p><a class="button" href="${phoneHref()}">${ic('phone')}Gọi ${esc(config.phone)}</a>`}</section>`;}
function inventoryLoading(){return '<div class="inventory-loading" role="status"><span class="loading-dot" aria-hidden="true"></span> Đang cập nhật sim từ cửa hàng…</div>';}
function detail(s=null,related=null) {
  if(!s)return `<main id="main" class="container page-sections detail-main">${crumbs([['/','Trang chủ'],['/kho-sim','Kho sim'],[null,'Thông tin sim']])}<section class="panel"><h1>Thông tin sim</h1>${inventoryLoading()}<a class="outline" href="${phoneHref()}">Gọi tư vấn ${esc(config.phone)}</a></section></main>`;
  const branch=config.branches.find(b=>b.id===s.branch),f=formatted(s.number),saved=favorites.includes(s.id);
  return `<main id="main" class="container page-sections detail-main">${crumbs([['/','Trang chủ'],['/kho-sim','Kho sim'],[null,esc(f)]])}
    <div class="detail-layout"><section>
      <div class="product panel"><div class="product-image" aria-hidden="true">${productArt(f)}</div>
        <div class="product-info"><span class="tag">${esc(s.type)}</span><h1>${simNumber(s.number)}</h1><p class="sim-description">${esc(s.description||'Số sim Viettel. Liên hệ cửa hàng để được tư vấn thông tin và cách nhận sim.')}</p>
          <div class="price-box"><div>Giá tại cửa hàng<strong>${money(s.price)}</strong></div><div>Hỗ trợ<b>Cửa hàng gọi tư vấn</b></div></div>
          <dl><dt>Nhà mạng</dt><dd>Viettel</dd><dt>Loại sim</dt><dd>${esc(s.type)}</dd><dt>Ngũ hành</dt><dd>${esc(s.element||'Chưa phân loại')} (tham khảo)</dd><dt>Cơ sở phụ trách</dt><dd>${esc(branch?branch.name+' — '+branch.address:String(s.branch).toUpperCase())}</dd><dt>Tình trạng</dt><dd class="${s.status==='available'?'green':''}">${esc(statuses[s.status])}</dd></dl>
          <div class="product-tools"><button type="button" class="outline" data-save="${s.id}" aria-pressed="${saved}">${ic('heart')}${saved?'Đã lưu':'Lưu sim'}</button><button type="button" class="outline" id="share">${ic('share')}Chia sẻ</button></div>
          <button type="button" class="button mobile-order-link" data-buy="${s.id}" ${s.status!=='available'?'disabled':''}>Mua sim · Nhờ tư vấn</button>
        </div>
      </div>
      <section class="panel detail-description"><h2>Thông tin khi mua sim</h2><div class="support-cards"><article><h3>Đăng ký chính chủ</h3><p>Cửa hàng hướng dẫn giấy tờ và thủ tục theo quy định của nhà mạng.</p></article><article><h3>Nhận sim</h3><p>Nhân viên xác nhận địa điểm, cách giao nhận và chi phí khi gọi tư vấn.</p></article></div><p class="section-note">Giá và tình trạng trên website được cập nhật từ cửa hàng. Gửi yêu cầu chưa tự giữ sim.</p><a class="text-link" href="/chinh-sach/">Xem chính sách cửa hàng</a></section>
    </section><aside>${orderForm(s)}</aside></div>
    <section class="related-section"><div class="section-head"><h2>Sim cùng loại</h2>${link('/kho-sim?type='+encodeURIComponent(s.type),'Xem thêm')}</div><div class="sim-grid related">${related?related.items.filter(x=>x.id!==s.id).map(x=>card(x,false)).join('')||empty():inventoryLoading()}</div></section>
  </main>`;
}
function mapLink(b) {return b.map_url||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.address);}
function faqItems() {return [
      ['Làm thế nào để chọn và mua sim?','Tìm sim bạn thích, bấm Mua sim, nhập tên và số điện thoại rồi gửi yêu cầu. Nhân viên sẽ gọi lại để tư vấn và xác nhận các bước tiếp theo.'],
      ['Tôi cần làm gì để đăng ký chính chủ?','Nhân viên hướng dẫn thủ tục theo quy định nhà mạng khi liên hệ. Website không yêu cầu gửi ảnh giấy tờ.'],
      ['Gửi yêu cầu có giữ sim cho tôi không?','Chưa. Việc giữ sim, giá bán và tình trạng được cửa hàng xác nhận trực tiếp khi gọi tư vấn.'],
      ['Tôi có thể nhận sim ở đâu?','Bạn có thể trao đổi với cửa hàng để nhận tại cơ sở hoặc thống nhất cách giao nhận phù hợp. Chi phí, thời gian giao nhận được xác nhận trước.'],
      ['Làm thế nào để sửa hoặc xóa thông tin đã gửi?','Gọi '+config.phone+' hoặc gửi email tới '+config.email+' để yêu cầu cửa hàng kiểm tra, sửa hoặc xóa thông tin.']
    ];}
function contact() {
  return `${pageHead('Liên hệ '+esc(config.name),'Chọn cơ sở thuận tiện hoặc gửi thông tin để nhân viên gọi lại tư vấn chọn sim và hướng dẫn đăng ký chính chủ.',[['/','Trang chủ'],[null,'Liên hệ']])}
  <main id="main" class="container page-sections">
    <div class="contact-grid live-contact"><section class="panel contact-info"><h2>Thông tin liên hệ</h2><dl><dt>Hotline</dt><dd><a class="red" href="${phoneHref()}"><b>${esc(config.phone)}</b></a></dd><dt>Email</dt><dd><a href="mailto:${esc(config.email)}">${esc(config.email)}</a></dd><dt>Giờ mở cửa</dt><dd>${esc(config.hours||'Gọi hotline để xác nhận trước khi đến')}</dd></dl>
      ${config.zalo_url?`<a href="${esc(config.zalo_url)}" class="button" target="_blank" rel="noopener">Nhắn Zalo cửa hàng</a>`:''}
      <div class="branch-cards">${config.branches.map(b=>`<article class="branch"><h3>${ic('pin')}${esc(b.name)}</h3><p>${esc(b.address)}</p><a class="outline" href="${esc(mapLink(b))}" target="_blank" rel="noopener">Chỉ đường Google Maps${ic('external')}</a>${b.map_url?'':'<small>Google Maps tìm theo địa chỉ; gọi hotline nếu cần hướng dẫn đường đi.</small>'}</article>`).join('')}</div>
    </section>
    <section class="panel contact-request"><h2>Gửi yêu cầu tư vấn</h2><p>Để lại thông tin và chọn cơ sở bạn muốn liên hệ.</p>
      <form class="request-form" data-kind="contact"><label>Họ và tên *<input name="name" required maxlength="100" autocomplete="name"></label><label>Số điện thoại *<input name="phone" type="tel" required maxlength="30" inputmode="tel" autocomplete="tel"></label>${branchesSelect()}<label>Nội dung cần tư vấn *<textarea name="message" required maxlength="2000" placeholder="Dãy số, mức giá hoặc dịch vụ bạn quan tâm…"></textarea></label>${consent()}<p class="form-availability notice" ${formReady()?'hidden':''}>${esc(formNotice())}</p><p class="form-error" role="alert"></p><button ${formReady()?'':'disabled'}>Gửi yêu cầu tư vấn</button><a class="form-call" href="${phoneHref()}">${ic('phone')}Gọi ${esc(config.phone)}</a></form>
    </section></div>
    <section class="faq" aria-labelledby="faq-title"><h2 id="faq-title">Câu hỏi thường gặp</h2>${faqItems().map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  </main>`;
}
function policies() {
  return `<main id="main" class="container policy-page page-sections">${crumbs([['/','Trang chủ'],[null,'Chính sách']])}<section class="panel policy-intro"><h1>Chính sách ${esc(config.name)}</h1><p>Thông tin về cách gửi yêu cầu tư vấn và sử dụng thông tin khách hàng.</p><a class="text-link" href="${phoneHref()}">Liên hệ ${esc(config.phone)} để được giải đáp</a></section>
    <section class="panel"><h2>Gửi yêu cầu mua sim</h2><p>Khách chọn sim và gửi tên, số điện thoại để cửa hàng gọi tư vấn. Yêu cầu không tự giữ sim. Giá, tình trạng, thủ tục và cách nhận sim được xác nhận khi trao đổi với nhân viên.</p></section>
    ${[['registration_policy','Hỗ trợ đăng ký chính chủ'],['privacy_policy','Sử dụng thông tin khách hàng']].map(([k,t])=>`<section class="panel"><h2>${t}</h2><p class="policy-text">${esc(config[k]||'Cửa hàng đang cập nhật nội dung này. Gọi '+config.phone+' để được giải đáp.')}</p></section>`).join('')}
  </main>`;
}
function notFound() {return `<main id="main" class="container not-found"><h1>Không tìm thấy trang</h1><p>Địa chỉ này không tồn tại hoặc đã được chuyển. Bạn có thể xem kho sim hoặc gọi ${esc(config.phone)} để được hỗ trợ.</p>${link('/kho-sim','Xem kho sim','button')}</main>`;}
function pageContent(state) {
  if(state.path==='/kho-sim')return catalog(false,state.data);
  if(state.path==='/sim-phong-thuy')return catalog(true,state.data);
  if(state.path==='/lien-he')return contact();
  if(state.path==='/chinh-sach')return policies();
  if(state.path.startsWith('/sim/'))return detail(state.data,state.related);
  if(state.path==='/')return home(state.data);
  return notFound();
}
/* ===== SEO: tiêu đề, mô tả, canonical, dữ liệu có cấu trúc cho từng trang ===== */
function setMeta(name,content,prop){let el=document.head.querySelector(`meta[${prop?'property':'name'}="${name}"]`);if(!el){el=document.createElement('meta');el.setAttribute(prop?'property':'name',name);document.head.appendChild(el);}el.setAttribute('content',content);}
function setCanonical(url){let el=document.head.querySelector('link[rel="canonical"]');if(!url){el?.remove();return;}if(!el){el=document.createElement('link');el.rel='canonical';document.head.appendChild(el);}el.href=url;}
function setLd(list){document.head.querySelectorAll('script[data-ld]').forEach(x=>x.remove());list.forEach(o=>{const s=document.createElement('script');s.type='application/ld+json';s.dataset.ld='1';s.textContent=JSON.stringify(o);document.head.appendChild(s);});}
function seoFor(state) {
  const p=state.path,n=config.name,params=new URLSearchParams(routeSearch());params.delete('size');
  const pages={
    '/':['Sim số đẹp Viettel Phú Thọ | '+n,'Kho sim số đẹp, sim phong thủy Viettel tại Phú Thọ, Việt Trì, Lâm Thao. Tìm số theo dãy số, giá, ngũ hành; cửa hàng gọi tư vấn và hướng dẫn đăng ký chính chủ.'],
    '/kho-sim':['Kho sim số đẹp Viettel | '+n,'Kho sim Viettel số đẹp cập nhật từ cửa hàng tại Phú Thọ. Lọc theo đầu số, loại sim, mức giá và cơ sở; gửi yêu cầu để nhân viên gọi tư vấn.'],
    '/sim-phong-thuy':['Sim phong thủy Viettel theo ngũ hành | '+n,'Chọn sim Viettel theo ngũ hành Kim, Mộc, Thủy, Hỏa, Thổ để tham khảo. Cửa hàng tại Phú Thọ tư vấn chọn số phù hợp nhu cầu.'],
    '/lien-he':['Liên hệ và địa chỉ 3 cơ sở | '+n,'Hotline '+config.phone+'. Địa chỉ 3 cơ sở tại Phú Thọ, Việt Trì và Lâm Thao. Gửi yêu cầu để được gọi lại tư vấn chọn sim.'],
    '/chinh-sach':['Chính sách cửa hàng | '+n,'Chính sách gửi yêu cầu mua sim, hỗ trợ đăng ký chính chủ và sử dụng thông tin khách hàng của '+n+'.']
  };
  if(p.startsWith('/sim/')){
    const s=state.data,canonical=SITE+'/sim/?id='+p.split('/')[2];
    if(!s)return {t:'Thông tin sim | '+n,d:'Thông tin sim Viettel tại '+n+'. Gọi '+config.phone+' để được tư vấn.',canonical,robots:'index,follow'};
    const f=formatted(s.number);
    return {t:'Sim '+f+' - '+money(s.price)+' | '+n,d:'Sim Viettel '+f+', '+s.type+(s.element?', mệnh '+s.element:'')+'. Giá '+money(s.price)+', '+String(statuses[s.status]||'').toLowerCase()+'. Gọi '+config.phone+' để được tư vấn và hướng dẫn đăng ký chính chủ.',canonical,robots:'index,follow'};
  }
  if(!pages[p])return {t:'Không tìm thấy trang | '+n,d:'Trang không tồn tại.',canonical:'',robots:'noindex,follow'};
  let [t,d]=pages[p],canonical=SITE+toHref(p),robots='index,follow';
  const keys=[...params.keys()];
  if(keys.length===1&&keys[0]==='type'&&params.get('type')){const ty=params.get('type');t=ty+' Viettel Phú Thọ | '+n;d='Xem '+ty.toLowerCase()+' Viettel tại '+n+'. Giá và tình trạng cập nhật từ cửa hàng; gọi '+config.phone+' để được tư vấn.';canonical=SITE+toHref(p+'?type='+encodeURIComponent(ty));}
  else if(keys.length===1&&keys[0]==='page'&&Number(params.get('page'))>1){canonical=SITE+toHref(p+'?page='+Number(params.get('page')));t=t.replace(' | ',' - trang '+Number(params.get('page'))+' | ');}
  else if(keys.length)robots='noindex,follow';
  return {t,d,canonical,robots};
}
const phoneIntl=()=>'+84'+digits(config.phone).replace(/^0/,'');
const storesLd=()=>config.branches.map(b=>({'@context':'https://schema.org','@type':'Store','@id':SITE+'/#'+b.id,'name':config.name+' - '+b.name,'url':SITE+'/','telephone':phoneIntl(),'email':config.email,'areaServed':'Phú Thọ','address':{'@type':'PostalAddress','streetAddress':b.address,'addressRegion':'Phú Thọ','addressCountry':'VN'}}));
const websiteLd=()=>({'@context':'https://schema.org','@type':'WebSite','@id':SITE+'/#website','url':SITE+'/','name':config.name,'inLanguage':'vi-VN','potentialAction':{'@type':'SearchAction','target':{'@type':'EntryPoint','urlTemplate':SITE+'/kho-sim/?q={search_term_string}'},'query-input':'required name=search_term_string'}});
const crumbLd=items=>({'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':items.map(([name,path],i)=>({'@type':'ListItem','position':i+1,'name':name,...(path?{'item':SITE+toHref(path)}:{})}))});
function ldFor(state) {
  const p=state.path;
  if(p==='/')return [websiteLd(),...storesLd()];
  if(p==='/lien-he')return [...storesLd(),{'@context':'https://schema.org','@type':'FAQPage','mainEntity':faqItems().map(([q,a])=>({'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}}))},crumbLd([['Trang chủ','/'],['Liên hệ',null]])];
  if(p==='/kho-sim')return [crumbLd([['Trang chủ','/'],['Kho sim số đẹp',null]])];
  if(p==='/sim-phong-thuy')return [crumbLd([['Trang chủ','/'],['Sim phong thủy',null]])];
  if(p==='/chinh-sach')return [crumbLd([['Trang chủ','/'],['Chính sách',null]])];
  if(p.startsWith('/sim/')&&state.data){
    const s=state.data,f=formatted(s.number),url=SITE+'/sim/?id='+s.id,stock={available:'https://schema.org/InStock'}[s.status]||'https://schema.org/OutOfStock';
    return [{'@context':'https://schema.org','@type':'Product','name':'Sim Viettel '+f,'description':'Sim Viettel '+f+', '+s.type+(s.element?', mệnh '+s.element:'')+'.','image':SITE+'/og-image.png','brand':{'@type':'Brand','name':'Viettel'},'category':s.type,'url':url,'offers':{'@type':'Offer','url':url,'price':String(s.price),'priceCurrency':'VND','availability':stock,'seller':{'@type':'Organization','name':config.name}}},crumbLd([['Trang chủ','/'],['Kho sim','/kho-sim'],[f,null]])];
  }
  return [];
}
function applySeo(state) {
  const m=seoFor(state);
  document.title=m.t;setMeta('description',m.d);setMeta('robots',m.robots);setCanonical(m.canonical);
  setMeta('og:title',m.t,1);setMeta('og:description',m.d,1);setMeta('og:url',m.canonical||SITE+'/',1);setMeta('twitter:title',m.t);setMeta('twitter:description',m.d);
  setLd(ldFor(state));
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
  applySeo(state);
  app.querySelectorAll('[data-retry]').forEach(button=>button.onclick=()=>{settingsPromise=null;settingsLoading=true;render(true);});
}
function refreshSettings() {
  if(!settingsPromise){settingsLoading=true;settingsPromise=api('/api/settings').then(fresh=>{config={...window.STORE_CONFIG,...fresh};connectionNotice='';},()=>{connectionNotice='Kết nối cửa hàng chưa ổn định. Vui lòng thử lại hoặc gọi '+config.phone+'.';}).finally(()=>{settingsLoading=false;updateFormAvailability();});}
  return settingsPromise;
}
function remember(data){for(const item of data?.items||[])simModels.set(Number(item.id),item);if(data?.id)simModels.set(Number(data.id),data);}
async function render(preserve=false) {
  const path=routePath();if(path==='/tra-cuu'){navigate('/lien-he',true);return;}if(path==='/sim'){navigate('/kho-sim',true);return;}
  const version=++renderVersion,key=path+routeSearch();
  const state={path,version,data:pageModels.get(key)||(/^\/sim\/\d+$/.test(path)?simModels.get(Number(path.split('/')[2])):null),related:null,error:''};
  activeState=state;app.setAttribute('aria-busy','true');paint(state,preserve);
  const tasks=[refreshSettings().then(()=>{if(activeState===state)paint(state);})];
  let dataPath;
  if(path==='/kho-sim'||path==='/sim-phong-thuy'){const params=new URLSearchParams(routeSearch());params.set('size',24);dataPath='/api/sims?'+params;tasks.push(api('/api/sim-options').then(result=>{catalogTypes=result.types;if(activeState===state)paint(state);}).catch(()=>{}));}
  else if(/^\/sim\/\d+$/.test(path))dataPath='/api/sims/'+path.split('/')[2];
  else if(path==='/')dataPath='/api/sims?size=9&status=available';
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
    const call=form.querySelector('.form-call');if(call){call.href=phoneHref();call.innerHTML=ic('phone')+'Gọi '+esc(config.phone);}
  });
}
function closeConsult(){const dialog=document.getElementById('consult-dialog');if(dialog?.open)dialog.close();}
function openConsult(id) {
  const sim=simModels.get(Number(id));if(!sim||sim.status!=='available'){toast('Vui lòng chọn sim còn hàng.');return;}
  const dialog=document.getElementById('consult-dialog');
  dialog.innerHTML=`<div class="consult-dialog-head"><h2 id="consult-title">Mua sim · Nhờ cửa hàng tư vấn</h2><button type="button" class="outline" id="close-consult" aria-label="Đóng biểu mẫu">${ic('close')}</button></div>${orderForm(sim,true)}`;
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
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.save);favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];try{localStorage.setItem('favorites',JSON.stringify(favorites))}catch{toast('Trình duyệt không cho lưu trên thiết bị này.')}document.querySelectorAll(`[data-save="${id}"]`).forEach(btn=>{btn.classList.toggle('saved',favorites.includes(id));btn.setAttribute('aria-pressed',String(favorites.includes(id)));if(!btn.classList.contains('heart'))btn.innerHTML=ic('heart')+(favorites.includes(id)?'Đã lưu':'Lưu sim')})});
  const share=document.getElementById('share');if(share)share.onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Đã sao chép liên kết sim')}}catch(e){if(e.name!=='AbortError')toast('Bạn có thể sao chép địa chỉ trên thanh trình duyệt.')}};
  app.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>openConsult(button.dataset.buy));
  bindRequests(app);

}
document.addEventListener('click',e=>{
  const a=e.target.closest('a');
  if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target||a.hasAttribute('download')||e.button!==0)return;
  const raw=a.getAttribute('href')||'';
  if(raw==='#order-form'){e.preventDefault();document.getElementById('order-form')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(raw.startsWith('#')||/^(mailto|tel):/.test(raw))return;
  let url;try{url=new URL(a.href,location.href);}catch{return;}
  if(url.origin!==location.origin)return;
  const route=internalFrom(url);if(!route)return;
  e.preventDefault();navigate(route);
});
window.addEventListener('popstate',()=>{closeConsult();render()});
/* Liên kết cũ dạng /#/kho-sim được chuyển sang địa chỉ thật */
if(location.hash.startsWith('#/'))history.replaceState({},'',toHref(location.hash.slice(1)));
if(!window.STATIC_BUILD)render();
