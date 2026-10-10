const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
function createStore(){
 const sheets=new Map(),properties=new Map(),cache=new Map(),logs=[];
 function range(sheet,row,col,height=1,width=1){return {setValues(values){if(values.length!==height||values.some(r=>r.length!==width))throw new Error('Range size mismatch');values.forEach((r,i)=>r.forEach((v,j)=>{sheet.cells[row+i-1]??=[];sheet.cells[row+i-1][col+j-1]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v;}));return this;},getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>sheet.cells[row+i-1]?.[col+j-1]??''));},setNumberFormat(){return this;}};}
 class Sheet{constructor(name){this.name=name;this.cells=[];this.max=1000;}getLastRow(){return this.cells.length;}getMaxRows(){return this.max;}insertRowsAfter(pos,count){this.max+=count;}getRange(row,col,h,w){if(typeof row==='string')return {setNumberFormat(){return this;}};if(row+(h||1)-1>this.max)throw new Error('Outside grid');return range(this,row,col,h,w);}getDataRange(){return range(this,1,1,Math.max(1,this.cells.length),Math.max(1,this.cells[0]?.length||1));}setFrozenRows(){}}
 const book={getId:()=> 'private-test-sheet',setSpreadsheetTimeZone(){},getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=new Sheet(n);sheets.set(n,s);return s;}};
 const props={getProperty:k=>properties.get(k)||null,setProperty(k,v){properties.set(k,String(v));return this;},setProperties(obj){Object.entries(obj).forEach(([k,v])=>properties.set(k,String(v)));return this;}};
 const c={get:k=>{const item=cache.get(k);if(!item||item.until<Date.now()){cache.delete(k);return null;}return item.value;},put:(k,v,ttl)=>cache.set(k,{value:String(v),until:Date.now()+ttl*1000}),remove:k=>cache.delete(k)};
 const output=value=>({value,mime:'',setMimeType(m){this.mime=m;return this;}});
 const identity={active:'owner@example.test',effective:'owner@example.test'};
 const context=vm.createContext({Session:{getActiveUser:()=>({getEmail:()=>identity.active}),getEffectiveUser:()=>({getEmail:()=>identity.effective})},console:{log:s=>logs.push(s)},Date,Set,Map,JSON,Number,String,Array,Object,Math,Error,
 SpreadsheetApp:{getActiveSpreadsheet:()=>book,openById:id=>{if(id!==book.getId())throw new Error('Wrong sheet ID');return book;},flush(){}},
 PropertiesService:{getScriptProperties:()=>props},CacheService:{getScriptCache:()=>c},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()].map(n=>n>127?n-256:n)},
 ContentService:{createTextOutput:output,MimeType:{JSON:'application/json',JAVASCRIPT:'application/javascript'}},
 HtmlService:{createHtmlOutputFromFile:()=>({setTitle(){return this;},addMetaTag(){return this;}})}
 });
 vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),context);
 function setup(){context.setupStore();const pwd=logs.find(s=>s.startsWith('Mật khẩu quản trị mới')).split(': ').pop();return context.adminLogin(pwd).token;}
 return {context,sheets,properties,cache,logs,identity,setup,publicRead:p=>JSON.parse(JSON.stringify(context.publicRead_(p))),post:d=>JSON.parse(context.doPost({postData:{contents:JSON.stringify(d)}}).value)};
}
module.exports={createStore};
