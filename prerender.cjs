/* Generate public HTML as root files; never read the real Google Sheet. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=__dirname,shell=fs.readFileSync(path.join(root,'shell.html'),'utf8');
const publicFiles=new Set(['app.js','admin.js','admin.css','styles.css','theme-red.css','reference-hero-right.webp','reference-catalog-right.webp','reference-feng-right.webp','reference-contact-right.webp','reference-sim-product.webp','reference-gift.webp','reference-support.webp','reference-viettri.webp','favicon.svg','hero.webp','promo.webp','cua-hang-1.webp','cua-hang-2.webp','cua-hang-3.webp','cua-hang-4.webp','cua-hang-5.webp','cua-hang-6.webp','og-image.png','apple-touch-icon.png','icon-192.png','icon-512.png','site.webmanifest']);
const mime={'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json'};
const pages=[['/','index.html'],['/kho-sim.html','kho-sim.html'],['/sim-phong-thuy.html','sim-phong-thuy.html'],['/lien-he.html','lien-he.html'],['/chinh-sach.html','chinh-sach.html'],['/yeu-thich.html','yeu-thich.html'],['/sim.html','sim.html'],['/khong-ton-tai.html','404.html']];
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1);
 if(publicFiles.has(name)){res.writeHead(200,{'Content-Type':mime[path.extname(name)]});return res.end(fs.readFileSync(path.join(root,name)));}
 res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(shell);
});
(async()=>{
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const [url,file]of pages){
   const page=await browser.newPage();
   await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   await page.addInitScript(()=>{window.STATIC_BUILD=true;});
   await page.goto(base+url,{waitUntil:'load'});
   const html=await page.evaluate(()=>{
    const p=routePath(),state={path:p==='/sim'?'/sim/0':p,version:0,data:p==='/yeu-thich'?{items:[]}:null,related:null,error:''};
    activeState=state;paint(state,false);app.removeAttribute('aria-busy');
    if(p==='/sim')setCanonical('');
    return '<!doctype html>\n'+document.documentElement.outerHTML;
   });
   const clean=html.replace(/[ \t]+$/gm,'');
   fs.writeFileSync(path.join(root,file),file==='404.html'?clean.replace('<head>','<head><base href="/">'):clean);
   console.log('Built '+file);await page.close();
  }
  const urls=['/','/kho-sim.html','/sim-phong-thuy.html','/lien-he.html','/chinh-sach.html'];
  fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(p=>'  <url><loc>https://simdep68.vn'+p+'</loc></url>').join('\n')+'\n</urlset>\n');
  const out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
  const publish=[...pages.map(([,file])=>file),'admin.html',...publicFiles,'robots.txt','sitemap.xml','CNAME'];
  for(const name of new Set(publish))fs.copyFileSync(path.join(root,name),path.join(out,name));

 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
