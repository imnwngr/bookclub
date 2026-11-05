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

## FINAL CHECK — chưa đủ dữ liệu chi tiết để kết luận SAFE TO APPLY

Preflight production do người dùng tóm tắt: 2 mốc, end_time/icon chưa có, 7/7 RLS, anon_save=false/authenticated_save=true, 10 aliases/0 secondary, 10 snapshots của một Draft, directory/snapshot Nguyễn Hoàng Viện đều chứa nội dung cũ. Chưa có toàn bộ JSON trong phiên này: chưa xác minh **snapshot khớp chính xác từng ký tự với nội dung cũ trong WHERE**, hay **primary_alias của từng snapshot khớp canonical trong directory**. Không suy ra hai điều này từ số lượng alias phụ bằng 0.

Migration production duy nhất sau review: supabase/migrations/202611050001_ui_refinement.sql. Trong một transaction + lock_timeout 5s, khóa bảng liên quan; dừng nếu schema đã đổi/đã áp dụng, không đúng 2 mốc, có alias phụ, canonical snapshot khác directory, không đúng một Draft target hoặc description cũ không khớp chính xác. UPDATE có điều kiện chính xác chỉ directory guest ID 10000000-0000-4000-8000-000000000001 và snapshot Draft tương ứng; Published snapshot/khách khác không thay đổi. Thêm end_time NULL và icon book, giữ 2 UUID mốc tại thời điểm migration; save_event về sau có thể thay UUID agenda do delete/insert. Không tự tạo suffix hay nhận invitation_edits phụ; direct authenticated alias writes bị thu hồi, trigger bảo vệ primary và resolver chỉ primary. Guard cuối kiểm tra ACL effective và 7 RLS trước COMMIT. Không thay Auth/Storage/RLS policies.

Kiểm thử local tests/refinement-database.test.ts + refinement-api.test.ts **9/9 PASS**, bao gồm cố ý gây lỗi cuối transaction rồi ROLLBACK kiểm tra description/schema/2 agenda IDs giữ nguyên, chạy lại bị chặn, canonical primary/alias phụ, range/icon, ACL/RLS và postflight JSON 1 hàng. Đây là PGlite với Auth/Storage shim, không phải live migration. ESLint và git diff --check PASS. Chưa chạy migration production.

Trình tự: (1) chạy supabase/refinement-final-guards.sql chỉ đọc trên đúng project, mong đợi agenda_count=2, directory_exact_match=1, target_draft_count=1, target_draft_exact_match=1, secondary_alias_count=0, noncanonical_invitation_count=0, refinement_columns_count=0; lưu export preflight đầy đủ gồm agenda IDs/RPC ACL để đối chiếu. (2) Nếu mọi giá trị khớp và người dùng phê duyệt riêng, chạy toàn bộ migration một lần; bất kỳ lỗi -> ROLLBACK và báo, không sửa guard để ép qua. (3) chạy supabase/refinement-postflight-json.sql, so sánh 2 agenda IDs/nội dung với export; end_time NULL/icon book, target description mới, các snapshot khác không đổi, secondary=0/noncanonical=0, anon_save=false, authenticated_save=true, anon_resolve=true, alias write privileges=false, RLS 7/7. (4) Live fixture Auth/agenda/icon/primary route/Draft/Published và cleanup; không chạy lại toàn bộ suite cũ.

Không áp dụng SQL, rebuild, commit, push hay deploy trong lượt review. Frontend production v1.0 vẫn có rủi ro không tương thích schema v1.1 hiện tại; không xác nhận UI production PASS. Đoạn BLOCKED cũ dưới đây là lịch sử, thay bằng điều kiện chính xác trên.

## FINAL REVIEW — BLOCKED chờ preflight production hiện tại

Ngày 2026-11-05: probe API chỉ đọc project trdofhdspbkwgernwybp: event_agenda_items.time HTTP 200; end_time,icon HTTP 400/42703. Migration cần thiết; chưa áp dụng. tests/refinement-database.test.ts + refinement-api.test.ts **6/6 PASS** trên PGlite/mock, không phải Supabase live. Production baseline user-reported 18/18 flags, 41+9 Auth/API PASS là bằng chứng trước migration, không thay cho preflight hiện tại.

Migration transaction thêm end_time nullable + icon whitelist/default, giữ mốc cũ NULL; save_event giữ signature, is_admin, optimistic locking, UTC fields và ACL anon/auth; resolve_invitation vẫn Published/admin. Trigger và REVOKE authenticated thay đổi quyền direct alias; existing secondary alias rows giữ lại nhưng link phụ sẽ ngừng resolve. Trước khi áp dụng phải kiểm tra số link phụ Published và chấp nhận ảnh hưởng, kể cả khi dữ liệu lịch sử hiện được phép bỏ. Không thay RLS policies/Storage; quyền alias table thay đổi có chủ đích. V1.0 frontend còn default_aliases và thiếu location_method nên có rủi ro lỗi CRUD với schema v1.1 đã tồn tại, độc lập migration này; migration cũng ngừng resolve link phụ. Không thể báo v1.0 tương thích toàn diện hoặc UI production PASS.

Migration không idempotent: ADD COLUMN/CONSTRAINT/FUNCTION/TRIGGER lần hai lỗi; transaction rollback khi lỗi trước COMMIT. Sau COMMIT ưu tiên roll-forward, lưu export definition/ACL trước khi chạy; không DROP range/icon đã có dữ liệu. save_event thay agenda bằng DELETE/INSERT khi payload có agenda: nội dung được lưu lại nhưng UUID các agenda item có thể thay đổi khi lưu; không tuyên bố bảo toàn ID qua các lần save. SQL mô tả riêng khớp nguyên văn yêu cầu, dùng điều kiện ID/name/description cũ, không sửa snapshot; nếu 0 rows dừng review, không nới WHERE. Chạy riêng chỉ khi review/cho phép cập nhật directory.

Preflight/postflight đã mở rộng kiểm tra columns, overload/signature, function body/ACL, RLS policies, alias counts và mô tả. Chưa có output preflight hiện tại, chưa xác nhận số link phụ/ACL thực tế, chưa test migration/Auth/Storage HTTP trên staging. Vì vậy kết luận **BLOCKED**: chưa đủ bằng chứng để nói SAFE TO APPLY. Sau khi có preflight, nếu có xung đột/ảnh hưởng ngoài dự kiến thì dừng và review; sau phê duyệt riêng mới thực hiện migration → postflight → live fixture tests.

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

## RPC EXECUTE HOTFIX — local PASS / production chưa áp dụng

Đã đọc log Clean v1.1 Auth/Storage live runner 2026-11-04T16:56:36.300Z trong file này: **41 API PASS**, gồm Auth admin/nonadmin, CRUD, Draft/Published, agenda, aliases, Storage HTTP và cleanup. Không chạy lại 41 checks. Người dùng báo postflight 17/18, duy nhất anon_save_execute=true thay vì false.

