## FIX RELEASE BLOCKERS — staged review

- BLOCKER 1 FIXED: README mô tả production đã clean rebuild/refinement; phân biệt SQL lịch sử, rebuild đã chạy, refinement đã chạy và audit; không hướng dẫn chạy chuỗi migration cũ trên production. Tài liệu lịch sử gắn nhãn; REBUILD là destructive đã thực thi, không dùng setup thông thường. Setup project mới phải review baseline/refinement phù hợp riêng và cấp admin qua UUID runtime.
- BLOCKER 2 FIXED: UID admin production được ẩn trong reports, SQL dùng current_setting('bookclub.reviewed_admin_uid', true)::uuid và test dùng fixture UUID. Không đổi Auth/permissions production. Không có email thật phát hiện trong index; domain email duy nhất trong test là test.invalid.
- Kiểm thử mới liên quan: tests/rebuild-transaction.test.ts, tests/rebuild-database.test.ts, tests/refinement-database.test.ts **19/19 PASS** PostgreSQL local/PGlite. Không chạy lại 19 API live, 11 nhóm UI live hoặc Playwright. Bằng chứng trước đó: 68/68 full Vitest, UI live 11 nhóm, API refinement 19/19, TypeScript/ESLint/build PASS.
- Staged allowlist: 76 file source/config/docs/SQL lịch sử/tests/logos. scripts/live-ui-session.mjs và scripts/live-ui-acceptance.mjs không staged, không phải dependency của npm/scripts chính thức. .env.local, artifacts, reports, screenshots ignored. Scan index từng file trước cập nhật biên bản: 0 UID production, 0 private key/GitHub token/Supabase secret/JWT thật; JWT fixture có chữ ký .test. Scan chỉ theo pattern, không đảm bảo tuyệt đối.
- Frontend v1.1 đã nghiệm thu Supabase thật trước lượt sửa; chỉ tài liệu/SQL review và fixture test thay đổi trong lượt này, không đổi frontend hay live database. Base /bookclub/, Pages workflow và variables đã kiểm tra; production frontend v1.0 còn có nguy cơ không tương thích đến khi phát hành.
- Trạng thái: **GO cho phê duyệt phát hành riêng**, không phải đã phát hành. Sau phê duyệt: staged diff/remote SHA lần cuối → commit một lần → push main bình thường → theo dõi Actions đúng SHA → production smoke. Nếu lỗi, dùng artifact frontend đã xác minh tương thích schema hiện tại hoặc trang bảo trì; không mặc định rollback v1.0. Không chạy lại SQL đã COMMIT.

## UI LIVE ACCEPTED — READY FOR RELEASE REVIEW (2026-11-05)

Frontend http://127.0.0.1:5173/bookclub/ kết nối project trdofhdspbkwgernwybp thật, không route interception/API mocks. Người dùng đăng nhập Admin trực tiếp trong Chrome cô lập; agent không đọc/lưu email, password, access token, refresh token hoặc storageState. Không bật trace đăng nhập. Log 19/19 refinement API PASS trước đó đã đọc, không chạy lại bộ backend.

Nghiệm thu độc lập qua Playwright điều khiển Chrome có phiên Admin thật: **11 nhóm LIVE PASS** trong log Live UI acceptance cuối file. Fixtures QA riêng, không mở sửa Draft hiện có. Lượt cuối qa-ui-13a6e1e6-3979-4cbf-b7b1-44ce0d9a1181 (đối chiếu mã thực tế ở log, không dùng mã này cho thao tác xóa thủ công). Tạo Draft qua form, chọn một khách từ directory, upload PNG fixture riêng, chọn ngày 20→21/10/2099 và giờ 18→20 (UTC+7), agenda 18:00→18:30/icon welcome/highlight. Lưu/reload thực, xác minh ngày nhiều ngày, range/icon/highlight/ảnh được bảo toàn.

