# BookClub CTUT — Invitation 3.0

## Phản hồi về cuộn: nội dung hiện dần, section không chồng nhau

Theo phản hồi tiếp theo của người dùng, cơ chế sticky/scale và chồng lớp section bên dưới **đã được thay thế** bằng reveal từng thành phần trong luồng đọc bình thường. Mô tả cuộn và bằng chứng mới nằm ở [INVITATION-SCROLL-FIX-VERIFICATION.md](INVITATION-SCROLL-FIX-VERIFICATION.md). Các số đo và kết quả bên dưới là lịch sử của bản 11:52, không phải phép nghiệm thu cho hành vi cuộn mới.

## Kết quả hiện hành: 11/11/2026, 11:52 (UTC+7)

**Đã triển khai logo chính thức, bốn chuyển tiếp giấy theo cuộn và sửa lỗi cascade làm mất vật liệu. TypeScript, lint, unit tests, Playwright và build PASS. Mục tiêu LCP ≤2,5s chưa đạt; goal chưa được đánh dấu hoàn thành toàn bộ.** Phần này thay thế các số đo và mô tả bundle trong nhật ký phía dưới.

### Thay đổi và quyết định cuối

- `BookClubLogo` thay dấu `b.` ở header, seal của cover và phần kết. Dùng ảnh gốc qua WebP 192px + PNG fallback; giữ tỷ lệ, alpha và `/bookclub/`. Bốn PNG gốc không thay đổi; thứ tự Đoàn → Hội → CTUT → BookClub được giữ. Không có dấu `b.` nhận diện còn sót trong source.
- Tham chiếu là **video MP4 trong Dribbble**, đúng URL người dùng xác nhận, không phải giao diện trang Dribbble. `reference/research.json`, MP4 5,27s và sáu frame xác nhận bề mặt sáng đi lên, hero rời khung và nội dung xuất hiện lệch nhịp. Easing, thư viện và khoảng pin của tác giả không thể xác minh từ clip.
- `InvitationChapter` + `useChapterScroll` cho lớp trước lùi nhẹ, lớp sau trượt lên theo tiến trình cuộn; bốn chuyển tiếp lời chào → sự kiện → ngày/địa điểm → chương trình → kết thư. Quote có dữ liệu được giữ giữa các chương. Scroll ngược có cùng transform tại cùng vị trí; không chặn wheel/touch.
- Module thiệp tải cùng entry để bỏ waterfall route JS/CSS; Home, EventDetail và admin vẫn lazy. Không thay Auth, resolver, snapshot, query retry hay business logic. `main` dùng `flow-root` để margin cover không đẩy header khi dữ liệu về. Chỉ preload hai subset K2D weight 500.
- **Lỗi đã phát hiện qua ảnh thực:** việc tải module thiệp sớm đảo thứ tự CSS, khiến một số nền bị màu phẳng ghi đè. `main.tsx` nay tải foundation trước enhancements; selector agenda trong `materials.css` có specificity đúng. Test mới kiểm tra texture + gradient trên bảy bề mặt, trước/sau mở và khi rời rồi quay lại route. PASS cả desktop và mobile.
- Giữ SVG linen/paper gốc, glass audio, opening animation, thứ tự đọc và nội dung cá nhân hóa. Không giữ thử nghiệm inline toàn bộ CSS, raster texture hoặc chia bundle thủ công vì chưa chứng minh lợi ích tổng thể. Không thêm dependency hoặc external AI worker.

### Kiểm chứng source hiện hành

Tất cả đường dẫn dưới đây tính từ `.local/ui-redesign/brand-scroll-v3/`.

| Lệnh / kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| `npm run typecheck` | PASS | `typecheck-final.log` |
| `npm run lint` | PASS | `lint-final.log` |
| `npm test -- --maxWorkers=2` | PASS, 120 tests / 25 files, 35,39s | `unit-material-final.log` |
| `npm run test:e2e -- --workers=4` | PASS, 137 tests, 25 skips, 3,4 phút | `e2e-material-final.log`; `playwright-report/index.html` ở repo |
| `npm run build` | PASS | `build-material-final.log` |
| `git -c core.safecrlf=false diff --check` | PASS | Không có lỗi whitespace |
| Vite `--mode e2e`, port 5188 | PASS, 6 chapters, focus anchor và logo đúng | `dev-logo-verified.json`, `after/dev-logo-mobile.png` |
| Tám chiều rộng 320/360/390/430/768/1024/1440/1920 | PASS Chromium, không horizontal overflow trong states kiểm tra | `matrix/`, các test width matrix |
| Cover, opening, group/individual snapshot, deep link/reload, retry | PASS | `app.spec.ts`, `scroll-v3.spec.ts` |
| Scroll thuận/ngược, native touch input, đổi viewport, navigation/remount | PASS | `scroll-v3.spec.ts`, `matrix/native-touch-*.png` |
| Volume 25%, autoplay policy/gesture, play/pause, mute, slider, cleanup | PASS | Unit audio + `invitation-v2.spec.ts`, MP3 fixture thật |
| Keyboard/focus, reduced motion đổi trực tiếp, thiếu motion APIs, text dài/optional sections | PASS | `scroll-v3.spec.ts`, `invitation-v2.spec.ts`, axe checks |
| CSS material sau khởi động và quay lại route | PASS desktop/mobile | `paper and emerald materials survive initial boot and route navigation` |
| Backend và thay đổi local được bảo toàn | PASS | `scope-final.json` so với `baseline/preexisting.patch` |

