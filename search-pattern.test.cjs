/* Regression test: wildcard queries use the existing Sheets API (no real connection). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function contextWithFixture(){
  const reads=[];
  const list=[];
  let id=1;
  for(let i=0;i<35;i++)list.push({id:id++,number:'098'+String(i).padStart(4,'0')+'999',status:'available'});
  for(let i=0;i<50;i++)list.push({id:id++,number:'097999'+String(i).padStart(4,'0'),status:'available'});
  for(let i=0;i<10;i++)list.push({id:id++,number:'086'+String(i).padStart(4,'0')+'999',status:'available'});
  for(let i=0;i<15;i++)list.push({id:id++,number:'098'+String(i).padStart(4,'0')+'123',status:'available'});
  list.push({id:id++,number:'0925454686',type:'Sim phong thủy',element:'Thổ',status:'available'});
  list.push({id:id++,number:'0325454686',type:'Sim lộc phát',status:'available'});
  list.push({id:id++,number:'0986860123',type:'Sim thần tài',status:'available'});
  const document={getElementById:()=>({}),currentScript:{src:'https://simdep68.vn/app.js'},addEventListener:()=>{}};
  const ctx=vm.createContext({window:{STATIC_BUILD:true,addEventListener:()=>{}},document,
    location:{pathname:'/kho-sim.html',search:'',hash:''},
    matchMedia:()=>({addEventListener:()=>{},matches:false}),
    localStorage:{getItem:()=>null},URL,URLSearchParams,console,crypto:globalThis.crypto,Date,setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync('app.js','utf8'),ctx,{filename:'app.js'});
  const mockApi=async function(url){
    const p=new URL(url,'https://api.invalid').searchParams;
    reads.push(Object.fromEntries(p));
    const q=p.get('q'),prefix=p.get('prefix');
    if(Number(p.get('size'))>60)throw new Error('Số sim mỗi trang không hợp lệ.');
    const filtered=list.filter(x=>(!q||x.number.includes(q))&&(!prefix||x.number.startsWith(prefix))&&(!p.get('type')||x.type===p.get('type'))&&(!p.get('element')||x.element===p.get('element')));
    const page=Math.max(1,Number(p.get('page'))||1);
    // Backend caps size to 10, to verify robust multi-page suffix retrieval.
    const size=Math.min(10,Number(p.get('size'))||10);
    return {items:filtered.slice((page-1)*size,page*size),total:filtered.length,size,page};
  };
  ctx.__fakeApi=mockApi;
  vm.runInContext('api = __fakeApi;',ctx);
  return {ctx,reads};
}
test('098* uses Sheets prefix and shows all 098... numbers, not middle matches',async()=>{
  const {ctx,reads}=contextWithFixture();
  const result=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=098*"))',ctx);
  assert.equal(result.total,51);
  assert.ok(result.items.every(s=>s.number.startsWith('098')));
  assert.equal(reads[0].prefix,'098');
  assert.equal(reads[0].q,undefined);
});
test('09*686 works with the real Sheets limit, anchors both ends and normalizes separators',async()=>{
  const {ctx,reads}=contextWithFixture();
  const result=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=09*686"))',ctx);
  assert.deepEqual(Array.from(result.items,s=>s.number),['0925454686']);
  assert.ok(reads.every(r=>Number(r.size)<=60));
  assert.equal(reads[0].prefix,'09');assert.equal(reads[0].q,'686');
  const spaced=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams({q:"09 * 6.86"}))',ctx);
  assert.deepEqual(Array.from(spaced.items,s=>s.number),['0925454686']);
});
test('All SIMs includes every type; feng shui requires an assigned category even with an element',async()=>{
  const {ctx,reads}=contextWithFixture();
  const all=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("type=Sim%20số%20đẹp"))',ctx);
  assert.equal(all.total,113);assert.equal(reads[0].type,undefined);
  const feng=await vm.runInContext('catalogSims("/sim-phong-thuy",new URLSearchParams("element=Thổ"))',ctx);
  assert.equal(feng.items.length,1);assert.equal(feng.items[0].type,'Sim phong thủy');
  assert.equal(reads.at(-1).type,'Sim phong thủy');
  const wealth=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("type=Sim%20thần%20tài"))',ctx);
  assert.equal(wealth.items.length,1);assert.equal(wealth.items[0].number,'0986860123');
});
test('*999 only shows true suffix matches even when 999 exists elsewhere, with pagination',async()=>{
  const {ctx,reads}=contextWithFixture();
  const first=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=*999"))',ctx);
  assert.equal(first.items.length,24);
  assert.equal(first.hasNext,true);
  assert.ok(first.items.every(s=>s.number.endsWith('999')));
  const second=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=*999&page=2"))',ctx);
  assert.equal(second.items.length,21);
  assert.equal(second.hasNext,false);
  assert.equal(second.total,45);
  assert.equal(second.complete,true);
  assert.ok(second.items.every(s=>s.number.endsWith('999')));
  assert.ok(reads.some(r=>r.q==='999'&&r.page==='2'));
});
test('098*999 combines anchored prefix and suffix and plain 999 remains substring search',async()=>{
  const {ctx,reads}=contextWithFixture();
  const both=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=098*999"))',ctx);
  assert.ok(both.items.length>0&&both.items.every(s=>s.number.startsWith('098')&&s.number.endsWith('999')));
  assert.equal(both.hasNext,true);
  const bothPage2=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=098*999&page=2"))',ctx);
  assert.equal(bothPage2.total,35);
  assert.equal(bothPage2.items.length,11);
  assert.equal(bothPage2.complete,true);
  assert.ok(reads.every(r=>r.prefix==='098'&&r.q==='999'));
  reads.length=0;
  const plain=await vm.runInContext('catalogSims("/kho-sim",new URLSearchParams("q=999"))',ctx);
  assert.equal(plain.total,95);
  assert.equal(reads[0].q,'999');
  assert.equal(reads[0].prefix,undefined);
});
