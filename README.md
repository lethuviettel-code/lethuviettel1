# Viettel Phú Hà — simdep68.vn

Trang chủ ưu tiên điện thoại, theo mẫu xanh–vàng: banner, 6 danh mục, sim 2 cột, bộ lọc, tư vấn, dịch vụ và thanh điều hướng dưới. Thông tin số/giá/tình trạng vẫn lấy từ Google Sheets. Website không có tài khoản khách hay thanh toán; “Mua ngay” mở biểu mẫu để cửa hàng gọi tư vấn.

Tất cả tệp trên GitHub ở thư mục gốc. Giữ **Settings → Pages → Deploy from a branch → main → /(root)** và tên miền hiện tại. `_config.yml` loại công cụ, tài liệu và kiểm thử khỏi website.

| Tệp | Vai trò |
|---|---|
| `app.js`, `styles.css` | Giao diện, tìm kiếm, yêu thích, gửi yêu cầu. URL Apps Script và thông tin cửa hàng mặc định ở đầu `app.js`; nếu đổi URL, sửa cùng liên kết trong `admin.html` |
| `shell.html` | Khung HTML, meta, phông chữ, biểu tượng |
| `index.html`, `kho-sim.html`, `sim-phong-thuy.html`, `lien-he.html`, `chinh-sach.html`, `sim.html`, `yeu-thich.html`, `404.html` | HTML được dựng sẵn bằng `prerender.cjs` để giao diện hiện ngay; chỉnh mã nguồn rồi dựng lại |
| `hero.webp`, `promo.webp` | Ảnh banner tối ưu dung lượng cho điện thoại |
| `admin.html` | Mở đúng admin Apps Script hiện tại; quản lý sim, yêu cầu và Zalo vẫn tại Google |
| `assets.cjs`, `favicon.svg`, các tệp PNG, `site.webmanifest` | Ảnh chia sẻ và biểu tượng ứng dụng |
| `sitemap.xml`, `robots.txt`, `CNAME` | SEO, tên miền |
| `package.json`, `package-lock.json`, `mobile.test.cjs` | Công cụ dựng và kiểm thử |

```sh
npm ci
npm run build
npm test
npm start
```

Bản dựng cũng tạo `dist/` chỉ chứa tệp công khai để chạy thử; thư mục này không được đưa lên GitHub. Footer có thể mở/thu gọn trên điện thoại để xem thông tin 3 cơ sở.

Cần Node.js, Python 3 (máy chủ tĩnh khi phát triển) và Chromium. Có thể đặt `CHROMIUM_PATH` nếu Chromium ở vị trí khác. Khi sửa nguồn, chạy `npm run build` và commit toàn bộ HTML được tạo. Không cần dán lại Apps Script vì lần thay giao diện này.

Trang con dùng tệp thật như `/kho-sim.html`, `/sim.html?id=123`, tải lại trực tiếp được trên GitHub Pages. Link cũ `/#/kho-sim` và `/kho-sim/` được đưa về tệp mới. Danh sách sim đang tải có khung chờ, không tạo số/giá giả.

Sim yêu thích chỉ lưu trên thiết bị khách, không có tài khoản. Các sim đã lưu được đọc lại giá/tình trạng từ cửa hàng khi mở mục Yêu thích. Mã gửi yêu cầu vẫn đợi xác nhận từ Google Sheet trước khi báo thành công.

Không có trả góp hoặc đánh giá giả. Hai vị trí tương ứng trong mẫu dùng tư vấn chọn sim và lời mời gửi nhận xét. Admin có thể cập nhật banner, giờ mở cửa, link Zalo và chính sách như trước.

Kiểm thử dùng Google mô phỏng và Chromium ở màn hình 320–430 px, ngang, máy tính; không gửi yêu cầu khách hoặc tin Zalo thật. Không thay Google Sheet, token bot hoặc cấu hình Supabase.

Viettel Phú Hà · 0344.639.666 · thuntlpto.9x@gmail.com

- CS1: KCN Phú Hà, thị xã Phú Thọ, Phú Thọ
- CS2: Thanh Miếu, Việt Trì, Phú Thọ
- CS3: Cao Mại, Lâm Thao, Phú Thọ
