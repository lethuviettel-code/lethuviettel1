const entry=document.getElementById('admin-entry');
const scriptUrl=String(window.STORE_CONFIG?.scriptUrl||'');
if(/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(scriptUrl)){
 const link=document.createElement('a');link.className='button';link.href=scriptUrl+'?view=admin';link.textContent='Mở trang quản trị';entry.appendChild(link);
}else{
 const message=document.createElement('p');message.textContent='Cần kết nối Apps Script trước. Làm theo HUONG_DAN_GOOGLE_SHEETS.md trong repo để thiết lập một lần.';entry.appendChild(message);
}
