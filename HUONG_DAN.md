# Hướng dẫn vận hành Viettel Phú Hà

Các tệp cần dùng đều ở thư mục gốc repository. Website, Google Sheets và Apps Script tiếp tục giữ URL và dữ liệu hiện tại.

## Website + Apps Script + Google Sheets

Website chạy trên GitHub Pages. Apps Script đọc kho sim và ghi yêu cầu mới vào Google Sheets. Trang quản trị nằm trên Apps Script và cần mật khẩu của cửa hàng. Không cần VPS, tài khoản khách hoặc thanh toán trên website.

URL Apps Script bạn gửi đã được đặt trong `site-config.js`. Các bước 1–3 dành cho thiết lập lần đầu. Nếu kho sim đã hiển thị và admin đã hoạt động, giữ nguyên Sheet và mật khẩu; bước 4 hướng dẫn quản lý hằng ngày.

Tính năng **thông báo Zalo Bot** mới cần cập nhật mã và cấp thêm quyền. Xem phần **Nhận yêu cầu mới bằng Zalo Bot** bên dưới nếu cửa hàng đã hoạt động; không tạo lại Sheet.

### 1. Chuẩn bị Google Sheet riêng tư

Tạo một Google Sheet mới, đặt tên **Viettel Phú Hà**. Không công khai hoặc bật “Xuất bản lên web”. Chỉ chia sẻ quyền sửa cho người quản lý cửa hàng.

Nếu Apps Script hiện tại đã gắn với Sheet và có dữ liệu, sao lưu trước. Mã này dùng các tab `KhoSim`, `YeuCau`, `CauHinh`; không ghi đè tab có tiêu đề khác. Nếu gặp lỗi cấu trúc, dùng Sheet mới; dữ liệu cũ không được tự nhập sang.

Từ Sheet, chọn **Tiện ích mở rộng → Apps Script**. Để giữ URL đã gửi, cập nhật đúng dự án đang sở hữu URL đó. Nếu dự án đó là dự án độc lập, cần gắn `SHEET_ID` trong **Cài đặt dự án → Thuộc tính tập lệnh** bằng ID Sheet (đoạn giữa `/d/` và `/edit`), rồi chạy setupStore để tạo các tab. Như vậy vẫn giữ được URL Apps Script hiện tại.

### 2. Dán hai tệp mã

1. Sao lưu mã cũ của Apps Script.
2. Thay nội dung tệp **Code.gs** bằng [Code.gs](Code.gs).
3. Thêm tệp **HTML** tên **Admin** rồi dán [AppsScript-Admin.html](AppsScript-Admin.html).
4. Lưu. Chọn hàm **setupStore**, bấm **Chạy**, cấp quyền Google cho chính dự án của bạn.
5. Hàm tạo 3 tab: **KhoSim**, **YeuCau**, **CauHinh**. Xem **Nhật ký thực thi** để lấy mật khẩu quản trị được tạo ngẫu nhiên. Lưu mật khẩu riêng; không đưa lên GitHub hoặc gửi vào chat.

Không cần dán manifest để bắt đầu; nếu quản lý manifest, có mẫu `appsscript.json`. Hàm thiết lập không nhập sim mẫu và không xóa dữ liệu có sẵn.

### 3. Triển khai Web App

- Chọn **Triển khai → Quản lý phiên triển khai**.
- Sửa Web App hiện tại, chọn **Phiên bản mới**.
- **Thực thi dưới tên:** Tôi (chủ Sheet).
- **Người có quyền truy cập:** Bất kỳ ai — để khách gửi yêu cầu mà không đăng nhập Google. Tài khoản Workspace có thể bị quản trị tổ chức chặn tùy chọn này.
- Bấm **Triển khai**. Giữ URL kết thúc bằng `/exec`, không dùng `/dev`.

Nếu triển khai mới có URL khác, sửa `scriptUrl` trong `site-config.js` trên GitHub. Đây là URL công khai, không phải mật khẩu.

