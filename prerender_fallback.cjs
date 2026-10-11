/* Fallback prerender without headless browser when browser is blocked by a hosting environment.
 * Normal build remains `npm run build` via prerender.cjs. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname;
const files=[['/','index.html'],['/kho-sim.html','kho-sim.html'],['/sim-phong-thuy.html','sim-phong-thuy.html'],['/lien-he.html','lien-he.html'],['/chinh-sach.html','chinh-sach.html'],['/yeu-thich.html','yeu-thich.html'],['/sim.html','sim.html'],['/khong-ton-tai.html','404.html']];
for(const [pathname,file] of files){
 const window={STATIC_BUILD:true,addEventListener:()=>{}},app={};
 const document={getElementById:()=>app,currentScript:{src:'https://simdep68.vn/app.js'},addEventListener:()=>{}};
 const location={pathname,search:'',hash:''};
 const ctx=vm.createContext({window,document,location,localStorage:{getItem:()=>null},matchMedia:()=>({addEventListener:()=>{},matches:false}),URL,URLSearchParams,crypto:globalThis.crypto,Date,setTimeout,clearTimeout,fetch:()=>{},console,history:{}});
 vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx,{filename:'app.js'});
 let markup=vm.runInContext(`header()+pageContent({path:${JSON.stringify(pathname==='/sim.html'?'/sim/0':pathname.replace(/\.html$/,'')||'/')},data:${pathname==='/yeu-thich.html'?'{items:[]}':'null'},related:null,error:''})+footer()`,ctx);
 let html=fs.readFileSync(path.join(root,file),'utf8');
 const pattern=/(<div id="app">)[\s\S]*?(<\/div>\s*<noscript>)/;
 const found=html.match(pattern);
 if(!found)throw Error('App anchor missing in '+file);
 html=html.replace(pattern,(_,open,close)=>open+markup+close);
 fs.writeFileSync(path.join(root,file),html);
 console.log('Updated '+file,markup.length+' B');
}
const publicFiles=new Set(['index.html','kho-sim.html','sim-phong-thuy.html','lien-he.html','chinh-sach.html','yeu-thich.html','sim.html','404.html','admin.html','app.js','styles.css','theme-red.css','hero.webp','promo.webp','favicon.svg','apple-touch-icon.png','icon-192.png','icon-512.png','og-image.png','site.webmanifest','robots.txt','sitemap.xml','CNAME',...fs.readdirSync(root).filter(n=>/^(reference-|cua-hang-).*\.webp$/.test(n))]);
const dir=path.join(root,'dist');fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);
for(const filename of publicFiles)fs.copyFileSync(path.join(root,filename),path.join(dir,filename));
console.log('Built '+publicFiles.size+' deployable files');