| Yêu cầu compact | Kết quả |
|---|---|
| 1. Danh sách thiệp chỉ tên | LIVE PASS — không GuestDescription, preview/copy thật |
| 2. Checkbox khách chỉ tên | LIVE PASS — chọn khách thật, không chức vụ |
| 3. Một range control / nhiều ngày | LIVE PASS — đóng không có date inputs, popup nhập/lưu/reload |
| 4. Bỏ hướng dẫn HH:mm cũ | PASS source/local; form live dùng đúng component mới |
| 5. Switch và xóa cùng đầu mốc | LIVE PASS — thao tác switch ở agenda-card-head |
| 6. Ba hàng/icon picker đóng | LIVE PASS — mở/chọn icon, đóng, lưu/reload |
| 7. Preview/copy/copy all | LIVE PASS — click popup URL canonical và clipboard thật so sánh |
| 8. Typography và chức vụ thiệp | LIVE PASS — tên lớn hơn tagline, chức vụ trước/sau, calendar/logos/decoded image/highlight timeline |
| 9. Phân cấp tham khảo, giữ K2D/BookClub | PASS thiết kế/source + LIVE PASS render desktop/320px, không tràn ngang |

Anonymous context riêng xác minh Draft không công khai; sau Publish bằng switch/lưu, thiệp hiển thị từ Supabase thật. Cuộn tới timeline và ngược lên greeting ở 1280px/320px PASS. Đã chụp và xem ảnh mobile 320px có ảnh venue thật của fixture; snapshots trong test-results/live-ui (ignored). Ảnh desktop cũng đã chụp. Đây là local UI + production database LIVE, **không phải frontend GitHub Pages production v1.1**.

Cleanup qua UI đúng article chứa title QA và DELETE theo UUID fixture, không xóa khách. Hậu kiểm authenticated read-only: qaUiEventsRemaining=0; unusedImages=0; cả hai queries không lỗi. Không có thao tác cập nhật vào event Draft người dùng. Các checks ledger/source thao tác chỉ fixture QA, không có snapshot trước/sau toàn database để tuyên bố audit mọi dữ liệu hệ thống.

**Release readiness: CONDITIONAL GO — chờ release review và phê duyệt commit/push/deploy riêng.** Database/refinement API PASS và UI live acceptance PASS. Production frontend vẫn v1.0, chưa deploy v1.1/production smoke; có rủi ro payload v1.0 không tương thích schema mới đã ghi nhận. Maps JS picker chưa có key (luồng URL/Place ID vẫn dùng được), bundle lớn/Pages initial HTTP404 là giới hạn đã chấp nhận. Không sửa source UI vì chưa phát hiện lỗi trong acceptance; chỉ thêm helper/runner live và tài liệu. Không rebuild/migrate/commit/push/deploy.

Các mục MANUAL PENDING/BLOCKED UI trong lịch sử bên dưới đã được buổi live này thay thế; các MOCK PASS cũ vẫn được giữ với phạm vi riêng.

## REFINEMENT MIGRATION — POSTFLIGHT VERIFIED (user-executed)

Người dùng xác nhận migration 202611050001_ui_refinement.sql đã được phê duyệt và thực thi. Postflight: hai mốc cũ giữ UUID/time/description/highlight/order, end_time=NULL/icon=book; constraints hiện diện/invalid_ranges=0; mô tả directory và Draft snapshot đúng; RLS 7/7; anon_save=false/authenticated_save=true; authenticated alias INSERT/UPDATE/DELETE=false; primary-only trigger có, secondary/noncanonical counts=0. Đây là bằng chứng hậu kiểm SQL do người dùng cung cấp, thay thế trạng thái chờ apply ở lịch sử bên dưới.

Agent kiểm tra API read-only trên project: SELECT time,end_time,icon,highlight LIMIT 0 HTTP 200; anonymous is_admin HTTP 200/false. Không tạo fixture. Không dùng probe này để tuyên bố đầy đủ live Auth/CRUD/agenda/primary-only đạt sau migration.

Đã tạo scripts/refinement-live.mjs và cờ auth-live.ps1 -RefinementOnly. Runner dùng signInWithPassword thật, credentials từ stdin do SecureString prompt truyền vào, không ghi email/password/tokens; snapshot legacy chỉ đọc và so sánh; fixture event UUID riêng, 2 range/icon/highlight items; reload, Draft/Published/public canonical snapshot, nonadmin save, direct numeric-suffix aliases, invitation_edits bị chặn, cleanup theo internal fixture UUID. Node syntax và ESLint PASS; **Auth live runner mới NOT RUN** vì chưa có người nhập credentials local. UI local save/reload với phiên Auth mới vẫn BLOCKED chờ API runner đạt. Không chạy lại migration/rebuild hoặc 41 tests cũ.

