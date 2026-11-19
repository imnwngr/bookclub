# HSV CTUT 3.0.0 · Nghiệm thu

Ngày 20/11/2026, Asia/Bangkok. **Bản triển khai local; chưa phát hành production.** Không dùng test mock để xác nhận SMTP, Edge đang deploy hoặc RLS production. Goal chưa hoàn tất cho đến khi backend, Auth/email và rollout thật được kiểm chứng.

## Preflight và trạng thái bên ngoài

| Hạng mục | Khả năng thực tế | Bằng chứng | PASS/BLOCKED | Cách xử lý |
|---|---|---|---|---|
| Git/source ban đầu | HEAD 8ee2e3e, main khớp origin; 10 untracked có trước | git status/fetch, baseline logs | PASS | Giữ nguyên file không thuộc phiên |
| GitHub | viewerPermission ADMIN; hsv chưa tồn tại, v3.0.0 chưa có | gh repo view/API/ls-remote | PASS quyền đã đọc | Recheck trước rename/tag; không ghi đè repo |
| Pages ban đầu | workflow; SHA 8ee2e3e; bundle index-QrJGegpT.js | Actions success, HTTP 200 /bookclub/ | PASS đối chiếu baseline | Chưa chuyển URL production |
| Supabase project | trdofhdspbkwgernwybp, public REST đọc được | public columns HTTP 200; v3 columns HTTP 400/42703 | PASS chỉ đọc | Không suy ra quyền quản trị |
| Schema/history/RLS/RPC/Edge live | Chưa có management session/token được cấp | Không tool Supabase connected; Dashboard sign-in; CLI chưa login | BLOCKED | Kết nối plugin Supabase đã đề xuất hoặc CLI bằng tài khoản có quyền đúng project |
| Backup/restore production | Chưa xác minh mới | Không có quyền đọc backup/PITR/khôi phục | BLOCKED | Kiểm tra và thử restore tách biệt trước apply |
| Auth/SMTP/redirect/log | Chỉ public settings và OPTIONS | Email enabled, autoconfirm false; CORS origin đúng | BLOCKED cấu hình và delivery | Native sandbox/mail sink và management access |
| Native sandbox | PostgreSQL 17.11 local; Supabase native tách biệt trên GitHub runner | concurrency result; Actions 44589080550 | PASS SQL/Auth/Edge/SMTP sandbox | Docker máy cá nhân chưa chạy; runner đã giải quyết kiểm thử độc lập |

Plugin discovery xác nhận có Supabase nhưng chưa connected; không xem CLI thiếu token là bằng chứng không tồn tại công cụ khác. Không đọc secrets từ tài khoản khác, không gửi thư tới người thật.

## Đã triển khai trong source

- Nhận diện Sự kiện Hội Sinh viên CTUT, logo Hội chính thức; giữ Đoàn/Hội/CTUT và nội dung lịch sử. Version package/lockfile 3.0.0.
- Loại sự kiện lưu qua SQL/RPC, cũ mặc định invitation; congratulation chấp nhận null thời gian/không có địa điểm. Form chuyển loại giữ dữ liệu và dirty state; resolver/API trả loại/theme.
- Năm preset và màu tùy chỉnh, preview/reset/save/reload; schema `{version:1,primary:'#RRGGBB'}` không nhận CSS tùy ý. Scope theo sự kiện, theme lấy live từ event, không thay recipient snapshot.
- Routes /hsv/thiep-moi và /hsv/thiep-chuc, canonical sau resolver, primary alias/copy all, Auth accept/callback, 404 refresh, assets và CI base đồng bộ.
- Thêm Editor một bước, server xác minh Admin, ledger/lease chống gửi email lặp, trạng thái chờ nhận lời mời/lỗi một phần/khôi phục, khóa double-click và timeout. Revoke vô hiệu hóa worker cũ; retry cùng yêu cầu vừa bị thu hồi không cấp lại quyền.

## Kết quả kiểm thử

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Baseline | typecheck/lint/build PASS; 120 unit; 145 e2e, 25 skip | Trước thay đổi |
| `npm run typecheck` | PASS | TypeScript ứng dụng/tests |
| `npm run lint` | PASS | ESLint |
| `npm test` | 137 PASS, 28 files | Domain/API, SQL PGlite và handler Edge với mocks |
| `npm run test:e2e` | 167 PASS, 35 skip | Chromium desktop/mobile, API/Storage mock |
| `npm run build` | PASS | Build production, base /hsv/ |
| `npm run test:concurrency` | PASS | PostgreSQL 17.11 thật, loopback, hai session độc lập |
| Native account sandbox | 10 nhóm kiểm tra PASS | Auth, JWT, Edge, PostgREST, SQL, SMTP Mailpit và Chromium thật trên runner tách biệt |
| Production write/email | Chưa chạy | BLOCKED; không có thay đổi production |

