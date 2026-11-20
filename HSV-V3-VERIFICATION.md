# HSV CTUT 3.0.0 · Nghiệm thu

Ngày 20/11/2026, Asia/Bangkok. **Database và Edge v3 đã triển khai production; Auth có callback cũ/mới; frontend chưa phát hành.** Người dùng xác nhận chưa có dịch vụ gửi email. Gửi lời mời email mới vẫn tắt; goal chưa hoàn tất. Không dùng test mock hoặc sandbox Mailpit để xác nhận delivery production.

## Kiểm chứng sau khi kết nối Supabase

Kết nối MCP đã hoạt động, project đúng `trdofhdspbkwgernwybp`, ACTIVE_HEALTHY, PostgreSQL 17.11, organization Free. Quyền đọc schema/history/RLS/Edge được thực thi; quyền migration được xác nhận bằng hai lần apply thành công, không suy từ quyền đọc hay GitHub ADMIN. Lịch sử thực tế và backup có phạm vi xem [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

| Hạng mục | Bằng chứng hiện tại | Trạng thái |
|---|---|---|
| Schema/RPC/RLS/history | MCP đọc definitions và ACL; hai history mới `20261119220329`, `20261119220343` | PASS |
| Backup phần bị ảnh hưởng | Snapshot public ngoài repo có ACL, manifest SHA-256; khôi phục 9 bảng và 26 hàm trên PostgreSQL thật; hai migration nguyên file PASS | PASS trong phạm vi public; không phải full platform restore |
| Dữ liệu sau migration | Fingerprint 9 bảng cũ giữ nguyên; 24 hàm không liên quan giữ nguyên; cũ mặc định invitation; ledger trống và client không có quyền trực tiếp | PASS production SQL |
| Public HTTP | 1 published event, 1 draft ẩn, 14 primary aliases/snapshots đúng; event_type/theme trả đúng; bảng riêng và recovery từ chối anonymous | PASS production read-only |
| Edge live | Revision 5; source khớp commit `e2670a0`; JWT bật; CORS/anonymous/method smoke HTTP PASS | PASS deploy/đối chiếu source; không phải kiểm thử cấp quyền production |
| Auth/secrets | CLI 3.2.0 đã login; callback accept/callback dưới cả hai base path; Site URL còn `/bookclub/`; mode live, gửi thư disabled | PASS cấu hình đã đọc lại |
| SMTP/provider | Custom SMTP và send-email hook đều chưa bật; người dùng xác nhận chưa có dịch vụ | BLOCKED provider; giữ gửi thư tắt |

Sửa thêm khả năng triển khai backend trước frontend: action grant của frontend cũ thiếu request_id nay được gán ID ổn định theo actor/email; không cho gửi thư và retry sau revoke không tự cấp lại. Luồng add v3 vẫn yêu cầu request_id từ client. Unit handler mới PASS; native sandbox bổ sung kiểm tra grant/retry/revoke của frontend cũ để CI xác minh trước deploy Edge.

Typecheck/lint/build PASS. Unit hiện **139 PASS**, browser đầy đủ **171 PASS, 35 skip**. Lần unit đầu chạy cùng các tiến trình khác có 3 timeout ở editor cũ; chạy lại `npm test -- --maxWorkers=4` PASS toàn bộ, không đổi timeout/test. Sau tinh chỉnh riêng dialog, 6 test desktop/mobile PASS lại, gồm nút thao tác nằm trọn viewport ở 320/390/430px. Logs `email-state-{typecheck,lint,unit-bounded,e2e,dialog,build}.log`. Bằng chứng sandbox không thay cho production.

Kiểm tra lại sau CLI login: project/schema/history/Edge đọc được bằng công cụ đã kết nối; không replay migration. SQL xác nhận ledger vẫn trống, RLS bật, anonymous/authenticated không có quyền trực tiếp và client không EXECUTE begin. GitHub vẫn ADMIN, main giữ `8ee2e3e`, repo đích `imnwngr/hsv` trả 404 và tag `v3.0.0` chưa có. Repository variable `HSV_V3_PRODUCTION_READY` chưa đặt. Không còn thiếu quyền kết nối quản trị; hạng mục bên ngoài còn thiếu là dịch vụ gửi email.

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
| `npm test -- --maxWorkers=4` | 139 PASS, 28 files | Domain/API, SQL PGlite và handler Edge với mocks; giới hạn worker sau timeout do chạy đồng thời |
| `npm run test:e2e` | 171 PASS, 35 skip | Chromium desktop/mobile, API/Storage mock; 6 dialog checks PASS lại sau tinh chỉnh |
| `npm run build` | PASS | Build production, base /hsv/ |
| `npm run test:concurrency` | PASS | PostgreSQL 17.11 thật, loopback, hai session độc lập |
| Native account sandbox hiện tại | 12 nhóm kiểm tra PASS, [Actions 44669262018](https://github.com/imnwngr/bookclub/actions/runs/44669262018) | Auth, JWT, Edge, PostgREST, SQL, SMTP Mailpit và Chromium thật trên runner tách biệt |
| Production database | Hai migration đã áp dụng; SQL và HTTP postflight PASS | Schema/RPC/ACL thực tế; dữ liệu cũ giữ nguyên |
| Production Edge/Auth | Edge v3 deploy, JWT bật; redirects/secrets kiểm tra qua CLI; 5 HTTP smoke PASS | Không dùng session Admin thật để thử cấp quyền |
| Production email | Chưa có provider; gửi lời mời disabled | BLOCKED SMTP; chưa kiểm chứng delivery |

35 skip là các matrix chiều rộng/màu và checks riêng desktop không chạy lặp trong project mobile; không phải test thất bại được bỏ qua. Browser suite vẫn chạy các luồng desktop và mobile. SQL PGlite dựng baseline synthetic từ các file lịch sử, điều chỉnh fingerprint guard lịch sử chỉ trong helper; **hai migration v3 dùng nguyên file**, không sửa guard. Không coi schema synthetic là schema live. Test PostgreSQL hai PID khác nhau xác nhận cùng email chỉ một claim `invite`, một `processing`, một ledger row; không chạy Auth hoặc gửi email.

Coverage: bảo toàn event/snapshot/alias khi migration; transaction rollback và từ chối replay; tạo/sửa/tải lại cả hai loại; validation giờ Thiệp mời; Thiệp chúc null không lịch/venue; đổi loại/save/cancel/dirty; theme lỗi/cực sáng/cực tối/contrast/không rò; filtering/sorting; draft/RLS local; primary links/copy all/404/query/hash; callback lỗi hết hạn; Admin/Editor/anonymous, partial failure/retry/revoke; nhạc thực decode/play trong Chromium, blocked autoplay/gesture/manual control; opening, forward/reverse/native touch/reduced motion.

## Browser và Anti-slop

Ảnh/log ở `.local/hsv-v3/` (ignored). Matrix 320/390/430/768/1024/1440/1920px cho home, cover/nội dung Thiệp chúc và editor. Ba màu #174b78/#173f36/#873c42 cho cover/nội dung Thiệp mời. Dialog tài khoản default/loading/error/pending success ở desktop/mobile. Axe WCAG2A/AA PASS trong matrix editor, ba theme và dialog. Đây không phải chứng nhận screen reader hay thiết bị iOS thật.

Quan sát ảnh phát hiện và sửa chữ “Chúc” tràn cột mobile và nhãn CTUT quá nhỏ ở footer; kiểm tra glyph bounds bổ sung. Sửa thêm lỗi validation bị ẩn khi nhập địa điểm sai rồi đổi sang Thiệp chúc: thông báo rõ và nút quay lại sửa, không tự xóa dữ liệu; test desktop/mobile xác nhận có thể sửa và lưu thiệp không thời gian/địa điểm. Bề mặt vẫn có thớ dệt/giấy và ánh sáng; tên người nhận rõ; Thiệp chúc không có section rỗng của lịch/địa điểm. Các chapter giữ normal flow, reveal ở thành phần bên trong. Controls dùng native semantics, keyboard/focus và các trạng thái có phản hồi. Không thêm artwork/logo tổ chức tự vẽ, testimonial, số liệu giả hoặc framework thiết kế mới.

CI Linux phát hiện assertion đọc theme trước khi navigation hoàn tất và Back chạy khi detail còn lazy loading. Kiểm thử đã chờ nội dung đích; theme đồng thời gắn với location key để không áp màu của route cũ lên route mới. Ba màu và Back desktop/mobile PASS sau sửa; Chrome kiểm tra riêng lại focus, Thiệp chúc không lịch và theme về home. Dialog thành công dùng nhãn disabled “Đã có quyền Editor”, không còn hiển thị nhãn khôi phục ở trạng thái thành công.

CI frontend ở `e2670a0` còn thất bại tại test đăng nhập mobile: heading “Quản lý sự kiện” xuất hiện ở cả trang đăng nhập và dashboard, nên assertion cũ có thể chạy trước khi dashboard/menu sẵn sàng. Trace xác nhận test chưa mở menu khi tìm nút đăng xuất. Test nay giữ response Auth để kiểm tra nút đang đăng nhập bị vô hiệu hóa, rồi chờ đúng URL dashboard và link “Thêm sự kiện” trước khi mở menu mobile. Không tăng timeout hoặc bỏ kiểm tra đăng xuất. Hồi quy local 5 lượt mỗi desktop/mobile: **10/10 PASS**; typecheck và lint PASS. Logs `login-race-regression.log`, `login-fix-typecheck.log`, `login-fix-lint.log`. Native job của cùng run cũ đã PASS; không gọi toàn bộ run đó thành công. Kết quả CI sau bản sửa xem [Actions nhánh hsv-v3](https://github.com/imnwngr/bookclub/actions?query=branch%3Ahsv-v3).

Anti-slop: hard gate PASS trong phạm vi browser matrix/axe/keyboard đã ghi; purpose gate PASS theo lý do vật liệu, typography và bố cục trong DESIGN.md; liveliness PASS theo ENERGY 2/RHYTHM 2/MOTION 3 và reduced motion; craftsmanship PASS theo luồng tạo/sửa/thiệp/dialog đã chạy. Giới hạn: chưa test screen reader thủ công/iOS thật, không dùng kiểm tra UI để kết luận quyền production.

Kiểm tra bổ sung sau khi xác nhận chưa có dịch vụ email: dialog đọc capability chỉ dành cho Admin, giải thích trạng thái đang tắt ngay trước nhập email; lỗi chưa có side effect dùng “Thử lại”, lỗi một phần giữ “Kiểm tra và khôi phục”. Ảnh mobile ban đầu cho thấy nút bị đẩy dưới mép dialog; chỉnh khoảng cách riêng form, kiểm viewport toàn phần của hai nút ở 320/390/430px và axe PASS. Hai vùng thông báo có tên riêng. CI native lần đầu dừng do locator `getByRole('status')` khớp cả hai vùng; đã sửa locator theo tên kết quả, không bỏ assertion hoặc giảm điều kiện thành công. Bản build local nối dữ liệu public production cũng đã mở bằng Chrome ở 1889px: đúng title/nhận diện, 1 sự kiện công bố, ảnh tải đủ, không overflow và không session đăng nhập. Đây là local frontend với dữ liệu live, không phải deployment `/hsv/`.

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
- `email-state-{typecheck,lint,unit-bounded,e2e,dialog,build}.log`: kiểm tra sau thêm trạng thái gửi email; giữ `email-state-unit.log` để đối chiếu lần chạy timeout.
- `screenshots/account-email-disabled-{desktop,mobile}-{width}.png`, `account-availability-error-{desktop,mobile}.png`, `account-existing-with-email-disabled-{desktop,mobile}.png`: browser mock, không gửi email.
- `edge-production-smoke.json`: script `node scripts/check-hsv-edge-readonly.mjs`, 5 HTTP checks, chỉ request read-only/anonymous; không tạo user/grant/email. `pages-before-rollout.json`: `/bookclub/` HTTP 200, `/hsv/` HTTP 404.
- `native-ci-email-state/result.json`, `native-ci-email-state/native-*.png`: 12 nhóm native PASS ở commit `e2670a0`; `resumed-preflight.json`: project/config/version/digest/ACL audit không chứa credentials hoặc dữ liệu cá nhân.

## Quản lý tài khoản: nguyên nhân và giới hạn

Source cũ có nhánh action=invite trả 403 “Invitations are disabled pending safety verification”. UI cũ buộc chọn kỹ thuật invite/grant. Sau khi có MCP, **đã xác nhận Edge revision 1 live cũng có nhánh chặn này**. Bản mới thay bằng luồng `add` và ledger chứ không chỉ gỡ 403. `HSV_INVITATIONS_ENABLED=verified` chỉ mở sau native Auth/SMTP sandbox thành công và kiểm tra cấu hình live; fixture mode không gửi email và sandbox từ chối cloud URL.

Auth invite và database grant không có transaction chung. Timeout/response mất giữ trạng thái chưa xác định, không tự gửi lại; khi tìm thấy tài khoản thì chỉ khôi phục quyền. Nếu chưa thấy tài khoản, operator cần đối chiếu logs trước quyết định gửi mới.

Native sandbox đã kiểm chứng Admin nhập email trên giao diện → Edge → Auth tạo user và gửi SMTP → SQL cấp Editor → Mailpit nhận đúng một thư → mở `/hsv/auth/accept` → đặt mật khẩu → đăng nhập lại với quyền Editor. Cũng PASS: tài khoản có sẵn không cần mời; Editor/anonymous/CORS/EXECUTE/ledger bị từ chối; request đồng thời/retry chỉ một thư; injection lỗi SQL sau gửi thư được khôi phục không gửi lại; link đã dùng/hết hạn; dừng container Mailpit gây lỗi thật, khởi động lại không tự resend; target/Admin bị cấm. Dùng CLI chính thức Supabase 3.2.0, kiểm tra nguồn package github.com/supabase/cli; không thêm dependency ứng dụng. Luồng grant cũ không có request_id cũng được kiểm chứng, kể cả retry sau revoke.

Schema native là baseline tài khoản synthetic từ source lịch sử, migration ledger v3 nguyên file, Auth/PostgREST/Edge và SMTP thật. Đây không phải restore của production, không xác nhận event schema production hoặc SMTP/provider production. Không gửi thư ra ngoài. Delivery production chưa kiểm chứng; source Edge đang deploy có bằng chứng riêng qua MCP. Workflow native được gọi từ workflow verify; deploy cần cả verify và native PASS cùng gate production.

## Phát hành và phần còn thiếu

Repo hiện tại `imnwngr/bookclub`, branch triển khai `hsv-v3`; chưa merge main, rename, tạo tag v3.0.0 hoặc deploy frontend. URL đích `https://imnwngr.github.io/hsv/` chưa được phát hành. Workflow chặn deploy nếu repo/gate/backend chưa đúng. Chi tiết rollout/rollback: [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

Code cập nhật trong các commit `8c2c460` và `e2670a0`. Edge revision 5 đã deploy sau khi 12 nhóm native PASS, đọc lại source khớp và `verify_jwt=true`; bundle SHA-256 `34f4fd1efb42f854d5c0764de121e8fbbf9a74d77803044018941a892a332396`. HTTP smoke sau deploy PASS 5/5; ledger vẫn 0 rows. Mode/gửi thư đã đối chiếu ngay trước deploy là live/disabled. Không có migration mới, không thay RLS/Auth/flags trong lần bổ sung capability; không tạo tài khoản, cấp quyền hoặc gửi email production để QA.

Link `/bookclub/` vẫn phục vụ bản cũ trong lần read-only kiểm tra này. Redirect repo GitHub không chứng minh Pages redirect. Sau rename, muốn giữ link cũ cần hosting bridge riêng ở `/bookclub/`; chưa tạo và chưa kiểm chứng. Không tuyên bố tương thích cũ sau rename.

MCP và CLI đã kết nối, database/Edge đã cập nhật, Auth redirects đã chuẩn bị. Điều kiện bên ngoài còn thiếu: provider SMTP/sender được cấu hình tại [Supabase Auth SMTP](https://supabase.com/dashboard/project/trdofhdspbkwgernwybp/auth/smtp). Người dùng đã xác nhận chưa có dịch vụ; không hỏi lại câu này hoặc yêu cầu token qua chat. Bộ gửi mặc định Supabase chỉ phục vụ địa chỉ thuộc team, không đáp ứng mời email mới tùy ý. Hướng dẫn kiểm chứng provider và thứ tự mở gửi thư sau Pages nằm trong [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md). Sau khi đủ điều kiện, tiếp tục rename/Pages/tag và production smoke.

Không dùng external AI worker. Không thay bucket/env names/migrations lịch sử hoặc dữ liệu production. Các file untracked có trước được giữ nguyên và không đưa vào commits của phiên.
