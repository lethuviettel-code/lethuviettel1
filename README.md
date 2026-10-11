# Viettel Phú Hà — simdep68.vn

Giao diện cập nhật theo 5 ảnh mẫu màu **đỏ Viettel – trắng – xanh lá đậm**: thanh ưu đãi, header Viettel Phú Hà, hero Việt Trì, 4 danh mục lớn, thẻ sim màu đỏ, khối ưu đãi/hỗ trợ, chân trang xanh lá. Trang kho sim có bộ lọc bên trái; trang sim phong thủy hiển thị 5 ngũ hành; trang chi tiết có thẻ sim và đơn tư vấn. Thông tin số/giá/tình trạng vẫn lấy từ Google Sheets. Website không có tài khoản khách hay thanh toán; “Mua ngay” mở biểu mẫu để cửa hàng gọi tư vấn.

Tất cả tệp trên GitHub ở thư mục gốc. Giữ **Settings → Pages → Deploy from a branch → main → /(root)** và tên miền hiện tại. `_config.yml` loại công cụ, tài liệu và kiểm thử khỏi website.

| Tệp | Vai trò |
|---|---|
| `app.js`, `styles.css`, `theme-red.css` | Giao diện, tìm kiếm, yêu thích, gửi yêu cầu. URL Apps Script và thông tin cửa hàng mặc định ở đầu `app.js`; nếu đổi URL, sửa cùng liên kết trong `admin.html` |
| `shell.html` | Khung HTML, meta, phông chữ, biểu tượng |
| `index.html`, `kho-sim.html`, `sim-phong-thuy.html`, `lien-he.html`, `chinh-sach.html`, `sim.html`, `yeu-thich.html`, `404.html` | HTML được dựng sẵn bằng `prerender.cjs` để giao diện hiện ngay; chỉnh mã nguồn rồi dựng lại |
| `reference-*.webp` | Các vùng hình ảnh trích từ 5 ảnh mẫu được cung cấp, dùng làm ảnh nền banner và khối ưu đãi; `hero.webp`, `promo.webp` vẫn giữ để tương thích dữ liệu cũ |
| `cua-hang-1.webp` … `cua-hang-6.webp` | 6 ảnh cửa hàng thực tế; phần thư viện vẫn có sẵn trong mã nguồn nếu cần hiển thị lại (danh sách `STORE_PHOTOS` trong `app.js`) |
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

Bản dựng tạo `dist/` chỉ chứa tệp công khai. ZIP bàn giao có sẵn cả thư mục `dist/` để tiện triển khai. Có thể chạy `node prerender_fallback.cjs` khi chưa cài được Playwright, để đồng bộ nhanh nội dung HTML tĩnh (bản dựng chuẩn vẫn là `npm run build`). Footer có thể mở/thu gọn trên điện thoại để xem thông tin 3 cơ sở.

Cần Node.js, Python 3 (máy chủ tĩnh khi phát triển) và Chromium. Có thể đặt `CHROMIUM_PATH` nếu Chromium ở vị trí khác. Khi sửa nguồn, chạy `npm run build` và commit toàn bộ HTML được tạo. Không cần dán lại Apps Script vì lần thay giao diện này.

Trang con dùng tệp thật như `/kho-sim.html`, `/sim.html?id=123`, tải lại trực tiếp được trên GitHub Pages. Link cũ `/#/kho-sim` và `/kho-sim/` được đưa về tệp mới. Danh sách sim đang tải có khung chờ, không tạo số/giá giả.

Sim yêu thích chỉ lưu trên thiết bị khách, không có tài khoản. Các sim đã lưu được đọc lại giá/tình trạng từ cửa hàng khi mở mục Yêu thích. Mã gửi yêu cầu vẫn đợi xác nhận từ Google Sheet trước khi báo thành công.

Không có trả góp hoặc đánh giá giả. Hai vị trí tương ứng trong mẫu dùng tư vấn chọn sim và lời mời gửi nhận xét. Admin có thể cập nhật banner, giờ mở cửa, link Zalo và chính sách như trước.

Kiểm thử dùng Google mô phỏng và Chromium ở màn hình 320–430 px, ngang, máy tính; không gửi yêu cầu khách hoặc tin Zalo thật. Không thay Google Sheet, token bot hoặc cấu hình Supabase.

Viettel Phú Hà · 0344.639.666 · thuntlpto.9x@gmail.com

- CS1: KCN Phú Hà, thị xã Phú Thọ, Phú Thọ
- CS2: Thanh Miếu, Việt Trì, Phú Thọ
- CS3: Cao Mại, Lâm Thao, Phú Thọ

## Những điểm cần xác minh trước khi đưa lên website thật

- Thông tin liên hệ/số điện thoại, địa chỉ, giá sim và kho hàng vẫn lấy từ cấu hình thực tế/Google Sheets, **không** sao chép số hotline hoặc giá minh họa trong ảnh mẫu.
- Nút “Mua ngay” **gửi yêu cầu tư vấn**, không thanh toán tự động hoặc cam kết giữ sim.
- Thanh đăng nhập/đăng ký trong ảnh mẫu không được tạo nút giả vì dự án hiện chưa có hệ thống tài khoản khách. Các liên kết danh mục, tìm kiếm, yêu thích, form và thông tin hỗ trợ tiếp tục sử dụng hệ thống cũ.
- Các ảnh mẫu được cắt để tạo hình nền giao diện, không tự động cho phép sử dụng logo/vật liệu marketing ngoài phạm vi nội dung đã có quyền dùng.
- `theme-red.css` ghi đè giao diện cũ, giữ `styles.css` để tránh phá vỡ phần responsive và tương tác có sẵn.

## Cập nhật 11/10/2026 – đỏ tươi và tìm đầu/đuôi bằng *

- Màu đỏ các nút, card và banner được tăng độ tươi nhẹ, giữ tương phản chữ trắng và màu xanh lá ở footer.
- Gõ `098*`: chỉ hiện số SIM bắt đầu bằng `098` (dùng bộ lọc `prefix` hiện có trên Google Sheets).
- Gõ `*999`: chỉ hiện số SIM kết thúc bằng `999` (quét các kết quả chứa `999` và lọc chính xác theo đuôi trên trình duyệt, không cần chỉnh Apps Script).
- Có thể gõ `098*999` để yêu cầu cả đầu `098` và đuôi `999`. Không dùng dấu `*` vẫn tìm kiếm chuỗi số như trước.
- Trên điện thoại ô tìm kiếm dùng bàn phím có thể nhập dấu `*`. Với tìm đuôi phổ biến, hệ thống tải thêm kết quả theo yêu cầu, hiển thị số lượng tối thiểu đã tìm thấy khi chưa quét hết kho.
