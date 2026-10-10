# Viettel Phú Hà

Website tiếng Việt gồm 5 giao diện theo mẫu: trang chủ, kho sim số đẹp, chi tiết sim, sim phong thủy và giới thiệu/liên hệ. HTML, CSS và JavaScript thuần; không cần bước build hoặc dịch vụ cơ sở dữ liệu.

## Chạy

Yêu cầu Python 3 và Node.js 24 (để chạy npm/test).

```sh
npm ci
npm start
```

Máy chủ chạy tại cổng 3000. Các trang dùng hash route: `#/`, `#/catalog`, `#/sim/0`, `#/feng-shui`, `#/contact`.

## Kiểm thử

```sh
npm test
```

Kiểm thử Playwright dùng Chromium tại `/usr/bin/chromium`. Bộ kiểm thử kiểm tra cả 5 trang ở chiều rộng 1672 và 390 pixel, tìm kiếm, lọc giá, lưu sim sau tải lại trang, xem chi tiết, xác thực biểu mẫu và mở câu hỏi thường gặp.

## Phạm vi hiện tại

- Số sim, giá, tồn kho, đánh giá và thông tin liên hệ là nội dung minh họa theo ảnh mẫu; cần thay bằng thông tin được cửa hàng xác nhận.
- Biểu mẫu kiểm tra thông tin tại trình duyệt và thông báo rõ yêu cầu chưa gửi. Chưa có backend, thanh toán hoặc dịch vụ nhận đơn.
- Lưu sim dùng localStorage. Bộ lọc phong thủy chỉ minh họa dữ liệu ngũ hành, không phải công cụ luận giải.
- Banner, thẻ sim và bản đồ dùng đồ họa minh họa cục bộ, không phải ảnh nhân viên/cảnh quan gốc. Bản đồ dẫn sang Google Maps tìm kiếm khu vực.
- Để dùng thực tế: cung cấp tài sản hình ảnh có quyền sử dụng, xác minh nội dung, kết nối API kho sim và dịch vụ nhận đơn/tư vấn.

Mỗi tác vụ đám mây đã được cô lập: sử dụng checkout hiện có, không tạo Git worktree trừ khi người dùng yêu cầu.