25 skips vẫn là các bản sao width matrix trong project mobile (8 + 9 + 8). Các chiều rộng chạy trong project desktop; interaction tests chạy cả desktop và touch/mobile. Không đổi assertions hoặc bỏ test lỗi để đạt PASS. Một lỗi ESLint do khởi tạo biến test thừa đã được sửa; lần lint lỗi không được tính PASS.

### Performance: số đo thực, không thay mục tiêu bằng điểm số

Chrome headless, Lighthouse 13.6.0, build E2E tối ưu, server gzip, API/storage fixtures, đo riêng sau khi tests kết thúc. Hai phương pháp dùng cùng source; không so điểm trực tiếp giữa simulated và applied.

| Chỉ số | 2.0 lịch sử, simulated | 3.0 hiện hành, simulated | 3.0 hiện hành, applied |
|---|---:|---:|---:|
| Performance | 91 | 92 | 87 |
| Accessibility | 100 | 100 | 100 |
| LCP | 3.470,6ms | 3.321,3ms | 3.308,9ms |
| CLS navigation | 0,0352 | 0 | 0 |
| TBT | 6ms | 32ms | 25,4ms |

Nguồn: `performance-material-final/{summary.json,cover.html,cover.json,trace.json}` và `performance-material-applied/`. LCP simulated thấp hơn khoảng 149ms so với số lịch sử 2.0; đây là các lần đo lab, không phải thống kê field. **LCP ≤2.500ms: FAIL. CLS ≤0,1 và Accessibility ≥95: PASS.**

Hai sample cuộn 180 frames, CPU ×4, glass mở: median 12,2/6,1ms; p95 54,6/30,3ms; 10/3 frames >50ms; 0 long tasks, CLS 0, một audio instance. Vẫn có spikes, chưa đủ bằng chứng kết luận 60 FPS trên điện thoại thật. Không dùng TBT hoặc synthetic frame sampling thay cho INP.

Entry JS production **373,62 kB raw / 117,63 kB gzip**; CSS entry **64,68 / 14,59 kB**. Thiệp được gộp vào entry, nên không còn chunk InvitationPage riêng. So với bản lazy 3.0 trước đó: entry + route JS là 392,33 / 125,14 kB, CSS 64,67 / 15,43 kB. Home chuyển thành lazy (3,68 / 1,63 kB); đây là tradeoff ưu tiên deep link thiệp, không phải mọi route đều nhẹ đi. Admin editor/Tiptap vẫn không tải trên thiệp. Bốn WebP logo tổng **47.876 bytes**, giảm 56,1% so với bản WebP trước; ảnh gốc giữ nguyên.

Lighthouse vẫn ghi một request script do Kaspersky trên máy chèn vào; allowlist fixture chặn host đó nên có `net::ERR_FAILED`. Raw report giữ lỗi này. Không tắt antivirus, đổi permissions hoặc che lỗi để lấy điểm; không quy nó thành lỗi Supabase. Kết nối production không được kiểm chứng bởi các fixtures.

### Bằng chứng, critique và giới hạn

- [Gallery local](.local/ui-redesign/brand-scroll-v3/index.html): MP4 tham chiếu, video browser desktop/mobile và ảnh sau triển khai. Nội dung sự kiện/người nhận có nhãn fixture, không phải dữ liệu thật.
- `after/`: homepage 1440/390, cover, opened, early/mid/complete/reverse của bốn transition, music mở và reduced motion; `matrix/`: tám chiều rộng và native touch. Ảnh mới được chụp lại sau sửa cascade, không dùng ảnh nền phẳng làm bằng chứng cuối.
- `video/scroll-{1280,390}.webm`: frames Chrome thật với cuộn thuận/ngược; mã hóa MediaRecorder. `video/decoded-frames.json` và `review-*.png` kiểm tra giải mã tại 1/3/6/9/12 giây, không chỉ sự tồn tại file. Đây không phải phép đo FPS thiết bị.
- Critique: xem lại cover và nền emerald sau sửa cascade, lớp sự kiện ở desktop, agenda 320px, mở glass và chiều ngược; giấy có mép/ánh sáng, linen rõ, logo không méo, nội dung không bị cắt trong state kiểm tra. Anti-slop PASS về identity, material có mục đích, reflow, keyboard, reduced motion và dữ liệu minh bạch; Hallmark được dùng làm guidance, **không tuyên bố chạy sloplint** vì bộ reference local không có CLI đầy đủ.
- Safari/Firefox, điện thoại thật, production signed media và field INP: **chưa xác minh**. Chromium touch không được gọi là Safari/iOS thật. Cần kiểm tra thêm trước phát hành.
- Không thay database/schema/migrations/Auth/RLS/RPC; không ghi production, commit, push hay deploy. Diff Auth/domain/package đã có từ trước vòng 3.0 được giữ nguyên. `acceptance-final-source.json` lưu hash các source/assets dùng cho nghiệm thu.