Chạy tại máy: powershell -NoProfile -File .\scripts\auth-live.ps1 -RefinementOnly (trong thư mục dự án). Sau API PASS nghiệm thu local RangePicker multi-day, agenda popup/icon grid, save/reload và Published invitation/anonymous; chỉ dọn fixture QA. Không commit/push/deploy trong lượt này. Chưa chốt REFINEMENT LIVE VERIFIED/UI ACCEPTANCE.

## COMPACT UI REFINEMENT — READY FOR ACCEPTANCE

| # | Yêu cầu | Trạng thái / bằng chứng local |
|---|---|---|
| 1 | Thiệp mời admin bỏ chức vụ | DONE — InvitationManager, browser compact |
| 2 | Chọn khách chỉ danh xưng/tên | DONE — GuestSelection, browser compact |
| 3 | Một range control cho agenda và sự kiện nhiều ngày | DONE — RangePicker dùng DateTime24/Time24 trong popover; UTC+7, browser save/reload hai ngày |
| 4 | Bỏ dòng hướng dẫn HH:mm | DONE — EventForm, lỗi chỉ hiện khi invalid |
| 5 | Switch và xóa ở đầu mốc | DONE — AgendaEditor, browser compact |
| 6 | Ba hàng, icon picker đóng mặc định | DONE — AgendaEditor/CSS, browser 320px |
| 7 | Hàng thiệp tên + preview/copy, giữ copy all | DONE — InvitationManager, browser regression |
| 8 | Tên nổi bật hơn tagline, K2D và chức vụ thiệp | DONE — InvitationPage/CSS, browser 320px |
| 9 | Đối chiếu nguyên tắc HTML tham khảo | DONE — dùng quan sát reference đã ghi trong báo cáo refinement trước: recipient heading, role lines, lịch, timeline; không sao chép nguồn hoặc font |

Kiểm thử mới: TypeScript PASS; ESLint PASS; Vitest 10/10 PASS; build PASS; Playwright full 44/44 PASS + compact 4/4 PASS, desktop/mobile **API mocks**. Compact test dùng 320px, xác minh title/tagline, role trước/sau, popup giờ/icon, lưu/reload mock và UTC hai ngày. Chưa kiểm thử UI live cho code mới.

SQL: không có SQL mới trong đợt compact. Migration refinement trước đó 202611050001_ui_refinement.sql vẫn chờ review/phê duyệt và chưa được áp dụng production. Không rebuild database, commit, push, deploy hay thay Auth/RLS. Source và các thay đổi chưa commit trước đó được giữ.

## BOOKCLUB v1.1.0 — UI REFINEMENT READY FOR ACCEPTANCE

Hoàn tất **8/8 yêu cầu ở local**, chưa áp dụng SQL/commit/push/deploy. Database baseline trước refinement đã LIVE VERIFIED (18/18 flags, 41+9 API checks) vẫn được giữ nguyên; kết quả đó không thay thế kiểm thử live migration refinement.