Phân tích nguồn: save_event(jsonb,uuid[],uuid,timestamptz) chỉ REVOKE từ PUBLIC, không thu hồi grant trực tiếp của anon do default privileges khi CREATE FUNCTION. Đã tái hiện local với ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ... TO anon, authenticated. Đây chứng minh đường gây lỗi trong code; **chưa có output ACL/default privileges production để phân biệt grant trực tiếp do defaults với grant thủ công hoặc role inheritance**. File supabase/hotfixes/save-event-execute-audit.sql chỉ đọc liệt kê mọi overload, effective ACL, explicit grants, default grants theo creator và role memberships. Không tự nhận đã kiểm tra ACL live.

Hotfix riêng supabase/hotfixes/save-event-execute.sql: transaction có guard đúng một overload/signature và SECDEF/admin guard; REVOKE EXECUTE từ PUBLIC, anon trên duy nhất function; GRANT authenticated; assert effective privileges trước COMMIT. Không sửa body/is_admin, schema defaults, RLS, Storage hoặc dữ liệu. Nếu inherited grants còn gây anon_execute=true, rollback và dừng review; không tự thu hồi role rộng. Chưa áp dụng production, đang chờ người dùng review.

Đã cập nhật 02-schema.sql và REBUILD.sql local với REVOKE EXECUTE ... FROM PUBLIC, anon. **Không chạy lại REBUILD.sql trên database đã dựng.** Tests/rebuild-transaction.test.ts **3/3 local PASS**: dựng với default grants anon, hotfix PUBLIC+direct grants, chạy hotfix lặp, anon permission denied for function, nonadmin Admin required, admin RPC create+cleanup; body save_event và ACL/body resolve_invitation giữ nguyên. ESLint/Node syntax/git diff check PASS.

Sau phê duyệt và áp dụng hotfix: chạy 06-postflight-flags.sql (cần 18/18); chạy auth-live.ps1 -RpcExecuteOnly cho targeted Auth/RPC tests, không chạy bộ 41. Runner mới xác minh anon bị chặn tại ACL (không chỉ admin guard), nonadmin guard, admin create/update/readback và cleanup fixture UUID. Chưa chạy targeted live; UI production v1.1 chưa deploy. **Chưa chốt DATABASE REBUILT — VERIFIED.**

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

# Kết quả kiểm chứng BookClub

## MIGRATION REVIEW v1.1.0: BLOCKED chờ bằng chứng staging/preflight thật

Review mới phát hiện và sửa local: guest_alias_v110 không còn âm thầm bỏ alias chỉnh từ v1.0 default_aliases; archive secondary aliases, giữ invitation aliases. Revoke client EXECUTE trên trigger helpers, thêm admin guard cho remember_event_code. Bộ review/upgrade SQL tests đã chạy **14/14 PASS**, gồm payload v1.0 sau migration 1 trước Storage, tọa độ/địa chỉ, guest edits và ACL helpers. Đây là PGlite, không phải staging live.

Giới hạn compatibility: v1.0 event detail SELECT theo code không biết event_codes khi code đã đổi; không bật renames trước deploy frontend mới và không rollback cached v1.0 không backport resolver. Thiệp cũ vẫn qua resolve_invitation; tests local old-code PASS. Hai migration là hai transaction; partial success cần giữ UI v1.0 và roll-forward, không DROP dữ liệu. SQL preflight/hậu kiểm đã mở rộng để kiểm tra function definition/ACL/search_path, triggers/FK/grants, collisions và quyền helpers.

Không có môi trường staging riêng được cấu hình trong phiên: local chỉ trỏ production, không thực thi SQL ở đó. Chưa có output tiền kiểm hiện tại/backup dữ liệu thật, chưa test Supabase Storage HTTP v1.1 trên staging. Do đó chưa đủ SAFE TO APPLY. Không commit/push/deploy hoặc thay database production. Xem MIGRATION-v1.1.md cho các điều kiện còn thiếu và rollback limits.

## v1.1.0 — READY FOR MIGRATION REVIEW / UI ACCEPTANCE (local)

**Biên bản chốt:** Vitest toàn bộ **41/41 PASS** (6 files), TypeScript PASS, ESLint PASS; build cuối PASS (main JS 704.73 kB/gzip 204.74 kB). Full Playwright 38/38 PASS với mock APIs; sau sửa cuối đã chạy lại 4 directory tests, 8 editor tests và 2 logo/visual tests, đều PASS. Đã xem ảnh thiệp mobile cuối sau animation hoàn tất. Không có Supabase v1.1 live PASS. Git diff check PASS; 16 file tracked sửa và 24 file mới (gồm 4 PNG), chưa stage/commit. HEAD vẫn b70aa7f. File baseline foundation và workflow không đổi. Các con số cũ trong các đoạn dưới là tiến trình kiểm thử trước biên bản này.

Kết quả tổng hợp cuối đã chạy: **40/40 unit/component/SQL PASS**, TypeScript PASS, ESLint PASS, full Playwright **38/38 PASS** (API mocks desktop/mobile), production build PASS. Bản sửa cuối tách active khỏi payload sửa guest để tránh ghi đè switch autosave; kiểm tra directory browser liên quan và build được chạy bổ sung. Không có live v1.1 PASS.

Đã đối chiếu đủ 16 thay đổi trong UPGRADE-v1.1.md. Hai migration mới và pre/postflight scripts đã chạy trên PostgreSQL WASM local, không sửa foundation v1.0 hoặc rls_auto_enable. Tests chứng minh old-code resolution, old aliases nhvien/1/full-name, UUID/snapshot, agenda, alias edits atomic, quyền helpers/admin/anonymous, private bucket/ảnh Published-only và referenced-object deletion guard. Auth và Storage schema trong SQL tests là shim, không phải live Supabase service.

Các checks đã chạy: TypeScript PASS; ESLint PASS; production build PASS (main JS 704.70 kB, gzip 204.73 kB, cảnh báo kích thước được giữ ngoài phạm vi tối ưu). Browser suite 38/38 PASS trên Chrome desktop/mobile emulation với API mocks: gồm regression Auth/CRUD/routing và v1.1 dirty/undo, alias staged, code/auto slug, Place ID, logos, clipboard, image file/paste-event, agenda. Các tests unit/component/SQL đã chạy 39/39 và lần bổ sung SQL Draft/helper permissions 10/10 riêng; kết quả tổng hợp cuối được ghi thêm sau khi chạy. Image tests cover success/failure cleanup tracking, preview/replacement/removal/paste, private Blob render/error; không coi mock là Storage live PASS.