35 skip là các matrix chiều rộng/màu và checks riêng desktop không chạy lặp trong project mobile; không phải test thất bại được bỏ qua. Browser suite vẫn chạy các luồng desktop và mobile. SQL PGlite dựng baseline synthetic từ các file lịch sử, điều chỉnh fingerprint guard lịch sử chỉ trong helper; **hai migration v3 dùng nguyên file**, không sửa guard. Không coi schema synthetic là schema live. Test PostgreSQL hai PID khác nhau xác nhận cùng email chỉ một claim `invite`, một `processing`, một ledger row; không chạy Auth hoặc gửi email.

Coverage: bảo toàn event/snapshot/alias khi migration; transaction rollback và từ chối replay; tạo/sửa/tải lại cả hai loại; validation giờ Thiệp mời; Thiệp chúc null không lịch/venue; đổi loại/save/cancel/dirty; theme lỗi/cực sáng/cực tối/contrast/không rò; filtering/sorting; draft/RLS local; primary links/copy all/404/query/hash; callback lỗi hết hạn; Admin/Editor/anonymous, partial failure/retry/revoke; nhạc thực decode/play trong Chromium, blocked autoplay/gesture/manual control; opening, forward/reverse/native touch/reduced motion.

## Browser và Anti-slop

Ảnh/log ở `.local/hsv-v3/` (ignored). Matrix 320/390/430/768/1024/1440/1920px cho home, cover/nội dung Thiệp chúc và editor. Ba màu #174b78/#173f36/#873c42 cho cover/nội dung Thiệp mời. Dialog tài khoản default/loading/error/pending success ở desktop/mobile. Axe WCAG2A/AA PASS trong matrix editor, ba theme và dialog. Đây không phải chứng nhận screen reader hay thiết bị iOS thật.

Quan sát ảnh phát hiện và sửa chữ “Chúc” tràn cột mobile và nhãn CTUT quá nhỏ ở footer; kiểm tra glyph bounds bổ sung. Sửa thêm lỗi validation bị ẩn khi nhập địa điểm sai rồi đổi sang Thiệp chúc: thông báo rõ và nút quay lại sửa, không tự xóa dữ liệu; test desktop/mobile xác nhận có thể sửa và lưu thiệp không thời gian/địa điểm. Bề mặt vẫn có thớ dệt/giấy và ánh sáng; tên người nhận rõ; Thiệp chúc không có section rỗng của lịch/địa điểm. Các chapter giữ normal flow, reveal ở thành phần bên trong. Controls dùng native semantics, keyboard/focus và các trạng thái có phản hồi. Không thêm artwork/logo tổ chức tự vẽ, testimonial, số liệu giả hoặc framework thiết kế mới.

CI Linux phát hiện assertion đọc theme trước khi navigation hoàn tất và Back chạy khi detail còn lazy loading. Kiểm thử đã chờ nội dung đích; theme đồng thời gắn với location key để không áp màu của route cũ lên route mới. Ba màu và Back desktop/mobile PASS sau sửa; Chrome kiểm tra riêng lại focus, Thiệp chúc không lịch và theme về home. Dialog thành công dùng nhãn disabled “Đã có quyền Editor”, không còn hiển thị nhãn khôi phục ở trạng thái thành công.

Anti-slop: hard gate PASS trong phạm vi browser matrix/axe/keyboard đã ghi; purpose gate PASS theo lý do vật liệu, typography và bố cục trong DESIGN.md; liveliness PASS theo ENERGY 2/RHYTHM 2/MOTION 3 và reduced motion; craftsmanship PASS theo luồng tạo/sửa/thiệp/dialog đã chạy. Giới hạn: chưa test screen reader thủ công/iOS thật, không dùng kiểm tra UI để kết luận quyền production.

Nhóm bằng chứng:

