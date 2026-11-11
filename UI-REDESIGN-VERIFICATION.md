# BookClub CTUT · Nghiệm thu redesign local

> Báo cáo lịch sử của vòng redesign đầu. Thay đổi audio, vật liệu và motion mới được nghiệm thu riêng tại [INVITATION-2.0-VERIFICATION.md](INVITATION-2.0-VERIFICATION.md); các số đo dưới đây không đại diện cho Invitation 2.0.

Ngày: **11/11/2026**. Nguồn: checkout local v1.1.0, base commit `c94c855`, không phải giao diện GitHub Pages đang phục vụ. Báo cáo này chỉ áp dụng cho thay đổi frontend trong đợt redesign; báo cáo live cũ không được dùng để chứng nhận bản mới.

## A. Kết quả triển khai

Đã triển khai hệ thống giao diện editorial xanh emerald / giấy cream, giữ K2D và hỗ trợ tiếng Việt. Các trang công khai, cover và nội dung thiệp, dashboard, editor, danh bạ, quản lý vai trò và đăng nhập đã được sửa trực tiếp trong source. Thiệp có opening bằng các lớp giấy, focus chuyển đến người nhận, section reveal và timeline khi cuộn. Quản trị có shell riêng, nhóm form rõ và điều khiển phản hồi nhanh.

**Phạm vi local đã triển khai; không tuyên bố đạt toàn bộ chỉ tiêu production.** LCP mobile mô phỏng của chi tiết và cover còn vượt 2,5 giây. INP thực tế, Safari/iOS, hiệu năng trên điện thoại thật và Supabase live của bản redesign chưa được đo. Các giới hạn này được ghi ở phần F–H.

Không sửa SQL, migrations, RLS, Auth policies, roles backend, RPC, schema hoặc resolver. Không ghi/xóa dữ liệu production, commit, push hay deploy. Giữ các thay đổi có sẵn trong `VERIFICATION.md`, hồ sơ backup/release/role và scripts live của người dùng.

## B. Before / After

| Khu vực | Trước | Đã triển khai |
|---|---|---|
| Foundation | CSS chồng lớp, font/weight ép bằng `!important`, màu thiếu nhất quán | Semantic tokens, K2D tự host, scale chữ/spacing, stylesheet theo phạm vi, focus và trạng thái thống nhất |
| Home | Tiêu đề và danh sách đơn giản | Hero bất đối xứng, quyển sách bằng CSS có chiều sâu, ngày sự kiện nổi bật, filter/reset/số kết quả, footer nhận diện |
| Chi tiết | Nội dung và metadata ít phân cấp | Hero, trạng thái, nội dung dài, ảnh/địa điểm/maps, agenda và reveal |
| Cover thiệp | Cover biến mất ngay khi mở | Lớp giấy/viền/dấu thư, người nhận nổi bật, opening có chuyển động và focus đúng |
| Thiệp đã mở | Các khối màu và layout chưa đồng bộ | Lá thư có nhịp greeting → lịch/địa điểm → quote nếu có → timeline → kết; giữ snapshot cá nhân/nhóm |
| Nhạc | Phát lại theo gesture chung, thiếu điều khiển rõ | Chỉ phát khi chọn Phát nhạc; pause/retry/status; giữ ký URL, refresh và cleanup |
| Dashboard | Navigation lẫn public và danh sách phẳng | Sidebar/drawer, breadcrumb, counts từ query thật, tìm/lọc, actions rõ và feedback |
| Event editor | Form dài khó định hướng | Bảy nhóm có anchor, RangePicker UTC+7/24h, toolbar có labels, guest search, save bar có khoảng đệm |
| Agenda editor | Identity theo index, chưa có kéo sắp xếp | ID nội bộ ổn định, dnd-kit sẵn có, feedback kéo, bàn phím và nút lên/xuống; payload giữ nguyên |
| Invitation manager | Liên kết và thao tác khó quét | Phân cấp tên/link, preview, copy/copy all và phản hồi; chỉ primary alias |
| Guest directory | List/editor thiếu đồng bộ | Search, selected state, active switch, bố cục desktop/mobile, focus trap drawer và dirty guards |
| Roles / Login | Controls và hierarchy đơn giản | Role labels, dialog thêm tài khoản, confirm thu hồi, lỗi rõ; đăng nhập cùng nhận diện |

