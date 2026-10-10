# Triển khai Viettel Phú Hà

## Phạm vi

Ứng dụng Flask + SQLite chạy trên một máy chủ có ổ đĩa bền vững, phục vụ khoảng 1.000 sim và ba cơ sở. Không triển khai trên hosting chỉ phục vụ tệp tĩnh/GitHub Pages, nhiều máy có SQLite riêng hoặc nền tảng xóa ổ đĩa khi restart. Nếu cần nhiều máy chủ, chuyển SQLite sang cơ sở dữ liệu dùng chung trước.

Website không nhận giấy tờ tùy thân hoặc mã OTP. Đăng ký chính chủ thực hiện theo quy trình nhà mạng tại cơ sở. Khách chọn sim, nhập tên và số điện thoại để cửa hàng gọi tư vấn. Việc giao dịch tiếp theo được trao đổi riêng với khách; website không có tài khoản khách hoặc thanh toán.

## Cài đặt trên VPS

Yêu cầu Python 3.12+, Node.js 24 để kiểm thử, Chromium nếu chạy kiểm thử trình duyệt.

```sh
cd /duong-dan/lethuviettel1
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm ci --cache /tmp/viettel-npm-cache
npm test
.venv/bin/python server.py create-admin
npm start
```

Tạo tài khoản chủ qua lời nhắc trong terminal: mật khẩu tối thiểu 12 ký tự, không có mật khẩu mặc định. Không gửi mật khẩu qua chat. Mật khẩu được băm; session lưu phía máy chủ, cookie HttpOnly/SameSite và CSRF bảo vệ thao tác quản trị. `create-admin` chỉ thêm tài khoản, không ghi đè tài khoản hiện có.

`npm start` dùng Gunicorn tại cổng 3000. Dùng systemd hoặc trình quản lý dịch vụ để tự khởi động lại. Chạy bằng tài khoản hệ thống riêng có quyền ghi DATA_DIR; không chạy root.

Các biến trong `.env.example` là hướng dẫn: ứng dụng không tự đọc `.env`. Đặt chúng bằng hosting/systemd hoặc xuất từ môi trường tin cậy. Mật khẩu SMTP phải nằm trong cấu hình bí mật, không trong repo.

## Docker (phương án thay thế)

```sh
 docker compose up -d --build
 docker compose exec web python server.py create-admin
```

Volume `store-data` giữ dữ liệu và ảnh sau khi restart. Không dùng `docker compose down -v` khi cần giữ dữ liệu. Không mount repo/data vào thư mục web công khai. Docker image đã build và chạy thử bằng người dùng không phải root; kiểm tra API, đăng nhập, gửi tư vấn, cookie Secure, sao lưu và giữ dữ liệu sau restart trên volume thử riêng.

Nếu Docker build không truy cập được DNS/Internet của kho Python, tải wheel đã ghim trước bằng `.venv/bin/pip download --only-binary=:all: --dest .docker-wheels -r requirements.txt` trên máy cùng nền tảng/Python, rồi build lại. Dockerfile dùng bộ wheel đó nếu có; không tắt TLS hoặc sửa checksum. Wheel là cache cục bộ, không được commit. Môi trường kiểm thử đã dùng cách này vì mạng trong Docker build không phân giải được DNS.

## Tên miền và HTTPS

Trỏ DNS tên miền của cửa hàng về VPS. Đặt Nginx/Caddy hoặc HTTPS proxy của hosting trước Gunicorn. Chỉ cho proxy truy cập cổng 3000; compose đã bind cổng vào loopback. Proxy chuyển Host, X-Forwarded-Proto và X-Forwarded-For, đúng **một** lớp proxy tin cậy. Chỉ bật `TRUST_PROXY=1` khi khách không thể truy cập trực tiếp Gunicorn; nếu cấu trúc proxy khác, cấu hình lại số hop trước khi dùng.

Bật `SECURE_COOKIES=1` trên HTTPS; không dùng chế độ này để đăng nhập qua HTTP. Giữ `SECURE_COOKIES` chưa đặt khi phát triển nội bộ qua HTTP. Cấu hình `SITE_URL` nếu proxy không giữ đúng origin. Giá trị này phải khớp HTTPS origin của tên miền.

