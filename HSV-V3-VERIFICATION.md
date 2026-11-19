# HSV CTUT 3.0.0 · Nghiệm thu

Ngày 20/11/2026, Asia/Bangkok. **Database v3 đã áp dụng production; chưa phát hành frontend/Edge v3.** Không dùng test mock để xác nhận SMTP hoặc Edge đang deploy. Goal chưa hoàn tất cho đến khi Auth/email và rollout thật được kiểm chứng.

## Kiểm chứng sau khi kết nối Supabase

Kết nối MCP đã hoạt động, project đúng `trdofhdspbkwgernwybp`, ACTIVE_HEALTHY, PostgreSQL 17.11, organization Free. Quyền đọc schema/history/RLS/Edge được thực thi; quyền migration được xác nhận bằng hai lần apply thành công, không suy từ quyền đọc hay GitHub ADMIN. Lịch sử thực tế và backup có phạm vi xem [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

| Hạng mục | Bằng chứng hiện tại | Trạng thái |
|---|---|---|
| Schema/RPC/RLS/history | MCP đọc definitions và ACL; hai history mới `20261119220329`, `20261119220343` | PASS |
| Backup phần bị ảnh hưởng | Snapshot public ngoài repo có ACL, manifest SHA-256; khôi phục 9 bảng và 26 hàm trên PostgreSQL thật; hai migration nguyên file PASS | PASS trong phạm vi public; không phải full platform restore |
| Dữ liệu sau migration | Fingerprint 9 bảng cũ giữ nguyên; 24 hàm không liên quan giữ nguyên; cũ mặc định invitation; ledger trống và client không có quyền trực tiếp | PASS production SQL |
| Public HTTP | 1 published event, 1 draft ẩn, 14 primary aliases/snapshots đúng; event_type/theme trả đúng; bảng riêng và recovery từ chối anonymous | PASS production read-only |
| Edge live | Đã tải source revision 1; xác nhận action invite trả 403 “Invitations are disabled pending safety verification” | PASS xác định nguyên nhân live; chưa deploy revision mới |
| Auth/SMTP/secrets | Plugin không có công cụ quản lý các cấu hình này; CLI AccessTokenRequiredError, Dashboard chưa đăng nhập ở lần kiểm tra | BLOCKED kênh quản trị bổ sung |

Sửa thêm khả năng triển khai backend trước frontend: action grant của frontend cũ thiếu request_id nay được gán ID ổn định theo actor/email; không cho gửi thư và retry sau revoke không tự cấp lại. Luồng add v3 vẫn yêu cầu request_id từ client. Unit handler mới PASS; native sandbox bổ sung kiểm tra grant/retry/revoke của frontend cũ để CI xác minh trước deploy Edge.

Typecheck/lint/build PASS sau sửa; unit tăng từ 137 lên **138 PASS**. Browser đầy đủ đã hoàn tất **167 PASS, 35 skip**, log `.local/hsv-v3/postmigration-e2e.log`. Unit/build của bản sửa tương thích lưu tại `edge-compat-unit.log` và `edge-compat-build.log`. Các bằng chứng sandbox trước đó bên dưới không thay cho kiểm tra production mới.

Kiểm tra lại kết nối theo yêu cầu người dùng: `list_projects`, `list_migrations`, `list_edge_functions` và SQL read-only đều thực thi thành công. History vẫn đúng hai migration v3, Edge vẫn revision 1, không replay migration. GitHub vẫn ADMIN, remote main giữ `8ee2e3e`, repo đích `imnwngr/hsv` trả 404 và tag `v3.0.0` chưa tồn tại. CLI vẫn thiếu access token, Dashboard chuyển đến Sign in; plugin không có tool Auth config/SMTP/Edge secrets. Đây là giới hạn kênh quản trị hiện có, không phải thiếu kết nối database. Chưa mở gửi email hoặc chuyển Pages.

Security advisors đã chạy trước/sau migration. Ledger có RLS và không policy là chủ đích deny-all cho client ([linter 0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)); quyền direct service cũng bị revoke, chỉ các RPC có guard được cấp EXECUTE. `editor_add_recovery` là SECURITY DEFINER có kiểm tra Admin và search_path cố định, đã kiểm ACL thực tế. Các cảnh báo hàm SECURITY DEFINER cũ và leaked-password protection có trước, không được âm thầm thay quyền hoặc cấu hình trong rollout này.

Bằng chứng mới không chứa dữ liệu cá nhân: `.local/hsv-v3/production-postflight.json`, `production-http-smoke.json`. Backup riêng và báo cáo restore nằm ngoài repo tại `C:\dev\temp\hsv-v3-production`. Không có email production nào được gửi.

## Preflight ban đầu trước khi có kết nối (lịch sử)

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
| `npm test` | 138 PASS, 28 files | Domain/API, SQL PGlite và handler Edge với mocks |
| `npm run test:e2e` | 167 PASS, 35 skip | Chromium desktop/mobile, API/Storage mock |
| `npm run build` | PASS | Build production, base /hsv/ |
| `npm run test:concurrency` | PASS | PostgreSQL 17.11 thật, loopback, hai session độc lập |
| Native account sandbox | 10 nhóm kiểm tra PASS | Auth, JWT, Edge, PostgREST, SQL, SMTP Mailpit và Chromium thật trên runner tách biệt |
| Production database | Hai migration đã áp dụng; SQL và HTTP postflight PASS | Schema/RPC/ACL thực tế; dữ liệu cũ giữ nguyên |
| Production Edge/Auth/email | Chưa rollout/kiểm chứng delivery | BLOCKED Auth/SMTP/secrets; Edge vẫn revision 1 |

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

Source cũ có nhánh action=invite trả 403 “Invitations are disabled pending safety verification”. UI cũ buộc chọn kỹ thuật invite/grant. Sau khi có MCP, **đã xác nhận Edge revision 1 live cũng có nhánh chặn này**. Bản mới thay bằng luồng `add` và ledger chứ không chỉ gỡ 403. `HSV_INVITATIONS_ENABLED=verified` chỉ mở sau native Auth/SMTP sandbox thành công và kiểm tra cấu hình live; fixture mode không gửi email và sandbox từ chối cloud URL.

Auth invite và database grant không có transaction chung. Timeout/response mất giữ trạng thái chưa xác định, không tự gửi lại; khi tìm thấy tài khoản thì chỉ khôi phục quyền. Nếu chưa thấy tài khoản, operator cần đối chiếu logs trước quyết định gửi mới.

Native sandbox đã kiểm chứng Admin nhập email trên giao diện → Edge → Auth tạo user và gửi SMTP → SQL cấp Editor → Mailpit nhận đúng một thư → mở `/hsv/auth/accept` → đặt mật khẩu → đăng nhập lại với quyền Editor. Cũng PASS: tài khoản có sẵn không cần mời; Editor/anonymous/CORS/EXECUTE/ledger bị từ chối; request đồng thời/retry chỉ một thư; injection lỗi SQL sau gửi thư được khôi phục không gửi lại; link đã dùng/hết hạn; dừng container Mailpit gây lỗi thật, khởi động lại không tự resend; target/Admin bị cấm. Dùng CLI chính thức Supabase 3.2.0, kiểm tra nguồn package github.com/supabase/cli; không thêm dependency ứng dụng.

Schema native là baseline tài khoản synthetic từ source lịch sử, migration ledger v3 nguyên file, Auth/PostgREST/Edge và SMTP thật. Đây không phải restore của production, không xác nhận event schema production hoặc SMTP/provider production. Không gửi thư ra ngoài. Chưa kiểm chứng delivery production hoặc Edge đang deploy. Workflow native được gọi từ workflow verify; deploy cần cả verify và native PASS cùng gate production.

## Phát hành và phần còn thiếu

Repo hiện tại `imnwngr/bookclub`, branch triển khai `hsv-v3`; chưa merge main, rename, tạo tag v3.0.0 hoặc deploy. URL đích `https://imnwngr.github.io/hsv/` chưa được phát hành. Workflow chặn deploy nếu repo/gate/backend chưa đúng. Chi tiết rollout/rollback: [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

Link `/bookclub/` vẫn phục vụ bản cũ trong lần read-only kiểm tra này. Redirect repo GitHub không chứng minh Pages redirect. Sau rename, muốn giữ link cũ cần hosting bridge riêng ở `/bookclub/`; chưa tạo và chưa kiểm chứng. Không tuyên bố tương thích cũ sau rename.

Plugin đã kết nối và database v3 đã áp dụng. Điều kiện bên ngoài còn thiếu: phiên CLI hoặc Dashboard có quyền quản trị để đọc/sửa Auth redirects, SMTP và Edge secrets mà plugin hiện không cung cấp. Câu hỏi bất đồng bộ đã gửi; không yêu cầu token trong chat và không xin duyệt lại scope. Không còn cần sửa Docker để chạy QA email vì runner đã cung cấp sandbox. Sau khi kiểm tra cấu hình, tiếp tục Edge, Auth redirects và phối hợp rename/deploy/tag/smoke.

Không dùng external AI worker. Không thay bucket/env names/migrations lịch sử hoặc dữ liệu production. Các file untracked có trước được giữ nguyên và không đưa vào commits của phiên.