Audit chi tiết và baseline: [UI-REDESIGN-PLAN.md](UI-REDESIGN-PLAN.md). Hệ thống thiết kế: [DESIGN.md](DESIGN.md).

## C. Thay đổi kỹ thuật

- Mới: `SiteLayout`, `AdminShell`, `PaperArt`, `Reveal`, `useReducedMotion`, `lib/queryClient.ts`, `lib/validation.ts`.
- Refactor các page và controls hiện có; không thay toàn bộ tầng business logic. Tách validation Zod khỏi public domain utilities để tránh tải editor validation vào trang công khai; các quy tắc validation được giữ nguyên.
- Lazy-load routes chi tiết/thiệp/đăng nhập và routes quản trị; admin CSS chỉ tải cùng vùng quản trị. Loader bắt đầu import route và prefetch public query đồng thời, dùng cùng QueryClient/cache key/retry/staleTime. Không đổi resolver hoặc hợp đồng RPC.
- CSS: `tokens`, `fonts`, `base`, `public`, `invitation`, `admin`, `controls`. Đây là CSS chia theo phạm vi, không phải CSS Modules. Loại stylesheet cũ chồng lớp thay vì thêm một lớp override toàn cục nữa.
- Motion: CSS transform/opacity, IntersectionObserver + Web Animations API; CSS scroll timeline có fallback. Observer, listener, animation và opening timer đều cleanup. Không scroll hijack; nội dung không phụ thuộc vào animation hoàn tất. Reduced motion bỏ spatial motion và smooth scroll.
- Assets: K2D 400/500/600/700, Latin và Vietnamese WOFF2, 76.048 byte tổng font; license SIL OFL và nguồn đi kèm. Thêm bốn bản WebP 192px cho logo, tổng 109.054 byte so với PNG gốc 1.618.612 byte (~93,3% ít hơn); giữ PNG fallback và thứ tự Đoàn/Hội/CTUT/BookClub. Art quyển sách bằng CSS; không dùng stock photo hoặc WebGL.
- Dependency runtime mới: **không có**. Dev dependencies thêm: `@axe-core/playwright` và `lighthouse`. Dnd-kit dùng bản có sẵn.
- Skills/guidance: Anti-slop core/UI/human/mobile/copy; Hallmark cho hierarchy và tránh template; UI UX Pro Max cho tokens/form/a11y; Taste và Impeccable cho critique và responsive polish; Scroll Craft cho nhịp thiệp. Đã đọc GSAP React để đánh giá lifecycle, nhưng chọn CSS/WAAPI, không cài GSAP. Không dùng Three.js/Scroll World vì CSS đáp ứng chiều sâu cần thiết. Các Markdown tham khảo lưu tại `.local/design-references/`; không chạy scaffold/hook/CLI bên thứ ba. Đây không phải chứng nhận PASS của các CLI upstream.
- Không dùng Antigravity/API model hoặc external AI worker. Sites guidance chỉ dùng cho quy trình local checkout/preview, không tạo hoặc publish site từ plugin.

## D. Bằng chứng hình ảnh và browser QA

Ảnh chỉ chứa fixture mô phỏng, có nội dung nhận diện kiểm thử; không phải sự kiện, người dùng hoặc số liệu production. File evidence được gitignore tại `.local/ui-redesign/`.