Logo nguồn bookclub.io.vn được người dùng xác nhận quyền dùng, PNG đã tải/kiểm signature, naturalWidth và overflow trong browser. Đã xem ảnh thiệp mobile. K2D toàn website, fallback/preconnect/display swap; không khẳng định font tải được trên mọi mạng.

Không có write live/database schema/commit/push/deploy cho v1.1. Local HEAD vẫn b70aa7f; production source 4c679c9 giữ nguyên. .env.local/dist/dist-e2e/test-results vẫn ignored; scan Git file-list với patterns tokens/private keys trả 0 match. Đây là scan giới hạn, không phải bảo đảm tuyệt đối.

Chưa xác minh: Supabase Storage HTTP thực, migration với dữ liệu production hiện tại, staging UI/người dùng nhập Ctrl+V OS thật và live v1.1 Auth/RLS. Cần phê duyệt review/apply staging/production riêng trước các thao tác đó. Upload failure/network cleanup fail giữ registry pending để retry, không có object không được theo dõi; UI dọn pending của uploader quá 24h để tránh phá công việc tab khác. Chi tiết gate Storage policies và rollback ở MIGRATION-v1.1.md. Các mục báo đang triển khai/chưa READY phía dưới là lịch sử, được mục này thay thế.

## v1.1.0: đợt triển khai đầu, chưa hoàn tất

Xem UPGRADE-v1.1.md cho phần đã sửa và phần còn thiếu. TypeScript/ESLint PASS, unit/integration local 20/20 PASS. Chưa có live hoặc UI v1.1 PASS, chưa đủ 16 yêu cầu và chưa READY. Production v1.0.0 giữ nguyên, không commit/push/deploy/migrate.

## PRODUCTION RELEASE v1.0.0: RELEASED — PARTIALLY VERIFIED

Release đã được người dùng phê duyệt. Source commit: 4c679c9b1cf9344918e78f4052c9c810090c9d2b, message release: bookclub v1.0.0, main, origin https://github.com/imnwngr/bookclub.git. Push bình thường thành công, remote SHA đã đối chiếu khớp source commit. Không force-push, không đổi schema/RLS, không xóa dữ liệu production. 54 file staged đã kiểm tra forbidden paths và token/private-key patterns trước commit; .env.local/artifacts không được commit.

Đã cấu hình repository variables VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY từ local mà không in key; Pages build_type workflow, HTTPS enabled. Workflow Verify and deploy BookClub: https://github.com/imnwngr/bookclub/actions/runs/41797854015 — completed/success, verify và deploy đều success, headSha đúng source commit trên. CI thực sự chạy npm ci, typecheck, ESLint, Vitest, Playwright, production build và upload dist/deploy Pages. Cảnh báo action Node20 được runner chuyển sang Node24 không làm job fail.

Production: https://imnwngr.github.io/bookclub/

| Phạm vi production smoke | Trạng thái | Bằng chứng/giới hạn |
| --- | --- | --- |
| Homepage HTTP | PASS | GET /bookclub/ 200; render/UI chưa xác minh |
| Assets | PASS | index-BPHgW6Bg.js và index-Bd91xlY3.css HTTP 200 |
| Supabase connectivity | PASS API | Bundle chứa đúng endpoint; REST events 200, 0 rows |
| Auth/admin/session/logout UI | BLOCKED | Browser access host unavailable, không có phiên admin production |
| CRUD, Draft/Published, selection, alias trên UI production | NOT RUN | Live API 23 PASS trước release và local UI 8/8 user-reported là bằng chứng riêng |
| Thiệp production | NOT RUN | Không có fixture admin để kiểm tra người nhận qua production UI |
| Deep links HTTP/fallback artifact | PASS | admin/, admin/new, admin/edit/qa-release-missing, qa-release-missing, qa-release-missing/nhvien đều HTTP 404 ban đầu, response có __spa fallback |
| Client recovery/refresh/tab mới trên production | BLOCKED | Không có browser control, không báo UI PASS từ HTML/HTTP |
| Responsive production | BLOCKED | Chưa kiểm thử bằng trình duyệt |
| Maps/manual entry production UI | NOT RUN | Không có key, picker không được báo PASS; fallback đã có mã và nghiệm thu local tổng hợp |
| Fixture cleanup | NOT RUN / không cần | Đợt smoke chỉ đọc, không tạo/sửa/xóa fixture production |

Supabase Auth URL Configuration: không có quyền Dashboard/management API khả dụng, chưa sửa hoặc xác minh cấu hình. Site URL đề nghị https://imnwngr.github.io/bookclub/; allowlist khi dùng redirect: https://imnwngr.github.io/bookclub/**, http://127.0.0.1:5173/bookclub/**, http://localhost:5173/bookclub/**. Ứng dụng hiện dùng signInWithPassword/signOut, không có OAuth hoặc password recovery, nên các redirect URLs không phải điều kiện bắt buộc cho login mật khẩu hiện tại; cần thiết trước khi dùng email redirect/recovery.

Giới hạn đã được chấp nhận: Maps picker thiếu key, main bundle khoảng 698 kB, deep-link HTTP 404 ban đầu. Không có bằng chứng lỗi production nghiêm trọng trong HTTP/API checks nhưng chưa chứng minh toàn bộ UI production. Bước còn lại: người dùng thực hiện UI-ACCEPTANCE.md trên origin production, gồm admin/non-admin, fixture QA riêng, public thiệp, refresh/tab mới và mobile; chỉ dọn fixture do lần thử đó tạo. Báo cáo này được commit riêng dạng docs [skip ci], không đổi source artifact đang deploy và không tạo deployment trùng.

## FINAL RELEASE REVIEW: CONDITIONAL GO

Mục này là kết luận mới nhất, thay thế các trạng thái UI BLOCKED lịch sử bên dưới. Người dùng xác nhận **8/8 UI Acceptance USER-REPORTED PASS**. Không có kiểm thử trình duyệt live độc lập của Codex. Checklist UI-ACCEPTANCE.md gồm 12 mục chi tiết; chưa có ánh xạ 8 bước do người dùng thực hiện sang từng mục, vì vậy không tự báo 12/12 hoặc gán bằng chứng thao tác cụ thể. Nghiệm thu thủ công được chấp nhận làm release gate; thiếu tự động hóa trình duyệt live không tự nó chặn phát hành.

Đối chiếu yêu cầu: Auth/admin/non-admin, CRUD, Draft/Published, selection, alias, persistence và public invitation RPC có log live 23 PASS/0 FAIL; UI có xác nhận tổng hợp người dùng. Responsive/keyboard/animation chỉ có bằng chứng mock/local trước đó và xác nhận UI tổng hợp, chưa có biên bản live riêng. Maps picker chưa có key; chỉ phát hành với nhập địa điểm thủ công. Điều hướng production/refresh/tab mới cần smoke test sau deploy, không suy luận từ Vite hoặc mock tests.

