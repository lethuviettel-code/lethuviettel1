const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createStore}=require('./sheets-harness.cjs');
const sim=(number='0344639666',branch='cs1')=>({number,price:1500000,type:'Sim số đẹp',branch,status:'available'});
const lead=(id,key=randomUUID())=>({action:'submitLead',sim_id:id,name:'Khách thử',phone:'0988123456',message:'',consent:true,request_key:key});
function fixture(){const store=createStore(),token=store.setup();store.context.adminSettings(token,{privacy_policy:'Thông tin chỉ dùng để gọi tư vấn.'});store.context.adminSaveSim(token,sim());return {...store,token};}

test('Setup creates private data tabs without stock and never overwrites different headers',()=>{const s=createStore();s.setup();assert.equal(s.publicRead({action:'sims'}).total,0);assert.deepEqual([...s.sheets.keys()],['KhoSim','YeuCau','CauHinh']);s.context.setupStore_();s.sheets.get('KhoSim').cells[0][0]='Wrong';assert.throws(()=>s.context.setupStore_(),/cấu trúc khác/);});
test('Chosen SIM snapshot derives number, price and branch on server; public APIs never expose customers',()=>{const s=fixture();const result=s.post({...lead(1),price:1,number:'0999999999',branch:'cs3'});assert.equal(result.received,true);const row=s.context.adminData(s.token).leads[0];assert.equal(row.sim_number,'0344639666');assert.equal(row.quoted_price,1500000);assert.equal(row.branch,'cs1');assert.equal(row.phone,'0988123456');assert.equal(s.publicRead({action:'sim',id:1}).status,'available');assert.throws(()=>s.publicRead({action:'leads'}),/không được hỗ trợ/);assert.equal(s.publicRead({action:'receipt',key:'unknown-request-key-123456'}).received,false);assert.ok(!Object.hasOwn(row,'request_key'));});
test('Retry confirms one saved Sheet row; changed payload rejected without overwriting',()=>{const s=fixture(),d=lead(1);const a=s.post(d),b=s.post(d);assert.equal(a.id,b.id);assert.equal(s.context.adminData(s.token).leads.length,1);assert.equal(s.publicRead({action:'receipt',key:d.request_key}).received,true);assert.match(s.post({...d,phone:'0971234567'}).error,/Thông tin đã thay đổi/);assert.equal(s.context.adminData(s.token).leads.length,1);});
test('Validation errors can be confirmed by receipt instead of false success',()=>{const s=fixture(),d={...lead(1),phone:'123'};assert.match(s.post(d).error,/Số điện thoại/);assert.match(s.publicRead({action:'receipt',key:d.request_key}).error,/Số điện thoại/);assert.equal(s.context.adminData(s.token).leads.length,0);assert.match(s.post({...lead(1),consent:false}).error,/đồng ý/);assert.match(s.post({...lead(1),website:'spam'}).error,/đồng ý/);assert.match(s.post({...lead(1),sim_id:999}).error,/không còn sẵn/);});
test('Manual sold and hidden status blocks new requests; completing a lead does not sell automatically',()=>{const s=fixture();s.post(lead(1));const r=s.context.adminData(s.token).leads[0];s.context.adminSaveLead(s.token,{id:r.id,status:'done',staff_note:'Đã gọi',follow_up:'2026-10-20T14:30'});assert.equal(s.publicRead({action:'sim',id:1}).status,'available');for(const status of ['sold','reserved','hidden']){s.context.adminSaveSim(s.token,{...sim(),id:1,status});assert.match(s.post(lead(1)).error,/không còn sẵn/);}assert.equal(s.publicRead({action:'sims'}).total,0);assert.throws(()=>s.context.adminSaveSim(s.token,{...sim('0971234567'),id:1}),/không đổi số/);});
test('1000 SIM batch handles Sheet capacity, keeps leading zeros and rejects entire duplicate/invalid import',()=>{const s=fixture();const rows=Array.from({length:1000},(_,i)=>sim('097'+String(i).padStart(7,'0'),i%2?'cs2':'cs1'));assert.equal(s.context.adminImport(s.token,rows).count,1000);assert.equal(s.publicRead({action:'sims',size:24,page:2}).items.length,24);assert.equal(s.publicRead({action:'sims',branch:'cs2'}).total,500);assert.equal(s.publicRead({action:'sims',q:'0970000999'}).total,1);assert.throws(()=>s.context.adminImport(s.token,[sim('0961234567'),rows[0]]),/bị trùng/);assert.equal(s.publicRead({action:'sims',q:'0961234567'}).total,0);assert.throws(()=>s.context.adminImport(s.token,[sim('0961234567'),sim('bad')]),/Dòng 3/);assert.equal(s.publicRead({action:'sims'}).total,1001);});
test('Admin rejects absent/expired tokens; logout and password reset revoke sessions',()=>{const s=fixture();for(const fn of [()=>s.context.adminData(''),()=>s.context.adminSaveSim('fake',sim()),()=>s.context.adminSaveLead('fake',{}),()=>s.context.adminSettings('fake',{}),()=>s.context.adminImport('fake',[])])assert.throws(fn,/đăng nhập/);s.context.adminLogout(s.token);assert.throws(()=>s.context.adminData(s.token),/hết hạn/);const token=s.setup();s.context.resetAdminPassword_();assert.throws(()=>s.context.adminData(token),/hết hạn/);const blank=createStore();assert.throws(()=>blank.context.adminData('forged'),/hết hạn/);});
test('Only authenticated admin can change settings; URL checks and privacy gate apply',()=>{const s=createStore(),token=s.setup();s.context.adminSaveSim(token,sim());assert.match(s.post(lead(1)).error,/chưa mở/);assert.throws(()=>s.context.adminSettings(token,{zalo_url:'javascript:alert(1)'}),/Link Zalo/);assert.throws(()=>s.context.adminSettings(token,{site_url:'https://example.vn/path'}),/Tên miền/);assert.throws(()=>s.context.adminSettings(token,{ADMIN_HASH:'bad'}),/Trường cấu hình/);s.context.adminSettings(token,{hours:'08:00–20:00',zalo_url:'https://zalo.me/0344639666'});assert.equal(s.publicRead({action:'settings'}).hours,'08:00–20:00');});
test('JSONP is allowlisted and encoded; formulas cannot execute as Sheet cells',()=>{const s=fixture();s.context.adminSettings(s.token,{privacy_policy:'</script><script>alert(1)</script>'});const response=s.context.doGet({parameter:{action:'settings',callback:'phuha_123_1'}});assert.ok(response.value.startsWith('phuha_123_1('));assert.ok(!response.value.includes('</script>'));assert.equal(s.context.doGet({parameter:{action:'settings',callback:'alert(1)'}}).value,'Invalid callback');assert.equal(s.context.safeCell_('=HYPERLINK("bad")'),'\'=HYPERLINK("bad")');assert.equal(s.context.safeCell_('+123'),"'+123");});
test('General consultation has branch, normalized phone, optional staff notes and flood limit',()=>{const s=fixture();const d={action:'submitLead',name:'Tư vấn chung',phone:'+84 344 639 666',message:'Tìm số đẹp',branch:'cs2',consent:true,request_key:randomUUID()};assert.equal(s.post(d).received,true);assert.equal(s.context.adminData(s.token).leads[0].phone,'0344639666');for(let i=0;i<4;i++)assert.equal(s.post({...d,request_key:randomUUID()}).received,true);assert.match(s.post({...d,request_key:randomUUID()}).error,/nhiều yêu cầu/);assert.equal(s.context.adminData(s.token).leads.length,5);});

