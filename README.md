# Viettel Phú Hà

Website chọn sim và gọi tư vấn tiếng Việt với 5 giao diện chính, API, cơ sở dữ liệu SQLite và trang quản trị tại `/admin`. Giao diện ưu tiên điện thoại; dữ liệu cửa hàng nằm trên máy chủ, không nằm trong mã JavaScript.

## Cài và chạy

Python 3.12+, Node.js 24. Chromium tại `/usr/bin/chromium` cho kiểm thử trình duyệt.

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci --cache /tmp/viettel-npm-cache
.venv/bin/python server.py create-admin
npm start
```

Gunicorn phục vụ cổng 3000. `npm run dev` dùng Flask cho phát triển. Không có tài khoản/mật khẩu mặc định; tạo chủ cửa hàng bằng lời nhắc terminal. Mỗi tác vụ đám mây đã được cô lập: dùng checkout hiện có, không tạo Git worktree trừ khi người dùng yêu cầu.

## Chức năng

- Kho sim thật: tìm kiếm, lọc đầu số/loại/giá/ngũ hành/cơ sở/tình trạng, phân trang trên máy chủ.
- Khách chọn sim → nhập tên và số điện thoại → cửa hàng gọi tư vấn. Ghi chú không bắt buộc; không cần tài khoản khách hoặc thanh toán trên website.
- Nhận yêu cầu tư vấn, phân công nhân viên, ghi chú nội bộ và lịch gọi lại.
- Quản trị theo cơ sở: chủ quản lý toàn bộ; nhân viên xử lý dữ liệu cơ sở mình. Có lịch sử thao tác. Chủ tự cập nhật sim đang giữ chỗ/đã bán sau khi trao đổi với khách.
- Nhập Excel/CSV tối đa 5.000 sim/lần, kiểm tra số trùng và lỗi trước khi nhập toàn bộ; xuất Excel/CSV, sửa giá nhiều sim.
- Chỉnh hotline, email, địa chỉ, giờ mở cửa, Zalo, tên miền, bản đồ, banner và chính sách xử lý thông tin trên quản trị.
- Tổng quan kho/khách cần tư vấn, lượt xem tổng hợp; thông báo trong quản trị và hàng đợi SMTP tùy chọn.
- Sao lưu SQLite nhất quán và lệnh khôi phục; script sao lưu dữ liệu/ảnh.
- URL riêng cho sim, Open Graph, canonical, sitemap và robots khi có tên miền.

Các trang: `/`, `/kho-sim`, `/sim/:id`, `/sim-phong-thuy`, `/lien-he`, `/chinh-sach`, `/admin`. Hash route cũ được chuyển sang URL mới.

## Kiểm thử

```sh
npm test
```

16 kiểm thử API và 6 luồng trình duyệt, sử dụng dữ liệu/tài khoản ngẫu nhiên trong thư mục `/tmp`; không tạo sim/khách/tài khoản thử trong kho vận hành. Kiểm tra nhập 1.000 sim, phân quyền, CSRF, gửi tư vấn đồng thời, gửi lại không trùng, cập nhật kho thủ công, lịch tư vấn, sao lưu/khôi phục, Excel, ảnh, SMTP giả lập và an toàn dữ liệu.

Kiểm thử Chromium với thao tác chạm tại 320, 360, 375, 390, 412, 430 px, xoay ngang 844 px và desktop 1672 px; kiểm tra chiều rộng màn hình thực tế, kích thước ô đồng ý, nút chạm, font biểu mẫu, lỗi JavaScript, yêu cầu tư vấn sau mất kết nối và quản trị trên điện thoại. Ảnh kết quả ở `test-results/` (được Git bỏ qua).

Có thể chạy cùng bộ trình duyệt trên WebKit: cài `node node_modules/playwright/cli.js install webkit`, rồi `TEST_ENGINE=webkit npm run test:browser`. WebKit chưa chạy ở môi trường hiện tại vì máy chủ tải trình duyệt bị chính sách mạng từ chối; chưa tuyên bố đã kiểm tra Safari hay iPhone thật.

## Trước khi mở bán

Kho ban đầu trống. Chủ đăng nhập quản trị, nhập danh sách sim thật và điền chính sách xử lý thông tin tư vấn để mở biểu mẫu. Giờ mở cửa có thể bổ sung sau. Tên miền và Zalo có thể bổ sung trong quản trị như yêu cầu. Không có đánh giá khách mẫu và không mặc định tuyên bố hỗ trợ 24/7.

Đọc [DEPLOYMENT.md](DEPLOYMENT.md) để đưa lên hosting, cấu hình HTTPS, tài khoản và sao lưu; [POLICY_GUIDE.md](POLICY_GUIDE.md) hướng dẫn nội dung chính sách cần xác nhận. Chưa kết nối tên miền/hosting thực tế hoặc gửi email thật.

## Thông tin cửa hàng

- Tên: Viettel Phú Hà
- Hotline: 0344.639.666
- Email: thuntlpto.9x@gmail.com
- CS1: KCN Phú Hà, thị xã Phú Thọ, Phú Thọ
- CS2: Thanh Miếu, Việt Trì, Phú Thọ
- CS3: Cao Mại, Lâm Thao, Phú Thọ