Thử mở URL thêm `?action=settings`: phải thấy nội dung JSON có tên **Viettel Phú Hà**. Nếu hiện yêu cầu đăng nhập Google, chưa mở quyền “Bất kỳ ai”. Nếu sửa mã mà vẫn thấy dữ liệu cũ, cập nhật triển khai sang phiên bản mới.

### 4. Mở admin và nhập sim

Mở URL Apps Script thêm **`?view=admin`**, đăng nhập bằng mật khẩu ở bước 2. Hoặc vào `admin.html` trên website và bấm **Mở trang quản trị**.

- **Kho sim:** thêm/sửa từng sim, giá, cơ sở, tình trạng; nhập CSV hoặc dán bảng từ Excel. Có tải mẫu CSV. Tối đa 5.000 sim mỗi lần. Tệp lỗi hoặc trùng bị từ chối toàn bộ.
- **Cấu hình cửa hàng:** bổ sung giờ mở cửa, Zalo, tên miền. Điền ô **Chính sách sử dụng tên/số điện thoại để gọi tư vấn**, bấm **Lưu cấu hình** để bật gửi yêu cầu. Nếu mục này trống, khách vẫn mở được form bằng nút Mua sim nhưng nút gửi bị khóa và có link gọi hotline.
- **Khách cần tư vấn:** xem tên, số điện thoại, sim đã chọn, giá lúc gửi; gọi khách, ghi chú, hẹn gọi lại và đổi trạng thái **Mới → Đã liên hệ → Đã xử lý**.
- **Thông báo Zalo:** lưu token bot riêng tư, chọn nơi nhận, gửi thử, bật/tắt lịch gửi và kiểm tra thông báo lỗi. Làm theo hướng dẫn bot trước khi bật.

Nếu soạn bằng Excel, cột `number` phải định dạng **Text** trước khi dán số để giữ số 0 đầu. Lưu **CSV UTF-8** hoặc sao chép bảng gồm cả tiêu đề vào ô nhập admin. Không tải trực tiếp `.xlsx`; không dùng công thức. Cơ sở: `cs1`, `cs2`, `cs3`; tình trạng: `available`, `reserved`, `sold`, `hidden`.

Gửi yêu cầu không tự giữ sim. Sau khi trao đổi với khách, cửa hàng tự đánh dấu **Đang giữ chỗ** hoặc **Đã bán** trong Kho sim. Giá và sim trong yêu cầu giữ nguyên lịch sử.

Nội dung tham khảo để cửa hàng chỉnh sửa cho đúng cách vận hành: “Viettel Phú Hà sử dụng tên, số điện thoại và ghi chú để liên hệ tư vấn. Khách có thể gọi 0344.639.666 để yêu cầu sửa hoặc xóa thông tin.” Có thể bổ sung người được xem và thời gian lưu theo thực tế cửa hàng.

### 5. Xuất bản website

Trong repo GitHub: **Settings → Pages → Build and deployment → Source → Deploy from a branch**. Chọn **Branch: main**, thư mục **/(root)**, bấm **Save**. Giữ tên miền **simdep68.vn** và bật **Enforce HTTPS** khi GitHub cho phép. Repo chỉ chứa tệp ở gốc; không còn workflow GitHub Actions. Tệp `_config.yml` loại mã Apps Script, tài liệu, công cụ và kiểm thử khỏi website xuất bản.

Website dùng link dạng `/#/kho-sim`, `/#/sim/1` nên tải lại hoặc chia sẻ link vẫn chạy trên GitHub Pages, kể cả thư mục `/lethuviettel1/`. CSS/ảnh dùng đường dẫn tương đối. Không chạy website này bằng GitHub Pages với URL sạch `/sim/1` như bản máy chủ cũ.