Kiểm tra cuối đã thực hiện: git diff --check PASS; branch main; origin https://github.com/imnwngr/bookclub.git; GitHub xác nhận repository Public, isEmpty=true, chưa có default branch thực trên remote. Source mới và tài liệu còn chưa commit; index intent-to-add không phải commit. Không có thay đổi schema/RLS. Cấu hình local trỏ đúng endpoint trdofhdspbkwgernwybp; .env.local và dist được ignore. Quét patterns token GitHub/Supabase secret/private key trong file dự kiến theo dõi trả 0 matches; đây là kiểm tra giới hạn, không bảo đảm phát hiện mọi loại secret. Frontend dùng publishable key, không dùng service_role. RLS review dựa vào migration và kết quả API live đã có, không chạy lại tests đã PASS.

Workflow review: verify chạy npm ci/typecheck/lint/Vitest/Playwright/build; deploy cần verify đạt và quyền pages/id-token. Biến repo Supabase được kiểm tra trước build phát hành. Push main hoặc workflow_dispatch có thể deploy ngay khi cấu hình đầy đủ; PR không deploy. Base /bookclub/, BrowserRouter /bookclub, 404 redirect và index restore path/query/hash nhất quán. Chưa có GitHub Actions run/production proof. Không chạy lại typecheck/lint/18 tests/build vì lần này chỉ sửa tài liệu; kết quả PASS lần trước vẫn là bằng chứng tương ứng với source.

Rủi ro chấp nhận có điều kiện: Maps picker không hoạt động khi thiếu key nhưng có fallback thủ công; bundle chính khoảng 698 kB (gzip khoảng 203 kB), có thể tải chậm trên mạng yếu; deep link Pages trả HTTP 404 ban đầu trước redirect nên SEO/social previews hạn chế. Không tuyên bố production DONE.

### Các thao tác phát hành sau phê duyệt riêng

1. Xác nhận chấp nhận ba giới hạn trên và phạm vi phát hành dùng địa điểm thủ công; cung cấp mapping UI chi tiết nếu cần hồ sơ nghiệm thu từng mục, không bắt buộc trình duyệt tự động.
2. Cấu hình repository variables VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY; Pages Source chọn GitHub Actions. Maps key/map ID tùy chọn, không dùng key giả. Kiểm tra Supabase Auth Site URL/redirect allowlist cho production. Các cấu hình remote cần nằm trong phê duyệt phát hành.
3. Review/stage đúng file, loại .env.local/artifacts, commit main và push origin main sau khi được phép. Do push có thể kích hoạt deploy, cần phê duyệt bao gồm cả deploy hoặc đặt gate environment trước push.
4. Theo dõi Actions verify/deploy và URL https://imnwngr.github.io/bookclub/. Không coi workflow source hoặc build local là deployment thành công.
5. Smoke test production: homepage/lọc, admin login/logout, fixture QA riêng Draft->Published, guest selection/alias, public invitation qua tab ẩn danh, direct URL/refresh/tab mới cho tất cả route và mobile; xóa đúng fixture. Ghi kết quả/thời điểm/Actions run vào báo cáo, không ghi credentials/token.

Quyết định: **CONDITIONAL GO để xin phê duyệt phát hành**, không phải quyền commit/push/deploy đã được cấp. Chưa thực hiện các thao tác đó.

## RELEASE READINESS: UI acceptance và chuẩn bị phát hành

HTTP smoke thực sự đã chạy: cả sáu route Vite (home/admin/new/edit/event/invitation) trả 200. Quét Git tracked + untracked không bị ignore: 0 file khớp patterns GitHub token, Supabase secret key hoặc private key; đây là quét pattern giới hạn, không bảo đảm phát hiện mọi secret. Google Maps API key chưa cấu hình; picker live BLOCKED, fallback thủ công cần UI acceptance.

Đã đọc log live Auth runner 2026-11-04T07:07:01.646Z trong chính file này: 23 PASS, 0 FAIL, cleanup PASS, UI NOT RUN. Đối chiếu với xác nhận người dùng: Auth/admin/non-admin, RLS, CRUD Draft/Published, guest selection, aliases, public RPC và persistence đã PASS qua API thực. Không chạy lại anonymous/API tests đã có bằng chứng.

Kiểm tra phát hành lần này: TypeScript PASS, ESLint PASS, Vitest 18/18 PASS, production build PASS. Build cảnh báo chunk chính 697.81 kB (gzip 202.62 kB), cần cân nhắc tối ưu tải trên mạng di động; không phải lỗi build. Những ghi nhận bundle nhỏ hơn ở các lần trước là lịch sử, không mô tả artifact hiện tại.

Vite chạy trên 127.0.0.1:5173 với base /bookclub/. Browser access host vẫn unavailable, nên UI live BLOCKED: chưa xác minh bằng thao tác login/logout/dashboard/form/selection/thiệp/responsive. UI-ACCEPTANCE.md cung cấp checklist thủ công và cleanup fixture riêng. Kết quả mock Playwright trước đó không thay thế nghiệm thu live.

Cấu hình Pages đã đọc: Vite base /bookclub/, BrowserRouter basename /bookclub, public/404.html chuyển deep link qua index và phục hồi path/query/hash. Vite HTTP 200 chỉ chứng minh dev server phục vụ route, không chứng minh render/Auth hoặc Pages production. Pages deep link đầu vẫn HTTP 404, giới hạn SEO/social preview. Production chưa triển khai nên direct/refresh production BLOCKED.

Workflow có npm ci/typecheck/lint/test/Playwright/build và deploy-pages; kiểm tra thiếu Supabase repository variables trước phát hành. Workflow chỉ được kiểm tra source, chưa có GitHub Actions run. Push main có thể kích hoạt deploy: chưa được phép commit/push/deploy. Git hiện main chưa có commit, origin đúng imnwngr/bookclub, các file ứng dụng mới chưa commit. .env.local và dist/dist-e2e được Git ignore; chỉ publishable key được dùng ở frontend.

Kết luận release: API PASS; checks local PASS; UI live, Maps picker khi thiếu key, Actions/Pages production BLOCKED. Chưa đủ điều kiện tuyên bố production ready. Không đổi schema/RLS, không tạo dữ liệu live trong đợt này, không commit/push/deploy.

## Fix PGRST201 tại truy vấn embedding

Kiểm tra sau sửa thực sự đã chạy: Node syntax PASS, ESLint PASS, TypeScript PASS, Vitest 18/18 PASS (bao gồm catalog FK trên PostgreSQL WASM). Không coi các kết quả này là live PostgREST PASS.