| Bằng chứng | Đường dẫn |
|---|---|
| Baseline trước redesign | [.local/ui-redesign/before/](.local/ui-redesign/before/) |
| Home desktop / 320px | [home-1440.png](.local/ui-redesign/after/home-1440.png) · [home-320.png](.local/ui-redesign/after/home-320.png) |
| Chi tiết desktop / mobile | [detail-1280.png](.local/ui-redesign/after/detail-1280.png) · [detail-390.png](.local/ui-redesign/after/detail-390.png) |
| Cover | [cover-1440.png](.local/ui-redesign/after/cover-1440.png) · [cover-390.png](.local/ui-redesign/after/cover-390.png) |
| Thiệp mở | [invitation-1440.png](.local/ui-redesign/after/invitation-1440.png) · [invitation-320.png](.local/ui-redesign/after/invitation-320.png) |
| Nội dung dài / thiếu optional | [long-invitation-mobile.png](.local/ui-redesign/after/long-invitation-mobile.png) · [minimal-invitation-mobile.png](.local/ui-redesign/after/minimal-invitation-mobile.png) |
| Thiệp nhóm, reduced motion | [group-reduced-mobile.png](.local/ui-redesign/after/group-reduced-mobile.png) |
| Dashboard / editor | [dashboard-1280.png](.local/ui-redesign/after/dashboard-1280.png) · [editor-768.png](.local/ui-redesign/after/editor-768.png) |
| Danh bạ / vai trò / login | [guests-1024.png](.local/ui-redesign/after/guests-1024.png) · [roles-430.png](.local/ui-redesign/after/roles-430.png) · [login-360.png](.local/ui-redesign/after/login-360.png) |
| Dialog / RangePicker / agenda | [role-dialog-mobile.png](.local/ui-redesign/after/role-dialog-mobile.png) · [range-popover-mobile.png](.local/ui-redesign/after/range-popover-mobile.png) · [agenda-edit-mobile.png](.local/ui-redesign/after/agenda-edit-mobile.png) |
| Empty / loading / error | [empty-mobile.png](.local/ui-redesign/after/empty-mobile.png) · [loading-mobile.png](.local/ui-redesign/after/loading-mobile.png) · [error-mobile.png](.local/ui-redesign/after/error-mobile.png) |
| Opening và các section thực tế trong viewport | [.local/ui-redesign/inspection/](.local/ui-redesign/inspection/) |

Ma trận 9 chiều rộng **320, 360, 390, 430, 768, 1024, 1280, 1440, 1920px** chụp 9 surface mỗi chiều rộng: home, detail, dashboard, editor, guests, roles, login, cover và thiệp mở. Có 81 ảnh ma trận và 21 ảnh states/interaction, tổng 102 ảnh trong `after/`. Helper cuộn đến ảnh lazy và kiểm tra tải xong trước full-page screenshot; screenshot toàn trang trước đó có vùng ảnh chưa tải nên đã chụp lại.

Kiểm tra bằng trình duyệt: không tràn ngang ở ma trận, không ảnh hỏng sau tải; tiếng Việt và tiêu đề dài reflow; mở thiệp chuyển focus; Escape/focus restoration của menu, dialog, RangePicker; toolbar rich text và agenda dùng được bằng bàn phím; dirty guards, drawer focus, reduced motion, thiệp nhóm/cá nhân và thiếu optional sections. Có kiểm tra page errors, console warnings/errors và asset HTTP errors; HTTP 404 tài liệu ban đầu của cơ chế GitHub Pages được phân biệt với asset 404.

## E. Kiểm thử

Lượt regression đầy đủ sau tối ưu loader: **PASS**. Xem các log `*-release.log` tại `.local/ui-redesign/`. Sau polish nút Hủy trong dialog vai trò thành secondary, đã chạy lại lint, build và 10 test role/accessibility: **10/10 PASS**; ảnh dialog đã chụp lại và kiểm tra.

| Lệnh | Kết quả | Bằng chứng |
|---|---|---|
| `npm run typecheck` | PASS | `typecheck-release.log` |
| `npm run lint` | PASS | `lint-release.log` |
| `npm test` | PASS · 116/116, 25 files | `unit-release.log` |
| `npm run test:e2e -- --workers=2` | PASS · 101 tests, 9 skipped có chủ đích | `e2e-release.log` |
| `npm run build` | PASS | `build-release.log` |
| `npm run test:e2e -- --workers=2 --grep 'role directory\|role revoke\|redesign accessibility'` | PASS · 10/10 sau polish cuối | `roles-polish.log` |

Chín lượt skipped là bản lặp của ma trận 9 chiều rộng trong project mobile; cả 9 đã chạy và PASS trong project desktop với viewport được đặt riêng. Các test chức năng khác vẫn chạy ở cả desktop lẫn mobile emulation. Không bỏ qua test lỗi để làm xanh kết quả.