**Phần còn lại:** mục tiêu LCP 2,5s và độ ổn định frame trên thiết bị thật chưa được chứng minh. Không đánh dấu các mục đó PASS hoặc tuyên bố toàn bộ goal đã hoàn tất.

## Nhật ký thực nghiệm trước bản hiện hành

Các bảng phía dưới được giữ để truy vết; source và số đo hiện hành ở phần trên. Bản lịch sử nguyên vẹn còn ở `.local/ui-redesign/brand-scroll-v3/verification-history.md`.

Ngày triển khai: 11/11/2026. Local repository là nguồn sự thật. HEAD ban đầu `c94c855`; working tree đã có redesign và các thay đổi chưa commit. Những thay đổi đó được giữ nguyên; diff tracked trước vòng này được lưu local tại `.local/ui-redesign/brand-scroll-v3/baseline/preexisting.patch`. Báo cáo này chỉ nói về vòng logo + scroll 3.0, tiếp nối Invitation 2.0.

## Triển khai thực tế

| Trước | Vấn đề | Sau | Ưu tiên |
|---|---|---|---|
| Monogram `b.` ở header, dấu thư, phần kết | Chưa dùng logo chính thức | `BookClubLogo`, tỷ lệ 1:1, WebP từ PNG gốc, fallback PNG và base path đúng | P0 |
| Lời chào, tên sự kiện, mô tả cùng một section | Chưa có chuyển tiếp từ người nhận sang sự kiện | Tách thành hai lớp giấy, không thay dữ liệu | P0 |
| Reveal một lần khi đi vào viewport | Cuộn ngược không diễn tiến lại chuyển section | Bề mặt trượt lên và lớp trước lùi nhẹ theo scroll progress, thuận/ngược đối xứng | P0 |
| Giấy liên tục gần phẳng giữa các section | Chưa rõ chiều sâu giữa các phần | Sticky ngắn, mép giấy sáng, foil và contact shadow, chất liệu 2.0 được giữ | P1 |
| Vị trí cuộn cover được giữ khi mở | Trên viewport thấp có thể vào giữa thiệp, anchor bị lớp mới che | Đưa viewport về đầu lời chào, focus tên người nhận, wrapper không chặn click | P0 |
| Vòng đo dùng server gzip ở 2.0 | So sánh sai nếu đo không gzip | Lưu cả kết quả không gzip và kết quả cùng điều kiện gzip | P1 |

Không sửa database, schema, migrations, RLS, RPC, Auth, resolver, snapshot, primary alias hoặc business logic. Không ghi production, commit, push hay deploy. Những diff backend/logic/package đã có trước phiên này không phải thay đổi của vòng 3.0.

## Reference và skills

- Trang nguồn: https://dribbble.com/shots/27851575-Travel-Website-Design-Booking-Platform
- Video đã mở: https://cdn.dribbble.com/userupload/49477073/file/fff162559e5da70e121c8118c963c7bb.mp4
- Đã xem sáu mốc trong clip 5,27s, không chỉ thumbnail. Bề mặt sáng đi lên, hero rời khung và nội dung mới xuất hiện có nhịp; loop quay lại hero. Không có bằng chứng để khẳng định clip dùng GSAP, pin cụ thể, tỷ lệ scroll hay easing nào.
- File reference, video và frames chỉ giữ trong `.local/ui-redesign/brand-scroll-v3/reference/`, không đưa vào assets sản phẩm.
- Đã đọc và áp dụng Anti-slop core/UI/human/mobile; bản Hallmark và Scroll Craft có sẵn ở `.local/design-references/` được dùng làm hướng dẫn critique về hierarchy, vật liệu, chuyển động và composition. Không chạy installer hoặc script bên thứ ba, không tuyên bố đã chạy Hallmark sloplint khi không có bộ script đầy đủ.
- Không dùng external AI worker; không thêm dependency.

## Thay đổi kỹ thuật của vòng này

