const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const publicFiles=new Set(['index.html','kho-sim.html','sim-phong-thuy.html','lien-he.html','chinh-sach.html','yeu-thich.html','sim.html','404.html','admin.html','app.js','admin.js','admin.css','styles.css','theme-red.css','reference-hero-right.webp','reference-catalog-right.webp','reference-feng-right.webp','reference-contact-right.webp','reference-sim-product.webp','reference-gift.webp','reference-support.webp','reference-viettri.webp','cua-hang-1.webp','cua-hang-2.webp','cua-hang-3.webp','cua-hang-4.webp','cua-hang-5.webp','cua-hang-6.webp','hero.webp','promo.webp','favicon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','og-image.png','site.webmanifest','robots.txt','sitemap.xml','CNAME']);
let browser,server,base;
before(async()=>{
 server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/lethuviettel1(?=\/|$)/,'').slice(1)||'index.html';
  const exists=publicFiles.has(name);if(!exists)name='404.html';
  const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
  res.writeHead(exists?200:404,{'Content-Type':mime[path.extname(name)]||'text/plain'});res.end(fs.readFileSync(name));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});fs.mkdirSync('test-results',{recursive:true});
});
after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
function fixture(){return {settings:{name:'Viettel Phú Hà',phone:'0344.639.666',email:'thuntlpto.9x@gmail.com',tagline:'Kết nối giá trị - Đồng hành cùng bạn',hours:'08:00–21:00',zalo_url:'https://zalo.me/0344639666',privacy_policy:'Thông tin được dùng để gọi tư vấn.',branches:[{id:'cs1',name:'CS1',address:'KCN Phú Hà, thị xã Phú Thọ, Phú Thọ'},{id:'cs2',name:'CS2',address:'Thanh Miếu, Việt Trì, Phú Thọ'},{id:'cs3',name:'CS3',address:'Cao Mại, Lâm Thao, Phú Thọ'}]},sims:[{id:1,number:'0986686868',price:3990000,type:'Sim lộc phát',element:'Kim',branch:'cs1',status:'available'},{id:2,number:'0389797979',price:6500000,type:'Sim thần tài',element:'Mộc',branch:'cs2',status:'available'},{id:3,number:'0973333666',price:2890000,type:'Sim tam hoa',branch:'cs3',status:'available'},{id:4,number:'0338888999',price:8200000,type:'Sim tứ quý',element:'Thủy',branch:'cs1',status:'available'}],leads:new Map(),reads:[],receiptReady:true,receiptError:false,delaySettings:null,delayInventory:null,failInventory:false};}
async function pageFor(width=390,height=844,options={}){const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<821,...options}),page=await context.newPage(),errors=[];page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.**/*',r=>r.abort());return {context,page,errors};}
async function connect(page,f){await page.route('https://script.google.com/macros/s/**',async route=>{
 const req=route.request(),u=new URL(req.url());
 if(req.method()==='POST'){const data=JSON.parse(req.postData());if(!f.leads.has(data.request_key))f.leads.set(data.request_key,{...data,id:'fixture-'+(f.leads.size+1)});return route.fulfill({status:200,body:'{}'});}
 const callback=u.searchParams.get('callback');
 if(!/^phuha_\d+_\d+$/.test(callback||''))return route.fulfill({status:200,body:'Invalid callback'});
 const action=u.searchParams.get('action');f.reads.push({action,params:Object.fromEntries(u.searchParams)});let result;
 if(action==='sims'&&Number(u.searchParams.get('size'))>60)return route.fulfill({status:200,contentType:'application/javascript',body:callback+'('+JSON.stringify({error:'Số sim mỗi trang không hợp lệ.'})+');'});
 if(action==='settings'){if(f.delaySettings)await f.delaySettings;result=f.settings;}
 if(action==='sims'){
  if(f.delayInventory)await f.delayInventory;if(f.failInventory)return route.abort();let items=f.sims.filter(s=>s.status!=='hidden'&&(!u.searchParams.get('status')||s.status===u.searchParams.get('status'))&&(!u.searchParams.get('q')||s.number.includes(u.searchParams.get('q')))&&(!u.searchParams.get('prefix')||s.number.startsWith(u.searchParams.get('prefix')))&&(!u.searchParams.get('type')||s.type===u.searchParams.get('type'))&&(!u.searchParams.get('element')||s.element===u.searchParams.get('element'))&&(!u.searchParams.get('max_price')||s.price<=Number(u.searchParams.get('max_price'))));const size=Number(u.searchParams.get('size'))||24,number=Math.max(1,Number(u.searchParams.get('page'))||1);result={items:items.slice((number-1)*size,number*size),total:items.length,page:number,size};
 }else if(action==='sim')result=f.sims.find(s=>s.id===Number(u.searchParams.get('id')))||{error:'Sim không còn trong kho'};
 else if(action==='options')result={types:[...new Set(f.sims.map(s=>s.type))]};
 else if(action==='receipt'){const lead=f.leads.get(u.searchParams.get('key'));result=f.receiptError?{error:'Chưa xác nhận được yêu cầu. Vui lòng thử lại.'}:{received:f.receiptReady&&Boolean(lead),id:lead?.id};}
 await route.fulfill({status:200,contentType:'application/javascript',body:u.searchParams.get('callback')+'('+JSON.stringify(result)+');'});
 });}
const ready=page=>page.waitForFunction(()=>!document.getElementById('app').hasAttribute('aria-busy'));
const fits=page=>page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
test('Home HTML is visible before JavaScript or Google, with red Viettel layout and no fictional SIMs',async()=>{
 const {context,page}=await pageFor(390,844,{javaScriptEnabled:false});try{await page.goto(base+'/');assert.match(await page.locator('#hero-title').innerText(),/Sim số đẹp/);assert.equal(await page.locator('.home-category').count(),4);assert.equal(await page.locator('.home-grid .skeleton').count(),4);assert.equal(await page.locator('[data-buy]').count(),0);assert.match(await page.title(),/Sim số đẹp Viettel Phú Thọ/);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://simdep68.vn/');}finally{await context.close();}
});
test('Red Viettel homepage keeps two SIM columns, banner artwork, touch controls and no overflow',async()=>{
 const f=fixture(),{context,page,errors}=await pageFor();try{await connect(page,f);await page.goto(base+'/');await ready(page);assert.equal(await page.locator('.footer-disclosure').evaluate(e=>e.open),false);assert.equal(await page.locator('.home-grid .sim-card').count(),4);assert.equal(await page.locator('.home-grid [data-buy]').count(),4);assert.equal(await page.locator('.home-grid .card-actions a').count(),0);
 for(const width of [320,360,375,390,414,430,768,844,1366,1672]){await page.setViewportSize({width,height:844});const box=await fits(page);assert.ok(box.scroll<=width&&box.width<=width,JSON.stringify(box));if(width<=768)assert.ok(await page.locator('.header-tools .icon-button').evaluateAll(a=>a.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)));if(width<=768)assert.equal(await page.locator('.home-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2);assert.ok(await page.locator('.purchase').evaluateAll(a=>a.every(e=>e.getBoundingClientRect().height>=(innerWidth<=820?44:32))));}
 await page.setViewportSize({width:844,height:390});const landscape=await fits(page);assert.ok(landscape.scroll<=844);await page.locator('[data-buy=\"1\"]').tap();assert.ok((await page.locator('#consult-dialog').boundingBox()).height<=390);await page.locator('#close-consult').tap();await page.setViewportSize({width:320,height:650});await page.locator('.footer-disclosure summary').tap();assert.equal(await page.locator('.footer-disclosure').evaluate(e=>e.open),true);assert.ok(await page.locator('.footer-grid li').filter({hasText:'Thanh Miếu, Việt Trì, Phú Thọ'}).isVisible());assert.ok((await fits(page)).scroll<=320);await page.locator('.footer-disclosure summary').tap();
 await page.setViewportSize({width:390,height:844});await page.locator('.offer img').first().scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>scrollY===0);await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Search, four categories, catalog filters, feng shui filters and direct reloads use real root files',async()=>{
 const f=fixture(),{context,page,errors}=await pageFor(320,750);try{await connect(page,f);await page.goto(base+'/');await ready(page);await page.locator('.search input').fill('6868');await page.locator('.search button').tap();await ready(page);assert.match(page.url(),/kho-sim\.html\?q=6868/);assert.equal(await page.locator('.sim-card').count(),1);assert.equal((await page.reload()).status(),200);await ready(page);
 await page.goto(base+'/kho-sim.html');await ready(page);await page.locator('.filter-toggle').tap();await page.locator('.filters [name=max_price]').selectOption('5000000');await page.locator('.filters .filter-buttons button').tap();await ready(page);assert.match(page.url(),/max_price=5000000/);assert.equal(await page.locator('.sim-card').count(),2);
 f.sims.push({id:5,number:'0925454686',price:3900000,type:'Sim phong thủy',element:'Kim',branch:'cs1',status:'available'});await page.goto(base+'/sim-phong-thuy.html?element=Kim');await ready(page);assert.equal(await page.locator('.sim-card').count(),1);assert.ok(f.reads.some(r=>r.action==='sims'&&r.params.element==='Kim'));await page.locator('.menu-toggle').tap();await page.locator('#main-nav a').filter({hasText:'Trang chủ'}).tap();await ready(page);assert.equal(new URL(page.url()).pathname,'/');
 for(const route of ['/kho-sim.html','/sim-phong-thuy.html','/lien-he.html','/chinh-sach.html','/sim.html?id=1','/yeu-thich.html']){assert.equal((await page.goto(base+route)).status(),200);await ready(page);const box=await fits(page);assert.ok(box.scroll<=box.width,route+' '+JSON.stringify(box));}assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Mua ngay validates phone, submits the selected SIM once and waits for Google receipt before success',async()=>{
 const f=fixture(),{context,page,errors}=await pageFor(390,650);f.receiptReady=false;try{await connect(page,f);await page.goto(base+'/');await ready(page);await page.locator('[data-buy="1"]').tap();const form=page.locator('#consult-dialog .request-form');await form.locator('[name=name]').fill('Khách kiểm thử');await form.locator('[name=phone]').fill('123');await form.locator('[name=consent]').check();await form.locator('.buy').tap();await form.locator('.form-error').filter({hasText:'chưa hợp lệ'}).waitFor();assert.equal(f.leads.size,0);await form.locator('[name=phone]').fill('0344639666');await form.locator('.buy').tap();await page.waitForFunction(()=>document.querySelector('.buy')?.textContent==='Đang gửi…');await page.waitForTimeout(250);assert.equal(await form.locator('.success-message').count(),0);assert.equal(await page.locator('#close-consult').isDisabled(),true);f.receiptReady=true;await form.locator('.success-message').waitFor();assert.equal(f.leads.size,1);assert.equal([...f.leads.values()][0].sim_id,1);assert.equal([...f.leads.values()][0].consent,true);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('A lost receipt shows an error; retry keeps the request key and creates no duplicate consultation',async()=>{
 const f=fixture(),{context,page}=await pageFor(320,560);f.receiptError=true;try{await connect(page,f);await page.goto(base+'/');await ready(page);await page.locator('[data-buy="2"]').tap();const form=page.locator('#consult-dialog .request-form');await form.locator('[name=name]').fill('Khách thử lại');await form.locator('[name=phone]').fill('0981234567');await form.locator('[name=consent]').check();await form.locator('.buy').tap();await form.locator('.form-error').filter({hasText:'Chưa xác nhận'}).waitFor();assert.equal(await form.locator('.success-message').count(),0);assert.equal(f.leads.size,1);const key=[...f.leads.keys()][0];f.receiptError=false;await form.locator('.buy').tap();await form.locator('.success-message').waitFor();assert.equal(f.leads.size,1);assert.equal([...f.leads.keys()][0],key);
 }finally{await context.close();}
});
test('Favorites persist on this phone, fetch fresh price/stock, and cannot purchase a sold SIM',async()=>{
 const f=fixture(),{context,page,errors}=await pageFor();try{await connect(page,f);await page.goto(base+'/');await ready(page);await page.locator('[data-save="1"]').tap();assert.equal(await page.locator('.saved-count').innerText(),'1');await page.locator('.mobile-actions a').filter({hasText:'Yêu thích'}).tap();await ready(page);assert.equal(await page.locator('.sim-card').count(),1);f.sims[0].price=5550000;f.sims[0].status='sold';await page.reload();await ready(page);assert.match(await page.locator('.price').innerText(),/5\.550\.000/);assert.equal(await page.locator('[data-buy]').count(),0);await page.locator('[data-save="1"]').tap();assert.equal(await page.locator('.sim-card').count(),0);assert.equal(await page.locator('.saved-count').innerText(),'0');await page.reload();await ready(page);assert.equal(await page.locator('.sim-card').count(),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Slow background settings keep the chosen SIM modal and customer inputs intact',async()=>{
 const f=fixture(),{context,page,errors}=await pageFor(320,650);let release;f.delaySettings=new Promise(r=>release=r);try{await connect(page,f);await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('[data-buy="1"]').waitFor();await page.locator('[data-buy="1"]').tap();const form=page.locator('#consult-dialog .request-form');await form.locator('[name=name]').fill('Tên đang nhập');await form.locator('[name=phone]').fill('0981234567');assert.equal(await form.locator('.buy').isDisabled(),true);release();await ready(page);assert.equal(await form.locator('[name=name]').inputValue(),'Tên đang nhập');assert.equal(await form.locator('[name=phone]').inputValue(),'0981234567');assert.equal(await form.locator('.buy').isDisabled(),false);assert.equal(await page.locator('#consult-dialog').evaluate(e=>e.open),true);assert.deepEqual(errors,[]);
 }finally{release();await context.close();}
});
test('An unavailable inventory keeps the homepage and hotline usable; missing policy blocks only submission',async()=>{
 const f=fixture(),{context,page}=await pageFor();f.failInventory=true;try{await connect(page,f);await page.goto(base+'/');await ready(page);assert.match(await page.locator('#hero-title').innerText(),/Sim số đẹp/);assert.ok(await page.locator('[data-retry]').count()>0);assert.equal(await page.locator('.home-grid [data-buy]').count(),0);f.failInventory=false;f.settings.privacy_policy='';await page.locator('[data-retry]').first().tap();await ready(page);await page.locator('[data-buy="1"]').tap();assert.equal(await page.locator('#consult-dialog .buy').isDisabled(),true);assert.match(await page.locator('#consult-dialog .form-call').getAttribute('href'),/0344639666/);
 }finally{await context.close();}
});
test('GitHub repository subpath, old shared links and admin entry remain usable without a customer account',async()=>{
 const f=fixture(),{context,page,errors}=await pageFor(390,844);try{await connect(page,f);await page.goto(base+'/lethuviettel1/');await ready(page);assert.equal(await page.locator('.hero-photo').count(),1);await page.locator('.home-category').first().tap();await ready(page);assert.match(page.url(),/\/lethuviettel1\/kho-sim\.html/);assert.equal((await page.reload()).status(),200);await ready(page);await page.goto(base+'/lethuviettel1/#/kho-sim');await ready(page);assert.match(page.url(),/\/lethuviettel1\/kho-sim\.html$/);await page.goto(base+'/kho-sim/');await page.waitForURL('**/kho-sim.html');await ready(page);assert.equal((await page.reload()).status(),200);await page.goto(base+'/admin.html');await page.waitForFunction(()=>document.getElementById('metric-total')?.textContent==='4');assert.match(await page.locator('[data-admin-link]').first().getAttribute('href'),/\/exec\?view=admin$/);assert.equal(await page.locator('input[type=password]').count(),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Prebuilt pages, sitemap and local assets resolve; no source tools or dependencies enter the public build',async()=>{
 for(const name of publicFiles){const response=await fetch(base+'/'+name);assert.equal(response.status,200,name);}
 const index=fs.readFileSync('index.html','utf8');assert.ok(index.includes('id="hero-title"'));assert.ok(!index.includes('policy-page'));assert.match(fs.readFileSync('sitemap.xml','utf8'),/kho-sim\.html/);assert.ok(fs.statSync('hero.webp').size<250000);assert.ok(fs.statSync('promo.webp').size<250000);
 if(fs.existsSync('dist'))assert.deepEqual(new Set(fs.readdirSync('dist')),publicFiles);
});

