# Viettel Phú Hà

Website + Google Apps Script + Google Sheets. Repository chỉ còn các tệp ở thư mục gốc. Đã bỏ máy chủ Python/SQLite, Docker, hướng dẫn VPS và kiểm thử của bản cũ.

**Sau khi thu gọn, chọn nguồn xuất bản một lần:** GitHub → **Settings → Pages → Source: Deploy from a branch → Branch: main → /(root) → Save**. Giữ tên miền **simdep68.vn**. Từ đó, mỗi lần đẩy mã lên `main`, GitHub Pages xuất bản lại từ các tệp ở gốc.

## Các tệp cần dùng

| Mục đích | Tệp |
|---|---|
| Website khách hàng | `index.html`, `app.js`, `styles.css`, `sim.svg`, `landscape.svg`, `favicon.svg` |
| Kết nối Google và mở admin | `site-config.js`, `sheets-client.js`, `admin.html`, `admin.js` |
| Mã để dán vào Apps Script | [Code.gs](Code.gs), [AppsScript-Admin.html](AppsScript-Admin.html), [appsscript.json](appsscript.json) |
| Tên miền và xuất bản | `CNAME`, `_config.yml` |
| Công cụ và kiểm thử | `build.cjs`, `package.json`, `package-lock.json`, `sheets-harness.cjs`, `sheets.test.cjs`, `static-browser.test.cjs` |
| Hướng dẫn chung | [HUONG_DAN.md](HUONG_DAN.md) |

Trong Apps Script, tệp HTML vẫn có tên **Admin** hoặc **admin**. `AppsScript-Admin.html` là tên tệp nguồn trên GitHub để phân biệt với `admin.html` — trang mở quản trị của website. Việc chuyển tệp về gốc không yêu cầu dán lại mã Google đã hoạt động.

## Vận hành

Khách chọn sim → nhập tên/số điện thoại → cửa hàng gọi tư vấn. Admin quản lý sim, nhập Excel/CSV, ghi chú và hẹn gọi lại. Bot Zalo gửi riêng yêu cầu mới cho tối đa 20 người; có gửi thử và xử lý lỗi riêng.

Kho sim, yêu cầu khách và cấu hình vẫn ở **Google Sheets**; token bot và bảo mật admin ở **Apps Script**. Việc thu gọn GitHub không xóa hoặc chuyển dữ liệu Google. Website không dùng Supabase, VPS, đăng nhập khách hoặc thanh toán.

Trong admin → **Cấu hình cửa hàng**, lưu chính sách sử dụng tên/số điện thoại để bật gửi yêu cầu. Thiết lập Google, kết nối Zalo và xử lý lỗi 408 được hướng dẫn trong [HUONG_DAN.md](HUONG_DAN.md).

## Phát triển

```sh
npm ci
npm start
npm test
npm run build
```

`npm start` dựng và phục vụ website trên cổng 3000 bằng Python 3. `npm run build` dùng Node.js tạo `dist/` chỉ gồm tệp website. `dist/`, thư viện và kết quả kiểm thử được bỏ qua khi commit; không tạo thư mục trong repository trên GitHub.

Khi sửa mã giao diện hoặc `site-config.js`, chạy **`npm run build:root`** để cập nhật HTML có sẵn trong `index.html`, rồi commit tệp này cùng mã đã sửa. `_config.yml` loại mã Apps Script, tài liệu, thư viện và kiểm thử khỏi bản GitHub Pages.

`npm test` dùng Google/Zalo mô phỏng và Chromium cảm ứng ở màn hình 320–430 px; không ghi vào Sheet hoặc gửi Zalo thật. Cần gửi thử trên Google/Zalo thật để xác nhận quyền, token và nơi nhận. Chưa kiểm thử trên Safari/iPhone thật.

Viettel Phú Hà · **0344.639.666** · **thuntlpto.9x@gmail.com**

- CS1: KCN Phú Hà, thị xã Phú Thọ, Phú Thọ
- CS2: Thanh Miếu, Việt Trì, Phú Thọ
- CS3: Cao Mại, Lâm Thao, Phú Thọ