| # | Yêu cầu | Triển khai và bằng chứng local |
|---|---|---|
| 1 | Xóa hướng dẫn đổi mã sai | Không còn câu hướng dẫn trong EventForm; sửa code vẫn hoạt động, không thêm redirect. Playwright kiểm tra không có dòng này. |
| 2 | Phương thức địa điểm | Hai selectable cards với icon link/pin, title/hint, radio keyboard/selected state; giữ dữ liệu khi đổi. Fix width radio và scroll safe-area mobile bằng trace thực, không force click. |
| 3 | Tách mô tả | GuestDescription + descriptionLines dùng ở cover/thiệp/danh bạ/selection/manager; split dấu phẩy/newline, trim/bỏ dòng trống, text React an toàn. SQL mô tả Nguyễn Hoàng Viện chuẩn bị riêng, chưa đổi production/snapshot. |
| 4 | Chức vụ trước/sau mở | Cover có salutation/name/all role lines và nút mở; phần kính mời giữ lại snapshot. Unit/browser + xem ảnh 320px không chồng/cắt. |
| 5 | Khoảng giờ | Giờ mốc đánh số, start/end HH:mm, sort/delete renumber/highlight; validation end>start; legacy time giữ nguyên, không tự đoán end. SQL/PGlite save và public RPC roundtrip. |
| 6 | Chỉ alias chính | Bỏ add/edit/remove/list alias phụ và invitation_edits frontend; copy/link chính đúng một URL. SQL review chặn direct writes + RPC phụ, giữ rows cũ, resolver chỉ primary; chưa áp dụng live. |
| 7 | Thiệp nhiều section | Kính mời → lịch/thời gian/địa điểm → thông tin/ảnh/hướng dẫn → agenda; root scroll-snap proximity, không khóa wheel/touch, reduced motion tắt snap/smooth; thiếu ảnh/hướng dẫn hoặc agenda tự bỏ section tương ứng. Browser long-content scroll hai chiều và empty layout PASS. |
| 8 | Icon chương trình | Grid 9 icon nét SVG nhất quán, có preview/aria-pressed, fallback book; enum whitelist trong SQL, save/reload/RPC roundtrip local. Không cài dependency mới hoặc tuyên bố giống hoàn toàn bộ icon mẫu. |

**Kết quả kiểm thử:** TypeScript/ESLint/production build PASS; **22/22 Vitest PASS** (5 files: refinement unit/API/SQL và image/domain regressions); **42/42 Playwright PASS** full desktop/mobile, cộng **2/2 targeted long-content/empty-section PASS** sau đó. Browser dùng API mocks; SQL dùng PostgreSQL WASM/PGlite với Auth/Storage shim. Không báo thành live PASS. Đã xem ảnh cover/open mobile 320px và desktop, không overflow; dữ liệu ảnh fixture mock, không tạo event production. Cảnh báo bundle 708.81 kB được giữ ngoài phạm vi tối ưu.

Tham khảo URL bookclub.io.vn/102026/nhvien qua Chrome: title/cover đọc được và có Lucide class; chưa xác minh chính xác icon timeline động bên trong. Dùng bộ SVG nét tương đương tự dựng, không sao chép source/layout. Giữ K2D, giấy sáng/xanh BookClub và bốn logo hiện có. Anti-slop UI/human/mobile dùng để rà soát; Hallmark không có trong skill catalog hiện tại.

**Cần review trước live:** UI-REFINEMENT-SQL-REVIEW.md; migration 202611050001_ui_refinement.sql, refinement-preflight.sql/refinement-postflight.sql; SQL mô tả riêng nguyen-hoang-vien-description-review.sql. New range/icon và khóa alias API cần migration này, không áp dụng production trong đợt triển khai. Frontend có guard columns để không âm thầm bỏ range/icon khi schema chưa hỗ trợ. Nội dung mô tả mới chỉ hiển thị sau update dữ liệu được phê duyệt; snapshot lịch sử không tự sửa.

Bước nghiệm thu: chạy local /bookclub/; cover role lines → mở và cuộn/keyboard qua section; editor cards/giờ/icon/primary copy; thử 320px và desktop/reduced motion. Nghiệm thu persistence live/primary-only backend sau khi SQL được phê duyệt, rồi review release riêng. Production UI vẫn chưa được deploy/nâng cấp; không tuyên bố production UI PASS.

Các báo cáo dưới là lịch sử của baseline/đợt trước, không thay đổi kết luận refinement ở trên.

## DATABASE REBUILT — LIVE VERIFIED (2026-11-05)

Bằng chứng đã đối chiếu: người dùng xác nhận 06-postflight-flags.sql sau hotfix **18/18 actual=expected** (anon_save_execute=false, authenticated_save_execute=true, private bucket, RLS 7 bảng, admin/2 Auth accounts và 10 canonical guests). Đây là kết quả SQL do người dùng thực thi, không phải agent trực tiếp chạy SQL.