Bằng chứng live người dùng cung cấp: 8 checks đầu PASS, GET /rest/v1/event_guests HTTP 300 PGRST201, cleanup PASS; các bước sau NOT RUN. RPC save_event đứng trước GET này đã trả thành công theo control flow, không phải thao tác phát sinh PGRST201.

Migration tạo hai quan hệ giữa cùng cặp bảng: invitation_aliases(event_guest_id,event_id) -> event_guests(id,event_id), FK mặc định invitation_aliases_event_guest_id_event_id_fkey; chiều ngược lại event_guests(id,primary_alias) -> invitation_aliases(event_guest_id,alias), FK primary_alias_exists. Embedding không chỉ định FK gây mơ hồ. Đã sửa ứng dụng listInvitations và auth-live runner sang invitation_aliases!invitation_aliases_event_guest_id_event_id_fkey(...), chọn đúng tập hợp alias của thiệp. Các selects khác trong src/scripts không embedding giữa các bảng này. Giữ nguyên schema và RLS.

Runner bổ sung check save_event guest-selection update returned successfully before embedding read. Test PostgreSQL local bổ sung kiểm tra tên và chiều của hai FK. Các kiểm tra tĩnh/local sẽ ghi nhận trong kết quả bàn giao; chúng không thực thi PostgREST live. Live sau sửa chưa chạy, Published/alias/RPC/persistence phía sau vẫn chưa được chứng minh.

## Điều tra runner dừng sau 8 API PASS

Đọc log live ngày 2026-11-04T06:50:42.712Z: Auth hai tài khoản, is_admin hai vai trò, danh bạ, tạo/reload Draft và hai kiểm tra ẩn Draft đạt; cleanup đạt. Thao tác tiếp theo trong source là RPC save_event cập nhật selection từ một lên hai khách, rồi SELECT event_guests kèm invitation_aliases trước assertion guest selection persisted. Log cũ không ghi trạng thái hai thao tác đó nên chưa thể xác định chính xác thao tác lỗi hoặc nguyên nhân database. Không kết luận RLS/schema lỗi dựa trên log thiếu diagnostics.

Đã sửa lỗi quan sát của runner: catch chung trước đây bỏ mất HTTP status và code. Fetch wrapper hiện ghi method/path (không query, headers hay body), HTTP status và mã lỗi; message dùng danh sách diễn giải an toàn, raw message không tin cậy bị bỏ. Assertion failure tách FAIL ASSERTION; HTTP failure tách FAIL API; lỗi không có HTTP tách BLOCKED SYSTEM. Các phép thử phía sau ghi NOT RUN; kết quả PASS trước đó giữ nguyên. Cleanup vẫn chỉ xóa đúng fixture code của lần chạy, diagnostics cleanup độc lập.

Chưa chạy lại bằng credentials thật nên chưa xác định nguyên nhân gốc của failure live, chưa có Published/alias/selection PASS mới. Không đổi schema hoặc RLS. Cần người dùng chạy lại scripts/auth-live.ps1 và cung cấp dòng diagnostic đã lọc để phân biệt lỗi concurrency, constraint, RPC/schema hay quyền.

## Công cụ nhập Auth local, không phụ thuộc trình duyệt

Đã thêm scripts/auth-live.ps1 và scripts/auth-live.mjs. PowerShell dùng Read-Host -AsSecureString cho cả email/mật khẩu, truyền JSON qua stdin của Node; không truyền credentials qua command arguments, không ghi credentials/token vào file hoặc báo cáo. Supabase client chỉ giữ phiên trong bộ nhớ và signOut local khi kết thúc. Runner khóa endpoint trdofhdspbkwgernwybp; fixture có tiền tố qa-auth và UUID, cleanup chỉ lọc đúng code của lần chạy. Không thay đổi schema/RLS hoặc danh bạ gốc.

Chưa chạy runner với credentials thật: API Auth admin/non-admin và các phép thử ghi vẫn BLOCKED. Kiểm tra cú pháp/lint chỉ xác minh công cụ local, không phải API PASS. Runner sẽ bổ sung kết quả thực thi thật vào cuối file này. UI live chưa được xác minh.

Chạy từ PowerShell local: `powershell -NoProfile -File .\scripts\auth-live.ps1` (nếu policy hệ thống chặn, dùng terminal được quản trị cho phép; không tự bỏ policy). Nhập admin rồi non-admin khi được hỏi; không gửi thông tin qua chat. Đọc toàn bộ kết quả, đặc biệt FAIL CLEANUP; nếu có lỗi cleanup chỉ xử lý fixture code được ghi trong báo cáo.

Xác minh UI thủ công: chạy `npm.cmd run dev -- --host 127.0.0.1`, mở URL Vite cung cấp với `/bookclub/admin/`. Đăng nhập admin, tạo event tên `[QA UI]` kèm UUID tự chọn, lưu Draft và reload; kiểm tra chọn khách/alias, công bố rồi mở link thiệp trong cửa sổ ẩn danh. Đăng xuất, đăng nhập non-admin để kiểm tra bị chặn quản trị. Cuối cùng admin xóa đúng event `[QA UI]` đã tạo và xác nhận biến mất sau reload. Chỉ ghi UI PASS sau khi các thao tác này thực sự được thực hiện.

## Live Admin Testing: kết quả API thực tế sau migration/seed

Người dùng xác nhận migration/seed đã được xác minh và admin đầu tiên có membership. Đã gọi trực tiếp Supabase API project trdofhdspbkwgernwybp bằng publishable key ở vai trò anonymous, không dùng SQL Editor:

| Kiểm tra live | Kết quả | Bằng chứng |
| --- | --- | --- |
| Anonymous is_admin() | PASS | HTTP 200, false |
| Anonymous đọc events | PASS kết nối; chưa đủ chứng minh Draft/Published | HTTP 200, [] với select status limit 10; không có fixture để đối chiếu |
| Anonymous đọc guests/event_guests/invitation_aliases/admin_users | PASS chặn truy cập | Cả bốn HTTP 401, PostgreSQL code 42501 |
| Alias không tồn tại | PASS | resolve_invitation HTTP 200, null |
| Đăng nhập admin thực tế, is_admin=true | BLOCKED | Chưa có phiên Supabase Auth của admin khả dụng; browser access host unavailable |
| Non-admin Auth, CRUD admin, guest selection, alias và persistence | BLOCKED | Thiếu phiên Auth admin/non-admin thực; chưa tạo fixture |
| Draft/Published visibility và RLS write denial trên fixture | BLOCKED | Cần fixture do admin Auth tạo; không dùng SQL Editor thay thế |

Không tạo hoặc xóa dữ liệu live trong đợt này; không có fixture cần dọn. Không commit/push/deploy. Các kết quả local/PGlite/mock bên dưới là lịch sử kiểm thử riêng, không chứng minh các luồng Auth live đã đạt.