- `final-typecheck.log`, `final-lint.log`, `final-unit.log`, `final-e2e.log`, `final-build.log`.
- `concurrency-final.log` và `concurrency/*/result.json`.
- `screenshots/home-{width}.png`, `editor-type-theme-{width}.png`.
- `screenshots/congratulation-cover-{width}.png`, `congratulation-open-reduced-{width}.png`.
- `screenshots/invitation-cover-{hex}.png`, `invitation-open-{hex}.png`.
- `screenshots/account-{default,loading,error,pending}-{desktop,mobile}.png`.
- `production-readonly.jsonl`: HTTP status/public settings, không token/rows cá nhân.
- `browser-review.json`, `screenshots/manual-purple-{open,closing}-mobile.png`: quan sát riêng màu tím ở 390px, mở bằng Enter đưa focus đến người nhận, không lịch/venue, theme sạch khi về home, Escape trả focus nút thêm tài khoản, không page exception. API vẫn là fixture.
- `latest-unit.log`, `latest-e2e.log`, `latest-build.log`, `ci-regression.log`: kiểm tra sau sửa chuyển trang/theme.
- `native-ci-final/result.json`, `native-ci-final/native-*.png`, `native-ci-final.log`: native Auth/SMTP sandbox, khác với browser mocks. [Lần chạy native thành công](https://github.com/imnwngr/bookclub/actions/runs/44589080550).

## Quản lý tài khoản: nguyên nhân và giới hạn

Source cũ có nhánh action=invite trả 403 “Invitations are disabled pending safety verification”. UI cũ buộc chọn kỹ thuật invite/grant. Đó là nguyên nhân đã xác minh ở source; **chưa đọc được Edge revision live**, không kết luận production deploy giống source. Bản mới thay bằng luồng `add` và ledger chứ không chỉ gỡ 403. `HSV_INVITATIONS_ENABLED=verified` chỉ mở sau native Auth/SMTP sandbox thành công; fixture mode không gửi email và sandbox từ chối cloud URL.

Auth invite và database grant không có transaction chung. Timeout/response mất giữ trạng thái chưa xác định, không tự gửi lại; khi tìm thấy tài khoản thì chỉ khôi phục quyền. Nếu chưa thấy tài khoản, operator cần đối chiếu logs trước quyết định gửi mới.

Native sandbox đã kiểm chứng Admin nhập email trên giao diện → Edge → Auth tạo user và gửi SMTP → SQL cấp Editor → Mailpit nhận đúng một thư → mở `/hsv/auth/accept` → đặt mật khẩu → đăng nhập lại với quyền Editor. Cũng PASS: tài khoản có sẵn không cần mời; Editor/anonymous/CORS/EXECUTE/ledger bị từ chối; request đồng thời/retry chỉ một thư; injection lỗi SQL sau gửi thư được khôi phục không gửi lại; link đã dùng/hết hạn; dừng container Mailpit gây lỗi thật, khởi động lại không tự resend; target/Admin bị cấm. Dùng CLI chính thức Supabase 3.2.0, kiểm tra nguồn package github.com/supabase/cli; không thêm dependency ứng dụng.

Schema native là baseline tài khoản synthetic từ source lịch sử, migration ledger v3 nguyên file, Auth/PostgREST/Edge và SMTP thật. Đây không phải restore của production, không xác nhận event schema production hoặc SMTP/provider production. Không gửi thư ra ngoài. Chưa kiểm chứng delivery production hoặc Edge đang deploy. Workflow native được gọi từ workflow verify; deploy cần cả verify và native PASS cùng gate production.

## Phát hành và phần còn thiếu

Repo hiện tại `imnwngr/bookclub`, branch triển khai `hsv-v3`; chưa merge main, rename, tạo tag v3.0.0 hoặc deploy. URL đích `https://imnwngr.github.io/hsv/` chưa được phát hành. Workflow chặn deploy nếu repo/gate/backend chưa đúng. Chi tiết rollout/rollback: [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

Link `/bookclub/` vẫn phục vụ bản cũ trong lần read-only kiểm tra này. Redirect repo GitHub không chứng minh Pages redirect. Sau rename, muốn giữ link cũ cần hosting bridge riêng ở `/bookclub/`; chưa tạo và chưa kiểm chứng. Không tuyên bố tương thích cũ sau rename.

Thao tác tối thiểu còn cần từ người dùng: kết nối Supabase project `trdofhdspbkwgernwybp` bằng plugin đã đề xuất hoặc login CLI bằng tài khoản có quyền quản trị phù hợp; không gửi token trong chat. Không còn cần người dùng sửa Docker để chạy QA email vì runner đã cung cấp môi trường đó. Sau khi kết nối, Codex kiểm tra quyền thực tế, backup/restore, schema/history/Edge/config, thử với schema tương ứng, áp dụng backend, cập nhật Auth redirects và mới phối hợp rename/deploy/tag/smoke. Không cần duyệt lại các thay đổi đã được chấp thuận trong nhiệm vụ.

Không dùng external AI worker. Không thay bucket/env names/migrations lịch sử hoặc dữ liệu production. Các file untracked có trước được giữ nguyên và không đưa vào commits của phiên.