Nhập tên miền HTTPS trong **Quản trị → Cấu hình cửa hàng** để tạo canonical URL, Open Graph và sitemap. Trường đó phục vụ nội dung/SEO, không tự mua tên miền, đổi DNS, cấu hình proxy hoặc xuất bản website. Một người quản lý hosting phải thực hiện phần hạ tầng này.

## Khởi tạo cửa hàng

1. Vào `/admin`, đăng nhập chủ cửa hàng.
2. Tải mẫu Excel tại **Kho sim → Nhập danh sách Excel / CSV**. Dán khoảng 1.000 sim vào sheet đầu; số sim là văn bản giữ số 0 đầu, giá là số nguyên đồng, cơ sở dùng `cs1/cs2/cs3`. Không dùng công thức. Giới hạn 5.000 sim/lần, tệp 1 MB, dữ liệu giải nén 20 MB. Tệp sai/trùng sẽ bị từ chối toàn bộ, không nhập một phần.
3. Điền giờ mở cửa, Zalo chính thức, tên miền, link ghim Google Maps của từng cơ sở. Các link mặc định chỉ tìm kiếm theo địa chỉ, chưa phải tọa độ cửa hàng đã xác minh.
4. Điền chính sách xử lý thông tin tư vấn theo hoạt động thực tế để mở biểu mẫu. Có thể bổ sung hướng dẫn đăng ký chính chủ. Website không tự công bố các điều kiện chưa được cửa hàng xác nhận. Tham khảo `POLICY_GUIDE.md`.
5. Có thể tải banner thật PNG/JPEG/WebP tối đa 1 MB. Ảnh được kiểm tra và mã hóa lại JPEG trước khi phục vụ; SVG/HTML không được nhận. Hệ thống không mặc định có đánh giá của khách hoặc tuyên bố hỗ trợ 24/7.
6. Tạo nhân viên, gán cơ sở. Nhân viên xem kho và khách tư vấn của cơ sở mình, cập nhật ghi chú, lịch gọi lại và trạng thái. Chỉ chủ cửa hàng sửa kho/giá/cấu hình, quản lý nhân viên và tải sao lưu.
7. Chọn một sim và gửi yêu cầu thử có kiểm soát. Kiểm tra cửa hàng nhận được đúng số sim, tên và điện thoại trước khi quảng bá.

Kho vận hành ban đầu trống. Dữ liệu 1.000 sim trong kiểm thử nằm ở thư mục tạm, không được đưa vào cửa hàng.

## Gọi tư vấn và quản lý kho

Khách chọn sim, nhập tên và số điện thoại, đồng ý chính sách xử lý thông tin rồi gửi yêu cầu. Ghi chú là tùy chọn. Trang quản trị **Khách cần tư vấn** lưu số sim, giá lúc gửi, cơ sở sở hữu, tên, điện thoại và ghi chú.

Nhân viên gọi khách và cập nhật **Mới → Đã liên hệ → Đã xử lý**, có thể phân công, ghi chú nội bộ và hẹn gọi lại. Gửi yêu cầu không tự giữ hay bán sim; nhiều khách có thể quan tâm cùng một số. Chủ tự đổi tình trạng trong **Kho sim → Sửa sim** thành **Đang giữ chỗ** hoặc **Đã bán** sau khi trao đổi trực tiếp. Hoàn tất tư vấn không tự đánh dấu đã bán.

Giá và số sim trong yêu cầu là bản ghi tại thời điểm gửi. Sửa giá kho không thay đổi lịch sử tư vấn; không đổi số sim đã có lịch sử. Gửi lại sau mất kết nối dùng cùng mã yêu cầu để tránh trùng. Mã này do website xử lý, khách không cần ghi hoặc tra cứu.

Trang tra cứu đơn cũ chuyển sang Liên hệ. API tạo đơn và tra cứu cũ dừng hoạt động; dữ liệu lịch sử vẫn nằm trong bản sao lưu. Cập nhật cơ sở dữ liệu chỉ thêm cột vào yêu cầu tư vấn, không xóa dữ liệu cũ.

## Thông báo và đo lường