| File | Vai trò |
|---|---|
| `src/components/BookClubLogo.tsx` | Logo chính thức dùng chung, alt/decorative semantics, WebP + PNG fallback |
| `src/components/SiteLayout.tsx` | Thay dấu header bằng logo |
| `src/components/InvitationChapter.tsx` | Wrapper + sheet, giữ semantic section của nội dung |
| `src/App.tsx` | Route thiệp dùng Router lazy, module và public query tải song song; giữ cache/resolver/retry |
| `src/pages/InvitationPage.tsx` | Các chương thư; logo cover/closing; đưa viewport về đầu khi mở |
| `src/hooks/useChapterScroll.ts` | Scrub transform, resize, reduced motion, cleanup |
| `src/styles/chapters.css` | Sticky track, stacking, edge/material, keyboard và mobile fallback |
| `src/styles/public.css`, `src/styles/invitation.css` | Kích thước logo, hierarchy section sự kiện, touch target link, bỏ selector animation không còn dùng |
| `tests/e2e/scroll-v3.spec.ts` | Progress/reverse, overlap, eight widths, logos, reload, navigation, anchors, nội dung dài, thiếu API, native touch và đổi viewport |
| `tests/e2e/app.spec.ts` | Cập nhật ba kỳ vọng cấu trúc cho section sự kiện mới; giữ toàn bộ assertions dữ liệu và overflow |
| `scripts/review-scroll.mjs` | Chụp desktop/mobile, từng giai đoạn và chiều ngược, music/reduced motion |
| `scripts/record-scroll.mjs` | Video browser thật bằng CDP + MediaRecorder của Chrome, không cài phần mềm |
| `scripts/measure-invitation.mjs` | Cho phép chọn thư mục báo cáo để không ghi đè số đo 2.0 |
| `vite.config.ts` | Mode E2E cố định endpoint/khóa giả; không để lệnh build kiểm thử thủ công kế thừa production config |

Hệ âm thanh, storage signed URLs, opening-paper và observer reveal 2.0 không bị thay thế. Logo PNG nguyên bản 870.387 bytes được giữ; bản WebP 192px được tối ưu từ 21.322 xuống 9.134 bytes, dùng ở kích thước 44–80px, không crop/filter/recolor. Ba logo đơn vị cũng được nén lại từ PNG gốc; giữ tỷ lệ, alpha và thứ tự. Không tạo asset nhận diện khác.

## Bằng chứng trực quan

Thư mục gốc: `.local/ui-redesign/brand-scroll-v3/` (gitignored, lưu local).

- `reference/`: video tham khảo, sáu frame và metadata nguồn.
- `after/home-{1440,390}.png`: homepage với nhận diện mới.
- `after/cover-{1440,390}.png`, `after/opened-{1440,390}.png`: cover và lời chào.
- `after/{event,schedule,program,closing}-{early,mid,complete,reverse}-{1440,390}.png`: diễn tiến bốn chuyển tiếp.
- `after/music-{1440,390}.png`, `after/reduced-full-{1440,390}.png`: capsule đang mở và toàn bộ thiệp giảm chuyển động.
- `matrix/`: bốn chuyển tiếp tại 320/360/390/430/768/1024/1440/1920px, desktop và touch interactions.
- `matrix/native-touch-{forward,reverse}-{desktop,mobile}.png`: cuộn bằng CDP touchStart/touchMove/touchEnd; kiểm tra cả chiều ngược và đổi viewport 390×844 ↔ 844×390. Đây là touch input trong Chromium, không phải đo trên điện thoại thật.
- `video/scroll-{1280,390}.webm`: browser frames thực; cuộn thuận/ngược bằng script, mã hóa bằng MediaRecorder. Video minh họa chuyển động, không dùng để tuyên bố FPS thiết bị thật.
- Video được quay lại sau regression cuối; script giữ tab thiệp foreground khi thu hình. Kiểm tra giải mã tại 1/3/6/9/12s có hình khác nhau (`video/decoded-frames.json`, `video/review-*.png`); xem được phần chuyển lớp và phần kết, không chỉ kiểm tra file tồn tại.
- Baseline 2.0 trước sửa: `.local/ui-redesign/invitation-v2/before-v-three/`.

Critique đã thực hiện: logo có vòng trắng đúng nguyên bản và rõ trên hai nền; giấy có cạnh/ánh sáng, emerald không thành solid; mobile 320px không tràn; timeline, text dài và điều khiển nhạc vẫn đọc/thao tác được. Phiên bản đầu chưa giữ lớp trước đủ lâu đã được chỉnh track; kiểm tra anchor phát hiện và sửa lỗi vùng che click. Screenshot không thay thế kiểm tra tiến trình: test so sánh transform ở nhiều vị trí và xác nhận cùng vị trí khi cuộn ngược cho cùng kết quả.