Log live trong VERIFICATION.md: **41/41 API PASS** (2026-11-04T16:56:36.300Z), **9/9 targeted RPC hotfix PASS** (2026-11-04T23:19:08.246Z), cleanup PASS cả hai. Đã đọc log, không chạy lại. Kết hợp hậu kiểm và phiên Auth thật đủ chốt database LIVE VERIFIED; không còn blocker database đã ghi ở các mục lịch sử bên dưới.

Local v1.1 tại http://127.0.0.1:5173/bookclub/: server Vite đã tồn tại (khởi chạy mới gặp port in use, không dừng server có sẵn); HTTP homepage/admin/new/guests đều 200 và app entry đúng. Module Supabase phục vụ đúng project trdofhdspbkwgernwybp, module API có get_event_v110. Chrome headless smoke không mocks: homepage events API HTTP 200, main/h1 visible, 0 pageerror; admin anonymous hiện login/password, 0 pageerror. Đây là smoke thực trên local/live API, không phải UI acceptance đầy đủ. Không tạo fixture mới.

Production GET homepage/asset HTTP 200, đang phục vụ /bookclub/assets/index-BPHgW6Bg.js; bundle còn default_aliases, không có get_event_v110. Đối chiếu source release v1.0: saveGuest dùng default_aliases.length/payload cột đã bỏ; form v1.0 thiếu location_method và có thể gửi maps_url rỗng, không đáp ứng constraint schema mới. Đó là nguy cơ tương thích được xác định từ artifact/source, không phải kết quả thao tác admin production; không thử ghi dữ liệu qua UI cũ và không tuyên bố production UI PASS. Homepage đọc events có thể vẫn hoạt động nhưng không chứng minh đủ tính năng v1.1.

**Release readiness sơ bộ: CONDITIONAL GO để UI ACCEPTANCE / RELEASE REVIEW; chưa sẵn sàng tuyên bố release.** Database PASS; local public/login smoke PASS; 16 mục UI v1.1 live + regression/cleanup cần người dùng nghiệm thu theo UI-ACCEPTANCE-v1.1.md đã chỉnh sang clean rebuild (không giữ URL cũ). UI production v1.1 NOT DEPLOYED. Maps JS key chưa có không chặn URL/Place ID; bundle lớn và Pages HTTP404 fallback là giới hạn đã chấp nhận. Cần nghiệm thu UI rồi phê duyệt commit/push/deploy riêng, sau đó smoke production đúng commit. Không migration/rebuild/commit/push/deploy trong lượt này.

Các mục BLOCKED/17-of-18/chưa có Auth live phía dưới là lịch sử và được kết luận này thay thế.

## POST-REBUILD — USER-REPORTED SQL + 9/9 anonymous live API PASS

Người dùng xác nhận đã chạy REBUILD.sql và 05-postflight.sql trên project trdofhdspbkwgernwybp. Nội dung hậu kiểm được gửi có 7 bảng, 10 guest IDs cố định với tên/danh xưng/mô tả/alias canonical đúng seed; admin UID [UID quản trị đã ẩn], auth_user_count=2, event_count=0. Bucket bookclub-venues có giới hạn 5242880 và MIME JPG/PNG/WebP. Danh sách policies và constraints khớp thiết kế (FK snapshot/alias, deferred primary alias, event image registry, agenda HH:mm/order, unique event code/guest primary alias).

Bản dán không phải JSON hợp lệ: các khóa boolean/null bị mất giá trị và có escaping Markdown. Không tự khôi phục/suy diễn rls/public/active/rpc_privileges/legacy_rpc_absent/old_code_table_absent/system_helper_preserved. Cần chạy 06-postflight-flags.sql chỉ đọc để lấy 18 dòng actual/expected dạng text. Script mới đã được kiểm thử trong rebuild transaction suite 2/2 local PASS; không phải live flags PASS.

Agent đã thực thi kiểm tra API live bằng publishable key, không Auth session: **9/9 PASS, 0 FAIL**, bằng chứng chi tiết ở mục Post-rebuild anonymous API phía cuối báo cáo. get_event_v110/resolve_invitation HTTP 200 null với code/alias không tồn tại; is_admin=false; save_event bị từ chối HTTP 401/42501; private directory/recipient/image registry bị từ chối 42501; events/agenda endpoints HTTP 200. Không tạo fixture, không thay schema và không đụng dữ liệu khác. Không dùng kết quả này để suy ra mọi RLS policy hoặc Draft/Published/Storage lifecycle đều đạt.

