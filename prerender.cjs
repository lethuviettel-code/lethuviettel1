/* Tạo HTML tĩnh cho từng trang (để Google đọc được ngay, không cần chờ JavaScript).
   Chạy:  npm i puppeteer  &&  node _build/prerender.cjs
   Mỗi lần sửa app.js / styles.css hoặc đổi thông tin cửa hàng trong STORE_CONFIG, chạy lại lệnh này. */
const fs=require('fs'),path=require('path'),http=require('http');
const puppeteer=require('puppeteer');
const ROOT=path.resolve(__dirname,'..');
const shell=fs.readFileSync(path.join(ROOT,'_build/shell.html'),'utf8');
const MIME={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const PAGES=[['/','index.html'],['/kho-sim/','kho-sim/index.html'],['/sim-phong-thuy/','sim-phong-thuy/index.html'],['/lien-he/','lien-he/index.html'],['/chinh-sach/','chinh-sach/index.html'],['/sim/','sim/index.html'],['/khong-ton-tai/','404.html']];
const server=http.createServer((req,res)=>{
  const p=decodeURIComponent(req.url.split('?')[0]);const ext=path.extname(p);
  if(ext&&MIME[ext]){const f=path.join(ROOT,p);if(f.startsWith(ROOT)&&fs.existsSync(f)){res.writeHead(200,{'Content-Type':MIME[ext]});return res.end(fs.readFileSync(f));}res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(shell);
});
(async()=>{
  await new Promise(r=>server.listen(0,r));const port=server.address().port;
  const browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
  for(const [url,out] of PAGES){
    const page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request',r=>r.url().startsWith('http://localhost:'+port)?r.continue():r.abort());
    await page.evaluateOnNewDocument(()=>{window.STATIC_BUILD=true;});
    await page.goto('http://localhost:'+port+url,{waitUntil:'load'});
    const html=await page.evaluate(()=>{
      const p=routePath(),isSim=p==='/sim',state={path:isSim?'/sim/0':p,version:0,data:null,related:null,error:''};
      activeState=state;paint(state,false);app.removeAttribute('aria-busy');
      if(isSim)document.head.querySelector('link[rel="canonical"]')?.remove();
      if(!['/','/kho-sim','/sim-phong-thuy','/lien-he','/chinh-sach','/sim'].includes(p))document.head.querySelector('link[rel="canonical"]')?.remove();
      return '<!doctype html>\n'+document.documentElement.outerHTML;
    });
    const file=path.join(ROOT,out);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);
    console.log('✓',url,'→',out,(html.length/1024).toFixed(1)+' KB');
    await page.close();
  }
  await browser.close();server.close();
})();