Giao diện có sẵn trong HTML, không đợi Apps Script mới hiển thị. Chỉ vùng kho sim chờ cập nhật dữ liệu. Mất kết nối có nút **Thử lại** và hotline; dữ liệu khách đang nhập được giữ khi cập nhật ở nền. HTML trang chủ đã có sẵn trong `index.html`. Khi thay giao diện hoặc cấu hình mặc định trong mã nguồn, chạy `npm run build:root` và commit `index.html` trước khi đẩy GitHub. Lệnh chỉ dựng giao diện, không lấy dữ liệu khách hoặc mật khẩu.

Tên miền riêng: cấu hình trong **GitHub Settings → Pages → Custom domain** và DNS theo hướng dẫn GitHub. Trường tên miền trong admin chỉ thay thông tin cửa hàng, không tự đổi DNS.

### 6. Kiểm tra một yêu cầu thật có kiểm soát

1. Nhập một sim thật, điền chính sách và mở website trên điện thoại.
2. Bấm **Mua sim** trên thẻ sim → điền tên/số điện thoại, đồng ý chính sách → **Gửi thông tin mua sim**. Có thể mở form từ trang chi tiết sim.
3. Xác nhận có dòng mới trong tab **YeuCau** và trang admin.
4. Đổi giá hoặc đánh dấu sim đã bán trong admin, tải lại website để xác nhận.

Website chỉ báo thành công sau khi đọc được xác nhận đã ghi Sheet. Gửi lại sau mất mạng giữ cùng mã để tránh tạo trùng. Không gửi tên/số điện thoại qua URL công khai. API công khai không trả danh sách khách; mật khẩu/token quản trị không nằm trong mã website.

### Lưu ý vận hành

Google Apps Script có hạn mức và thời gian thực thi; phù hợp cửa hàng có lượng truy cập vừa phải, không bảo đảm mọi lưu lượng. Thông báo số khách mới cập nhật mỗi phút khi admin đang mở; không có push khi đã đóng admin. Sheet luôn nhận dữ liệu kể cả admin đang đóng.

Giữ Sheet riêng tư. Dùng lịch sử phiên bản và tạo bản sao Sheet định kỳ; có nút xuất CSV trong admin. Xuất CSV chứa số điện thoại khách, cần lưu riêng. Không nhập thông tin giấy tờ, OTP hoặc mật khẩu khách.

Quên mật khẩu admin: chủ dự án chạy **resetAdminPassword**, lấy mật khẩu mới trong nhật ký. Việc này làm các phiên quản trị cũ hết hiệu lực. Phiên admin tối đa 30 phút; Google có thể xóa cache sớm, lúc đó đăng nhập lại. Các hàm thiết lập kiểm tra tài khoản chủ dự án; khách truy cập Web App không thể thiết lập hoặc đổi mật khẩu.


## Nhận yêu cầu mới bằng Zalo Bot

Website vẫn lưu yêu cầu khách vào Google Sheets trước. Sau khi bật bot, Apps Script kiểm tra hàng đợi mỗi phút và gửi tin riêng tới từng người quản lý trong danh sách. Tối đa 20 người nhận, mỗi người có trạng thái gửi và nút gửi lại riêng. Không cần VPS.

**Token xuất hiện trong ảnh chụp đã gửi:** tạo lại token trong Zalo Bot Manager, rồi nhập token mới trực tiếp vào admin. Không gửi token vào chat hoặc lưu trong mã GitHub.

### 1. Cập nhật Apps Script đang dùng

Bạn đã có Sheet và admin, nên không cần tạo lại Sheet hoặc mật khẩu.

1. Mở dự án Apps Script của cửa hàng.
2. Thay nội dung **Mã.gs / Code.gs** bằng [Code.gs](Code.gs).
3. Thay nội dung tệp HTML **Admin** (hoặc `admin` nếu tên đang viết thường) bằng [AppsScript-Admin.html](AppsScript-Admin.html).
4. Lưu. Trong danh sách hàm cạnh nút **Chạy**, chọn **setupZaloNotifications** rồi bấm **Chạy**. Dùng tài khoản chủ dự án để cấp thêm quyền Google.
5. Chọn **Triển khai → Quản lý phiên triển khai → Sửa → Phiên bản mới → Triển khai**. Giữ Web App chạy dưới tên chủ Sheet, quyền truy cập **Bất kỳ ai** và URL `/exec` hiện tại.