## Tiền kiểm do người dùng xác minh và bàn giao thực thi

Người dùng đã xác minh trong SQL Editor project trdofhdspbkwgernwybp: public không có bảng, constraints hay policies; chỉ có function rls_auto_enable() SECURITY DEFINER. Chấp nhận bằng chứng này, không lặp lại tiền kiểm. Đã đọc lại toàn bộ migration/seed: không tham chiếu, thay thế, ALTER hoặc DROP rls_auto_enable; các function tạo mới mang tên khác. Không có DROP/TRUNCATE hoặc sửa dữ liệu hiện hữu lúc áp dụng migration. FK cascade và DELETE trong save_event là hành vi chức năng được mô tả trước đó, không thực thi khi tạo hàm. Theo tiền kiểm không có bảng guests nên chưa có xung đột 10 ID tại thời điểm người dùng kiểm tra.

Kiểm tra quyền thực thi hiện tại: không có Supabase/psql CLI khả dụng hoặc project link; browser access host vẫn unavailable. Chưa áp dụng migration/seed, chưa xác minh hậu triển khai hoặc chạy live CRUD/RLS. Đã tạo SUPABASE-MANUAL.md chứa nguyên văn hai file hiện tại và thứ tự chạy; supabase/verify-after-migration.sql cung cấp các truy vấn chỉ đọc để kiểm chứng bảng/RLS/policies/constraints/functions/grants và đầy đủ dữ liệu 10 guests. Cần kết quả thực thi từ SQL Editor trước khi cập nhật thành công hoặc tiếp tục tests live.

## Rà soát project trdofhdspbkwgernwybp

- Endpoint Auth trả HTTP 200; REST truy vấn `public.events` trả PGRST205. Kết quả này không chứng minh bảng không tồn tại vì schema cache/quyền có thể ảnh hưởng.
- Đã đọc toàn bộ migration và seed. Migration tạo bảng, functions, grants, policies và bật RLS; không có DROP/TRUNCATE. Tuy nhiên FK có ON DELETE CASCADE đối với thiệp/alias và hàm save_event xóa event_guests khi bỏ chọn khách; thao tác này kéo theo xóa alias của liên kết đó. Seed dùng ON CONFLICT(id) DO NOTHING, có thể bỏ sót khách nếu ID đã tồn tại.
- SQL dự kiến giới hạn CRUD theo is_admin, đọc events Published và phân giải thiệp qua RPC; unique(event_id,alias) giới hạn alias. Chưa xác minh policies, grants, functions, bảng hay dữ liệu hiện có trên project, cũng chưa kiểm tra xung đột 10 ID bằng quyền quản trị.
- Publishable key không cung cấp quyền kiểm tra metadata quản trị hoặc chạy migration; không có CLI/database connector đã liên kết, browser access host không khả dụng. Do đó chưa áp dụng migration/seed và chưa chạy live CRUD/RLS/Auth/alias. Không suy luận project trống từ PGRST205.

Ngày 04/11/2026 (giờ Việt Nam). Trạng thái: **PARTIALLY COMPLETE / BLOCKED**. Có triển khai mã ứng dụng, chưa có hệ thống production hoạt động với Supabase thật.

## Môi trường và Git

- Git 2.55.0.windows.5, GitHub CLI 2.102.0, Node 24.19.0, npm 11.17.0.
- Local đúng `C:\Users\Tio\Downloads\bookclub`, thư mục ban đầu chưa tồn tại. Không đụng repository khác.
- Đăng nhập gh được xác minh là imnwngr qua network approval; lỗi token/proxy trong sandbox không phải lỗi tài khoản thật.
- Đã tạo https://github.com/imnwngr/bookclub, Public, còn trống (isEmpty=true).
- Branch main; remote origin https://github.com/imnwngr/bookclub.git. Chưa commit, chưa push. Index có intent-to-add để diff có thể review, chưa stage nội dung commit.
- GitHub Pages API trả HTTP 404 (Pages chưa được tạo). Workflow có trong local nhưng chưa chạy trên GitHub.

## Kiểm thử thực sự đã chạy

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| npm run typecheck | PASS | TypeScript application/Vite config |
| npm run lint | PASS | ESLint source/tests/scripts/config |
| npm test | 17/17 PASS | 8 domain, 1 component, 8 PostgreSQL integration |
| npm run test:e2e | 24/24 PASS | Chrome desktop và Chromium mobile emulation, API mock |
| npm run build | PASS | Production dist riêng, không có credentials |
| npm audit / npm audit --omit=dev | 0 vulnerabilities | Tại thời điểm kiểm tra; không phải bảo đảm tuyệt đối |
| git diff --check | PASS | Không có lỗi whitespace |
| Credential-pattern scan | Không thấy token/private key theo pattern kiểm tra | Không phải công cụ secret scanning đầy đủ |
| Kiểm tra bundle dist | Không có E2E endpoint/password/title fixture | dist-e2e không được deploy |
| Contrast | 7/7 cặp màu đạt AA cho chữ thường | Không thay thế audit accessibility đầy đủ |
| npm run test:rls | BLOCKED, exit 2 | Chưa có Supabase project/JWT/fixture live |

Màu kiểm tra: chữ chính/nền giấy 10.64:1; chữ phụ/nền giấy 5.54:1; chữ phụ/nền nổi 5.06:1; chữ trắng/nút xanh 11.66:1; lỗi/nền form 7.66:1; upcoming/nền nổi 6.55:1; tiêu đề phụ/nền giấy 5.51:1.

SQL integration dùng PGlite chạy PostgreSQL thật qua WASM, thực thi migration/seed/RLS/grants/functions. auth.users và auth.uid() được shim trong test để điều khiển identity, không phải Supabase Auth thật. Bao gồm tạo/sửa/xóa event, đồng bộ selection trong transaction, snapshot, collision aliases, bảo vệ primary alias, concurrency, anonymous Published-only, chặn ordinary user CRUD và tự cấp admin, cascade không xóa danh bạ.

## Kiểm tra thao tác trình duyệt

Mỗi kịch bản chạy desktop/mobile, API mock:

