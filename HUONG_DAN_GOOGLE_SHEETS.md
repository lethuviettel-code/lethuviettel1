# Website + Apps Script + Google Sheets

Website chạy trên GitHub Pages. Apps Script đọc kho sim và ghi yêu cầu mới vào Google Sheets. Trang quản trị nằm trên Apps Script và cần mật khẩu của cửa hàng. Không cần VPS, tài khoản khách hoặc thanh toán trên website.

URL Apps Script bạn gửi đã được đặt trong `site-config.js`. **Cần cập nhật mã Apps Script theo các bước dưới đây**; chỉ có URL chưa bảo đảm mã hiện tại tương thích.

## 1. Chuẩn bị Google Sheet riêng tư

Tạo một Google Sheet mới, đặt tên **Viettel Phú Hà**. Không công khai hoặc bật “Xuất bản lên web”. Chỉ chia sẻ quyền sửa cho người quản lý cửa hàng.

Nếu Apps Script hiện tại đã gắn với Sheet và có dữ liệu, sao lưu trước. Mã này dùng các tab `KhoSim`, `YeuCau`, `CauHinh`; không ghi đè tab có tiêu đề khác. Nếu gặp lỗi cấu trúc, dùng Sheet mới; dữ liệu cũ không được tự nhập sang.

Từ Sheet, chọn **Tiện ích mở rộng → Apps Script**. Để giữ URL đã gửi, cập nhật đúng dự án đang sở hữu URL đó. Nếu dự án đó là dự án độc lập, cần gắn `SHEET_ID` trong **Cài đặt dự án → Thuộc tính tập lệnh** bằng ID Sheet (đoạn giữa `/d/` và `/edit`), rồi chạy setupStore để tạo các tab. Như vậy vẫn giữ được URL Apps Script hiện tại.

## 2. Dán hai tệp mã

1. Sao lưu mã cũ của Apps Script.
2. Thay nội dung tệp **Code.gs** bằng [apps-script/Code.gs](apps-script/Code.gs).
3. Thêm tệp **HTML** tên **Admin** rồi dán [apps-script/Admin.html](apps-script/Admin.html).
4. Lưu. Chọn hàm **setupStore**, bấm **Chạy**, cấp quyền Google cho chính dự án của bạn.
5. Hàm tạo 3 tab: **KhoSim**, **YeuCau**, **CauHinh**. Xem **Nhật ký thực thi** để lấy mật khẩu quản trị được tạo ngẫu nhiên. Lưu mật khẩu riêng; không đưa lên GitHub hoặc gửi vào chat.

Không cần dán manifest để bắt đầu; nếu quản lý manifest, có mẫu `apps-script/appsscript.json`. Hàm thiết lập không nhập sim mẫu và không xóa dữ liệu có sẵn.

## 3. Triển khai Web App

- Chọn **Triển khai → Quản lý phiên triển khai**.
- Sửa Web App hiện tại, chọn **Phiên bản mới**.
- **Thực thi dưới tên:** Tôi (chủ Sheet).
- **Người có quyền truy cập:** Bất kỳ ai — để khách gửi yêu cầu mà không đăng nhập Google. Tài khoản Workspace có thể bị quản trị tổ chức chặn tùy chọn này.
- Bấm **Triển khai**. Giữ URL kết thúc bằng `/exec`, không dùng `/dev`.

Nếu triển khai mới có URL khác, sửa `scriptUrl` trong `site-config.js` trên GitHub. Đây là URL công khai, không phải mật khẩu.

Thử mở URL thêm `?action=settings`: phải thấy nội dung JSON có tên **Viettel Phú Hà**. Nếu hiện yêu cầu đăng nhập Google, chưa mở quyền “Bất kỳ ai”. Nếu sửa mã mà vẫn thấy dữ liệu cũ, cập nhật triển khai sang phiên bản mới.

## 4. Mở admin và nhập sim

Mở URL Apps Script thêm **`?view=admin`**, đăng nhập bằng mật khẩu ở bước 2. Hoặc vào `admin.html` trên website và bấm **Mở trang quản trị**.

