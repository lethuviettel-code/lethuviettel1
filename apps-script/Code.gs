/* Viettel Phú Hà — Google Sheets backend. Public endpoints never return leads.
   Bind to a PRIVATE Google Sheet. Run setupStore once, then deploy as owner. */
var SIM_HEADERS = ['id','number','price','type','element','branch','status','description','featured','updated'];
var LEAD_HEADERS = ['id','created','name','phone','sim_id','sim_number','quoted_price','branch','message','status','staff_note','follow_up','request_key','request_hash'];
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
function book_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw new Error('Chưa chạy setupStore_.');return SpreadsheetApp.openById(id);}
function rows_(name){var sheet=book_().getSheetByName(name);if(!sheet)throw new Error('Thiếu sheet '+name+'. Chạy setupStore_.');var values=sheet.getDataRange().getValues();var keys=values.shift();return values.filter(function(r){return r[0]!=='';}).map(function(r){var out={};keys.forEach(function(k,i){out[k]=r[i];});return out;});}
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
    append_('YeuCau',LEAD_HEADERS,record);return {received:true,id:record.id};
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
function adminData(token){auth_(token);return {sims:rows_('KhoSim').map(publicSim_),leads:rows_('YeuCau').map(function(r){var copy=Object.assign({},r);delete copy.request_key;delete copy.request_hash;return copy;}),settings:store_()};}
function validSim_(d){var type=clean_(d.type,'Loại sim',60,true),element=clean_(d.element||'','Ngũ hành',20,false);if(['','Kim','Mộc','Thủy','Hỏa','Thổ'].indexOf(element)<0)throw new Error('Ngũ hành không hợp lệ.');if(['available','reserved','sold','hidden'].indexOf(d.status||'available')<0)throw new Error('Tình trạng sim không hợp lệ.');return {number:phone_(String(d.number)),price:int_(d.price,'Giá sim',1,999999999999),type:type,element:element,branch:branch_(d.branch),status:d.status||'available',description:clean_(d.description||'','Mô tả',2000,false),featured:d.featured===true||d.featured===1?1:0,updated:Math.floor(Date.now()/1000)};}
function adminSaveSim(token,data){auth_(token);var parsed=validSim_(data);return locked_(function(){var all=rows_('KhoSim');var old=data.id?all.find(function(r){return Number(r.id)===Number(data.id);}):null;if(data.id&&!old)throw new Error('Không tìm thấy sim.');if(all.some(function(r){return String(r.number)===parsed.number&&(!old||Number(r.id)!==Number(old.id));}))throw new Error('Số sim đã có trong kho.');if(old&&String(old.number)!==parsed.number&&rows_('YeuCau').some(function(r){return Number(r.sim_id)===Number(old.id);}))throw new Error('Sim đã có khách tư vấn: không đổi số, hãy thêm sim mới.');parsed.id=old?Number(old.id):Math.max.apply(null,[0].concat(all.map(function(r){return Number(r.id);})))+1;if(old)replace_('KhoSim',SIM_HEADERS,old.id,parsed);else append_('KhoSim',SIM_HEADERS,parsed);return {ok:true};});}
function adminImport(token,input){auth_(token);if(!Array.isArray(input)||!input.length||input.length>5000)throw new Error('Nhập từ 1 đến 5.000 sim mỗi lần.');var rows=input.map(function(d,i){try{return validSim_(d);}catch(e){throw new Error('Dòng '+(i+2)+': '+e.message);}});return locked_(function(){var current=rows_('KhoSim'),seen=new Set(current.map(function(r){return String(r.number);})),next=Math.max.apply(null,[0].concat(current.map(function(r){return Number(r.id);})));rows.forEach(function(r){if(seen.has(r.number))throw new Error('Số '+r.number+' bị trùng. Chưa nhập dòng nào.');seen.add(r.number);r.id=++next;});var sheet=book_().getSheetByName('KhoSim');capacity_(sheet,sheet.getLastRow()+rows.length);sheet.getRange(sheet.getLastRow()+1,1,rows.length,SIM_HEADERS.length).setNumberFormat('@').setValues(rows.map(function(r){return SIM_HEADERS.map(function(k){return safeCell_(r[k]);});}));SpreadsheetApp.flush();return {count:rows.length};});}
function adminSaveLead(token,data){auth_(token);return locked_(function(){var old=rows_('YeuCau').find(function(r){return r.id===data.id;});if(!old)throw new Error('Không tìm thấy yêu cầu.');if(['new','contacted','done'].indexOf(data.status)<0)throw new Error('Trạng thái không hợp lệ.');old.status=data.status;old.staff_note=clean_(data.staff_note||'','Ghi chú',2000,false);old.follow_up=clean_(data.follow_up||'','Lịch gọi lại',30,false);if(old.follow_up&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(old.follow_up))throw new Error('Lịch gọi lại không hợp lệ.');replace_('YeuCau',LEAD_HEADERS,old.id,old);return {ok:true};});}
function adminSettings(token,data){auth_(token);var cfg=store_();Object.keys(data).forEach(function(k){if(!Object.prototype.hasOwnProperty.call(DEFAULT_STORE,k)||k==='branches')throw new Error('Trường cấu hình không hợp lệ.');cfg[k]=clean_(data[k],k,k.endsWith('_policy')?10000:500,['name','phone','email'].indexOf(k)>=0);});phone_(cfg.phone);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.email))throw new Error('Email không hợp lệ.');if(cfg.zalo_url&&!/^https:\/\/(oa\.)?zalo\.me\/[\w/-]+$/.test(cfg.zalo_url))throw new Error('Link Zalo cần là https://zalo.me/…');if(cfg.site_url&&!/^https:\/\/[A-Za-z0-9.-]+\/?$/.test(cfg.site_url))throw new Error('Tên miền cần là HTTPS.');if(cfg.banner_url&&!/^https:\/\/[A-Za-z0-9.-]+\//.test(cfg.banner_url))throw new Error('Ảnh banner cần link HTTPS.');return locked_(function(){var sheet=book_().getSheetByName('CauHinh');var rows=Object.keys(cfg).map(function(k){return [k,safeCell_(k==='branches'?JSON.stringify(cfg[k]):cfg[k])];});sheet.getRange(2,1,rows.length,2).setNumberFormat('@').setValues(rows);SpreadsheetApp.flush();return {ok:true};});}
