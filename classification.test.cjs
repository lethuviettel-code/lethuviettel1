const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

function setup(){
 const headers=['id','number','price','type','element','branch','status','description','featured','updated'];
 const values=[headers,
  [1,'0925454686',3900000,'Sim số đẹp','Thổ','cs1','available','Ghi chú giữ nguyên',1,1],
  [2,'0986868686',12000000,'Sim lộc phát','Kim','cs2','reserved','Giữ chỗ khách',0,1],
  [3,'0336868686',5000000,'Sim thần tài','Mộc','cs3','hidden','Không công khai',0,1]];
 const writes=[];let lock=false;
 const sheet={getDataRange:()=>({getValues:()=>structuredClone(values)}),getRangeList:cells=>({setValue:value=>{
  assert.equal(lock,true,'Writes require the store lock');
  for(const cell of cells){const [,letters,line]=cell.match(/^([A-Z]+)(\d+)$/);let column=0;for(const letter of letters)column=column*26+letter.charCodeAt(0)-64;values[Number(line)-1][column-1]=value;}
  writes.push({cells,value});
 }})};
 const ctx=vm.createContext({auth_:token=>{if(token!=='fixture-session')throw new Error('Vui lòng đăng nhập quản trị.');},
  int_:(value,label,min,max)=>{if(!Number.isSafeInteger(Number(value))||Number(value)<min||Number(value)>max)throw new Error(label+' không hợp lệ.');return Number(value);},
  locked_:fn=>{lock=true;try{return fn();}finally{lock=false;}},book_:()=>({getSheetByName:()=>sheet}),SpreadsheetApp:{flush:()=>{}}});
 vm.runInContext(fs.readFileSync('PhanLoai.gs','utf8'),ctx);
 return {ctx,values,writes};
}
test('Authenticated batch classification updates only selected cells, keeping prices, stock, notes and other SIMs',()=>{
 const {ctx,values}=setup(),before=structuredClone(values);
 const result=ctx.adminClassifySims('fixture-session',[1,2,2],'Sim phong thủy',null);
 assert.equal(result.count,2);assert.equal(values[1][3],'Sim phong thủy');assert.equal(values[2][3],'Sim phong thủy');
 for(let row=1;row<3;row++)for(const column of [0,1,2,4,5,6,7,8])assert.equal(values[row][column],before[row][column]);
 assert.deepEqual(values[3],before[3]);
 ctx.adminClassifySims('fixture-session',[1],'Sim thần tài','Hỏa');assert.equal(values[1][4],'Hỏa');
 ctx.adminClassifySims('fixture-session',[1],'Sim số đẹp','');assert.equal(values[1][4],'');assert.equal(values[1][3],'Sim số đẹp');
});
test('Unauthenticated, invalid and stale selections are rejected before any data write',()=>{
 const {ctx,writes}=setup();
 assert.throws(()=>ctx.adminClassifySims('',[1],'Sim lộc phát',null),/đăng nhập/);
 assert.throws(()=>ctx.adminClassifySims('fixture-session',[1],'=SIM',null),/Phân loại/);
 assert.throws(()=>ctx.adminClassifySims('fixture-session',[1],'Sim lộc phát','Không hợp lệ'),/Ngũ hành/);
 assert.throws(()=>ctx.adminClassifySims('fixture-session',[1,999],'Sim lộc phát',null),/không còn/);
 assert.throws(()=>ctx.adminClassifySims('fixture-session',Array(501).fill(1),'Sim lộc phát',null),/500/);
 assert.throws(()=>ctx.adminClassifySims('fixture-session',[0],'Sim lộc phát',null),/ID sim/);
 assert.equal(writes.length,0);
});
