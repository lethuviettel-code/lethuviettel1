/* Prepare static HTML without calling Google or putting customer data in GitHub. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname;
const context=vm.createContext({window:{STATIC_BUILD:true,addEventListener(){}},document:{getElementById(){return {};},addEventListener(){}},location:{href:'https://example.invalid/',hash:''},localStorage:{getItem:()=>null},SheetsClient:{configured:()=>true},URL,URLSearchParams,Map,WeakMap,Set,console});
vm.runInContext(fs.readFileSync(path.join(root,'site-config.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const markup=vm.runInContext('header()+home()+footer()',context)
 .replace(/href="\/([^\"]*)"/g,(_,route)=>'href="./#/'+route+'"')
 .replace(/src="\/([^\"]*)"/g,(_,asset)=>'src="./'+asset+'"');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=source.indexOf('<div id="app">'),end=source.indexOf('<noscript>');
if(start<0||end<start)throw new Error('Missing app container');
const html=source.slice(0,start)+'<div id="app">'+markup+'</div>'+source.slice(end);
if(process.argv.includes('--root')){
 fs.writeFileSync(path.join(root,'index.html'),html);
 console.log('Prepared index.html for GitHub Pages main / (root).');
}else{
 const out=path.join(root,'dist');
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
 for(const name of ['admin.html','app.js','admin.js','site-config.js','sheets-client.js','styles.css','favicon.svg','sim.svg','landscape.svg'])fs.copyFileSync(path.join(root,name),path.join(out,name));
 fs.writeFileSync(path.join(out,'index.html'),html);
 if(fs.existsSync(path.join(root,'CNAME')))fs.copyFileSync(path.join(root,'CNAME'),path.join(out,'CNAME'));
 fs.writeFileSync(path.join(out,'.nojekyll'),'');
 console.log('Static storefront built in dist/.');
}
