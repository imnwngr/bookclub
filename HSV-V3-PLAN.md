# HSV CTUT 3.0.0

## Phạm vi và hướng thiết kế

Sự kiện Hội Sinh viên CTUT là nền tảng sự kiện. Giữ K2D, giấy/dệt, Liquid Glass, opening và reveal bên trong từng chương; không dựng lại website. Audience: người nhận thiệp cá nhân/nhóm và người quản trị nội dung. Thành công: tạo/lưu/tải lại hai loại, màu riêng có contrast, lời mời tài khoản có trạng thái và khôi phục an toàn.

Design-team đã đọc catalog. Chọn hệ thiết kế hiện có làm hướng duy nhất; Hallmark dùng phương pháp kiểm tra tính nhất quán, không scaffold/theme mới; better-accessibility kiểm tra semantics/focus/dialog; Anti-slop `during` theo cấu hình global, audit cuối. Chrome DevTools và Playwright cho bằng chứng tương tác. Không cần GSAP, ảnh AI hoặc framework mới. ENERGY 2 / RHYTHM 2 / MOTION 3; mobile giảm chuyển động, reduced motion hiện nội dung ngay.

## Preflight 2026-11-20 (giờ máy; UTC 2026-11-19)

| Hạng mục | Thực tế / bằng chứng | Trạng thái | Xử lý |
|---|---|---|---|
| Git | main, origin imnwngr/bookclub, HEAD 8ee2e3e, 10 untracked có trước | PASS | Bảo toàn, không stage |
| Deploy hiện có | Actions success cùng SHA; Pages JS index-QrJGegpT.js trùng baseline build | PASS | Theo dõi backend trước release |
| GitHub | gh viewerPermission ADMIN; hsv HTTP 404; Pages workflow | PASS | Chưa rename khi backend còn blocked |
| Supabase | trdofhdspbkwgernwybp từ config; REST public columns 200, event_type/theme 42703 | PASS chỉ đọc public | Không suy ra quyền ghi |
| Management access | Không Supabase MCP/token CLI/DB credential; browser Supabase sign-in | BLOCKED | Kết nối Supabase đúng project |
| Schema/RPC/RLS/history/Edge revision | Không đọc được management metadata hiện tại | BLOCKED | Audit lại trước apply |
| Auth/email | Public settings: email enabled, autoconfirm false; Edge OPTIONS 204, CORS origin https://imnwngr.github.io | BLOCKED cấu hình/SMTP/logs | Không email production thử nghiệm |
| Backup/restore | Tài liệu cũ không xác nhận backup production; chưa có quyền xác minh mới | BLOCKED | Backup có kiểm tra phục hồi trước apply |
| Local | Node/npm/PGlite/Chrome sẵn; Docker daemon không chạy | PASS local logic/browser | SQL tách biệt; email sandbox cần chuẩn bị |
| Baseline | typecheck/lint/build PASS, 120 tests/25 files PASS; e2e 145 PASS/25 skip | PASS | Log .local/hsv-v3/ |

## Quyết định triển khai

- event_type: invitation (mặc định dữ liệu cũ) / congratulation. starts_at/ends_at nullable, bắt buộc hợp lệ với invitation. Thời gian/địa điểm đã nhập được giữ khi đổi loại, ẩn khỏi thiệp chúc; không tạo dữ liệu giả.
- theme: {version:1, primary:'#RRGGBB'}, validation cả SQL/frontend, đọc trực tiếp từ sự kiện. Snapshot salutation/name/description/kind và primary alias giữ nguyên.
- URL canonical /hsv/thiep-moi/:code/:alias và /hsv/thiep-chuc/:code/:alias; route sai loại chuyển đến canonical chỉ sau resolver có quyền trả dữ liệu. Route cũ trong /hsv/ được canonical hóa. /bookclub/ sau rename cần hosting riêng để redirect, chưa cam kết tương thích.
- Thêm tài khoản nhận email một bước. Server tự tra tài khoản, chỉ Editor; operation ledger khóa theo email, trạng thái kết quả/khôi phục, không tự gửi lại email khi timeout.
- Release theo thứ tự: audit/backup → thử migration → backend → Auth redirects → Edge sandbox → frontend QA → rename/origin/Pages → push/tag khi release gates PASS. Không deploy main khi backend chưa đủ điều kiện.

## Bảo toàn

Không sửa bucket bookclub-venues/bookclub-music, env names hiện có, historical migrations/seeds hoặc dữ liệu thật. Không stage 10 file có sẵn trước phiên. Không commit .env/.local/test artifacts. Không external AI worker được dùng.

## Đối chiếu sau triển khai local

**Cập nhật sau khi người dùng kết nối Supabase:** MCP đã đọc được schema/history/Edge live. Đã tạo snapshot public có ACL ngoài repository, khôi phục trên PostgreSQL local và thử hai migration nguyên bản. Đã apply production tại versions `20261119220329` và `20261119220343`; fingerprint 9 bảng cũ/24 hàm không liên quan giữ nguyên, public HTTP/resolver/draft checks PASS. Edge live revision 1 có đúng nhánh chặn invite. Các đoạn dưới ghi lại trạng thái trước khi kết nối. Điểm còn thiếu hiện nay là quản trị Auth/SMTP/Edge secrets (plugin không có tools này), đã yêu cầu phiên CLI hoặc Dashboard; chưa rename/tag/Pages deploy.

Quyền GitHub kiểm tra lại vẫn ADMIN; target hsv trả HTTP 404; remote main vẫn tại 8ee2e3e. Pages vẫn phục vụ bundle cũ. Supabase MCP đã kết nối; CLI chính thức chạy được nhưng chưa có token và Dashboard chưa đăng nhập. Source/kiểm thử/tài liệu tiếp tục được hoàn thiện độc lập; không rename hoặc bật deploy khi cấu hình Auth/SMTP/Edge chưa được xác minh.

Đã giải quyết hạn chế Docker local bằng Supabase native trên GitHub runner tách biệt: 10 nhóm kiểm tra Auth/Edge/PostgREST/SMTP/browser PASS, gồm accept thành công, retry/concurrency, lỗi cấp quyền sau gửi thư, SMTP outage, expired/reused link và banned account. Workflow native trở thành điều kiện trước deploy. Bản sửa mới bổ sung trường hợp grant/retry/revoke từ frontend cũ để kiểm tra triển khai backend trước frontend. Không coi sandbox synthetic là production; backup public và postflight production có bằng chứng riêng.