## Kết quả kiểm thử

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --maxWorkers=2` | PASS: 25 files, 120 tests, 20,22s; log `unit-verified.log` |
| `npm run test:e2e -- --workers=4` | PASS: 135 tests, 25 skipped có chủ đích, 2,8 phút; log `e2e-routing-verified.log` |
| `npm run build` | PASS — production bundle |
| Vite dev `npm run dev -- --host 127.0.0.1 --port 5173` + browser smoke | PASS — fixture mobile, anchor và không page error/overflow |
| Targeted regression sau sửa anchor/selector | PASS — 10 tests desktop/mobile |
| Cold route/module bị trì hoãn + lỗi dữ liệu/retry | PASS desktop/mobile; một request khi tải lần đầu, dữ liệu vẫn tải trong lúc module chưa sẵn sàng |
| Vite dev `--mode e2e` ở port 5188 + browser mobile | PASS: mở thiệp, 6 chapters, focus anchor đúng, không page error/overflow; `dev-verified.json` |
| Logo src/base path, tỷ lệ, reload/deep links | PASS Chromium |
| Scroll thuận/ngược, overlap, navigation/remount | PASS Chromium desktop/touch |
| Native touch swipe và resize thiệp đang mở | PASS cả hai projects; tiến trình đổi theo vuốt và đo lại chiều cao sheet sau resize |
| Keyboard anchors, text dài, options vắng, thiếu ResizeObserver | PASS |
| Live reduced motion và thiếu IntersectionObserver | PASS |
| MP3 thật từ fixture, autoplay blocked/gesture, volume/mute, focus/slider | PASS bộ regression 2.0 |
| Axe WCAG2A/AA/2.1AA các routes/dialog và thiệp dài | PASS trong các state kiểm thử |
| Browser page errors / asset failures của app | Không phát hiện trong fixture QA; ngoại lệ môi trường đo ở mục dưới |
| `git diff --check` | PASS |

25 test skipped là các bản sao ma trận kích thước trong project mobile: 8 của 2.0, 9 của redesign, 8 của 3.0. Các chiều rộng đã chạy trong project desktop; test interaction cũng chạy với cấu hình touch/mobile. Không có test chức năng thất bại bị đổi thành skip. Log xác minh mới nhất: `.local/ui-redesign/brand-scroll-v3/e2e-routing-verified.log`; các log 129/131 tests trước đó vẫn giữ để đối chiếu. HTML report: `playwright-report/index.html`.

Lần chạy lại `npm test` đồng thời với typecheck/lint có một test rich quote editor vượt timeout 5.000ms (119/120 PASS). Chạy lại đủ suite bằng `npm test -- --maxWorkers=2` PASS 120/120 trong 31,67s; không sửa test editor, tăng timeout hoặc bỏ assertions. Không gọi lần timeout là PASS.

Các lỗi phát hiện trong quá trình phát triển đã được sửa: ba test còn dùng cấu trúc greeting cũ và lỗi click anchor thực trên desktop thấp. Không bỏ assertions dữ liệu/overflow, không dùng force click để vượt lỗi UI. Các lệnh ban đầu bị sandbox chặn ghi cache/khởi tạo process đã chạy lại thành công bằng quyền local được phê duyệt.

## Performance và giới hạn

Môi trường: Chrome headless, build tối ưu chạy local, Supabase/storage fixtures, Lighthouse 13.6.0 simulated mobile. Lần đo hiện hành ngày 11/11/2026 10:45 (UTC+7), chạy riêng trước khi khởi động bộ tests cuối, server bật `E2E_GZIP=true`, cùng cấu hình mạng/CPU của số đo 2.0. Source của phép đo là bản Router lazy + SVG đã qua bộ regression cuối.

| Chỉ số | Invitation 2.0 lịch sử | 3.0 final | Đánh giá |
|---|---:|---:|---|
| Lighthouse Performance mobile | 91 | 91 | Không suy giảm điểm trong điều kiện đo này |
| Lighthouse Accessibility | 100 | 100 | PASS mục tiêu ≥95 |
| LCP simulated mobile | 3.471 ms | 3.468 ms | **FAIL mục tiêu ≤2.500 ms**, gần như không đổi |
| CLS navigation | 0,0352 | 0 | PASS ≤0,1 |
| TBT | 6 ms | 0 ms | Đo thật trong lab, không phải INP |

Scroll sample final: 180 frames tổng hợp ở 390×844, CPU ×4 và capsule kính mở. Median 6,1ms, p95 18,3ms, 3 frames >50ms, 0 long tasks, CLS trong sample 0, audio instances 1. Vẫn có frame spikes; **không tuyên bố đạt 60 FPS trên thiết bị thật**. Những thống kê này không phải field INP. Cached height/style giảm ghi DOM; không thêm framework animation, không có vòng rAF chạy khi không cuộn/resize.

Lần đo không gzip ban đầu: Performance 78, LCP 6.243ms; lưu tại `performance/`, không dùng để so sánh với baseline 2.0 có gzip. Lần đối chứng gzip: `performance-gzip/`. Final hiện hành: `performance-routing-final/summary.json`, `cover.html`, `cover.json`, `trace.json`. LCP còn chịu tải bootstrap, waterfall route/asset và ảnh hưởng môi trường đo; logo mới dùng WebP có sẵn, route JS/CSS vẫn lazy. Không đổi auth/data bootstrap để chạy theo điểm số trong nhiệm vụ UI này.

| Bundle | Trước 3.0 (raw / gzip) | Sau 3.0 (raw / gzip) |
|---|---:|---:|
| Invitation route JS | 19,85 / 7,20 kB | 22,26 / 7,94 kB |
| Invitation route CSS | 16,04 / 4,29 kB | 18,15 / 4,73 kB |
| Entry JS | 369,74 / 117,04 kB | 370,07 / 117,20 kB |

Phần thêm cho route + entry khoảng **1,34 kB gzip**. Không thêm dependency, font, ảnh mới hoặc tải mã admin vào thiệp. Build log cuối: `build-routing-verified.log`.

Trong profile Lighthouse có request script được phần mềm Kaspersky trên máy chèn vào, host `gc.kis.v2.scr.kaspersky-labs.com`; allowlist QA chặn request ngoài local/fixture nên có `net::ERR_FAILED` tương ứng. Lỗi này được giữ trong report raw và phân loại là môi trường, không che bằng mock trả PASS. Không đổi cấu hình antivirus. Browser QA ứng dụng không phát hiện uncaught exception hoặc asset lỗi.

Thử nghiệm tải sớm JS/CSS theo deep link được đo với cùng Lighthouse 13.6.0, gzip, CPU ×4 và fixture. Lần đầu LCP 3.659,8ms, Performance 90, có cảnh báo credentials của CSS preload. Sau sửa crossorigin và bỏ preload trùng: LCP 3.508,3ms, Performance 91, Accessibility 100, không còn cảnh báo preload; request Kaspersky vẫn bị allowlist chặn. Phương án không cải thiện so với 3.475,5ms nên đã gỡ hoàn toàn khỏi source và Vite config. Hai báo cáo giữ ở `performance-preload/` và `performance-preload-corrected/`; không dùng các số đó làm kết quả final. Production build chạy lại PASS, các hash JS/CSS khớp bản đã qua regression. Log `build-confirmed.log`.

Kết nối Supabase production không được kiểm chứng bằng fixture QA. Không quy lỗi preload hoặc sandbox `spawn EPERM` thành lỗi kết nối database, và không đổi quyền/sandbox hoặc phần mềm bảo vệ máy để làm đẹp số đo.

Thử rasterize SVG thành texture WebP làm CSS route tăng thành 132,44 kB raw / 91,97 kB gzip; phép đo `performance-baked/` cho Performance 88, LCP 3.908ms. Đã gỡ bitmap khỏi source assets và khôi phục SVG 1.224 bytes. Các file thử nghiệm giữ trong `experiments/`, không đóng gói vào sản phẩm.

Một lần đo thủ công ở `performance-router-verified/` không hợp lệ: build E2E chưa được cấp cấu hình fixture nên không tìm thấy thiệp kiểm thử, bước mở thiệp timeout. Không dùng kết quả đó để báo PASS. Đã cố định endpoint giả trong mode E2E của Vite rồi chạy lại phép đo thành công và đủ 135 E2E tests. Lần dev smoke đầu gặp port 5174 đã được sử dụng; không dừng process có sẵn, chuyển sang port 5188 và kiểm tra thành công.

Ảnh `after/` được chụp lại sau khi khôi phục SVG và áp dụng Router lazy; `after/browser.json` không có overflow/page errors. Ma trận tám chiều rộng được cập nhật bằng suite cuối. Anti-slop audit trong phạm vi thay đổi: PASS về reflow (320–1920px), keyboard/focus (anchor, menu, music), dữ liệu thật tách fixture, reduced motion và tính nhất quán vật liệu. Hallmark được dùng làm hướng dẫn về hierarchy và motif giấy; không chạy hoặc tuyên bố PASS sloplint vì bộ reference local không có CLI đó.

Đo chẩn đoán unthrottled riêng (`loading-timing.json`): dữ liệu người nhận xong ở 99,5ms, module/CSS xong ở 101,5/105,1ms, cover gắn DOM ở 118,7ms; LCP được browser ghi nhận ở 724ms. Điều này xác nhận khoảng đợi gắn cover đã giảm so với ghi nhận khoảng 400ms trước đó, nhưng còn khoảng cách từ DOM đến paint. Không dùng số unthrottled này thay cho Lighthouse mobile 3.468ms. Goal vẫn cần xử lý/đánh giá tiếp phần mục tiêu LCP, không coi số liệu hiện tại là PASS mục tiêu 2,5s.

## Trạng thái nghiệm thu

### Chẩn đoán bổ sung ngày 11/11/2026, 11:00–11:05 (UTC+7)

- Trace SVG hiện hành ghi nhận các GPU task dài nhất 176,85ms và 132,52ms; cover xuất hiện trong DOM sớm hơn thời điểm được paint. Đây là bằng chứng chi phí rendering, không phải bằng chứng Supabase bị chặn mạng.
- Đã thử rasterize đúng kích thước tile gốc (96px linen / 128px paper), WebP quality 0,7. Hai tile cộng 21.212 bytes; route CSS tăng từ 4,73 lên 26,09 kB gzip. LCP quan sát không throttle giảm từ 654 xuống 521ms trong hai lần đo, nhưng LCP simulated mobile vẫn 3.468ms, Performance 91; một cặp số đo không chứng minh cải thiện ổn định. **Không giữ phương án này**: SVG gốc và bundle ban đầu đã được khôi phục. Evidence: `performance-native-tiles/`; script thử nghiệm chỉ nằm trong `experiments/optimize-native-materials.mjs`.
- `scripts/measure-invitation.mjs` thêm `--applied-throttling` và ghi rõ `throttlingMethod` trong JSON. Chế độ mặc định vẫn là simulated mobile để giữ khả năng so sánh với 2.0. Đây là thay đổi công cụ đo, không đổi cấu hình browser hoặc antivirus.
- Đo bổ sung `performance-applied/` bằng Lighthouse DevTools throttling (mạng và CPU x4 áp trực tiếp): **Performance 82, Accessibility 100, LCP 3.952,9ms, CLS 0, TBT 40,9ms**. Không so điểm trực tiếp với simulated 91, không thay số đo mặc định bằng số thuận lợi hơn. Mục tiêu LCP 2,5s chưa đạt trong cả hai cách đo.
- Trong trace applied, entry JS kết thúc tải khoảng 2.355ms và CSS route khoảng 3.261ms; phần còn lại gồm render/paint. Hướng chẩn đoán tiếp theo là chuỗi tải bootstrap → route CSS, không lặp lại rasterization đã thử và không đổi Auth/resolver để chạy theo điểm số.
- Kaspersky vẫn chèn request ngoài local/fixture và allowlist kiểm thử chặn request đó. Không tắt bảo vệ máy, không sửa permission và không quy `ERR_FAILED` này thành lỗi database.
- Đối chiếu diff tracked với `baseline/preexisting.patch`: Auth, domain/business logic, package/lockfile và Supabase giữ nguyên như đầu vòng 3.0. Không có dependency mới hoặc ghi production.

### Kiểm chứng lại source hiện hành

Ngày 11/11/2026 khoảng 11:09 (UTC+7): `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS (`build-acceptance.log`); `npm run test:e2e -- --workers=4` PASS **135 tests / 25 skips**, 3,0 phút (`e2e-acceptance.log`); `npm test -- --maxWorkers=2` PASS **120 tests / 25 files**, 21,11s (`unit-acceptance.log`). Không đổi assertions hoặc skips để đạt kết quả. `git diff --check` PASS. `acceptance-source.json` lưu SHA-256 của các file chính và thống kê bằng chứng: 44 ảnh trong `after/`, 46 ảnh trong `matrix/`.