**BLOCKED AUTH LIVE**: chưa có phiên admin/nonadmin thật trong runner mới, chưa kiểm CRUD/agenda/image HTTP/thiệp Published/persistence/cleanup end-to-end. Chạy auth-live.ps1 -RebuildV110 trên máy, nhập credentials bằng SecureString, không gửi credentials/token vào chat. UI kết nối database mới NOT RUN. Không chạy lại REBUILD.sql. Không commit/push/deploy. Chưa đủ DATABASE REBUILT — VERIFIED.

## CLEAN REBUILD — inventory đã đối chiếu, gói SQL local đã kiểm thử

Inventory SQL Editor do người dùng cung cấp: đúng 5 bảng foundation, 5 hàm BookClub + rls_auto_enable hệ thống; Storage không bucket/object/policy; 2 Auth users, admin UID [UID quản trị đã ẩn]. Xem supabase/rebuild-v110/INVENTORY-REVIEW.md. Giữ Auth, system RLS helper và tất cả event triggers hệ thống.

Gói REBUILD.sql reset/schema/seed/admin restore trong một transaction, DROP RESTRICT, guard inventory drift, không CASCADE/schema reset/Storage metadata deletion. Đã kiểm thử trên PostgreSQL local **10/10 SQL PASS**, gồm rollback external view và chặn chạy lại. Nhóm schema+component/image **20/20 PASS** (có trùng 8 SQL tests, không cộng số); **38/38 Playwright PASS với API mocks** desktop/mobile. TypeScript/build, ESLint và Node syntax PASS. Bundle 704.67 kB là giới hạn đã chấp nhận.

Runner scripts/rebuild-live.mjs và cờ auth-live.ps1 -RebuildV110 đã chuẩn bị cho Auth/Storage HTTP thật, chưa chạy. Supabase live rebuild/postflight/Auth/Storage/UI vẫn NOT RUN. Script thủ công và lệnh trong supabase/rebuild-v110/README.md. Agent không có phiên SQL truy cập được; inventory là user-provided, không tự nhận đã thực thi. Chưa reset database thật, chưa commit/push/deploy.

Mục CLEAN DATABASE REBUILD trước đó và các báo cáo migration bên dưới là lịch sử; trạng thái hiện tại đã có inventory và gói rebuild, đang chờ thực thi live theo quy trình đã chuẩn bị.

## CLEAN DATABASE REBUILD — đang thực hiện (thay thế kế hoạch giữ dữ liệu v1.0)

Người dùng cho phép xóa riêng dữ liệu BookClub để xây schema v1.1 mới; giữ Auth và tài khoản, khôi phục admin UID hợp lệ. Chưa chạy xóa/reset live. Xem supabase/rebuild-v110/README.md và SQL inventory/schema/seed trong cùng thư mục. Không dùng chuỗi upgrade cũ để rebuild.

Bằng chứng mới: schema độc lập tạo được trên PostgreSQL local, seed 10 guests canonical; tests/rebuild-database.test.ts **5/5 PASS**, TypeScript PASS sau chỉnh frontend, ESLint PASS. Đã bỏ default_aliases payload và phương thức địa điểm legacy trong source. Không có event-code history trong schema mới; URL cũ sau đổi code không còn được hỗ trợ theo quyết định mới.

Chưa có inventory live để chốt allowlist reset và admin mapping. Browser host unavailable; Computer Use thấy Chrome SQL Editor nhưng get_window hết thời gian chờ quyền ứng dụng. Không có CLI SQL/connector được cấu hình. Đã cung cấp 00-inventory.sql chỉ đọc. Auth/RLS/Storage HTTP/UI với schema mới chưa chạy; chưa đủ DATABASE REBUILT / LIVE VERIFIED. Không commit/push/deploy.

Các kết quả migration giữ dữ liệu ở bên dưới là lịch sử và không chứng minh schema rebuild mới.

# v1.1.0 — READY FOR MIGRATION REVIEW / UI ACCEPTANCE