Hàm chuẩn bị tạo tab riêng **ThongBaoZalo** và lịch gửi. Nó không đổi kho sim, yêu cầu khách hoặc mật khẩu admin. Token sẽ được nhập ở bước 2. Nếu đã kết nối một người trong bản cũ, cập nhật cả hai tệp rồi triển khai phiên bản mới: token, người nhận và hàng đợi hiện tại được giữ; không cần nhập token lại.

Nếu dự án tự quản lý trường `oauthScopes` trong `appsscript.json`, giữ các quyền cũ và thêm `https://www.googleapis.com/auth/script.external_request` cùng `https://www.googleapis.com/auth/script.scriptapp`. Có manifest mẫu tại [appsscript.json](appsscript.json). Dự án tự nhận quyền không cần dán manifest riêng.

### 2. Kết nối bot trong admin

Mở admin như trước, chọn **Thông báo Zalo**.

1. Nhập token mới vào ô **Token Zalo bot**. Để **Bật thông báo** chưa được tích, bấm **Lưu kết nối bot**.
2. Nhờ **người thứ nhất** mở bot trên Zalo của họ và **nhắn riêng** cho bot: **Nhận thông báo**.
3. Quay lại admin, bấm **Lấy nơi nhận**, chọn người vừa gửi tin. Một thẻ người nhận sẽ được thêm vào **Danh sách người nhận**. Đặt tên để dễ nhận biết, bấm **Lưu kết nối bot**.
4. Bấm **Gửi tin thử** ngay trong thẻ của người đó, kiểm tra Zalo của họ đã nhận tin.
5. Lặp lại bước 2–4 với **người thứ hai, thứ ba…**. Giữ các thẻ đã thêm; không thay Chat ID của người cũ bằng người mới. Mỗi Chat ID chỉ thêm một lần.
6. Tích **Bật thông báo yêu cầu mới**, bấm **Lưu kết nối bot**. Mọi yêu cầu mới được gửi riêng tới từng người trong danh sách.

Nếu đã biết Chat ID, bấm **+ Thêm người nhận bằng Chat ID**, điền tên và mã rồi lưu. Muốn ngừng gửi cho một người, bấm **Xóa người nhận** ở thẻ của họ rồi **Lưu kết nối bot**. Xóa người cuối cùng sẽ bỏ tích bật thông báo; lưu để dừng lịch gửi.

Người mới thêm chỉ nhận yêu cầu phát sinh sau khi được thêm, không tự nhận dữ liệu khách cũ. Khi đổi hoặc xóa người nhận, các tin còn chờ của người đó sẽ dừng. Nếu bỏ rồi thêm lại cùng Chat ID, người đó cũng chỉ nhận các yêu cầu mới sau lần thêm lại.

**Chat ID là mã cuộc trò chuyện, không phải số điện thoại.** Nếu bot dùng webhook hoặc một ứng dụng khác đang đọc tin nhắn, có thể phải nhập Chat ID đã có. Không tự xóa webhook của bot. Với nhóm Zalo, thêm bot vào nhóm theo hướng dẫn Zalo rồi gửi một tin nhắn cho bot trong nhóm để lấy nơi nhận.

Token và danh sách người nhận chỉ lưu trong Script Properties riêng của Apps Script. Website công khai không đọc được danh sách này. Admin không trả lại token đã lưu; để ô token trống khi chỉ thêm/xóa người hoặc bật/tắt thông báo. Dòng **Đã lưu token** xác nhận có giá trị đã lưu, chưa xác nhận token còn hợp lệ; dùng **Gửi tin thử** và kiểm tra Zalo để xác nhận kết nối.

### 3. Kiểm tra hoạt động