- **Kho sim:** thêm/sửa từng sim, giá, cơ sở, tình trạng; nhập CSV hoặc dán bảng từ Excel. Có tải mẫu CSV. Tối đa 5.000 sim mỗi lần. Tệp lỗi hoặc trùng bị từ chối toàn bộ.
- **Cấu hình cửa hàng:** bổ sung giờ mở cửa, Zalo, tên miền và chính sách sử dụng thông tin tư vấn. Lưu chính sách này để mở biểu mẫu khách.
- **Khách cần tư vấn:** xem tên, số điện thoại, sim đã chọn, giá lúc gửi; gọi khách, ghi chú, hẹn gọi lại và đổi trạng thái **Mới → Đã liên hệ → Đã xử lý**.

Nếu soạn bằng Excel, cột `number` phải định dạng **Text** trước khi dán số để giữ số 0 đầu. Lưu **CSV UTF-8** hoặc sao chép bảng gồm cả tiêu đề vào ô nhập admin. Không tải trực tiếp `.xlsx`; không dùng công thức. Cơ sở: `cs1`, `cs2`, `cs3`; tình trạng: `available`, `reserved`, `sold`, `hidden`.

Gửi yêu cầu không tự giữ sim. Sau khi trao đổi với khách, cửa hàng tự đánh dấu **Đang giữ chỗ** hoặc **Đã bán** trong Kho sim. Giá và sim trong yêu cầu giữ nguyên lịch sử.

## 5. Xuất bản website

Trong repo GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Workflow `pages.yml` chỉ xuất bản các tệp website. Khi đẩy mã lên `main`, GitHub Actions xuất bản lại.

Website dùng link dạng `/#/kho-sim`, `/#/sim/1` nên tải lại hoặc chia sẻ link vẫn chạy trên GitHub Pages, kể cả thư mục `/lethuviettel1/`. CSS/ảnh dùng đường dẫn tương đối. Không chạy website này bằng GitHub Pages với URL sạch `/sim/1` như bản máy chủ cũ.

Tên miền riêng: cấu hình trong **GitHub Settings → Pages → Custom domain** và DNS theo hướng dẫn GitHub. Trường tên miền trong admin chỉ thay thông tin cửa hàng, không tự đổi DNS.

## 6. Kiểm tra một yêu cầu thật có kiểm soát

1. Nhập một sim thật, điền chính sách và mở website trên điện thoại.
2. Chọn sim → nhập tên/số điện thoại → gửi.
3. Xác nhận có dòng mới trong tab **YeuCau** và trang admin.
4. Đổi giá hoặc đánh dấu sim đã bán trong admin, tải lại website để xác nhận.

Website chỉ báo thành công sau khi đọc được xác nhận đã ghi Sheet. Gửi lại sau mất mạng giữ cùng mã để tránh tạo trùng. Không gửi tên/số điện thoại qua URL công khai. API công khai không trả danh sách khách; mật khẩu/token quản trị không nằm trong mã website.

## Lưu ý vận hành

Google Apps Script có hạn mức và thời gian thực thi; phù hợp cửa hàng có lượng truy cập vừa phải, không bảo đảm mọi lưu lượng. Thông báo số khách mới cập nhật mỗi phút khi admin đang mở; không có push khi đã đóng admin. Sheet luôn nhận dữ liệu kể cả admin đang đóng.

Giữ Sheet riêng tư. Dùng lịch sử phiên bản và tạo bản sao Sheet định kỳ; có nút xuất CSV trong admin. Xuất CSV chứa số điện thoại khách, cần lưu riêng. Không nhập thông tin giấy tờ, OTP hoặc mật khẩu khách.

Quên mật khẩu admin: chủ dự án chạy **resetAdminPassword**, lấy mật khẩu mới trong nhật ký. Việc này làm các phiên quản trị cũ hết hiệu lực. Phiên admin tối đa 30 phút; Google có thể xóa cache sớm, lúc đó đăng nhập lại. Các hàm thiết lập kiểm tra tài khoản chủ dự án; khách truy cập Web App không thể thiết lập hoặc đổi mật khẩu.

Bản Python/SQLite trước đây không còn phục vụ website hiện tại. Dữ liệu cũ cần xuất và chuyển riêng; không tự động xóa hay chuyển dữ liệu.