Local implementation, chưa phát hành. Baseline Git b70aa7f; production v1.0.0/source 4c679c9 giữ nguyên. Không commit/push/deploy hoặc áp dụng migrations production. Các trạng thái dưới đây chứng minh code + kiểm thử local, không phải DONE trên Supabase live.

Kết quả chốt: TypeScript, ESLint, build PASS; **41/41 Vitest PASS**; **38/38 Playwright PASS** (API mocks, desktop/mobile), sau sửa cuối chạy lại các nhóm directory/editor/logo liên quan đều PASS. Git diff check PASS, 16 file tracked sửa + 24 file mới. Xem VERIFICATION.md để phân biệt từng lần chạy và giới hạn live.

| # | Yêu cầu | Triển khai và bằng chứng local |
| --- | --- | --- |
| 1 | Thanh lưu dirty | Fixed bottom chỉ hiện khi form/selection/agenda/staged alias/ảnh thay đổi; undo/hủy; chừa khoảng đáy. Browser test undo và image cancel; file chỉ upload khi submit. |
| 2 | Sửa mã, giữ URL cũ | Wrapper save_event + event_codes và resolver mới, serialize namespace; cùng UUID, không mất FK. SQL test rename và link cũ; browser payload/navigation. |
| 3 | Giờ 24h | DateTime24 ngày + chọn giờ/phút; Time24 text HH:mm + chọn giờ/phút cho agenda; Intl h23, UTC/VN. Unit + browser UTC payload. |
| 4 | Published switch | Đầu form; staged tới lúc lưu, dirty/undo; RLS Published vẫn áp dụng. Browser switch và SQL permissions. |
| 5 | Auto event slug | Từ tên khi code trống lúc tạo; không thay khi sửa title; conflict báo lỗi, không ghi đè. SQL/browser tests. |
| 6 | Một alias danh bạ | primary_alias unique + trigger tạo slug bỏ danh xưng; legacy_default_aliases backup; không xóa alias thiệp lịch sử. SQL old nhvien/1/full-name và unit slug. |
| 7 | Active autosave | Switch từng hàng, optimistic pending, khóa request bằng ref, verify returned row, rollback/toast. Browser failure và SQL inactive/history persistence. |
| 8 | K2D | Google Fonts 400/500/600/700, preconnect/display swap, fallback; override toàn bộ component/toast. Quan sát ảnh browser desktop/mobile. Font ngoài có thể tải chậm, fallback được giữ. |
| 9 | Guest selected | Outline + chữ Đang chỉnh sửa, tên trên form; reset Khách mời mới. Browser test. |
| 10 | Chức vụ snapshot | description giữ newline, bỏ đoạn trống, không lấy lại từ danh bạ. Browser thiệp + snapshot SQL regression. |
| 11 | Địa điểm | Radio URL mặc định/Place ID, validate bắt buộc theo phương thức; không có lat/lng input. Legacy coords/link không drop; Place ID ưu tiên đúng phương thức. Unit/browser. |
| 12 | Copy all | Mỗi guest một dòng, primary alias có hiệu lực, filter đúng event và dedup; thứ tự hiển thị, saved code, lỗi clipboard. Unit/browser. |
| 13 | Agenda | Bảng event_agenda_items; add/edit/delete/sort, highlight, validation; save transaction; RPC và timeline không rỗng. SQL/unit/browser. |
| 14 | Upload ảnh | File/paste/drop, MIME/5 MiB, preview, replace/remove, loading/error; registry trước upload, cleanup lỗi, pending có thể retry. Unit lifecycle và browser preview/paste-event, Storage RLS SQL local. |
| 15 | Ảnh trên thiệp | EventInfo tải Blob từ bucket private, object-fit contain và mở lớn; khi lỗi hiện thông báo, không có broken img/section rỗng. Unit download/render/error. |
| 16 | Bốn logo | Đoàn/Hội/CTUT/BookClub đúng thứ tự; PNG local, contain, alt; người dùng đã xác nhận quyền dùng. Browser kiểm tra đủ bốn ảnh/naturalWidth/overflow; provenance trong public/logos/SOURCE.md. |

## File và schema

