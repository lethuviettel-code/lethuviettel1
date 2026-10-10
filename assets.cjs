/* Tạo ảnh chia sẻ (og-image.png) và icon ứng dụng. Chạy 1 lần khi cần đổi logo. */
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer');
const ROOT=path.resolve(__dirname,'..');
const mark=s=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${s}" height="${s}"><rect width="40" height="40" rx="11" fill="#e4002b"/><path d="M9.5 12h6.2l4.3 11.2L24.3 12h6.2L22.9 30h-5.8z" fill="#fff"/></svg>`;
const og=`<html><body style="margin:0;width:1200px;height:630px;display:flex;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;background:#fff;color:#15171c">
<div style="flex:1;padding:72px 64px;display:flex;flex-direction:column;justify-content:space-between">
<div style="display:flex;align-items:center;gap:16px">${mark(64)}<div style="font-size:30px;font-weight:700">Viettel Phú Hà</div></div>
<div><div style="font-size:72px;font-weight:800;line-height:1.05;letter-spacing:-2px">Sim số đẹp Viettel<br>tại Phú Thọ</div>
<div style="font-size:28px;color:#394050;margin-top:24px;line-height:1.4">Tư vấn chọn số · Đăng ký chính chủ<br>Hotline 0344.639.666</div></div></div>
<div style="width:420px;background:#e4002b;position:relative;overflow:hidden">
<div style="position:absolute;left:-20px;top:20px;font-size:230px;font-weight:800;color:#fff;opacity:.13;letter-spacing:-10px">6868</div>
<div style="position:absolute;left:-30px;top:330px;font-size:230px;font-weight:800;color:#fff;opacity:.13;letter-spacing:-10px">999</div>
<svg viewBox="0 0 260 340" style="position:absolute;left:80px;top:140px;width:270px;transform:rotate(-7deg)"><path d="M20 10h150l60 60v250a16 16 0 0 1-16 16H36a16 16 0 0 1-16-16V26a16 16 0 0 1 16-16z" fill="#fff"/><rect x="62" y="150" width="130" height="104" rx="14" fill="none" stroke="#e4002b" stroke-width="6"/><path d="M62 185h130M62 219h130M127 150v104" stroke="#e4002b" stroke-width="5"/></svg></div></body></html>`;
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});const p=await b.newPage();
  await p.setViewport({width:1200,height:630});await p.setContent(og);await p.screenshot({path:path.join(ROOT,'og-image.png')});
  for(const [n,s] of [['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]]){
    await p.setViewport({width:s,height:s});await p.setContent(`<body style="margin:0">${mark(s)}</body>`);await p.screenshot({path:path.join(ROOT,n),omitBackground:true});
  }
  await b.close();console.log('assets ok');
})();
