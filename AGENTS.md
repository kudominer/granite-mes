# AGENTS.md — StoneFlow Pro (granite-mes)

Hướng dẫn làm việc cho mọi AI agent (Cursor, Copilot, Cline, Hermes...) khi sửa dự án web quản lý kho & xưởng đá hoa cương này.

Xem [README.md](README.md) (nếu có) để biết tổng quan. Dự án deploy tĩnh tại https://granite-mes.netlify.app, source: https://github.com/kudominer/granite-mes (nhánh `master`).

## Công cụ đã sẵn sàng
- `git` — remote `https://github.com/kudominer/granite-mes.git`, nhánh `master`.
- `netlify-cli` đã cài GLOBAL (gõ `netlify` ở terminal nào cũng được). Token deploy đã cấp quyền (biến `NETLIFY_AUTH_TOKEN` hoặc session `netlify login` active).
- Dự án là web tĩnh (HTML/CSS/JS thuần), deploy từ thư mục `.`, auto-build từ GitHub.

## QUY TRÌNH LÀM VIỆC — QUAN TRỌNG NHẤT
1. **ĐỒNG BỘ TRƯỚC KHI SỬA:** luôn `git fetch` rồi `git pull origin master` để lấy code mới nhất. TUYỆT ĐỐI không sửa khi chưa pull. (Áp dụng mọi repo, không riêng Bot_Albion_TNC.)
2. **Bàn thiết kế trước** với user (mô tả lệnh, logic, file bị đụng) — chỉ code khi user chốt rõ ràng (`"chốt"`, `"ok"`, `"làm đi"`, `"ok làm đi"`). Prompt kết thúc bằng `?` = thảo luận, không code.
3. **KIỂM TRA trước khi báo xong:** với file JS chạy `node --check <file>.js`. Mọi lệnh phải chạy thật, báo output thật — không bịa kết quả.
4. **COMMIT** (tiếng Việt, KHÔNG thêm `Co-Authored-By`):
   `git add -A && git commit -m "feat: <mô tả ngắn tiếng Việt>"` (type: feat/fix/refactor/docs/style/test/chore).
5. **PUSH:** `git push origin master`.
6. **DEPLOY thủ công** (nếu cần lên ngay, không chờ auto-build):
   `netlify deploy --prod --dir . --auth "$NETLIFY_AUTH_TOKEN"`
   (nếu session đã login thì bỏ `--auth`: `netlify deploy --prod --dir .`)

## Nguyên tắc code (Karpathy)
1. **Nghĩ trước khi code** — nếu có nhiều cách hiểu, nêu ra cho user chọn. Nếu có cách đơn giản hơn, nói thẳng.
2. **Đơn giản trước tiên** — code tối thiểu đủ giải quyết đúng yêu cầu. Không thêm tính năng/abstraction chưa ai yêu cầu.
3. **Sửa đúng phạm vi (surgical)** — chỉ đụng chỗ cần sửa. Không refactor lan man, giữ nguyên style hiện có. Chỉ dọn code mồ côi do chính mình tạo ra.
4. **Tiêu chí kiểm chứng được** — biến yêu cầu mơ hồ thành tiêu chí rõ ràng, test được.

## Lưu trữ dữ liệu (Supabase)
- App dùng Supabase project `granite-mes` (URL `https://meeajulucdyypnqamyow.supabase.co`). Bảng: `orders`, `slabs`, `inventory`, `order_photos` (RLS mở cho nội bộ).
- Data load/save qua `js/supabase.js` (`initSupabase`, `loadAllFromSupabase`, `saveOrderToSupabase`, `saveInventoryToSupabase`). Không gọi Supabase trần (phải qua wrapper này).
- Mọi thao tác đổi data (nhận đơn, nhận đá, ảnh, tấm, chuyển sở hữu) PHẢI gọi hàm save tương ứng — không chỉ đổi biến in-memory.

## BẢO MẬT (TUYỆT ĐỐI)
- KHÔNG commit file `.env`, `js/config.js` (chứa Supabase key & Netlify token — đã nằm trong `.gitignore`).
- KHÔNG hardcode secret vào code. Nếu thấy key lộ trong diff → báo user ngay.
- `.env` chỉ thêm mới (append), KHÔNG xóa/sửa dòng cũ.
- `js/config.js` chứa `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY` — anon key an toàn cho browser, service_role key KHÔNG bao giờ đưa lên client.

## UI RULES (bắt buộc)
- **Mobile:** TUYỆT ĐỐI không scroll ngang; bảng → card trên màn hình nhỏ (< 640px). Test bằng DevTools mobile.
- **Dark mode:** đã fix bằng CSS override (`.dark` class trong `css/style.css`), KHÔNG dùng Tailwind `dark:` variant (Tailwind Play CDN v4 không hỗ trợ config darkMode class).
- **Quy trình nhận hàng:** luôn kèm chụp ảnh + thông tin (mẫu mã/kích thước/số tấm). Modal "Nhận Đá Khách (Chụp)" ở dashboard.

## Tạo bảng/cột tự động (DDL qua script)
Khi cần thêm bảng hoặc cột mới trên Supabase granite-mes, Agent KHÔNG cần mở SQL Editor thủ công. Dùng script:
`node scripts/db-exec.js "SQL_DDL_ở_đây"` (ví dụ: `ALTER TABLE orders ADD COLUMN tong_tien bigint;`).
Script dùng `DATABASE_URL` từ `.env` (thêm vào từ Supabase Dashboard project granite-mes → Settings → Database → Connection string, chứa mật khẩu DB) qua package `pg`.
- Yêu cầu: `npm install pg` (nếu thiếu).
- KHÔNG dùng anon/service_role key qua REST để tạo cột (REST không hỗ trợ DDL) — luôn qua script này hoặc SQL Editor.
- Sau khi tạo schema, cập nhật `supabase/schema.sql` cho khớp.

## Cấu trúc dự án
- `index.html` — markup + script tags (supabase-js CDN → config.js → supabase.js → data.js → app.js).
- `css/style.css` — style + dark mode override + mobile card layout.
- `js/data.js` — dữ liệu mẫu (fallback khi Supabase rỗng), `let orders`, `let inventory`, `let activities`.
- `js/app.js` — logic render + thao tác (dashboard, inventory, orders, receive-stone, slab-table, ops-intelligence, edit-photo).
- `js/supabase.js` — kết nối & load/save Supabase.
- `js/config.js` — Supabase credentials (gitignored).
- `supabase/schema.sql` — schema DB (chạy 1 lần trên Supabase SQL Editor).
- `.env` / `.env.example`, `netlify.toml` — cấu hình.

## Ngôn ngữ & giao tiếp
- Giao tiếp tiếng Việt, xưng hô theo cách user gọi.
- Giải thích đời thường cho user không biết code.
- Báo lỗi/sụp = ngầm yêu cầu sửa → vá gấp rồi báo.