test('Visible setup/reset editor functions reject anonymous or different-account Web App calls',()=>{const s=createStore();s.identity.active='';assert.throws(()=>s.context.setupStore(),/Chỉ chủ dự án/);assert.throws(()=>s.context.resetAdminPassword(),/Chỉ chủ dự án/);assert.equal(s.sheets.size,0);s.identity.active='someone@example.test';assert.throws(()=>s.context.setupStore(),/Chỉ chủ dự án/);s.identity.active=s.identity.effective;const token=s.setup();assert.equal(s.context.adminData(token).sims.length,0);s.context.resetAdminPassword();assert.throws(()=>s.context.adminData(token),/hết hạn/);});

const botToken='1234567890123456:fixture_private_bot_token_not_a_real_secret';
const botResponse=(body={ok:true,result:{message_id:'fixture-message'}},code=200)=>({getResponseCode:()=>code,getContentText:()=>typeof body==='string'?body:JSON.stringify(body)});
function connectBot(s,enabled=true,chat_id='chat-fixture-1'){s.context.adminZaloSettings(s.token,{bot_token:botToken,chat_id,enabled});s.controls.fetch=()=>botResponse();}

test('Bot settings require admin and keep credentials out of public data, admin responses and logs',()=>{
 const s=fixture();for(const action of [()=>s.context.adminZaloSettings('',{}),()=>s.context.adminZaloStatus(''),()=>s.context.adminZaloChats(''),()=>s.context.adminZaloTest(''),()=>s.context.adminZaloRetry('','',false)])assert.throws(action,/đăng nhập/);
 assert.throws(()=>s.context.adminZaloSettings(s.token,{bot_token:'https://bad/token',chat_id:'chat-1',enabled:true}),/Token/);
 connectBot(s);assert.equal(s.properties.get('ZALO_BOT_TOKEN'),botToken);assert.equal(s.triggers.length,1);
 s.context.adminZaloSettings(s.token,{bot_token:'',chat_id:'chat-fixture-1',enabled:true});assert.equal(s.triggers.length,1);assert.equal(s.properties.get('ZALO_BOT_TOKEN'),botToken);
 for(const value of [s.publicRead({action:'settings'}),s.context.adminData(s.token),s.context.adminZaloStatus(s.token),s.logs])assert.ok(!JSON.stringify(value).includes(botToken));
 for(const action of ['adminZaloSettings','zalo','notifications'])assert.throws(()=>s.publicRead({action}),/không được hỗ trợ/);
 s.identity.active='';assert.throws(()=>s.context.setupZaloNotifications(),/Chỉ chủ dự án/);
});

