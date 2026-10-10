/* Apps Script ContentService redirects across origins. JSONP reads and confirmed
   no-cors writes work without browser preflight or exposing admin credentials. */
(function () {
  let sequence = 0;
  function endpoint() {
    const value = String(window.STORE_CONFIG?.scriptUrl || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value)) {
      throw new Error('Cửa hàng chưa kết nối Google Sheets. Vui lòng gọi 0344.639.666.');
    }
    return value;
  }
  function read(action, params = {}) {
    return new Promise((resolve, reject) => {
      let url;
      try { url = new URL(endpoint()); } catch (e) { reject(e); return; }
      const callback = 'phuha_' + Date.now() + '_' + (++sequence);
      url.search = new URLSearchParams({...params, action, callback}).toString();
      const script = document.createElement('script');
      let timer;
      const clean = () => {clearTimeout(timer); script.remove(); delete window[callback];};
      window[callback] = result => {clean(); if(result?.error){const error=new Error(result.error);error.fromSheet=true;reject(error);}else resolve(result);};
      script.onerror = () => {clean(); reject(new Error('Chưa kết nối được kho sim. Vui lòng thử lại hoặc gọi cửa hàng.'));};
      timer = setTimeout(() => {clean(); reject(new Error('Kết nối Google Sheets quá lâu. Vui lòng thử lại.'));}, 20000);
      script.src = url.toString(); document.head.appendChild(script);
    });
  }
  async function submit(data) {
    // The response is opaque: only show success after the Sheet confirms this key.
    try {
      await fetch(endpoint(), {method:'POST',mode:'no-cors',credentials:'omit',
        headers:{'Content-Type':'text/plain;charset=UTF-8'},
        body:JSON.stringify({action:'submitLead', ...data})});
    } catch { /* A lost response can still mean the Sheet saved the request. */ }
    for (let n=0;n<6;n++) {
      try {
        const result=await read('receipt',{key:data.request_key});
        if(result.received) return result;
        if(result.error) throw new Error(result.error);
      } catch(e) { if(e.fromSheet||n===5) throw e; }
      if(n<5) await new Promise(resolve=>setTimeout(resolve,800));
    }
    throw new Error('Chưa xác nhận được yêu cầu đã lưu. Bấm gửi lại để kiểm tra; hệ thống tránh tạo trùng.');
  }
  window.SheetsClient={read,submit,configured:()=>Boolean(window.STORE_CONFIG?.scriptUrl)};
})();
