# Kết quả kiểm chứng BookClub

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
