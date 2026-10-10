# Viettel Phú Hà — simdep68.vn

Website bán sim số đẹp (GitHub Pages + Google Apps Script/Sheets).

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `index.html`, `kho-sim/`, `sim-phong-thuy/`, `lien-he/`, `chinh-sach/`, `sim/`, `404.html` | HTML tĩnh **được tạo tự động** bằng `_build/prerender.cjs` (đừng sửa tay) |
| `app.js` | Toàn bộ giao diện + kết nối Google Sheets. Thông tin cửa hàng nằm ở `STORE_CONFIG` đầu tệp |
| `styles.css` | Giao diện (phông chữ: Bricolage Grotesque cho tiêu đề và số, Be Vietnam Pro cho nội dung; màu đỏ Viettel `--red`, nền tối `--wine`) |
| `admin.html` | Trang quản trị (không index) |
| `_build/shell.html` | Khung `<head>` (meta, font, icon sprite). Sửa meta mặc định ở đây |
| `sitemap.xml`, `robots.txt` | SEO |

## Khi sửa `app.js`, `styles.css`, `shell.html` hoặc `STORE_CONFIG`
```bash
npm i puppeteer        # lần đầu
node _build/prerender.cjs
```
Rồi commit toàn bộ thay đổi. Nếu đổi `styles.css`/`app.js`, tăng số `?v=` trong `_build/shell.html` để trình duyệt tải bản mới.

## URL
- Trang: `/kho-sim/`, `/sim-phong-thuy/`, `/lien-he/`, `/chinh-sach/`
- Chi tiết sim: `/sim/?id=123`
- Link cũ dạng `/#/kho-sim` tự chuyển sang URL mới.

## Sau khi đưa lên GitHub
1. Google Search Console → thêm `https://simdep68.vn` → gửi `https://simdep68.vn/sitemap.xml`.
2. Dùng "Kiểm tra URL" cho trang chủ, `/kho-sim/`, `/lien-he/` để yêu cầu lập chỉ mục.
3. Tạo / xác minh hồ sơ Google Business Profile cho 3 cơ sở (quan trọng nhất cho tìm kiếm địa phương).