test('A saved consultation queues one Zalo notification; retries never enqueue or send duplicates',()=>{
 const s=fixture();connectBot(s);const d=lead(1);const received=s.post(d);assert.equal(received.received,true);assert.equal(s.requests.length,0);s.post(d);
 assert.equal(s.context.rows_('ThongBaoZalo').length,1);assert.equal(s.context.processZaloNotifications_().sent,1);s.context.processZaloNotifications_();s.post(d);s.context.processZaloNotifications_();assert.equal(s.requests.length,1);
 const request=s.requests[0],message=JSON.parse(request.options.payload);assert.equal(request.url,'https://bot-api.zapps.me/bot'+botToken+'/sendMessage');assert.equal(request.options.followRedirects,false);assert.equal(request.options.validateHttpsCertificates,true);assert.equal(request.lockDepth,0);
 assert.equal(message.chat_id,'chat-fixture-1');for(const text of ['0988123456','0344639666','1.500.000','CS1',received.id])assert.ok(message.text.includes(text));
 assert.equal(s.context.adminZaloStatus(s.token).counts.sent,1);assert.equal(s.publicRead({action:'receipt',key:d.request_key}).received,true);
});

test('Confirmed Zalo rate limits retry with backoff while customer receipt stays successful',()=>{
 const s=fixture();connectBot(s);const d=lead(1);s.post(d);let calls=0;s.controls.fetch=()=>botResponse(++calls===1?{ok:false,error_code:429}:{ok:true,result:{message_id:'saved'}} ,calls===1?429:200);
 s.context.processZaloNotifications_();assert.equal(s.context.adminZaloStatus(s.token).counts.pending,1);assert.equal(s.publicRead({action:'receipt',key:d.request_key}).received,true);
 s.context.processZaloNotifications_();assert.equal(calls,1);s.advance(61000);s.context.processZaloNotifications_();assert.equal(calls,2);assert.equal(s.context.adminZaloStatus(s.token).counts.sent,1);
});

