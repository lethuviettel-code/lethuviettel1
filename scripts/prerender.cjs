/* Render the initial storefront locally, without calling Google or inventing stock. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({window:{STATIC_BUILD:true,addEventListener(){}},document:{getElementById(){return {};},addEventListener(){}},location:{href:'https://example.invalid/',hash:''},localStorage:{getItem:()=>null},SheetsClient:{configured:()=>true},URL,URLSearchParams,Map,WeakMap,Set,console});
vm.runInContext(fs.readFileSync(path.join(root,'site-config.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const markup=vm.runInContext('header()+home()+footer()',context)
 .replace(/href="\/([^\"]*)"/g,(_,route)=>'href="./#/'+route+'"')
 .replace(/src="\/([^\"]*)"/g,(_,asset)=>'src="./'+asset+'"');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=source.indexOf('<div id="app">'),end=source.indexOf('<noscript>');
if(start<0||end<start)throw new Error('Missing app container');
fs.writeFileSync(path.resolve(process.argv[2]||path.join(root,'dist','index.html')),source.slice(0,start)+'<div id="app">'+markup+'</div>'+source.slice(end));