test('09*686 finds true head/tail matches across Sheets pages on a phone and in the HTML admin',async()=>{
 const f=fixture();f.sims=Array.from({length:61},(_,i)=>({id:i+10,number:'096686'+String(i).padStart(4,'0'),price:1000000,type:'Sim số đẹp',branch:'cs1',status:'available'}));
 f.sims.push({id:100,number:'0925454686',price:3000000,type:'Sim số đẹp',branch:'cs1',status:'available'},
  {id:101,number:'0981111686',price:4000000,type:'Sim thần tài',branch:'cs1',status:'available'},
  {id:102,number:'0325454686',price:5000000,type:'Sim lộc phát',branch:'cs1',status:'available'});
 const {context,page,errors}=await pageFor(320,750);
 try{await connect(page,f);await page.goto(base+'/');await ready(page);await page.locator('.search input').fill('09*686');await page.locator('.search button').tap();await ready(page);
 assert.equal(await page.locator('.sim-card').count(),2);assert.ok(await page.locator('.sim-number').evaluateAll(nodes=>nodes.every(node=>/^09\d+686$/.test(node.textContent.replace(/\D/g,'')))));
 assert.ok(f.reads.some(read=>read.action==='sims'&&read.params.page==='2'));assert.ok(f.reads.every(read=>read.action!=='sims'||Number(read.params.size)<=60));
 await page.reload();await ready(page);assert.equal(await page.locator('.sim-card').count(),2);
 await page.goto(base+'/admin.html#inventory');await page.locator('#filter-query').fill('09*686');await page.locator('.btn-filter').tap();
 await page.waitForFunction(()=>document.querySelectorAll('#inventory-body .sim-no').length===2);assert.ok(await page.locator('#inventory-body .sim-no').evaluateAll(nodes=>nodes.every(node=>/^09\d+686$/.test(node.textContent.replace(/\D/g,'')))));
 assert.ok((await fits(page)).scroll<=320);await page.locator('#open-sidebar').tap();await page.locator('.side-links [data-view=classification]').tap();
 assert.ok(await page.locator('#classification-title').isVisible());assert.match(await page.locator('[data-classification-link]').getAttribute('href'),/exec\?view=admin&tab=classification$/);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test('Each storefront category follows its admin type; the all-SIM link includes every type and element alone does not grant membership',async()=>{
 const f=fixture();f.sims.push({id:5,number:'0925454686',price:3900000,type:'Sim phong thủy',element:'Kim',branch:'cs1',status:'available'},
 {id:6,number:'0927777686',price:4000000,type:'Sim số đẹp',element:'Kim',branch:'cs2',status:'available'}, {id:7,number:'0926666686',price:5000000,type:'Sim phong thủy',element:'Kim',branch:'cs2',status:'hidden'});
 const {context,page,errors}=await pageFor(390,750);
 try{await connect(page,f);await page.goto(base+'/');await ready(page);await page.locator('.home-category').filter({hasText:'Sim số đẹp'}).tap();await ready(page);assert.equal(await page.locator('.sim-card').count(),6);
 for(const [url,type,count]of [['/kho-sim.html?type=Sim%20thần%20tài','Sim thần tài',1],['/kho-sim.html?type=Sim%20lộc%20phát','Sim lộc phát',1],['/sim-phong-thuy.html','Sim phong thủy',1],['/sim-phong-thuy.html?element=Kim','Sim phong thủy',1],['/kho-sim.html?type=Sim%20số%20đẹp','',6]]){
  await page.goto(base+url);await ready(page);assert.equal(await page.locator('.sim-card').count(),count,url);
  const reads=f.reads.filter(read=>read.action==='sims');assert.equal(reads.at(-1).params.type||'',type);
 }
 f.sims[1].type='Sim lộc phát';await page.goto(base+'/kho-sim.html?type=Sim%20lộc%20phát');await ready(page);assert.equal(await page.locator('.sim-card').count(),2);
 await page.goto(base+'/kho-sim.html?type=Sim%20thần%20tài');await ready(page);assert.equal(await page.locator('.sim-card').count(),0);assert.deepEqual(errors,[]);
 }finally{await context.close();}
});

test('Authenticated native admin filters and batch-assigns SIM categories on a phone, preserving other fields and Zalo controls',async()=>{
 const f=fixture();f.sims[0].number='0925454686';f.sims[1].number='0981111686';const calls=[],before=structuredClone(f.sims);
 const {context,page,errors}=await pageFor(320,750);
 const data=()=>({sims:structuredClone(f.sims),leads:[],settings:f.settings,zalo:{enabled:false,token_configured:false,recipients:[],counts:{pending:0,sending:0,sent:0,failed:0,uncertain:0,cancelled:0},jobs:[]}});
 try{
  await page.exposeFunction('__nativeRpc',async(name,args)=>{calls.push({name,args});if(name==='adminLogin'){assert.equal(args[0],'fixture-password');return {token:'fixture-session'};}
   assert.equal(args[0],'fixture-session');if(name==='adminData')return data();
   if(name==='adminClassifySims'){const [,ids,type,element]=args;for(const sim of f.sims)if(ids.includes(sim.id)){sim.type=type;if(element!==null)sim.element=element;}return {ok:true,count:ids.length};}
   throw new Error('Unexpected RPC '+name);
  });
  await page.addInitScript(()=>{window.google={script:{get run(){let success,failure;const methods={withSuccessHandler(fn){success=fn;return proxy;},withFailureHandler(fn){failure=fn;return proxy;}};const proxy=new Proxy(methods,{get(target,name){return target[name]||((...args)=>window.__nativeRpc(name,args).then(result=>success(result),error=>failure({message:error.message})));}});return proxy;},url:{getLocation:callback=>callback({parameter:{tab:'classification'}})}}};});
  await page.route(base+'/__native-admin-test.html',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync('AppsScript-Admin.html','utf8')}));
  await page.goto(base+'/__native-admin-test.html');await page.locator('#login-form [name=password]').fill('fixture-password');await page.locator('#login-form button').tap();await page.locator('#classification-filter').waitFor();
  await page.locator('#classification-filter [name=query]').fill('09*686');await page.locator('#classification-filter button').tap();assert.equal(await page.locator('[data-classification-id]').count(),2);
  await page.locator('#classification-select-page').tap();await page.locator('#classification-form [name=type]').selectOption('Sim phong thủy');await page.locator('#classification-save').tap();await page.locator('#message').filter({hasText:'Đã phân loại 2 sim'}).waitFor();
  const write=calls.find(call=>call.name==='adminClassifySims');assert.deepEqual(write.args,['fixture-session',[1,2],'Sim phong thủy',null]);
  for(let i=0;i<2;i++){assert.equal(f.sims[i].type,'Sim phong thủy');for(const key of ['number','price','element','branch','status'])assert.equal(f.sims[i][key],before[i][key]);}
  assert.deepEqual(f.sims[2],before[2]);assert.equal(await page.locator('#classification-save').isDisabled(),true);
  assert.ok((await fits(page)).scroll<=320);await page.screenshot({path:'test-results/native-classification-mobile.png',fullPage:true});
  await page.locator('#tab').selectOption('sims');assert.equal(await page.locator('.sim-form input[name=type]').count(),0);assert.ok(await page.locator('.sim-form select[name=type]').count()>0);
  await page.locator('#tab').selectOption('zalo');assert.ok(await page.locator('#zalo-form').isVisible());assert.ok(!calls.some(call=>call.name==='adminZaloTest'));assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