1. Trong **Cấu hình cửa hàng**, bảo đảm đã lưu chính sách sử dụng tên/số điện thoại. Có nút **Điền nội dung tham khảo** để chỉnh sửa và lưu. Khi bật bot, chính sách tham khảo có nói rõ thông tin được gửi tới Zalo quản lý.
2. Mở website, chọn sim và gửi một yêu cầu thử do cửa hàng kiểm soát.
3. Xác nhận dòng mới trong **YeuCau** và **Khách cần tư vấn**.
4. Chờ lịch gửi chạy rồi kiểm tra Zalo của **từng người** và mục **Tình trạng gửi thông báo** trong admin. Mỗi dòng ghi mã yêu cầu và người nhận; cùng một yêu cầu có thể có nhiều dòng. Bấm **Làm mới** để xem trạng thái mới nhất.

Tin nhắn gồm mã yêu cầu, tên, số điện thoại, sim đã chọn, giá lúc gửi, cơ sở phụ trách, ghi chú và thời gian. Yêu cầu tư vấn chung cũng được thông báo. Không tự giữ chỗ hay bán sim.

### 4. Khi gửi tin gặp lỗi

- **Lấy nơi nhận hết thời gian chờ (408):** lần đọc tin Zalo chưa lấy được cập nhật trong thời gian chờ. Không kết luận token sai từ mã này. Nhờ người nhận nhắn riêng một tin mới cho bot rồi bấm **Lấy nơi nhận** lại. Nếu hệ thống khác đang đọc tin hoặc dùng webhook, dùng Chat ID đã có; không tự xóa webhook.
- **Chờ gửi:** lịch gửi xử lý tối đa 5 tin mỗi phút cho toàn bộ danh sách. Ví dụ một yêu cầu gửi cho 20 người cần ít nhất 4 lượt nếu không có hàng đợi khác. Lỗi giới hạn gửi đã được Zalo xác nhận sẽ thử lại sau 1, 2, 4 phút, tối đa 4 lần.
- **Gửi lỗi:** kiểm tra token, quyền bot và Chat ID của người đó. Sửa kết nối rồi bấm **Gửi lại thông báo** ở đúng dòng. Chỉ người bị lỗi được gửi lại; người đã nhận thành công không nhận thêm. Lỗi một người không chặn người khác.
- **Chưa xác nhận:** có thể Zalo đã nhận nhưng phản hồi bị mất. Kiểm tra Zalo trước, rồi dùng **Gửi lại sau khi kiểm tra** nếu cần. Lần gửi lại thủ công có thể tạo thêm tin nếu lần trước đã được nhận.
- **Đã dừng:** người nhận đã bị xóa/thêm lại hoặc yêu cầu khách đã bị xóa. Không tự chuyển thông tin khách cũ cho người mới thêm.
- Nếu có dòng trong `YeuCau` mà không có thông báo, kiểm tra đã bật bot, lịch gửi và tab `ThongBaoZalo`; lịch tự kiểm tra những yêu cầu mới chưa có trong hàng đợi.
- Nếu Google báo thiếu quyền, chủ dự án chạy lại **setupZaloNotifications**, cấp quyền rồi kiểm tra phiên triển khai.

Bot dùng hạn mức của Zalo và Apps Script. Tắt thông báo trong admin sẽ dừng lịch gửi; website và Sheet vẫn nhận yêu cầu. Chỉ chọn người/nhóm quản lý có quyền tiếp nhận thông tin khách và giữ Sheet riêng tư.

Tài liệu nền tảng của bot: [Zalo Bot Platform](https://bot.zaloplatforms.com/docs/build-your-bot/). Tích hợp dùng API `https://bot-api.zapps.me`, phương thức `sendMessage` và `getUpdates`; không đưa token vào đường dẫn công khai của website.

Kiểm thử trong repo dùng dịch vụ Google/Zalo mô phỏng, không gửi tin vào bot thật. Cần hoàn thành các bước trên và gửi thử để xác nhận quyền Google, token và nơi nhận thực tế.
