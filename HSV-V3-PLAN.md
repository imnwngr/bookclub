# HSV CTUT 3.0.0

## Trạng thái sau đổi repository · 20/11/2026

Repository đã là [imnwngr/hsv](https://github.com/imnwngr/hsv), origin local `https://github.com/imnwngr/hsv.git`. Fetch xác nhận `hsv-v3` đồng bộ remote tại `87512c4` khi bắt đầu đợt này, với 17 commit hơn `main`; nhánh mặc định vẫn là `main` tại `8ee2e3e`. Giữ thư mục local `C:\Users\Tio\Downloads\bookclub` và 10 file untracked có trước.

SMTP Resend đã hoàn tất theo xác nhận của người dùng: tự cấu hình và nhận email thử thành công. Không còn hạng mục thiếu provider. Luồng mời Editor production chưa được kiểm chứng toàn bộ; không suy ra kết quả cấp quyền/nhận lời mời từ email thử SMTP.

Phạm vi đợt này: đối chiếu Git, cập nhật tài liệu, review từng staged diff và secrets, chia commit có ý nghĩa, push `origin/hsv-v3`, xác nhận SHA remote và CI. Không merge main, đổi nhánh mặc định, tạo tag/release, deploy, bật gate hoặc thay database/Auth/SMTP/Edge. Các kiểm tra local bàn giao đã kết thúc: typecheck/lint/build PASS, 139 unit PASS, Playwright 171 PASS và 35 skip. Chi tiết bằng chứng nằm trong [nghiệm thu](HSV-V3-VERIFICATION.md).

Pages đã có URL `/hsv/`, nhưng HTTP đọc lại cho thấy HTML BookClub cũ vẫn trỏ đến script `/bookclub/assets/` bị 404; `/bookclub/` cũng trả 404. Đổi tên repository không đồng nghĩa đã phát hành frontend HSV v3. Các mục preflight bên dưới lưu lại lịch sử trước rename và Resend.

## Phạm vi và hướng thiết kế

Sự kiện Hội Sinh viên CTUT là nền tảng sự kiện. Giữ K2D, giấy/dệt, Liquid Glass, opening và reveal bên trong từng chương; không dựng lại website. Audience: người nhận thiệp cá nhân/nhóm và người quản trị nội dung. Thành công: tạo/lưu/tải lại hai loại, màu riêng có contrast, lời mời tài khoản có trạng thái và khôi phục an toàn.

Design-team đã đọc catalog. Chọn hệ thiết kế hiện có làm hướng duy nhất; Hallmark dùng phương pháp kiểm tra tính nhất quán, không scaffold/theme mới; better-accessibility kiểm tra semantics/focus/dialog; Anti-slop `during` theo cấu hình global, audit cuối. Chrome DevTools và Playwright cho bằng chứng tương tác. Không cần GSAP, ảnh AI hoặc framework mới. ENERGY 2 / RHYTHM 2 / MOTION 3; mobile giảm chuyển động, reduced motion hiện nội dung ngay.

## Preflight ban đầu (lịch sử; giờ máy 2026-11-20, UTC 2026-11-19)

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
- Kế hoạch release ban đầu: audit/backup → thử migration → backend → Auth redirects → Edge sandbox → frontend QA → rename/origin/Pages → push/tag khi release gates PASS. Rename/origin nay đã hoàn tất riêng; không lặp lại. Phát hành frontend/tag còn là đợt riêng, ngoài phạm vi Git/tài liệu hiện tại.

## Bảo toàn

Không sửa bucket bookclub-venues/bookclub-music, env names hiện có, historical migrations/seeds hoặc dữ liệu thật. Không stage 10 file có sẵn trước phiên. Không commit .env/.local/test artifacts. Không external AI worker được dùng.

## Đối chiếu backend trước rename và Resend (lịch sử)

**Cập nhật 20/11 sau khi người dùng đăng nhập CLI:** MCP và CLI đã truy cập đúng project. Hai migration production ở versions `20261119220329` và `20261119220343` giữ nguyên; fingerprint 9 bảng cũ/24 hàm không liên quan và public HTTP đã PASS. Edge v3 đã deploy với JWT verification bật. Callback `/bookclub/auth/accept`, `/bookclub/auth/callback`, `/hsv/auth/accept`, `/hsv/auth/callback` đã có trong allowlist; Site URL giữ `/bookclub/` trong khi trang hiện tại còn chạy.

Tại mốc audit này, GitHub có quyền ADMIN, target hsv trả HTTP 404 và main tại `8ee2e3e`; Pages còn phục vụ bản cũ ở `/bookclub/`. CLI xác nhận mode live, gửi lời mời disabled và chưa có custom SMTP/send-email hook. Đây là trạng thái trước rename và trước khi người dùng tự cấu hình Resend; không dùng nó làm trạng thái SMTP hiện tại. Đợt Git/tài liệu không đọc lại hoặc sửa cấu hình backend.

Supabase native trên GitHub runner tách biệt đã kiểm chứng Auth/Edge/PostgREST/SMTP/browser, gồm accept, retry/concurrency, lỗi cấp quyền sau gửi thư, SMTP outage, expired/reused link, banned account và grant từ frontend cũ. Workflow native là điều kiện trước deploy. Bản sửa `8c2c460` cho hộp thoại đọc trạng thái gửi lời mời từ server, giải thích email đang tắt và vẫn hỗ trợ tài khoản đã có; thêm kiểm tra capability không tạo user/ledger. Không coi sandbox synthetic là production; backup public và postflight production có bằng chứng riêng.