- Event editor: src/pages/EventForm.tsx, components/DateTime24, Time24, Switch, AgendaEditor, ImageEditor; staged alias trong features/invitations/InvitationManager.
- Guests: pages/GuestDirectory, features/events/api, lib/domain.
- Invitation: pages/InvitationPage, components/Agenda, EventInfo, VenueImage, InvitationLogos, styles/app.css, public/logos.
- Data: hai migrations 202611040001_v110.sql và 202611040002_venue_storage.sql; preflight-v110.sql/postflight-v110.sql. Chi tiết quyền, namespace, rollback trong MIGRATION-v1.1.md.

## Giới hạn chứng minh và điều kiện trước production

PGlite là PostgreSQL WASM, auth.uid và storage tables được shim cho tests; SQL RLS chạy thật trên role local nhưng không phải Supabase Auth/Storage service. Browser tests dùng API mocks; clipboard test mock API, paste test dispatch ClipboardEvent, không chứng minh clipboard OS trên mọi thiết bị. Blob download/upload tests dùng client mock, không chứng minh Storage HTTP production.

Chưa áp dụng v1.1 schema/bucket vào Supabase thật, nên live persistence/Storage v1.1 BLOCKED chờ phê duyệt/staging. Không dùng 23 PASS v1.0 làm bằng chứng v1.1. Upload cross-service không atomic: khi network cleanup thất bại, registry giữ path để retry; UI dọn ảnh pending của chính uploader quá 24h, không xóa file tab khác đang làm. Cần nghiệm thu tình huống này trên staging trước release.

Trang tham khảo không đọc được qua web tool nhưng HTTP từ local truy cập được, dùng để tìm đúng asset; không tuyên bố sao chép chính xác bố cục động. Không còn thiếu logo sau xác nhận quyền dùng. Chưa tối ưu bundle/SEO/hosting theo phạm vi.

Review migration trước, áp dụng staging sau phê duyệt, chạy UI-ACCEPTANCE-v1.1.md và live Auth/Storage tests, rồi xin phê duyệt release riêng. Không đánh dấu từng mục DONE production chỉ vì local test PASS.

## UI Overhaul Phase 1 — cập nhật local

- Bộ 11 icon Lucide dùng chung cho trình chọn và timeline; mã cũ vẫn được đọc và giữ nguyên khi chưa chọn icon khác.
- Các segment giờ dùng chung cho chương trình và sự kiện, giữ ngày độc lập và múi giờ Việt Nam. Giá trị chưa hoàn chỉnh không được gửi khi lưu.
- SQL `supabase/migrations/202611060001_agenda_icon_library.sql` mở rộng CHECK, giữ các mã cũ và thêm RPC kiểm tra capability. **Chưa chạy trên production**. Trước khi gửi một trong tám mã mới, frontend kiểm tra RPC; nếu thiếu hoặc không xác nhận được, thao tác lưu bị chặn với thông báo rõ ràng. Các icon `music`, `gift`, `camera` đã có trong constraint cũ.
- Kiểm thử migration bằng PGlite là PostgreSQL local mô phỏng roles, không phải xác minh Supabase live. SQL cần được review và phê duyệt riêng trước khi chạy production; sau đó kiểm tra capability, lưu/reload và thiệp qua Supabase thật.

## Danh bạ khách mời — local

Giao diện hai cột, editor sticky, hai chế độ danh sách, drawer mobile và bảo vệ form chưa lưu đã triển khai. Tay nắm sử dụng dnd-kit, DragOverlay, placeholder và sensor chuột, touch, bàn phím; khi capability database chưa có thì bị khóa. Thứ tự bền vững cần migration riêng `202611060002_guest_order.sql`; hướng dẫn review tại `GUEST-DIRECTORY-ORDER-REVIEW.md`. Migration chưa áp dụng production và lưu thứ tự live chưa được xác minh.


## UI Overhaul release — current database status (2026-11-06)
User confirms Guest Order and Agenda Icon Library migrations APPLIED & POSTFLIGHT VERIFIED, and successful persistence of new icons in production. This supersedes earlier migration-pending/blocker entries retained as historical evidence. These are USER-REPORTED production results, not an independent SQL execution by this agent. No migration is to be rerun. Release includes Agenda segmented time inputs and Lucide icons, plus dnd-kit guest directory and persistent ordering. Production UI smoke remains pending deployment.