Trang quản trị kiểm tra số khách tư vấn mới mỗi 30 giây khi đang mở. Có lịch hẹn gọi lại, ghi chú và phân công nhân viên. Lịch hẹn hiển thị giờ Việt Nam; chưa tự gửi SMS/nhắc lịch ngoài trình duyệt.

Email tự động dùng hàng đợi bền vững. Cấu hình SMTP_HOST, SMTP_PORT (465 hoặc 587), SMTP_FROM, SMTP_USERNAME, SMTP_PASSWORD và chạy **một** tiến trình `.venv/bin/python server.py mail-worker` hoặc chạy `--once` mỗi phút. SMTP dùng TLS có kiểm tra chứng chỉ, gửi thông báo chung tới email cửa hàng cấu hình trong quản trị, không gửi tên/địa chỉ khách trong email. Chưa gửi thử email thật vì chưa có cấu hình SMTP; luồng này đã kiểm thử bằng máy gửi giả lập. SMTP có thể gửi lặp khi worker chết sau khi gửi mà chưa đánh dấu, nên luôn xử lý theo yêu cầu trên quản trị.

Docker có profile tùy chọn `mail`: cấu hình biến SMTP qua môi trường Compose hoặc tệp `.env` được bảo vệ/bỏ qua Git rồi chạy `docker compose --profile mail up -d`. Profile này chưa gửi email thật trong kiểm thử. Không chạy thêm worker thứ hai.

Trang Tổng quan hiển thị trạng thái kho/khách tư vấn, số lượt xem theo ngày và trang được xem nhiều. Lượt xem chỉ là bộ đếm tổng hợp, không phải số khách duy nhất; không dùng cookie theo dõi khách và tôn trọng Do Not Track.

## Sao lưu và khôi phục

Bản SQLite tải từ Quản trị → Sao lưu chứa dữ liệu khách và băm mật khẩu; chỉ lưu ở nơi được phân quyền. Phiên đăng nhập bị loại khỏi bản sao lưu. Ảnh tải lên nằm trong `DATA_DIR/uploads` và cần sao lưu riêng.

VPS: thiết lập cron hằng ngày chạy `scripts/backup.sh`, ví dụ `0 18 * * *` tương ứng 01:00 giờ Việt Nam nếu cron dùng UTC. Thiết lập DATA_DIR/BACKUP_DIR đúng môi trường dịch vụ. Script tạo SQLite snapshot và tệp ảnh; sao chép ra nơi lưu ngoài máy chủ, quy định thời gian giữ, mã hóa và thử khôi phục định kỳ. Script không tự xóa bản cũ.

Docker: dùng `docker compose exec -T web python server.py backup --file /data/backup-YYYYMMDD.sqlite3`, sao chép tệp ra nơi lưu an toàn và sao lưu thư mục uploads/volume. Không chỉ sao chép tệp store.db khi dịch vụ đang ghi vì có dữ liệu trong WAL.

Dừng dịch vụ trước khi khôi phục:

```sh
.venv/bin/python server.py restore --file /noi-luu/backup.sqlite3
```

Khôi phục ảnh tương ứng, khởi động lại và đăng nhập lại. Lệnh kiểm tra tính toàn vẹn, các bảng cần thiết và tạo bản trước khôi phục trong DATA_DIR. Khôi phục đã kiểm thử trên dữ liệu tạm; người vận hành vẫn cần diễn tập với hạ tầng thật.

## Theo dõi hoạt động

Theo dõi `/api/health`, lỗi Gunicorn/proxy, dung lượng đĩa, bản sao lưu gần nhất và hàng đợi email. Cấu hình uptime monitor bên ngoài hosting; endpoint health kiểm tra API/cơ sở dữ liệu nhưng không xác minh DNS, SMTP hoặc khả năng khôi phục backup.

Đặt giới hạn request/body và firewall trên proxy; ứng dụng đã có giới hạn gửi tư vấn và đăng nhập quản trị. Có phân quyền phía máy chủ, CSRF, băm mật khẩu, cookie bảo vệ phiên, truy vấn SQL tham số hóa, thoát HTML, hạn chế tệp công khai và chống công thức trong CSV/Excel. Đây là các kiểm tra đã triển khai và kiểm thử, không phải chứng nhận kiểm toán bảo mật độc lập.