Đã xem lại ảnh cover 390px, chuyển tiếp 320px, 1440px, 1920px và agenda mobile: logo giữ tỷ lệ/vòng trắng gốc; mép giấy và texture emerald còn rõ; không tràn ngang hoặc mất nội dung tại các ảnh đã kiểm tra. E2E xác minh tiến trình forward/reverse, overlap và toàn bộ tám chiều rộng. Ma trận xác minh yêu cầu:

| Yêu cầu của goal 3.0 | Bằng chứng source / runtime | Kết quả |
|---|---|---|
| Logo chính thức thay dấu `b.`, tỷ lệ và base path | `BookClubLogo`, `SiteLayout`, cover/closing; test `official identity loads…` và ảnh homepage/cover | PASS |
| Tham khảo video, không chỉ thumbnail/trang Dribbble | MP4 5,27s cùng 6 frame trong `reference/`; cơ chế được ghi trong `DESIGN.md` | PASS; easing/thư viện của tác giả không xác minh được |
| Bốn chuyển tiếp liên tục theo scroll, lớp trước lùi, lớp sau đi lên | `useChapterScroll`, `chapters.css`; test `paper progress…`, ảnh early/mid/complete/reverse và hai video browser | PASS |
| Nội dung dài/optional sections, scroll ngược và touch | `long content…`, `native touch scrolling…`, ma trận 320/360/390/430/768/1024/1440/1920 | PASS Chromium; không phải điện thoại thật |
| Giữ opening, personalization, thứ tự logo, music/glass/25% | Các regression `app.spec.ts` và `invitation-v2.spec.ts`, fixture snapshot và MP3 thật | PASS |
| Giữ linen/paper/foil/depth | `materials.css` dùng SVG gốc, ảnh cover và các sheet | PASS; bitmap thử nghiệm đã gỡ khỏi sản phẩm |
| Reduced motion, keyboard/focus, reading order, cleanup | Media change, anchors, navigation/back/remount, missing APIs và axe trong E2E | PASS các state được kiểm thử |
| Deep link/refresh và `/bookclub/` | GitHub Pages-style server, logo route/base tests, reload/navigation | PASS local |
| Performance không suy giảm nghiêm trọng; LCP/CLS/a11y mục tiêu | Simulated 91/100, LCP 3.468ms, CLS 0; phép đo applied riêng ghi phía trên | **LCP FAIL**; điểm simulated giữ 91 như baseline 2.0 |
| Giới hạn frontend, dữ liệu/backend và thay đổi local | So diff baseline; fixture-only QA; không commit/push/deploy | PASS |