1. Trang chủ: hiện event, lọc tháng, empty state, mở chi tiết, refresh; không có pageerror trong kịch bản này, không tràn ngang.
2. Ba alias nhvien/1/nguyen-hoang-vien: cùng người nhận; mở thiệp/refresh; reduced motion tắt animation; không tràn ngang.
3. Direct admin/new/edit khi chưa đăng nhập: về login và refresh được.
4. Event/thiệp không tồn tại: có not-found state.
5. Tạo event: validation tên/thời gian, chọn tất cả, đúng guest_ids, tọa độ trống giữ null; gửi RPC; xóa có confirm, Escape hủy, xác nhận gửi DELETE.
6. Chỉnh sửa: dữ liệu điền sẵn, đổi tên, cảnh báo rời trang, hủy cảnh báo, lưu; alias trùng có thông báo.
7. Tab mới: deep link ban đầu HTTP 404, redirect index, phục hồi query/hash và mở đúng thiệp.
8. User thường: bị từ chối admin; trang công khai có loading và error state khi API lỗi.
9. Danh bạ: PATCH đúng tên; thêm/xóa alias, alias chính bị khóa xóa.
10. Login/logout: form gửi đăng nhập và guard mở/đóng đúng phiên.
11. Thiệp nhóm: nội dung riêng, nút mở thiệp dùng keyboard Enter.
12. Phiên hết hạn: refresh token bị từ chối, chuyển về login.

Đã xem ảnh homepage desktop, thiệp mobile và form mobile. Ảnh/trace/report ở test-results và playwright-report (Git ignore). Đã sửa lỗi query bị hủy lúc INITIAL_SESSION, lỗi PL/pgSQL tên biến mơ hồ và tọa độ trống bị biến thành 0,0; chạy regression sau sửa đạt các kết quả trên.

## Chưa được kiểm chứng, không được báo DONE

- Chưa tạo Supabase project, chưa áp dụng SQL vào dịch vụ thật, chưa có persistence/Authentication/RLS trực tiếp qua Supabase API được xác minh. Người dùng đã xác nhận chưa có project và yêu cầu tiếp tục phần độc lập.
- Chưa có Google Maps API key/billing/quota: Maps loader/Places/marker đã có mã nhưng chưa kiểm thử dịch vụ thật; fallback nhập thủ công đã được dùng trong E2E.
- Chưa commit/push/deploy; chưa xác minh URL production https://imnwngr.github.io/bookclub/ hoặc Actions trên GitHub. Deep link fallback local không bảo đảm production đã cấu hình đúng. GitHub Pages vẫn có HTTP 404 đầu tiên với deep links, giới hạn SEO/social previews đã mô tả trong README.
- Hallmark không khả dụng. Anti-slop core/UI/human/mobile đã được đọc; dùng hướng thiết kế từ brief người dùng và DESIGN.md. Không dùng external AI workers.

## Điều kiện để đưa vào sử dụng

1. Chủ tài khoản tạo Supabase project riêng; chạy migration/seed, tạo user, cấp admin qua SQL Editor.
2. Cấu hình Project URL/publishable key ở local và repository variables. Không gửi/lưu service_role hay mật khẩu trong Git.
3. Nếu cần Maps picker, chủ tài khoản bật APIs/billing và cung cấp key giới hạn referrer/API/quota; không có key vẫn dùng thủ công.
4. Chạy live API/RLS trên staging và CRUD bằng tài khoản admin/ordinary thực; sửa nếu phát hiện khác biệt dịch vụ.
5. Phê duyệt commit/push và công khai triển khai; chọn GitHub Actions làm Pages source. Xác minh Actions, dữ liệu và tất cả deep links trên production thật.

## Live Auth runner 2026-11-04T06:50:42.712Z
Fixture: qa-auth-0dc37cfa-5b8b-4cb4-917f-8fb0beddd389

- PASS API: admin password authentication
- PASS API: non-admin password authentication
- PASS API: admin is_admin=true
- PASS API: non-admin is_admin=false
- PASS API: admin reads guest directory
- PASS API: create and reload persisted Draft
- PASS API: anonymous cannot read Draft
- PASS API: non-admin cannot read Draft
- BLOCKED/FAIL API: run incomplete; no raw authentication errors or credentials recorded
- PASS API: cleanup deleted only run fixture
- UI: NOT RUN by API runner

## Live Auth runner 2026-11-04T06:54:36.598Z
Fixture: qa-auth-ecda9394-c143-4917-9137-5264f10303ae

- PASS API: admin password authentication
- PASS API: non-admin password authentication
- PASS API: admin is_admin=true
- PASS API: non-admin is_admin=false
- PASS API: admin reads guest directory
- PASS API: create and reload persisted Draft
- PASS API: anonymous cannot read Draft
- PASS API: non-admin cannot read Draft
- BLOCKED SYSTEM: step=GET /rest/v1/event_guests; HTTP=300; code=PGRST201; message=Operation did not complete; untrusted raw message suppressed
- NOT RUN: remaining checks after the failed step; previous PASS results preserved
- PASS API: cleanup deleted only run fixture
- UI: NOT RUN by API runner

## Live Auth runner 2026-11-04T07:07:01.646Z
Fixture: qa-auth-de6d8b96-80d1-41d0-a5ff-b8072965ec46

- PASS API: admin password authentication
- PASS API: non-admin password authentication
- PASS API: admin is_admin=true
- PASS API: non-admin is_admin=false
- PASS API: admin reads guest directory
- PASS API: create and reload persisted Draft
- PASS API: anonymous cannot read Draft
- PASS API: non-admin cannot read Draft
- PASS API: save_event guest-selection update returned successfully before embedding read
- PASS API: guest selection persisted
- PASS API: alias uniqueness enforced
- PASS API: anonymous Draft invitation hidden
- PASS API: non-admin RPC write denied
- PASS API: non-admin direct update affects zero rows
- PASS API: non-admin direct delete affects zero rows
- PASS API: update and reload persisted Published
- PASS API: anonymous can read Published
- PASS API: anonymous resolves correct published recipient
- PASS API: anonymous cannot enumerate recipient records
- PASS API: non-admin can read Published
- PASS API: non-admin resolves correct published recipient
- PASS API: non-admin cannot enumerate recipient records
- PASS API: cleanup deleted only run fixture
- UI: NOT RUN by API runner

## Rebuild runner review — 2026-11-04T16:34:13.728Z

- Read-only live probe POST /rest/v1/rpc/get_event_v110 trên project đúng: HTTP 404, PGRST202. RPC chưa khả dụng qua API tại thời điểm kiểm tra; không suy ra chỉ từ probe rằng SQL đã hay chưa chạy. Không tạo fixture và không thay đổi database.
- Runner rebuild-live.mjs được gia cố: negative upload dùng valid registered paths; theo dõi tất cả fixture paths; cleanup kiểm tra object listing và registry thực sự vắng; timeout request 30 giây; HTTP 300 được phân loại FAIL API.
- Node syntax và ESLint PASS. Runner Auth/Storage thật chưa chạy; không có live PASS mới. Vẫn cần REBUILD.sql COMMIT + 05-postflight.json và credentials nhập local qua auth-live.ps1 -RebuildV110.

## Post-rebuild anonymous API 2026-11-04T16:51:45.641Z

Executed against exact project using publishable key, no Auth session, no fixture created. Denied save_event probe supplies empty payload and has no write authorization.