Các lượt đầu có rich editor unit timeout khi chạy tải cao, sandbox chặn ghi report/native subprocess và xung đột cổng preview của phiên cũ. Đã chạy lại bằng quyền local phù hợp, xác minh rồi dừng đúng server e2e cũ; không đổi approval controls. Không dùng kết quả của lượt bị chặn làm PASS.

Coverage chức năng dùng intercepted Supabase API/Storage và dữ liệu riêng: public list/filter/Draft exclusion/detail; login/logout/session expired; admin guard và Admin/Editor controls; create/edit/save errors/conflicts; UTC+7/24h/multi-day persistence; guest selection/directory/reorder/rollback; agenda icon/highlight/time/reorder; rich text an toàn và paste tiếng Việt; venue/map/image preview; invitation resolver/snapshot/group/primary alias/copy failure; unsaved undo/navigation; direct links/refresh/query/hash/404 recovery; menu mobile; MP3 consent/retry/pause/cleanup và phát byte audio thật trong browser. Đây là frontend integration regression, không phải kiểm thử RLS live.

Axe WCAG A/AA scans có trên các routes chính, thiệp mở và dialog vai trò: không có violation trong phạm vi quét. Kiểm tra công thức contrast bổ sung: muted/paper 5,35:1; sage/forest 7,30:1; gold-dark/surface 5,64:1; focus/forest 3,24:1; viền control/trắng 3,00:1. Kết quả tự động không chứng minh toàn bộ WCAG hoặc thay thế kiểm thử screen reader/thiết bị thật.

## F. Performance và bundle

Lighthouse **13.6.0**, Chrome headless local, production-mode Vite e2e build, dữ liệu mock, gzip, mobile simulated throttling (RTT 150ms, CPU slowdown ×4). Báo cáo máy đo: [.local/ui-redesign/performance/release/](.local/ui-redesign/performance/release/). Không phải đo mạng production hoặc field data.

| Trang | Performance | Accessibility | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|
| Home | 100 | 100 | 1,242s | 0 | 0ms |
| Chi tiết | 93 | 100 | 3,239s | 0 | 0ms |
| Cover thiệp | 94 | 100 | 3,089s | 0,0264 | 1ms |

- Performance ≥85, Accessibility ≥95, CLS ≤0,1: **PASS trong điều kiện đo trên**.
- LCP ≤2,5s: **PASS Home; FAIL chi tiết và cover**. Prefetch song song giảm cover từ khoảng 3,62s xuống 3,09s. Data-dependent rendering và lazy route vẫn cần tải trên lần truy cập trực tiếp; chưa có server rendering trong kiến trúc hiện tại. Không thêm thay đổi kiến trúc lớn để che chỉ tiêu chưa đạt.
- Môi trường Chrome có script chèn từ phần mềm bảo vệ máy; harness chặn origin ngoài localhost/backend kiểm thử. Đây là một nguồn sai lệch của phép đo local, không đủ cơ sở quy toàn bộ LCP chậm cho yếu tố này.
- INP ≤200ms: **BLOCKED / chưa có field measurement**, không dùng TBT thay INP.
- Opening rAF sample: 305 frames/2,4s, trung bình 7,87ms, max 24ms, không frame >32ms; xem `inspection/motion.json`. Chỉ là sample desktop local, **chưa xác minh 60fps trên điện thoại phổ thông**.

| Chunk build (decimal kB) | Raw | Gzip |
|---|---:|---:|
| Main | 369,70 | 117,02 |
| Supabase shared | 224,69 | 58,94 |
| EventDetail | 2,76 | 1,23 |
| InvitationPage | 13,57 | 4,92 |
| EventForm (lazy) | 479,61 | 153,39 |
| Sortable (lazy admin/directory) | 137,40 | 41,30 |
| CSS public | 45,67 | 10,64 |
| CSS admin + controls (lazy) | 19,00 | 4,74 |

