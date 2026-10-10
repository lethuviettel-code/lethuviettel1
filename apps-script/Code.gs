/* Viettel Phú Hà — Google Sheets backend. Public endpoints never return leads.
   Bind to a PRIVATE Google Sheet. Run setupStore once, then deploy as owner. */
var SIM_HEADERS = ['id','number','price','type','element','branch','status','description','featured','updated'];
var LEAD_HEADERS = ['id','created','name','phone','sim_id','sim_number','quoted_price','branch','message','status','staff_note','follow_up','request_key','request_hash'];
var ZALO_HEADERS = ['lead_id','status','attempts','next_try','last_error','updated','lease','chat_id'];
var DEFAULT_STORE = {
  name:'Viettel Phú Hà',phone:'0344.639.666',email:'thuntlpto.9x@gmail.com',
  tagline:'Kết nối giá trị - Đồng hành cùng bạn',hours:'',zalo_url:'',site_url:'',banner_url:'',
  privacy_policy:'',registration_policy:'',
  branches:[{id:'cs1',name:'CS1',address:'KCN Phú Hà, thị xã Phú Thọ, Phú Thọ',map_url:''},
    {id:'cs2',name:'CS2',address:'Thanh Miếu, Việt Trì, Phú Thọ',map_url:''},
    {id:'cs3',name:'CS3',address:'Cao Mại, Lâm Thao, Phú Thọ',map_url:''}]
};
// Visible editor entry points. Browser calls cannot provision/reset the store.
function setupStore() {
  requireEditorOwner_();
  setupStore_();
}
function resetAdminPassword() {
  requireEditorOwner_();
  resetAdminPassword_();
}
function requireEditorOwner_() {
  var active=Session.getActiveUser().getEmail();
  var effective=Session.getEffectiveUser().getEmail();
  if(!active||active!==effective)throw new Error('Chỉ chủ dự án chạy hàm này trong trình sửa Apps Script.');
}
function setupStore_() {
  var props=PropertiesService.getScriptProperties();
  var sheet=SpreadsheetApp.getActiveSpreadsheet()||(props.getProperty('SHEET_ID')?SpreadsheetApp.openById(props.getProperty('SHEET_ID')):null);
  if(!sheet)throw new Error('Mở Apps Script từ Google Sheet: Tiện ích mở rộng → Apps Script.');
  props.setProperty('SHEET_ID',sheet.getId());
  sheet.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
  ensureSheet_(sheet,'KhoSim',SIM_HEADERS);ensureSheet_(sheet,'YeuCau',LEAD_HEADERS);
  ensureSheet_(sheet,'CauHinh',['key','value']);
  sheet.getSheetByName('KhoSim').getRange('B2:B').setNumberFormat('@');
  sheet.getSheetByName('YeuCau').getRange('D2:D').setNumberFormat('@');
  if(!props.getProperty('ADMIN_HASH')||!props.getProperty('ADMIN_SALT')||!props.getProperty('ADMIN_VERSION')) resetAdminPassword_();
  console.log('Đã thiết lập. Giữ Google Sheet riêng tư; chạy resetAdminPassword nếu cần mật khẩu quản trị mới.');
}
function resetAdminPassword_() {
  var password=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().slice(0,8);
  var salt=Utilities.getUuid();var props=PropertiesService.getScriptProperties();
  props.setProperties({ADMIN_SALT:salt,ADMIN_HASH:hash_(salt+password),ADMIN_VERSION:Utilities.getUuid()});
  console.log('Mật khẩu quản trị mới (lưu riêng, không đưa lên GitHub): '+password);
}
function ensureSheet_(book,name,headers) {
  var sheet=book.getSheetByName(name)||book.insertSheet(name);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);}
  else if(JSON.stringify(sheet.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))
    throw new Error('Sheet '+name+' đã có cấu trúc khác. Tạo bản sao dữ liệu rồi dùng Google Sheet mới để tránh ghi đè.');
  return sheet;
}
function book_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw new Error('Chưa chạy setupStore.');return SpreadsheetApp.openById(id);}
function rows_(name){var sheet=book_().getSheetByName(name);if(!sheet)throw new Error('Thiếu sheet '+name+'. Chạy setupStore.');var values=sheet.getDataRange().getValues();var keys=values.shift();return values.filter(function(r){return r[0]!=='';}).map(function(r){var out={};keys.forEach(function(k,i){out[k]=r[i];});return out;});}
function store_(){var cfg=JSON.parse(JSON.stringify(DEFAULT_STORE));rows_('CauHinh').forEach(function(r){if(Object.prototype.hasOwnProperty.call(cfg,r.key)){cfg[r.key]=r.key==='branches'?JSON.parse(r.value):String(r.value);}});return cfg;}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function clean_(value,label,max,required){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new Error(label+' không hợp lệ.');return value.trim();}
function phone_(v){var n=clean_(v,'Số điện thoại',30,true).replace(/[\s.+()-]/g,'').replace(/^84/,'0');if(!/^0[35789]\d{8}$/.test(n))throw new Error('Số điện thoại Việt Nam chưa hợp lệ.');return n;}
function int_(v,label,min,max){if(v===''||v===null||typeof v==='boolean'||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>max)throw new Error(label+' không hợp lệ.');return Number(v);}
function branch_(v){if(['cs1','cs2','cs3'].indexOf(v)<0)throw new Error('Cơ sở không hợp lệ.');return v;}
function key_(v){if(typeof v!=='string'||! /^[A-Za-z0-9_-]{20,100}$/.test(v))throw new Error('Mã yêu cầu không hợp lệ.');return v;}
function safeCell_(v){return typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v;}
function locked_(fn){var lock=LockService.getScriptLock();lock.waitLock(20000);try{return fn();}finally{lock.releaseLock();}}
function capacity_(sheet,last){if(last>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),last-sheet.getMaxRows());}
function append_(name,headers,row){var sheet=book_().getSheetByName(name);var index=sheet.getLastRow()+1;capacity_(sheet,index);sheet.getRange(index,1,1,headers.length).setNumberFormat('@').setValues([headers.map(function(k){return safeCell_(row[k]===undefined?'':row[k]);})]);SpreadsheetApp.flush();}
function replace_(name,headers,id,row){var sheet=book_().getSheetByName(name);var values=sheet.getDataRange().getValues();var index=values.findIndex(function(r,i){return i>0&&String(r[0])===String(id);});if(index<0)throw new Error('Không tìm thấy dữ liệu.');sheet.getRange(index+1,1,1,headers.length).setNumberFormat('@').setValues([headers.map(function(k){return safeCell_(row[k]===undefined?'':row[k]);})]);SpreadsheetApp.flush();}
function publicSim_(r){var out={};SIM_HEADERS.forEach(function(k){out[k]=r[k];});out.id=Number(out.id);out.price=Number(out.price);out.featured=Number(out.featured)||0;return out;}
function doGet(e) {
  var p=e&&e.parameter||{};
  if(p.view==='admin'){var admin;try{admin=HtmlService.createHtmlOutputFromFile('Admin');}catch(error){admin=HtmlService.createHtmlOutputFromFile('admin');}return admin.setTitle('Quản trị Viettel Phú Hà').addMetaTag('viewport','width=device-width, initial-scale=1');}
  var result;
  try{result=publicRead_(p);}catch(error){result={error:error.message};}
  var json=JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  if(p.callback){if(!/^phuha_\d+_\d+$/.test(p.callback))return ContentService.createTextOutput('Invalid callback');return ContentService.createTextOutput(p.callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);}
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function publicRead_(p){
  if(p.action==='settings')return store_();
  if(p.action==='receipt'){
    var key=hash_(key_(p.key));var lead=rows_('YeuCau').find(function(r){return r.request_key===key;});
    if(lead)return {received:true,id:lead.id};
    var cached=CacheService.getScriptCache().get('receipt:'+key);return cached?JSON.parse(cached):{received:false};
  }
  if(p.action!=='sims'&&p.action!=='sim'&&p.action!=='options')throw new Error('Yêu cầu không được hỗ trợ.');
  var all=rows_('KhoSim').filter(function(r){return r.status!=='hidden';}).map(publicSim_);
  if(p.action==='options')return {types:Array.from(new Set(all.map(function(r){return r.type;}))).sort()};
  if(p.action==='sim'){var item=all.find(function(r){return r.id===Number(p.id);});if(!item)throw new Error('Không tìm thấy sim.');return item;}
  var size=int_(p.size||24,'Số sim mỗi trang',1,60),page=int_(p.page||1,'Trang',1,100000);
  var q=String(p.q||'').replace(/[\s.]/g,'').slice(0,30);
  var items=all.filter(function(r){return (!q||String(r.number).indexOf(q)>=0)&&(!p.prefix||String(r.number).startsWith(p.prefix))&&(!p.type||r.type===p.type)&&(!p.element||r.element===p.element)&&(!p.branch||r.branch===p.branch)&&(!p.status||r.status===p.status)&&(!p.max_price||r.price<=Number(p.max_price))&&(!p.min_price||r.price>=Number(p.min_price));});
  items.sort(function(a,b){return p.sort==='asc'?a.price-b.price:p.sort==='desc'?b.price-a.price:b.featured-a.featured||b.id-a.id;});
  return {items:items.slice((page-1)*size,page*size),total:items.length,page:page,size:size};
}
function doPost(e){
  var payload,key,result;
  try{payload=JSON.parse(e.postData.contents);key=key_(payload.request_key);if(payload.action!=='submitLead')throw new Error('Yêu cầu không được hỗ trợ.');result=submitLead_(payload);}
  catch(error){result={error:error.message};if(key)CacheService.getScriptCache().put('receipt:'+hash_(key),JSON.stringify(result),120);}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function submitLead_(data){
  if(data.website||data.consent!==true)throw new Error('Vui lòng đồng ý chính sách xử lý thông tin.');
  var key=hash_(key_(data.request_key));
  var name=clean_(data.name,'Họ tên',100,true),phone=phone_(data.phone),sid=data.sim_id==null?'':int_(data.sim_id,'Mã sim',1,999999999);
  var message=clean_(data.message||'','Ghi chú',2000,sid==='');
  var signature=hash_(JSON.stringify([name,phone,sid,message,sid===''?branch_(data.branch):'']));
  return locked_(function(){
    var leads=rows_('YeuCau'),previous=leads.find(function(r){return r.request_key===key;});
    if(previous){if(previous.request_hash!==signature)throw new Error('Thông tin đã thay đổi sau khi gửi. Tải lại trang để gửi yêu cầu mới.');return {received:true,id:previous.id};}
    if(!store_().privacy_policy)throw new Error('Cửa hàng chưa mở biểu mẫu tư vấn. Vui lòng gọi hotline.');
    // A per-phone limit reduces accidental repetition; Apps Script does not expose client IP.
    if(leads.filter(function(r){return r.phone===phone&&Number(r.created)>Date.now()/1000-600;}).length>=5)throw new Error('Bạn đã gửi nhiều yêu cầu. Vui lòng gọi cửa hàng để được hỗ trợ.');
    var sim=sid===''?null:rows_('KhoSim').find(function(r){return Number(r.id)===sid;});
    if(sid!==''&&(!sim||sim.status!=='available'))throw new Error('Sim này không còn sẵn. Vui lòng chọn sim khác hoặc gọi cửa hàng.');
    var record={id:'PH-'+Utilities.getUuid().slice(0,8).toUpperCase(),created:Math.floor(Date.now()/1000),name:name,phone:phone,sim_id:sid,
      sim_number:sim?sim.number:'',quoted_price:sim?sim.price:'',branch:sim?sim.branch:branch_(data.branch),message:message,status:'new',staff_note:'',follow_up:'',request_key:key,request_hash:signature};
    append_('YeuCau',LEAD_HEADERS,record);
    // Notification failures must never prevent a saved consultation being confirmed.
    try{enqueueZalo_(record);}catch(error){PropertiesService.getScriptProperties().setProperty('ZALO_LAST_ERROR','Chưa đưa được yêu cầu vào hàng đợi Zalo. Lịch gửi sẽ kiểm tra lại.');}
    return {received:true,id:record.id};
  });
}
function adminLogin(password){
  var cache=CacheService.getScriptCache(),count=Number(cache.get('login-failures')||0);
  if(count>=10)throw new Error('Đã nhập sai nhiều lần. Vui lòng thử lại sau 10 phút.');
  var props=PropertiesService.getScriptProperties(),expected=props.getProperty('ADMIN_HASH');
  if(!expected||typeof password!=='string'||hash_(props.getProperty('ADMIN_SALT')+password)!==expected){cache.put('login-failures',String(count+1),600);throw new Error('Mật khẩu không đúng.');}
  var token=Utilities.getUuid()+Utilities.getUuid();cache.put('session:'+hash_(token),props.getProperty('ADMIN_VERSION'),1800);return {token:token};
}
function auth_(token){if(typeof token!=='string'||token.length>100||!token)throw new Error('Vui lòng đăng nhập quản trị.');var cache=CacheService.getScriptCache(),version=PropertiesService.getScriptProperties().getProperty('ADMIN_VERSION');if(!version||cache.get('session:'+hash_(token))!==version)throw new Error('Phiên đã hết hạn. Vui lòng đăng nhập lại.');}
function adminLogout(token){auth_(token);CacheService.getScriptCache().remove('session:'+hash_(token));return {ok:true};}
function adminData(token){auth_(token);return {sims:rows_('KhoSim').map(publicSim_),leads:rows_('YeuCau').map(function(r){var copy=Object.assign({},r);delete copy.request_key;delete copy.request_hash;return copy;}),settings:store_(),zalo:zaloStatus_()};}
function validSim_(d){var type=clean_(d.type,'Loại sim',60,true),element=clean_(d.element||'','Ngũ hành',20,false);if(['','Kim','Mộc','Thủy','Hỏa','Thổ'].indexOf(element)<0)throw new Error('Ngũ hành không hợp lệ.');if(['available','reserved','sold','hidden'].indexOf(d.status||'available')<0)throw new Error('Tình trạng sim không hợp lệ.');return {number:phone_(String(d.number)),price:int_(d.price,'Giá sim',1,999999999999),type:type,element:element,branch:branch_(d.branch),status:d.status||'available',description:clean_(d.description||'','Mô tả',2000,false),featured:d.featured===true||d.featured===1?1:0,updated:Math.floor(Date.now()/1000)};}
function adminSaveSim(token,data){auth_(token);var parsed=validSim_(data);return locked_(function(){var all=rows_('KhoSim');var old=data.id?all.find(function(r){return Number(r.id)===Number(data.id);}):null;if(data.id&&!old)throw new Error('Không tìm thấy sim.');if(all.some(function(r){return String(r.number)===parsed.number&&(!old||Number(r.id)!==Number(old.id));}))throw new Error('Số sim đã có trong kho.');if(old&&String(old.number)!==parsed.number&&rows_('YeuCau').some(function(r){return Number(r.sim_id)===Number(old.id);}))throw new Error('Sim đã có khách tư vấn: không đổi số, hãy thêm sim mới.');parsed.id=old?Number(old.id):Math.max.apply(null,[0].concat(all.map(function(r){return Number(r.id);})))+1;if(old)replace_('KhoSim',SIM_HEADERS,old.id,parsed);else append_('KhoSim',SIM_HEADERS,parsed);return {ok:true};});}
function adminImport(token,input){auth_(token);if(!Array.isArray(input)||!input.length||input.length>5000)throw new Error('Nhập từ 1 đến 5.000 sim mỗi lần.');var rows=input.map(function(d,i){try{return validSim_(d);}catch(e){throw new Error('Dòng '+(i+2)+': '+e.message);}});return locked_(function(){var current=rows_('KhoSim'),seen=new Set(current.map(function(r){return String(r.number);})),next=Math.max.apply(null,[0].concat(current.map(function(r){return Number(r.id);})));rows.forEach(function(r){if(seen.has(r.number))throw new Error('Số '+r.number+' bị trùng. Chưa nhập dòng nào.');seen.add(r.number);r.id=++next;});var sheet=book_().getSheetByName('KhoSim');capacity_(sheet,sheet.getLastRow()+rows.length);sheet.getRange(sheet.getLastRow()+1,1,rows.length,SIM_HEADERS.length).setNumberFormat('@').setValues(rows.map(function(r){return SIM_HEADERS.map(function(k){return safeCell_(r[k]);});}));SpreadsheetApp.flush();return {count:rows.length};});}
function adminSaveLead(token,data){auth_(token);return locked_(function(){var old=rows_('YeuCau').find(function(r){return r.id===data.id;});if(!old)throw new Error('Không tìm thấy yêu cầu.');if(['new','contacted','done'].indexOf(data.status)<0)throw new Error('Trạng thái không hợp lệ.');old.status=data.status;old.staff_note=clean_(data.staff_note||'','Ghi chú',2000,false);old.follow_up=clean_(data.follow_up||'','Lịch gọi lại',30,false);if(old.follow_up&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(old.follow_up))throw new Error('Lịch gọi lại không hợp lệ.');replace_('YeuCau',LEAD_HEADERS,old.id,old);return {ok:true};});}
function adminSettings(token,data){auth_(token);var cfg=store_();Object.keys(data).forEach(function(k){if(!Object.prototype.hasOwnProperty.call(DEFAULT_STORE,k)||k==='branches')throw new Error('Trường cấu hình không hợp lệ.');cfg[k]=clean_(data[k],k,k.endsWith('_policy')?10000:500,['name','phone','email'].indexOf(k)>=0);});phone_(cfg.phone);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.email))throw new Error('Email không hợp lệ.');if(cfg.zalo_url&&!/^https:\/\/(oa\.)?zalo\.me\/[\w/-]+$/.test(cfg.zalo_url))throw new Error('Link Zalo cần là https://zalo.me/…');if(cfg.site_url&&!/^https:\/\/[A-Za-z0-9.-]+\/?$/.test(cfg.site_url))throw new Error('Tên miền cần là HTTPS.');if(cfg.banner_url&&!/^https:\/\/[A-Za-z0-9.-]+\//.test(cfg.banner_url))throw new Error('Ảnh banner cần link HTTPS.');return locked_(function(){var sheet=book_().getSheetByName('CauHinh');var rows=Object.keys(cfg).map(function(k){return [k,safeCell_(k==='branches'?JSON.stringify(cfg[k]):cfg[k])];});sheet.getRange(2,1,rows.length,2).setNumberFormat('@').setValues(rows);SpreadsheetApp.flush();return {ok:true};});}

/* Private Zalo Bot notifications.
   API contract: POST https://bot-api.zapps.me/bot{token}/sendMessage
   JSON {chat_id, text}, response {ok, result/error_code}. No token is public. */
function setupZaloNotifications() {
  requireEditorOwner_();
  ensureSheet_(book_(),'ThongBaoZalo',ZALO_HEADERS);
  // Prepare a request to authorize UrlFetch without sending messages.
  UrlFetchApp.getRequest('https://bot-api.zapps.me/',{method:'get'});
  ensureZaloTrigger_();
  console.log('Đã chuẩn bị thông báo Zalo. Mở admin → Thông báo Zalo để nhập token và nơi nhận.');
}
function zaloConfig_() {
  var props=PropertiesService.getScriptProperties();
  return {enabled:props.getProperty('ZALO_ENABLED')==='1',token:props.getProperty('ZALO_BOT_TOKEN')||'',
    chatId:props.getProperty('ZALO_CHAT_ID')||'',since:Number(props.getProperty('ZALO_ENABLED_SINCE')||0),baseline:props.getProperty('ZALO_BASELINE_LEAD')||''};
}
function zaloTriggers_(){return ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='processZaloNotifications_';});}
function ensureZaloTrigger_(){var list=zaloTriggers_();if(!list.length)ScriptApp.newTrigger('processZaloNotifications_').timeBased().everyMinutes(1).create();list.slice(1).forEach(function(t){ScriptApp.deleteTrigger(t);});}
function adminZaloSettings(token,data) {
  auth_(token);
  var cfg=zaloConfig_(),value=clean_(data.bot_token||'','Token bot',300,false),chat=clean_(data.chat_id||'','Chat ID',100,false);
  if(value&&!/^[A-Za-z0-9:_-]{20,300}$/.test(value))throw new Error('Token bot không hợp lệ. Dán token mới từ Zalo Bot Manager.');
  if(chat&&!/^[A-Za-z0-9_-]{1,100}$/.test(chat))throw new Error('Chat ID không hợp lệ. Đây là mã nơi nhận, không phải số điện thoại.');
  var enabled=data.enabled===true;
  if(enabled&&(!(value||cfg.token)||!chat))throw new Error('Cần lưu token và chọn Chat ID trước khi bật thông báo.');
  return locked_(function(){
    var props=PropertiesService.getScriptProperties();
    ensureSheet_(book_(),'ThongBaoZalo',ZALO_HEADERS);
    if(enabled)ensureZaloTrigger_();else zaloTriggers_().forEach(function(t){ScriptApp.deleteTrigger(t);});
    var update={ZALO_CHAT_ID:chat,ZALO_ENABLED:enabled?'1':'0'};
    if(value)update.ZALO_BOT_TOKEN=value;
    if(enabled&&!cfg.enabled){var existing=rows_('YeuCau');update.ZALO_ENABLED_SINCE=String(Math.floor(Date.now()/1000));update.ZALO_BASELINE_LEAD=existing.length?existing[existing.length-1].id:'';}
    props.setProperties(update);
    return {ok:true};
  });
}
function zaloStatus_() {
  var cfg=zaloConfig_(),sheet=book_().getSheetByName('ThongBaoZalo');
  var jobs=sheet?rows_('ThongBaoZalo'):[],counts={pending:0,sending:0,sent:0,failed:0,uncertain:0,cancelled:0};
  jobs.forEach(function(j){if(Object.prototype.hasOwnProperty.call(counts,j.status))counts[j.status]++;});
  var scheduled=false;try{scheduled=cfg.enabled&&zaloTriggers_().length>0;}catch(error){}
  return {enabled:cfg.enabled,token_configured:Boolean(cfg.token),chat_id:cfg.chatId,schedule_ready:scheduled,
    counts:counts,last_error:PropertiesService.getScriptProperties().getProperty('ZALO_LAST_ERROR')||'',
    jobs:jobs.slice(-20).reverse().map(function(j){return {lead_id:j.lead_id,status:j.status,attempts:Number(j.attempts),last_error:j.last_error,updated:Number(j.updated)};})};
}
function adminZaloStatus(token){auth_(token);return zaloStatus_();}
function zaloFailure_(message,retryable,ambiguous){var error=new Error(message);error.retryable=Boolean(retryable);error.ambiguous=Boolean(ambiguous);return error;}
function zaloCall_(method,payload) {
  var cfg=zaloConfig_();
  if(!cfg.token)throw new Error('Chưa lưu token Zalo bot.');
  if(['sendMessage','getUpdates'].indexOf(method)<0)throw new Error('Lệnh Zalo không được hỗ trợ.');
  var response;
  try{response=UrlFetchApp.fetch('https://bot-api.zapps.me/bot'+cfg.token+'/'+method,{
    method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true,
    followRedirects:false,validateHttpsCertificates:true
  });}catch(error){throw zaloFailure_(method==='sendMessage'?'Chưa xác nhận được phản hồi Zalo. Kiểm tra tin nhắn trước khi gửi lại.':'Chưa kết nối được Zalo. Kiểm tra token hoặc thử lại.',false,method==='sendMessage');}
  var code=response.getResponseCode(),body;
  try{body=JSON.parse(response.getContentText());}catch(error){throw zaloFailure_('Zalo trả phản hồi chưa xác định. Kiểm tra kết nối trước khi thử lại.',false,method==='sendMessage');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw zaloFailure_('Zalo trả phản hồi chưa xác định. Kiểm tra tin nhắn trước khi gửi lại.',false,method==='sendMessage');
  if(code>=200&&code<300&&body.ok===true)return body.result;
  if(body.ok===false){
    var apiCode=Number(body.error_code)||code;
    var text=apiCode===401?'Token Zalo không còn hợp lệ. Tạo token mới và lưu lại.':apiCode===403?'Bot chưa có quyền gửi tới nơi nhận. Nhắn tin cho bot hoặc kiểm tra Chat ID.':apiCode===429?'Zalo đang giới hạn gửi tin. Hệ thống sẽ thử lại sau.':'Zalo từ chối yêu cầu (mã '+apiCode+'). Kiểm tra token và Chat ID.';
    throw zaloFailure_(text,apiCode===429||code>=500,false);
  }
  throw zaloFailure_('Chưa xác nhận Zalo đã nhận thông báo. Kiểm tra tin nhắn trước khi gửi lại.',false,method==='sendMessage');
}
function adminZaloChats(token) {
  auth_(token);
  var result=zaloCall_('getUpdates',{timeout:1}),updates=Array.isArray(result)?result:result?[result]:[],seen={};
  updates.forEach(function(update){
    var message=update.message||update.edited_message||update,chat=message.chat;
    if(!chat||chat.id==null||typeof chat.id==='number'&&!Number.isSafeInteger(chat.id))return;
    var id=String(chat.id);if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))return;
    var isGroup=chat.chat_type==='GROUP'||chat.type==='group';
    seen[id]={id:id,name:String(chat.title||chat.name||(isGroup?'Nhóm '+id:chat.username||message.from&&message.from.display_name||'Nơi nhận '+id)).slice(0,100)};
  });
  return {chats:Object.keys(seen).map(function(id){return seen[id];})};
}
function adminZaloTest(token) {
  auth_(token);var cfg=zaloConfig_();if(!cfg.chatId)throw new Error('Lưu Chat ID trước khi gửi thử.');
  zaloCall_('sendMessage',{chat_id:cfg.chatId,text:store_().name+'\nKết nối thông báo Zalo thành công. Khi bật thông báo, yêu cầu mới sẽ được gửi tới cuộc trò chuyện này.'});
  return {ok:true};
}
function enqueueZalo_(lead) {
  var cfg=zaloConfig_();if(!cfg.enabled||!cfg.token||!cfg.chatId)return;
  ensureSheet_(book_(),'ThongBaoZalo',ZALO_HEADERS);
  if(rows_('ThongBaoZalo').some(function(j){return j.lead_id===lead.id;}))return;
  append_('ThongBaoZalo',ZALO_HEADERS,{lead_id:lead.id,status:'pending',attempts:0,next_try:0,last_error:'',updated:Math.floor(Date.now()/1000),lease:'',chat_id:cfg.chatId});
}
function zaloText_(lead) {
  var cfg=store_(),branch=cfg.branches.find(function(b){return b.id===lead.branch;});
  return [cfg.name+' · YÊU CẦU MỚI',
    'Mã: '+lead.id,'Khách: '+lead.name,'Điện thoại: '+lead.phone,
    lead.sim_number?'Sim: '+lead.sim_number+' · Giá: '+Number(lead.quoted_price).toLocaleString('vi-VN')+' đ':'Nhu cầu: Tư vấn chọn sim',
    'Cơ sở: '+(branch?branch.name+' — '+branch.address:lead.branch),
    lead.message?'Ghi chú: '+String(lead.message).slice(0,600):'',
    'Thời gian: '+Utilities.formatDate(new Date(Number(lead.created)*1000),'Asia/Ho_Chi_Minh','dd/MM/yyyy HH:mm'),
    'Mở admin → Khách cần tư vấn để gọi lại và cập nhật trạng thái.'
  ].filter(Boolean).join('\n').slice(0,1900);
}
function claimZaloJob_() {
  return locked_(function(){
    var cfg=zaloConfig_();if(!cfg.enabled||!cfg.token||!cfg.chatId)return null;
    ensureSheet_(book_(),'ThongBaoZalo',ZALO_HEADERS);
    var jobs=rows_('ThongBaoZalo'),leads=rows_('YeuCau'),now=Math.floor(Date.now()/1000),seen={};
    jobs.forEach(function(j){seen[j.lead_id]=true;});
    // Recover a queue write failure after the consultation itself was saved.
    var boundary=cfg.baseline?leads.findIndex(function(l){return l.id===cfg.baseline;}):-1;
    var recent=boundary>=0?leads.slice(boundary+1):leads.filter(function(l){return Number(l.created)>=cfg.since;});
    recent.filter(function(l){return !seen[l.id];}).slice(0,10).forEach(enqueueZalo_);
    jobs=rows_('ThongBaoZalo');
    for(var i=0;i<jobs.length;i++){
      var job=jobs[i];
      if(job.status==='sending'&&Number(job.next_try)<=now){job.status='uncertain';job.last_error='Lần gửi trước bị gián đoạn. Kiểm tra Zalo trước khi gửi lại.';job.updated=now;replace_('ThongBaoZalo',ZALO_HEADERS,job.lead_id,job);}
      if(job.status!=='pending'||Number(job.next_try)>now)continue;
      var lead=leads.find(function(l){return l.id===job.lead_id;});
      if(job.chat_id!==cfg.chatId||!lead){job.status='cancelled';job.last_error=!lead?'Yêu cầu khách đã được xóa.':'Nơi nhận đã thay đổi. Không chuyển thông tin cũ sang nơi mới.';job.updated=now;replace_('ThongBaoZalo',ZALO_HEADERS,job.lead_id,job);continue;}
      job.status='sending';job.attempts=Number(job.attempts)+1;job.next_try=now+600;job.lease=Utilities.getUuid();job.updated=now;
      replace_('ThongBaoZalo',ZALO_HEADERS,job.lead_id,job);
      return {job:job,lead:lead};
    }
    return null;
  });
}
function processZaloNotifications_() {
  var started=Date.now(),sent=0;
  for(var i=0;i<5&&Date.now()-started<250000;i++){
    var claimed=claimZaloJob_();if(!claimed)break;
    var failure=null;
    // No spreadsheet lock is held while waiting on Zalo's network response.
    try{zaloCall_('sendMessage',{chat_id:claimed.job.chat_id,text:zaloText_(claimed.lead)});sent++;}catch(error){failure=error;}
    locked_(function(){
      var fresh=rows_('ThongBaoZalo').find(function(j){return j.lead_id===claimed.job.lead_id;});
      if(!fresh||fresh.lease!==claimed.job.lease)return;
      var now=Math.floor(Date.now()/1000);
      fresh.status=!failure?'sent':failure.ambiguous?'uncertain':failure.retryable&&Number(fresh.attempts)<4?'pending':'failed';
      fresh.last_error=failure?failure.message:'';fresh.updated=now;fresh.next_try=fresh.status==='pending'?now+60*Math.pow(2,Number(fresh.attempts)-1):0;fresh.lease='';
      replace_('ThongBaoZalo',ZALO_HEADERS,fresh.lead_id,fresh);
      PropertiesService.getScriptProperties().setProperty('ZALO_LAST_ERROR',failure?failure.message:'');
    });
  }
  return {sent:sent};
}
function adminZaloRetry(token,id,confirmUncertain) {
  auth_(token);
  return locked_(function(){
    var job=rows_('ThongBaoZalo').find(function(j){return j.lead_id===id;}),cfg=zaloConfig_();
    if(!cfg.enabled)throw new Error('Bật thông báo Zalo trước khi gửi lại.');
    if(!job||['failed','uncertain'].indexOf(job.status)<0)throw new Error('Chỉ gửi lại thông báo lỗi hoặc chưa xác nhận.');
    if(job.status==='uncertain'&&confirmUncertain!==true)throw new Error('Kiểm tra Zalo trước khi gửi lại để tránh nhận trùng.');
    if(job.chat_id!==cfg.chatId)throw new Error('Nơi nhận đã đổi. Không gửi thông tin cũ sang nơi nhận mới.');
    job.status='pending';job.attempts=0;job.next_try=0;job.last_error='';job.lease='';job.updated=Math.floor(Date.now()/1000);
    replace_('ThongBaoZalo',ZALO_HEADERS,job.lead_id,job);return {ok:true};
  });
}
