# Nhận yêu cầu mới bằng Zalo Bot

Website vẫn lưu yêu cầu khách vào Google Sheets trước. Sau khi bật bot, Apps Script kiểm tra hàng đợi mỗi phút và gửi thông tin tới cuộc trò chuyện Zalo của người quản lý đã chọn. Không cần VPS.

**Token xuất hiện trong ảnh chụp đã gửi:** tạo lại token trong Zalo Bot Manager, rồi nhập token mới trực tiếp vào admin. Không gửi token vào chat hoặc lưu trong mã GitHub.

## 1. Cập nhật Apps Script đang dùng

Bạn đã có Sheet và admin, nên không cần tạo lại Sheet hoặc mật khẩu.

1. Mở dự án Apps Script của cửa hàng.
2. Thay nội dung **Mã.gs / Code.gs** bằng [apps-script/Code.gs](apps-script/Code.gs).
3. Thay nội dung tệp HTML **Admin** (hoặc `admin` nếu tên đang viết thường) bằng [apps-script/Admin.html](apps-script/Admin.html).
4. Lưu. Trong danh sách hàm cạnh nút **Chạy**, chọn **setupZaloNotifications** rồi bấm **Chạy**. Dùng tài khoản chủ dự án để cấp thêm quyền Google.
5. Chọn **Triển khai → Quản lý phiên triển khai → Sửa → Phiên bản mới → Triển khai**. Giữ Web App chạy dưới tên chủ Sheet, quyền truy cập **Bất kỳ ai** và URL `/exec` hiện tại.

Hàm chuẩn bị tạo tab riêng **ThongBaoZalo** và lịch gửi. Nó không đổi kho sim, yêu cầu khách hoặc mật khẩu admin. Token sẽ được nhập ở bước 2.

Nếu dự án tự quản lý trường `oauthScopes` trong `appsscript.json`, giữ các quyền cũ và thêm `https://www.googleapis.com/auth/script.external_request` cùng `https://www.googleapis.com/auth/script.scriptapp`. Có manifest mẫu tại [apps-script/appsscript.json](apps-script/appsscript.json). Dự án tự nhận quyền không cần dán manifest riêng.

## 2. Kết nối bot trong admin

Mở admin như trước, chọn **Thông báo Zalo**.

1. Nhập token mới vào ô **Token Zalo bot**. Để **Bật thông báo** chưa được tích, bấm **Lưu kết nối bot**.
2. Trên Zalo của người nhận, mở bot và gửi tin nhắn **Nhận thông báo**.
3. Quay lại admin, bấm **Lấy nơi nhận**, chọn cuộc trò chuyện vừa gửi tin. Ô **Chat ID** sẽ tự điền; bấm **Lưu kết nối bot**.
4. Bấm **Gửi tin thử**, kiểm tra đúng người/nhóm Zalo đã nhận tin.
5. Tích **Bật thông báo yêu cầu mới**, bấm **Lưu kết nối bot**.

**Chat ID là mã cuộc trò chuyện, không phải số điện thoại.** Nếu bot dùng webhook hoặc một ứng dụng khác đang đọc tin nhắn, có thể phải nhập Chat ID đã có. Không tự xóa webhook của bot. Với nhóm Zalo, thêm bot vào nhóm theo hướng dẫn Zalo rồi gửi một tin nhắn cho bot trong nhóm để lấy nơi nhận.

Token chỉ lưu trong Script Properties riêng của Apps Script. Admin không trả lại token đã lưu; để ô token trống khi chỉ sửa Chat ID hoặc bật/tắt thông báo.

## 3. Kiểm tra hoạt động

1. Trong **Cấu hình cửa hàng**, bảo đảm đã lưu chính sách sử dụng tên/số điện thoại. Có nút **Điền nội dung tham khảo** để chỉnh sửa và lưu. Khi bật bot, chính sách tham khảo có nói rõ thông tin được gửi tới Zalo quản lý.
2. Mở website, chọn sim và gửi một yêu cầu thử do cửa hàng kiểm soát.
3. Xác nhận dòng mới trong **YeuCau** và **Khách cần tư vấn**.
4. Chờ lịch gửi chạy, thường trong khoảng một phút nếu không có hàng đợi, rồi kiểm tra Zalo và mục **Tình trạng gửi thông báo** trong admin. Bấm **Làm mới** để xem trạng thái mới nhất.

Tin nhắn gồm mã yêu cầu, tên, số điện thoại, sim đã chọn, giá lúc gửi, cơ sở phụ trách, ghi chú và thời gian. Yêu cầu tư vấn chung cũng được thông báo. Không tự giữ chỗ hay bán sim.

## 4. Khi gửi tin gặp lỗi

- **Chờ gửi:** lịch gửi xử lý tối đa 5 thông báo mỗi lượt. Lỗi giới hạn gửi đã được Zalo xác nhận sẽ thử lại sau 1, 2, 4 phút, tối đa 4 lần.
- **Gửi lỗi:** kiểm tra token, quyền bot và Chat ID. Sửa kết nối rồi bấm **Gửi lại thông báo**.
- **Chưa xác nhận:** có thể Zalo đã nhận nhưng phản hồi bị mất. Kiểm tra Zalo trước, rồi dùng **Gửi lại sau khi kiểm tra** nếu cần. Lần gửi lại thủ công có thể tạo thêm tin nếu lần trước đã được nhận.
- **Đã dừng:** nơi nhận đã đổi hoặc yêu cầu khách đã bị xóa. Không tự chuyển thông tin khách cũ sang cuộc trò chuyện khác.
- Nếu có dòng trong `YeuCau` mà không có thông báo, kiểm tra đã bật bot, lịch gửi và tab `ThongBaoZalo`; lịch tự kiểm tra những yêu cầu mới chưa có trong hàng đợi.
- Nếu Google báo thiếu quyền, chủ dự án chạy lại **setupZaloNotifications**, cấp quyền rồi kiểm tra phiên triển khai.

Bot dùng hạn mức của Zalo và Apps Script. Tắt thông báo trong admin sẽ dừng lịch gửi; website và Sheet vẫn nhận yêu cầu. Chỉ chọn người/nhóm quản lý có quyền tiếp nhận thông tin khách và giữ Sheet riêng tư.

Tài liệu nền tảng của bot: [Zalo Bot Platform](https://bot.zaloplatforms.com/docs/build-your-bot/). Tích hợp dùng API `https://bot-api.zapps.me`, phương thức `sendMessage` và `getUpdates`; không đưa token vào đường dẫn công khai của website.

Kiểm thử trong repo dùng dịch vụ Google/Zalo mô phỏng, không gửi tin vào bot thật. Cần hoàn thành các bước trên và gửi thử để xác nhận quyền Google, token và nơi nhận thực tế.