Nguồn: `build-release.log`. Baseline: main 386,36kB (117,35 gzip), shared Feedback/Supabase 248,30kB (66,35 gzip), shared icon-related 95,09kB (31,67 gzip), EventForm 469,05kB (149,84 gzip), CSS 34,83kB (8,59 gzip). Main raw giảm nhẹ, gzip gần tương đương; CSS và editor tăng theo chức năng giao diện. Không so tổng các chunk không cùng route để tuyên bố phần trăm giảm page load. Tiptap và dnd-kit vẫn là phần lớn của editor/directory và được tách khỏi public routes.

Để lặp phép đo với dữ liệu mô phỏng, dùng PowerShell trong repo. Các biến dưới đây chỉ có hiệu lực trong process hiện tại:

```powershell
$env:VITE_SUPABASE_URL = 'https://bookclub-test.invalid'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'test-only-public-key'
$env:VITE_GOOGLE_MAPS_API_KEY = ''
npm run build:e2e
$env:E2E_GZIP = 'true'
node scripts/e2e-server.mjs
```

Trong terminal khác, chạy `node scripts/measure-redesign.mjs review` và `node scripts/review-redesign.mjs`. Harness cài fixtures vào browser context, không phải dữ liệu thật; script measurement chặn origin ngoài localhost/test backend. Dừng server bằng Ctrl+C trước khi chạy `npm run test:e2e` vì suite tự quản lý cổng 4173. Đóng terminal có biến môi trường kiểm thử trước khi build bản production.

## G. Hạn chế và Definition of Done

| Tiêu chí | Trạng thái |
|---|---|
| Redesign toàn bộ surface chính, tokens, motion, mobile, reduced motion, tài liệu và screenshots | PASS local |
| Bảo toàn dữ liệu/alias/timezone/backend contracts; không đổi quyền | PASS source review + mocks, chưa chứng nhận lại production |
| Không major a11y blockers trong routes/dialog đã quét | PASS axe + keyboard trong Chromium; chưa full WCAG audit |
| TypeScript, ESLint, unit, e2e, build | PASS; chi tiết tại bảng E |
| Bundle/performance được đo và báo đúng | PASS |
| LCP ≤2,5s trên mọi trang đo | FAIL cho chi tiết/cover |
| INP thực tế và animation trên điện thoại phổ thông | BLOCKED / thiếu thiết bị và field data |
| Safari/WebKit, Firefox và keyboard/assistive technology trên thiết bị thật | Chưa chạy; không quy đổi Chromium mobile thành Safari |
| Supabase/Auth/RLS/Storage live của bản mới | Chưa chạy trong đợt redesign; tests ghi dữ liệu chỉ dùng mocks |
| Deploy production | Chưa thực hiện, nằm ngoài quyền tự chủ local |

CSS scroll-driven progress là progressive enhancement: trình duyệt thiếu API vẫn hiển thị toàn bộ nội dung và cuộn thường. Editor dài vẫn tải Tiptap khi vào route; có thể tối ưu tiếp khi có profile sử dụng thực tế.

## H. Điều kiện trước phát hành

1. Review diff final với các file mới và thay đổi có sẵn; không đưa backup/log/fixture evidence hoặc `.env.local` vào commit. Source tests và fixtures kiểm thử có thể commit cùng frontend.
2. Smoke test bản build trên môi trường staging riêng với tài khoản Admin/Editor, signed media và dữ liệu được phép dùng. Không chạy lại migrations/rebuild đã áp dụng.
3. Kiểm tra trên Safari/iOS và Android thật; đo lại LCP/CLS sau hosting với compression/cache và network thật. Thu INP sau khi có field data.
4. Giữ `/bookclub/`, `404.html` recovery, asset paths và variables hiện hành; xác minh artifact/commit được phát hành. Frontend cũ không mặc nhiên là rollback tương thích schema hiện tại.
5. **Commit, push và deploy cần phê duyệt riêng.** Bản này chưa được publish và không có thao tác production đang chờ tự động chạy.

## Vòng tiếp nối

Logo chính thức và chuyển tiếp scroll nhiều lớp của Invitation 3.0 được ghi riêng tại [INVITATION-3.0-VERIFICATION.md](INVITATION-3.0-VERIFICATION.md). Các số đo ở tài liệu này là lịch sử của vòng redesign; không thay thế kết quả hiện hành của 3.0.
