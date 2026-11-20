# HSV CTUT 3.0.0 · Nghiệm thu

Ngày 20/11/2026, Asia/Bangkok. **Repository đã đổi thành `imnwngr/hsv`; database và Edge v3 đã triển khai ở đợt trước; frontend HSV v3 chưa phát hành.** SMTP Resend đã hoàn tất theo xác nhận của người dùng: tự cấu hình và nhận email thử thành công. Chưa kiểm chứng toàn bộ luồng mời Editor production. Không dùng email thử, test mock hoặc sandbox Mailpit để kết luận luồng production đã hoàn tất.

## Kiểm tra sau rename · phạm vi Git/tài liệu

| Hạng mục | Bằng chứng | Kết quả và giới hạn |
|---|---|---|
| Repository/origin | `gh repo view` trả `imnwngr/hsv`, quyền ADMIN; origin `https://github.com/imnwngr/hsv.git` | Rename đã xong, không thực hiện lại |
| Nhánh tại bàn giao | Sau fetch, `hsv-v3` local/remote cùng `87512c4`; 17 commit hơn `origin/main` | `main` vẫn là default tại `8ee2e3e`; các commit tài liệu mới được thêm sau mốc này |
| Version | package.json, package-lock.json và root package trong lock đều `3.0.0` | PASS, không thay dependency |
| Local checks | `repo-rename-{typecheck,lint,unit,build}.log` | Typecheck/lint/build PASS; 139 unit PASS trong 28 files |
| Playwright bàn giao | `repo-rename-e2e.log` kết thúc với 171 PASS, 35 skip (3.3 phút); `test-results/.last-run.json` có status passed, failedTests rỗng | `npm run test:e2e -- --workers=4` đã kết thúc; không khởi chạy trùng, API/Storage mock |
| CI source ứng dụng | [Run 44671804593](https://github.com/imnwngr/hsv/actions/runs/44671804593), commit `87512c4` | Verify và native accounts PASS, deploy skipped; CI của các commit tài liệu mới theo [nhánh hsv-v3](https://github.com/imnwngr/hsv/actions?query=branch%3Ahsv-v3) |
| SMTP Resend | Người dùng xác nhận đã tự cấu hình và nhận email thử | Hoàn tất theo xác nhận người dùng; agent không kiểm tra hộp thư/cấu hình, không xác nhận luồng Editor production |
| Pages sau rename | API Pages: workflow, URL `/hsv/`; HTTP 09:08 UTC ngày 20/11 | `/bookclub/` 404; `/hsv/` 200 với HTML BookClub cũ và hai script `/bookclub/assets/` đều 404; frontend HSV v3 chưa phát hành |

Đợt này chỉ sửa tài liệu, không thay source ứng dụng/tests/workflows hoặc backend. Kết quả local được tái sử dụng vì code không đổi; kết quả CI cho từng SHA xem Actions nhánh `hsv-v3` ở bảng trên. `HSV_V3_PRODUCTION_READY` chưa được đặt trong lần đọc lại qua GitHub API; không thay gate. Bằng chứng mới nằm trong `.local/hsv-v3/repo-rename-pages.json` và các log `repo-rename-*`, đều ignored. Giữ nguyên 10 file untracked có trước, không stage hoặc xóa.

## Bằng chứng backend trước rename và Resend (lịch sử)

Kết nối MCP đã hoạt động, project đúng `trdofhdspbkwgernwybp`, ACTIVE_HEALTHY, PostgreSQL 17.11, organization Free. Quyền đọc schema/history/RLS/Edge được thực thi; quyền migration được xác nhận bằng hai lần apply thành công, không suy từ quyền đọc hay GitHub ADMIN. Lịch sử thực tế và backup có phạm vi xem [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

| Hạng mục | Bằng chứng tại lần audit backend | Trạng thái |
|---|---|---|
| Schema/RPC/RLS/history | MCP đọc definitions và ACL; hai history mới `20261119220329`, `20261119220343` | PASS |
| Backup phần bị ảnh hưởng | Snapshot public ngoài repo có ACL, manifest SHA-256; khôi phục 9 bảng và 26 hàm trên PostgreSQL thật; hai migration nguyên file PASS | PASS trong phạm vi public; không phải full platform restore |
| Dữ liệu sau migration | Fingerprint 9 bảng cũ giữ nguyên; 24 hàm không liên quan giữ nguyên; cũ mặc định invitation; ledger trống và client không có quyền trực tiếp | PASS production SQL |
| Public HTTP | 1 published event, 1 draft ẩn, 14 primary aliases/snapshots đúng; event_type/theme trả đúng; bảng riêng và recovery từ chối anonymous | PASS production read-only |
| Edge live | Revision 5; source khớp commit `e2670a0`; JWT bật; CORS/anonymous/method smoke HTTP PASS | PASS deploy/đối chiếu source; không phải kiểm thử cấp quyền production |
| Auth/secrets | CLI 3.2.0 đã login; callback accept/callback dưới cả hai base path; Site URL còn `/bookclub/`; mode live, gửi thư disabled | PASS cấu hình đã đọc lại |
| SMTP/provider lúc audit | Khi đó custom SMTP/send-email hook chưa bật, chưa có dịch vụ | Thiếu provider tại mốc cũ; đã được thay bằng xác nhận Resend ở phần đầu |

Sửa thêm khả năng triển khai backend trước frontend: action grant của frontend cũ thiếu request_id nay được gán ID ổn định theo actor/email; không cho gửi thư và retry sau revoke không tự cấp lại. Luồng add v3 vẫn yêu cầu request_id từ client. Unit handler mới PASS; native sandbox bổ sung kiểm tra grant/retry/revoke của frontend cũ để CI xác minh trước deploy Edge.

Typecheck/lint/build PASS. Unit hiện **139 PASS**, browser đầy đủ **171 PASS, 35 skip**. Lần unit đầu chạy cùng các tiến trình khác có 3 timeout ở editor cũ; chạy lại `npm test -- --maxWorkers=4` PASS toàn bộ, không đổi timeout/test. Sau tinh chỉnh riêng dialog, 6 test desktop/mobile PASS lại, gồm nút thao tác nằm trọn viewport ở 320/390/430px. Logs `email-state-{typecheck,lint,unit-bounded,e2e,dialog,build}.log`. Bằng chứng sandbox không thay cho production.

Tại lần kiểm tra sau CLI login trước rename/Resend: project/schema/history/Edge đọc được bằng công cụ đã kết nối; không replay migration. SQL xác nhận ledger trống, RLS bật, client không có quyền trực tiếp hoặc EXECUTE begin. Khi đó GitHub có quyền ADMIN, main tại `8ee2e3e`, repo đích hsv trả 404 và chưa có tag `v3.0.0`/biến gate. Các thông tin repo và SMTP này là lịch sử; trạng thái sau rename và xác nhận Resend nằm ở phần đầu. Đợt Git/tài liệu không đọc lại hoặc thay backend.

Security advisors đã chạy trước/sau migration. Ledger có RLS và không policy là chủ đích deny-all cho client ([linter 0008](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)); quyền direct service cũng bị revoke, chỉ các RPC có guard được cấp EXECUTE. `editor_add_recovery` là SECURITY DEFINER có kiểm tra Admin và search_path cố định, đã kiểm ACL thực tế. Các cảnh báo hàm SECURITY DEFINER cũ và leaked-password protection có trước, không được âm thầm thay quyền hoặc cấu hình trong rollout này.

Bằng chứng backend không chứa dữ liệu cá nhân: `.local/hsv-v3/production-postflight.json`, `production-http-smoke.json`. Backup riêng và báo cáo restore nằm ngoài repo tại `C:\dev\temp\hsv-v3-production`. Agent không gửi email production trong đợt backend này; xác nhận email thử Resend của người dùng được ghi riêng ở phần đầu.

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
| Native account sandbox tại `87512c4` | 12 nhóm kiểm tra PASS, [Actions 44671804593](https://github.com/imnwngr/hsv/actions/runs/44671804593) | Auth, JWT, Edge, PostgREST, SQL, SMTP Mailpit và Chromium thật trên runner tách biệt |
| Production database | Hai migration đã áp dụng; SQL và HTTP postflight PASS | Schema/RPC/ACL thực tế; dữ liệu cũ giữ nguyên |
| Production Edge/Auth | Edge v3 deploy, JWT bật; redirects/secrets kiểm tra qua CLI; 5 HTTP smoke PASS | Không dùng session Admin thật để thử cấp quyền |
| SMTP Resend | Người dùng xác nhận tự cấu hình và nhận email thử thành công | Hoàn tất theo xác nhận người dùng |
| Luồng mời Editor production | Chưa kiểm chứng chuỗi invite/cấp quyền/accept/đăng nhập toàn bộ trên production | Còn việc cho đợt phát hành riêng; không suy từ SMTP test hoặc sandbox |

35 skip là các matrix chiều rộng/màu và checks riêng desktop không chạy lặp trong project mobile; không phải test thất bại được bỏ qua. Browser suite vẫn chạy các luồng desktop và mobile. SQL PGlite dựng baseline synthetic từ các file lịch sử, điều chỉnh fingerprint guard lịch sử chỉ trong helper; **hai migration v3 dùng nguyên file**, không sửa guard. Không coi schema synthetic là schema live. Test PostgreSQL hai PID khác nhau xác nhận cùng email chỉ một claim `invite`, một `processing`, một ledger row; không chạy Auth hoặc gửi email.

Coverage: bảo toàn event/snapshot/alias khi migration; transaction rollback và từ chối replay; tạo/sửa/tải lại cả hai loại; validation giờ Thiệp mời; Thiệp chúc null không lịch/venue; đổi loại/save/cancel/dirty; theme lỗi/cực sáng/cực tối/contrast/không rò; filtering/sorting; draft/RLS local; primary links/copy all/404/query/hash; callback lỗi hết hạn; Admin/Editor/anonymous, partial failure/retry/revoke; nhạc thực decode/play trong Chromium, blocked autoplay/gesture/manual control; opening, forward/reverse/native touch/reduced motion.

## Browser và Anti-slop

Ảnh/log ở `.local/hsv-v3/` (ignored). Matrix 320/390/430/768/1024/1440/1920px cho home, cover/nội dung Thiệp chúc và editor. Ba màu #174b78/#173f36/#873c42 cho cover/nội dung Thiệp mời. Dialog tài khoản default/loading/error/pending success ở desktop/mobile. Axe WCAG2A/AA PASS trong matrix editor, ba theme và dialog. Đây không phải chứng nhận screen reader hay thiết bị iOS thật.

Quan sát ảnh phát hiện và sửa chữ “Chúc” tràn cột mobile và nhãn CTUT quá nhỏ ở footer; kiểm tra glyph bounds bổ sung. Sửa thêm lỗi validation bị ẩn khi nhập địa điểm sai rồi đổi sang Thiệp chúc: thông báo rõ và nút quay lại sửa, không tự xóa dữ liệu; test desktop/mobile xác nhận có thể sửa và lưu thiệp không thời gian/địa điểm. Bề mặt vẫn có thớ dệt/giấy và ánh sáng; tên người nhận rõ; Thiệp chúc không có section rỗng của lịch/địa điểm. Các chapter giữ normal flow, reveal ở thành phần bên trong. Controls dùng native semantics, keyboard/focus và các trạng thái có phản hồi. Không thêm artwork/logo tổ chức tự vẽ, testimonial, số liệu giả hoặc framework thiết kế mới.

CI Linux phát hiện assertion đọc theme trước khi navigation hoàn tất và Back chạy khi detail còn lazy loading. Kiểm thử đã chờ nội dung đích; theme đồng thời gắn với location key để không áp màu của route cũ lên route mới. Ba màu và Back desktop/mobile PASS sau sửa; Chrome kiểm tra riêng lại focus, Thiệp chúc không lịch và theme về home. Dialog thành công dùng nhãn disabled “Đã có quyền Editor”, không còn hiển thị nhãn khôi phục ở trạng thái thành công.

CI frontend ở `e2670a0` còn thất bại tại test đăng nhập mobile: heading “Quản lý sự kiện” xuất hiện ở cả trang đăng nhập và dashboard, nên assertion cũ có thể chạy trước khi dashboard/menu sẵn sàng. Trace xác nhận test chưa mở menu khi tìm nút đăng xuất. Test nay giữ response Auth để kiểm tra nút đang đăng nhập bị vô hiệu hóa, rồi chờ đúng URL dashboard và link “Thêm sự kiện” trước khi mở menu mobile. Không tăng timeout hoặc bỏ kiểm tra đăng xuất. Hồi quy local 5 lượt mỗi desktop/mobile: **10/10 PASS**; typecheck và lint PASS. Logs `login-race-regression.log`, `login-fix-typecheck.log`, `login-fix-lint.log`. Native job của cùng run cũ đã PASS; không gọi toàn bộ run đó thành công. Kết quả CI sau bản sửa xem [Actions nhánh hsv-v3](https://github.com/imnwngr/hsv/actions?query=branch%3Ahsv-v3).

Run `44670726023` xác nhận đăng nhập đã PASS, nhưng phát hiện một race khác tại test sắp xếp khách mời mobile (170 PASS, 1 fail, 35 skip; native 12 nhóm PASS). Trace cho thấy thao tác bàn phím tiếp theo bắt đầu khi hiệu ứng thả của thao tác chạm trước còn chạy; row vẫn có opacity do drop animation 250ms. Test nay chờ nút được bật lại và overlay kết thúc trước khi thử lỗi 409. Giữ các assertion về bàn phím/chạm, rollback thứ tự, bản nháp chưa lưu và reload; không sleep cố định hoặc tăng timeout. Hồi quy 8 lượt mỗi desktop/mobile: **16/16 PASS**; typecheck/lint PASS. Lỗi CI không tái hiện trong 8 lượt mobile trước sửa tại máy local; bằng chứng gốc vẫn giữ ở `ci-72a2039-browser/trace/`. Logs `reorder-race-{before,after}.log` và `reorder-fix-{typecheck,lint}.log`.

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
- `native-ci-final/result.json`, `native-ci-final/native-*.png`, `native-ci-final.log`: native Auth/SMTP sandbox, khác với browser mocks. [Lần chạy native thành công](https://github.com/imnwngr/hsv/actions/runs/44589080550).
- `email-state-{typecheck,lint,unit-bounded,e2e,dialog,build}.log`: kiểm tra sau thêm trạng thái gửi email; giữ `email-state-unit.log` để đối chiếu lần chạy timeout.
- `screenshots/account-email-disabled-{desktop,mobile}-{width}.png`, `account-availability-error-{desktop,mobile}.png`, `account-existing-with-email-disabled-{desktop,mobile}.png`: browser mock, không gửi email.
- `edge-production-smoke.json`: script `node scripts/check-hsv-edge-readonly.mjs`, 5 HTTP checks, chỉ request read-only/anonymous; không tạo user/grant/email. `pages-before-rollout.json`: `/bookclub/` HTTP 200, `/hsv/` HTTP 404.
- `native-ci-email-state/result.json`, `native-ci-email-state/native-*.png`: 12 nhóm native PASS ở commit `e2670a0`; `resumed-preflight.json`: project/config/version/digest/ACL audit không chứa credentials hoặc dữ liệu cá nhân.
- `ci-87512c4-result.json`, `ci-87512c4.log`, `native-ci-87512c4/`: CI toàn bộ PASS ở `87512c4`; source ứng dụng giữ nguyên trong đợt tài liệu sau rename. `pages-before-rollout.json` ở trên là HTTP trước rename, không dùng thay kết quả mới `repo-rename-pages.json`.

## Quản lý tài khoản: nguyên nhân và giới hạn

Source cũ có nhánh action=invite trả 403 “Invitations are disabled pending safety verification”. UI cũ buộc chọn kỹ thuật invite/grant. Sau khi có MCP, **đã xác nhận Edge revision 1 live cũng có nhánh chặn này**. Bản mới thay bằng luồng `add` và ledger chứ không chỉ gỡ 403. `HSV_INVITATIONS_ENABLED=verified` chỉ mở sau native Auth/SMTP sandbox thành công và kiểm tra cấu hình live; fixture mode không gửi email và sandbox từ chối cloud URL.

Auth invite và database grant không có transaction chung. Timeout/response mất giữ trạng thái chưa xác định, không tự gửi lại; khi tìm thấy tài khoản thì chỉ khôi phục quyền. Nếu chưa thấy tài khoản, operator cần đối chiếu logs trước quyết định gửi mới.

Native sandbox đã kiểm chứng Admin nhập email trên giao diện → Edge → Auth tạo user và gửi SMTP → SQL cấp Editor → Mailpit nhận đúng một thư → mở `/hsv/auth/accept` → đặt mật khẩu → đăng nhập lại với quyền Editor. Cũng PASS: tài khoản có sẵn không cần mời; Editor/anonymous/CORS/EXECUTE/ledger bị từ chối; request đồng thời/retry chỉ một thư; injection lỗi SQL sau gửi thư được khôi phục không gửi lại; link đã dùng/hết hạn; dừng container Mailpit gây lỗi thật, khởi động lại không tự resend; target/Admin bị cấm. Dùng CLI chính thức Supabase 3.2.0, kiểm tra nguồn package github.com/supabase/cli; không thêm dependency ứng dụng. Luồng grant cũ không có request_id cũng được kiểm chứng, kể cả retry sau revoke.

Schema native là baseline tài khoản synthetic từ source lịch sử, migration ledger v3 nguyên file, Auth/PostgREST/Edge và SMTP thật. Đây không phải restore của production, không xác nhận event schema production hoặc cấu hình SMTP/provider production. Sandbox không gửi thư ra ngoài. Người dùng đã xác nhận email thử Resend; luồng mời Editor production vẫn chưa được agent kiểm chứng toàn bộ. Source Edge đang deploy có bằng chứng riêng qua MCP. Workflow native được gọi từ workflow verify; deploy cần cả verify và native PASS cùng gate production.

## Phát hành và phần còn thiếu

Repo hiện tại [imnwngr/hsv](https://github.com/imnwngr/hsv), branch `hsv-v3`, origin đã cập nhật. Rename hoàn tất; source v3 chưa merge main, chưa có tag `v3.0.0` và chưa deploy frontend HSV v3. URL Pages `/hsv/` đã tồn tại nhưng còn HTML bản cũ như bằng chứng HTTP ở phần đầu. Đợt này chỉ cập nhật tài liệu, commit/push và theo dõi CI; không đổi nhánh mặc định, tạo tag/release, deploy hoặc bật gate. Chi tiết rollout/rollback: [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md).

Code cập nhật trong các commit `8c2c460` và `e2670a0`. Edge revision 5 đã deploy sau khi 12 nhóm native PASS, đọc lại source khớp và `verify_jwt=true`; bundle SHA-256 `34f4fd1efb42f854d5c0764de121e8fbbf9a74d77803044018941a892a332396`. HTTP smoke sau deploy PASS 5/5; ledger vẫn 0 rows. Mode/gửi thư đã đối chiếu ngay trước deploy là live/disabled. Không có migration mới, không thay RLS/Auth/flags trong lần bổ sung capability; không tạo tài khoản, cấp quyền hoặc gửi email production để QA.

Sau rename, `/bookclub/` trả 404 trong lần kiểm tra HTTP mới; không có redirect Pages tương thích được kiểm chứng. `/hsv/` trả HTML cũ tham chiếu script ở base path cũ cũng bị 404. Muốn giữ link cũ cần hosting bridge riêng; chưa tạo hoặc kiểm chứng. Việc sửa/phát hành Pages là công việc còn lại ngoài phạm vi Git/tài liệu này.

SMTP Resend đã hoàn tất theo xác nhận người dùng; không yêu cầu cấu hình lại hoặc gửi token qua chat. Công việc còn lại thuộc đợt phát hành riêng: hoàn thiện frontend/Pages, kiểm tra callback và luồng mời Editor production, rồi quyết định mở gửi lời mời/tag theo release gates. Các cấu hình backend/cờ gửi thư không được đọc lại hoặc thay trong đợt Git/tài liệu này; xem [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md) để biết bằng chứng cũ và thứ tự kiểm chứng.

Không dùng external AI worker. Không thay bucket/env names/migrations lịch sử hoặc dữ liệu production. Các file untracked có trước được giữ nguyên và không đưa vào commits của phiên.
