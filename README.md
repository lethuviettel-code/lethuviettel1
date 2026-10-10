# Viettel Phú Hà

Website tĩnh + Google Apps Script + Google Sheets. Không cần VPS.

- Website chạy trên GitHub Pages, tương thích thư mục `/lethuviettel1/` và tên miền riêng.
- Khách chọn sim, nhập tên/số điện thoại để cửa hàng gọi tư vấn.
- Sheet `KhoSim` lưu kho; sheet `YeuCau` nhận yêu cầu mới; `CauHinh` lưu thông tin cửa hàng.
- Admin trên Apps Script có mật khẩu, nhập CSV hoặc bảng Excel, sửa giá/tình trạng và ghi chú gọi lại.
- Không có đăng nhập khách hoặc thanh toán.

**Thiết lập theo [HUONG_DAN_GOOGLE_SHEETS.md](HUONG_DAN_GOOGLE_SHEETS.md).** URL Apps Script đã được điền trong `site-config.js`; cần cập nhật mã Code.gs và Admin.html trong dự án Google rồi triển khai phiên bản mới. Không đưa Sheet hoặc mật khẩu quản trị ra công khai.

## Phát triển và kiểm thử

```sh
npm ci
npm start
npm test
npm run build
```

`npm start` phục vụ các tệp tĩnh bằng Python 3 trên cổng 3000. `npm test` chạy kiểm thử Apps Script bằng mô phỏng dịch vụ Google và kiểm thử Chromium (cài sẵn `/usr/bin/chromium`). Kiểm thử dùng dữ liệu giả trong bộ nhớ; không ghi vào Sheet thật. `npm run build` tạo `dist/`, chỉ gồm tệp website.

Các phép thử mô phỏng không thay thế bước triển khai và gửi thử trên Google thật. Môi trường hiện tại bị chặn truy cập script.google.com; chưa xác nhận kết nối Sheet thật hoặc Safari/iPhone thật.

Backend Python/SQLite và các kiểm thử cũ còn trong repo để giữ tham chiếu/lịch sử; không chạy trong luồng mới. Không nhập dữ liệu cũ tự động.

## Thông tin cửa hàng

Viettel Phú Hà · 0344.639.666 · thuntlpto.9x@gmail.com

- CS1: KCN Phú Hà, thị xã Phú Thọ, Phú Thọ
- CS2: Thanh Miếu, Việt Trì, Phú Thọ
- CS3: Cao Mại, Lâm Thao, Phú Thọ