Script chụp ảnh lần đầu sau E2E gặp `ERR_CONNECTION_REFUSED` do Playwright đã tự dừng server fixture ở port 4173. Đã xác minh server kết thúc và khởi động lại `scripts/e2e-server.mjs` với gzip để chụp lại; đây là vòng đời server local, không phải CDN/Supabase hay permission.

Logo, scroll-linked layering, reverse, bốn chuyển tiếp, vật liệu, opening/music, responsive, keyboard/reduced motion, tests, build, browser screenshots/video và tài liệu: **PASS local**. Target LCP ≤2,5s: **FAIL**, công bố đúng số đo. Safari/Firefox, điện thoại thật và field INP: **chưa xác minh**. Không quy đổi Chromium touch thành Safari.

Mở `.local/ui-redesign/brand-scroll-v3/index.html` để xem gallery, video MP4 tham chiếu do người dùng xác nhận và hai video BookClub desktop/mobile. Bằng chứng BookClub dùng fixture có nhãn kiểm thử, không phải dữ liệu khách mời thật.

## Trước khi phát hành

### Cập nhật 11/11/2026, 11:24–11:30 (UTC+7)

- Đã gỡ plugin `invitation-resource-hints` còn sót trong `vite.config.ts`. Thử tải song song cho LCP simulated 3.449ms nhưng applied 4.147ms, chưa chứng minh lợi ích. Không giữ cơ chế khởi động bổ sung sau thử nghiệm. Hai report giữ ở `performance-parallel-bootstrap/` và `performance-parallel-applied/`.
- `scripts/optimize-logos.mjs` dùng WebP quality 0,92. Bốn PNG gốc giữ nguyên. Bản WebP BookClub giảm 21.322 → 9.134 bytes; Đoàn 34.004 → 14.046; Hội 19.198 → 10.236; CTUT 34.530 → 14.460. Tổng giảm **61.178 bytes (56,1%)**, vẫn 192px và giữ alpha. Đã xem ảnh đối chiếu `experiments/logo-comparison.png` ở kích thước hiển thị 64px/DPR 2 trên nền cream và emerald; không thấy méo hoặc mất chi tiết ở kích thước này. Các WebP trước tối ưu được giữ trong `experiments/original-webp/`.
- Đo source hiện hành, riêng khỏi quá trình test: `performance-logo-compression/summary.json`: **Performance 91, Accessibility 100, LCP 3.474,9ms, CLS 0, TBT 9ms** (simulated). `performance-logo-applied/summary.json`: **Performance 83, Accessibility 100, LCP 3.926,4ms, CLS 0, TBT 39,1ms** (applied). Logo nhẹ hơn nhưng chưa chứng minh giảm LCP đáng kể. Đây là số đo mới nhất; các bảng trước giữ làm lịch sử đối chứng.
- Sample cuộn CPU ×4 của simulated: 180 frames, median 7,7ms, p95 30ms, 3 frames >50ms, không long task, CLS 0, một audio instance. Chưa đáp ứng bằng chứng 60 FPS trên điện thoại thật.
- Request script do Kaspersky chèn vẫn bị allowlist fixture chặn; giữ nguyên lỗi trong report. Không thay antivirus, permissions hoặc production để cải thiện số đo.
- `node scripts/review-scroll.mjs` chụp lại 44 ảnh ở `after/`: không page error hoặc overflow. Đã xem lại cover, chương sự kiện ở 320px/1440px, lịch mobile, agenda, music capsule và closing. Mép giấy, texture, logo và chiều sâu vẫn được giữ.
- `npm run typecheck` và `npm run lint`: PASS. `npm test -- --maxWorkers=2`: **120/120 PASS, 25 files**, 21,76s (`unit-logo-verified.log`). `npm run build`: PASS (`build-logo-verified.log`). Bundle JS/CSS không tăng; tối ưu chỉ giảm dung lượng ảnh.
- `npm run test:e2e -- --workers=4`: **135 PASS / 25 skipped**, 2,9 phút (`e2e-logo-verified.log`). 25 skips vẫn là bản sao ma trận viewport trong project mobile, không bỏ test lỗi. `git diff --check`: PASS. `acceptance-logo-source.json` ghi hashes source/assets và 45 ảnh `after/`, 46 ảnh `matrix/`.
- Browser smoke trên Vite `--mode e2e` port 5188: PASS, 6 chapters, mở thiệp và focus anchor chính xác, logo 192px đã decode, không overflow/page error. `dev-logo-verified.json` vẫn ghi riêng request Kaspersky bị chặn. Không có truy cập production trong phép kiểm tra này.
- `scope-logo-verification.json` đối chiếu tracked diff với đầu vòng 3.0: các thay đổi có sẵn trong Auth, domain, package và lockfile được giữ nguyên, không thay backend. Không thêm dependency, không commit/push/deploy.

**Còn chưa đạt:** LCP ≤2,5s trong cả simulated và applied throttling. Không dùng kết quả nén ảnh, điểm Accessibility hoặc số đo không throttle để thay cho mục tiêu này. Goal chưa được đánh dấu hoàn thành toàn bộ.

Review riêng diff 3.0 với các thay đổi local từ trước. Kiểm tra thêm Safari/iOS, Firefox, điện thoại thật và staging signed media; lần này chỉ dùng Chromium desktop/touch. Giữ base `/bookclub/`, fallback `404.html` và asset gốc. Không tự chạy migrations hoặc thao tác production. Việc commit/push/deploy vẫn chưa thực hiện.