test('A lost Zalo response is marked uncertain and never automatically resent or leaked in errors',()=>{
 const s=fixture();connectBot(s);const d=lead(1),received=s.post(d);s.controls.fetch=(url)=>{throw new Error('Sensitive transport error '+url);};s.context.processZaloNotifications_();
 assert.equal(s.context.adminZaloStatus(s.token).counts.uncertain,1);assert.ok(!JSON.stringify(s.context.adminZaloStatus(s.token)).includes(botToken));assert.equal(s.publicRead({action:'receipt',key:d.request_key}).received,true);
 s.advance(610000);s.context.processZaloNotifications_();assert.equal(s.requests.length,1);assert.throws(()=>s.context.adminZaloRetry(s.token,received.id,false),/Kiểm tra/);
 s.controls.fetch=()=>botResponse();s.context.adminZaloRetry(s.token,received.id,true);s.context.processZaloNotifications_();assert.equal(s.context.adminZaloStatus(s.token).counts.sent,1);
});

test('Expired sending leases do not resend automatically; confirmed failures have a retry limit',()=>{
 const s=fixture();connectBot(s);s.post(lead(1));s.context.claimZaloJob_();s.advance(601000);s.context.processZaloNotifications_();assert.equal(s.requests.length,0);assert.equal(s.context.adminZaloStatus(s.token).counts.uncertain,1);
 const another=fixture();connectBot(another);another.post(lead(1));another.controls.fetch=()=>botResponse({ok:false,error_code:500},500);
 for(let i=0;i<4;i++){another.context.processZaloNotifications_();another.advance(5*60000);}
 assert.equal(another.requests.length,4);assert.equal(another.context.adminZaloStatus(another.token).counts.failed,1);
});

test('Queue writes recover after failure without re-notifying historical customers; target changes cannot reroute old data',()=>{
 const s=fixture();const old=s.post(lead(1));connectBot(s);s.context.processZaloNotifications_();assert.equal(s.requests.length,0);
 s.controls.queueWriteFailure=true;const d={...lead(1),phone:'0971234567'},saved=s.post(d);assert.equal(saved.received,true);assert.equal(s.publicRead({action:'receipt',key:d.request_key}).received,true);
 s.controls.queueWriteFailure=false;s.context.processZaloNotifications_();assert.equal(s.requests.length,1);assert.ok(!s.requests[0].options.payload.includes(old.id));
 const queued=s.post({...lead(1),phone:'0961234567'});s.context.adminZaloSettings(s.token,{chat_id:'different-recipient',enabled:true});s.context.processZaloNotifications_();assert.equal(s.requests.length,1);assert.equal(s.context.rows_('ThongBaoZalo').find(j=>j.lead_id===queued.id).status,'cancelled');
});

test('Bot chat discovery handles both result shapes, rejects unsafe numeric IDs and never returns raw messages',()=>{
 const s=fixture();connectBot(s,false);s.controls.fetch=()=>botResponse({ok:true,result:{message:{chat:{id:'123456789123456789',title:'Quản lý cửa hàng'},text:'private-content'}}});
 const result=s.context.adminZaloChats(s.token);assert.equal(result.chats[0].id,'123456789123456789');assert.ok(!JSON.stringify(result).includes('private-content'));
 s.controls.fetch=()=>botResponse({ok:true,result:[{message:{chat:{id:123,title:'Một'}}},{message:{chat:{id:123,title:'Một'}}},{message:{chat:{id:123456789123456789,title:'Không an toàn'}}}]});assert.equal(s.context.adminZaloChats(s.token).chats.length,1);
 s.controls.fetch=()=>botResponse();s.context.adminZaloTest(s.token);assert.ok(!s.requests.at(-1).options.payload.includes('0988123456'));
 s.context.adminZaloSettings(s.token,{chat_id:'chat-fixture-1',enabled:true});s.context.adminZaloSettings(s.token,{chat_id:'chat-fixture-1',enabled:false});assert.equal(s.triggers.length,0);s.post(lead(1));s.context.processZaloNotifications_();assert.equal(s.context.rows_('ThongBaoZalo').length,0);
});