- PASS API: anonymous is_admin false; HTTP=200; code=none
- PASS API: get_event_v110 available; missing code returns null; HTTP=200; code=none
- PASS API: resolve_invitation available; missing alias returns null; HTTP=200; code=none
- PASS API: anonymous save_event denied; HTTP=401; code=42501
- PASS API: anonymous directory enumeration denied; HTTP=401; code=42501
- PASS API: anonymous invitation enumeration denied; HTTP=401; code=42501
- PASS API: anonymous registry enumeration denied; HTTP=401; code=42501
- PASS API: public events endpoint available; HTTP=200; code=none
- PASS API: agenda endpoint available; HTTP=200; code=none

These checks do not prove admin/nonadmin Auth, seed content, private bucket flag, Published fixture rendering or Storage HTTP lifecycle.

## Clean v1.1 Auth/Storage live runner 2026-11-04T16:56:36.300Z
Fixture: qa-auth-175eddf3-ebaf-4bb0-99a7-39bbf9f4ff1d

- PASS API: admin password authentication
- PASS API: non-admin password authentication
- PASS API: admin is_admin=true
- PASS API: non-admin is_admin=false
- PASS API: admin reads guest directory
- PASS API: create and reload persisted Draft
- PASS API: anonymous cannot read Draft
- PASS API: non-admin cannot read Draft
- PASS API: save_event guest-selection update returned successfully before embedding read
- PASS API: guest selection persisted
- PASS API: alias uniqueness enforced
- PASS API: anonymous Draft invitation hidden
- PASS API: non-admin RPC write denied
- PASS API: non-admin direct update affects zero rows
- PASS API: non-admin direct delete affects zero rows
- PASS API: update and reload persisted Published
- PASS API: anonymous can read Published
- PASS API: anonymous resolves correct published recipient
- PASS API: anonymous cannot enumerate recipient records
- PASS API: non-admin can read Published
- PASS API: non-admin resolves correct published recipient
- PASS API: non-admin cannot enumerate recipient records
- PASS API: admin uploads fixture image via Storage HTTP
- PASS API: nonadmin Storage upload denied on valid registered path
- PASS API: anonymous Storage upload denied on valid registered path
- PASS API: Draft image hidden via Storage HTTP
- PASS API: admin reads Draft image
- PASS API: anonymous reads Published image via controlled Storage HTTP
- PASS API: agenda and highlight persist through public RPC
- PASS API: event code change preserves internal UUID
- PASS API: old event code is not retained after clean rebuild
- PASS API: invitation resolves under renamed event code
- PASS API: unpublish revokes public invitation
- PASS API: unpublish revokes future image downloads
- PASS API: cleanup deleted only run fixture
- PASS API: cleanup verified fixture object absent
- PASS API: cleanup verified fixture registry absent
- PASS API: cleanup verified fixture object absent
- PASS API: cleanup verified fixture registry absent
- PASS API: cleanup verified fixture object absent
- PASS API: cleanup verified fixture registry absent
- UI: NOT RUN by API runner

## Targeted save_event ACL live runner 2026-11-04T23:19:08.246Z
Fixture: qa-auth-6e5e89a8-7c2b-4c56-84bb-0996ff91840b

- PASS API: admin password authentication
- PASS API: non-admin password authentication
- PASS API: admin is_admin=true
- PASS API: non-admin is_admin=false
- PASS API: anonymous rejected by function EXECUTE ACL, not only is_admin guard
- PASS API: nonadmin can invoke but is_admin guard denies write
- PASS API: authenticated admin RPC creates Draft
- PASS API: authenticated admin RPC update persists
- PASS API: cleanup deleted only run fixture
- UI: NOT RUN by API runner

## Refinement focused live runner 2026-11-05T04:12:16.465Z
Fixture: qa-auth-97952738-41ef-4550-9c1e-3852cc0a7d21

- PASS API: admin password authentication
- PASS API: non-admin password authentication
- PASS API: admin is_admin=true
- PASS API: non-admin is_admin=false
- PASS API: legacy NULL-end agenda reads safely (read only)
- PASS API: active canonical guest available
- PASS API: admin creates separate Draft fixture
- PASS API: reload preserves time/end_time/icon/highlight/content
- PASS API: anonymous Draft invitation hidden
- PASS API: fixture uses directory canonical primary alias
- PASS API: nonadmin cannot save fixture
- PASS API: nonadmin cannot directly create secondary numeric-suffix alias
- PASS API: admin cannot directly create secondary numeric-suffix alias
- PASS API: save_event rejects secondary invitation edits
- PASS API: Published primary invitation resolves correct snapshot
- PASS API: anonymous Published agenda roundtrip preserves all fields
- PASS API: secondary alias cannot resolve
- PASS API: existing legacy agenda untouched
- PASS API: cleanup deleted only run fixture
- UI: NOT RUN by API runner

## Live UI acceptance 2026-11-05T04:17:53.828Z
Fixture: qa-ui-4e037cae-8395-4ba1-b123-1cc67475fc28

- LIVE PASS: Admin UI authenticated
- LIVE PASS: single date-time range / multi-day / 24h UI
- LIVE PASS: guest list name-only / selection
- LIVE PASS: three-row agenda / range / closed icon picker / highlight
- LIVE PASS: create / save / reload / agenda highlight and venue image persistence
- LIVE PASS: multi-day and icon survive reload
- LIVE PASS: invitation name-only row / preview canonical URL / real clipboard and copy all
- LIVE PASS: anonymous Draft invitation hidden
- LIVE PASS: anonymous Published invitation / roles before-after / hierarchy / calendar / image / agenda
- LIVE PASS: desktop and 320px live UI / scroll both directions / no horizontal overflow
- LIVE PASS: cleanup UI deleted only fixture UUID (event/image cleanup flow)

## Live UI acceptance 2026-11-05T04:19:52.821Z
Fixture: qa-ui-13a6e1e6-3979-4cbf-b7b1-44ce0d9a1181

- LIVE PASS: Admin UI authenticated
- LIVE PASS: single date-time range / multi-day / 24h UI
- LIVE PASS: guest list name-only / selection
- LIVE PASS: three-row agenda / range / closed icon picker / highlight
- LIVE PASS: create / save / reload / agenda highlight and venue image persistence
- LIVE PASS: multi-day and icon survive reload
- LIVE PASS: invitation name-only row / clicked preview / real clipboard and copy all
- LIVE PASS: anonymous Draft invitation hidden
- LIVE PASS: anonymous Published invitation / roles before-after / hierarchy / calendar / decoded image / highlighted icon timeline
- LIVE PASS: desktop and 320px live UI / scroll both directions / no horizontal overflow
- LIVE PASS: cleanup UI deleted only fixture UUID (event/image cleanup flow)
