# BookClub CTUT: nội dung hiện dần khi cuộn

Ngày 11/11/2026. Đây là thay đổi theo phản hồi mới nhất: phần sau không che nội dung phần trước; các thành phần nhỏ trong phần tiếp theo hiện dần theo nhịp cuộn. Hướng này thay thế chuyển tiếp chồng section của Invitation 3.0, giữ nhận diện và vật liệu hiện có.

## Thay đổi thực tế

| Trước | Sau | Lý do |
|---|---|---|
| Toàn bộ sheet sticky, scale/translate; phần tiếp theo trượt chồng lên | Các sheet nằm trong normal flow, không sticky, margin âm hoặc transform | Không che tiêu đề hay dòng cuối phần trước |
| Nội dung vào cùng cả mảng giấy | Tiêu đề, đoạn văn, chi tiết lịch, địa điểm và từng mục agenda có tiến trình riêng | Hiện lần lượt theo vị trí, không chờ timer |
| Nhiều reveal tác động vào nội dung cùng chuyển tiếp sheet | `useChapterScroll` quản lý nội dung; `useInvitationMotion` chỉ giữ ornament | Không cộng dồn transform hoặc xuất hiện đồng loạt |
| Pointer focus làm reset transform khi bấm liên kết | Chỉ keyboard `:focus-visible` làm hiện nội dung ngay | Không dịch liên kết giữa pointer-down và pointer-up |

`chapters.css` giữ texture giấy/emerald, mép foil và chiều dày bên cạnh. Nội dung không bị clip. Khoảng dịch là 28px desktop/16px mobile; agenda dịch ngang nhẹ. Native CSS view timeline hoàn tất trong tối đa 180px cuộn. Cuộn ngược diễn tiến lại theo cùng vị trí; không khóa wheel/touch.

Fallback dùng một passive scroll listener và rAF theo nhu cầu. Đo offset không bị transform tác động; cache tiến trình tránh ghi DOM thừa. Reduced motion, print và thiếu API vẫn đọc được. Listener, ResizeObserver, rAF và style được cleanup khi tắt chuyển động/unmount. Không thêm dependency.

## Source và phạm vi

- `src/hooks/useChapterScroll.ts`: chuyển từ transform sheet sang tiến trình từng phần tử.
- `src/hooks/useInvitationMotion.ts`: giữ ornament, bỏ reveal trùng với hook nội dung.
- `src/styles/chapters.css`: bỏ chồng section; animation/focus/reduced-motion cho nội dung.
- `tests/e2e/scroll-v3.spec.ts`: thay assertion bắt buộc overlap bằng không overlap; kiểm tra tiến trình, reverse, native touch, bàn phím, fallback và agenda dài.
- `scripts/review-content-scroll.mjs`: chụp/đo tám chiều rộng bằng fixtures.
- `scripts/record-scroll.mjs`: nhận thư mục xuất và origin tùy chọn để lưu video mới riêng khỏi bằng chứng cũ.
- `DESIGN.md`, `INVITATION-3.0-VERIFICATION.md`, tài liệu này: cập nhật hướng chuyển động và liên kết bằng chứng.

Đối chiếu `.local/ui-redesign/content-scroll-fix/scope.json`: Auth, domain, package/lockfile và backend giữ nguyên các thay đổi có sẵn ở đầu vòng 3.0. Resolver, snapshot, audio controller, logo, textures, App/router và dữ liệu thiệp không thay đổi so với source nghiệm thu 11:52. Không commit/push/deploy hoặc ghi Supabase production.

## Bằng chứng trình duyệt

Nguồn bằng chứng: `.local/ui-redesign/content-scroll-fix/`.

- [Gallery ảnh và video](.local/ui-redesign/content-scroll-fix/index.html).
- `browser.json`: 160 mẫu tiến trình và 32 mẫu layout; không overlap hoặc horizontal overflow ở 320/360/390/430/768/1024/1440/1920px. Không page exception. Tất cả dùng dữ liệu mô phỏng được intercept, không seed database.
- `program-{width}.png`: tiêu đề “Nội Dung & Tiến Trình Buổi Lễ” và từng mục; `event-*`, `schedule-*`, `closing-*`: bốn phần trong flow.
- `agenda-enter-*`, `agenda-half-*`, `agenda-read-*`: tiến trình xuất hiện từng mục ở 390/1440px. `reduced-*`: toàn bộ nội dung hiện sẵn khi giảm chuyển động.
- `video/scroll-{1280,390}.webm`: hai video Chrome thật, cuộn thuận/ngược khoảng 13 giây mỗi video. `decoded-frames.json` kiểm tra giải mã tại 2/5/8/11 giây; ảnh `review-*` đã được xem lại. Không dùng số frame ghi hình để tuyên bố FPS trên điện thoại thật.
- Vite chạy `--mode e2e` tại port 5190. Playwright suite dùng build E2E và local server port 4173; các endpoint là `bookclub-test.invalid`.

## Kiểm thử

| Lệnh / kiểm tra | Kết quả | Bằng chứng trong thư mục trên |
|---|---|---|
| `npm run typecheck` | PASS | `typecheck.log` |
| `npm run lint` | PASS | `lint.log` |
| `npm test -- --maxWorkers=2` | PASS, 120 tests / 25 files | `unit.log` |
| `npm run test:e2e -- --workers=4` | PASS, 141 tests, 25 skips, 3,2 phút | `e2e-final.log` |
| `npm run build` | PASS | `build.log` |
| Fallback + keyboard + live reduced motion, ba lần mỗi project | PASS, 6/6 | `fallback.log` |
| Cuộn thuận/ngược, native touch, resize, agenda dài, không overlap | PASS desktop/mobile | `scroll-v3.spec.ts`, `matrix/` |
| Tám chiều rộng và review ảnh/video | PASS các state đã kiểm tra | `browser.json`, ảnh, `video/decoded-frames.json` |
| `git -c core.safecrlf=false diff --check` | PASS | Không lỗi whitespace |
| Giữ protected changes và source không liên quan | PASS | `scope.json` |

25 skips là các bản sao ma trận chiều rộng trong project mobile đã có từ trước; ma trận chạy ở project desktop, các test tương tác chạy cả hai. Không bỏ test đang lỗi để đạt PASS.

Các lỗi trong lần kiểm thử đầu không được tính thành PASS: click bị hụt do pointer focus (đã sửa CSS); phép đo fallback lấy mẫu khi keyboard focus smooth-scroll chưa kết thúc (bài kiểm thử chờ scroll ổn định rồi mới so sánh vị trí). `e2e.log` giữ lượt 139 PASS/2 FAIL trước sửa đồng bộ kiểm thử; `e2e-final.log` là kết quả cuối. Bài kiểm thử vẫn xác minh opacity, transform, cleanup và tiến trình đảo ngược; không nới tolerance hay xóa assertion để tránh lỗi.

Các thao tác hồi quy gồm mở thiệp bằng chuột/bàn phím; anchor đến sự kiện/lịch; tabs ảnh/bản đồ; copy; music mở/đóng, play/pause/mute/volume 25%; liên kết cuối thiệp; back/remount; individual/group snapshots; login, guard và các form quản trị bằng mocks. Axe chạy trong suite cho các route/dialog và nội dung dài.

## Bundle

Production entry JS: **372,78 kB raw / 117,27 kB gzip**; entry CSS: **64,80 / 14,57 kB**. Bản 3.0 trước sửa: JS 373,62 / 117,63 kB, CSS 64,68 / 14,59 kB. Không thêm dependency, ảnh, font hoặc framework; bundle không tăng đáng kể. Không dùng dung lượng bundle để suy ra LCP/FPS.

## Performance đo trên bản hiện tại

Lighthouse 13.6.0, Chrome headless, mobile simulated throttling, build E2E với gzip và fixtures; đo riêng sau khi tests kết thúc lúc 12:16 (UTC+7). Nguồn: `performance/summary.json`, `performance/cover.html` và `performance/cover.json`.

| Chỉ số | Kết quả thực | Đánh giá |
|---|---:|---|
| Performance | 92 | Giữ mức bản 3.0 trước sửa |
| Accessibility | 100 | PASS mục tiêu ≥95 |
| LCP | 3.317,9ms | **FAIL mục tiêu ≤2.500ms** |
| CLS | 0 | PASS mục tiêu ≤0,1 |
| TBT | 0ms | Số đo lab, không phải field INP |

Sample cuộn 180 frames ở 390×844, CPU ×4, glass controller mở: median 6,1ms, p95 6,2ms, không frame >50ms hoặc long task; CLS 0 và một audio instance. Đây là kiểm tra synthetic rAF trên máy local, không chứng minh 60 FPS trên thiết bị phổ thông. LCP gần như bản trước (3.321,3ms); không diễn giải chênh lệch vài mili giây thành cải thiện tốc độ có ý nghĩa.

## Kiểm tra chất lượng

- Anti-slop core/UI/human/mobile được dùng theo mode `during` đã lưu. Hallmark Markdown local được đọc để đối chiếu nhịp nội dung, focus và material; không chạy CLI/sloplint hoặc external AI worker.
- R-03/35: ảnh thực và geometry ở tám chiều rộng; có native touch input và thay viewport. Phần sau không vẽ lên phần trước.
- R-19: chuyển động dẫn mắt qua từng chi tiết; nền giấy giữ yên trong luồng đọc. Không thêm loop, pin, scroll hijacking hoặc framework mới.
- R-24/26/32: các anchor/venue controls/music và liên kết cuối thiệp được kiểm tra bằng suite; keyboard focus hiện nội dung ngay, pointer focus giữ vị trí.
- R-17/36/38: giữ dữ liệu sản phẩm, không thêm nội dung giả vào UI; ảnh QA ghi rõ fixtures. Không dùng kết quả Chromium để tuyên bố đã kiểm thử Safari/iPhone thật.

## Giới hạn

Chưa kiểm tra trên Safari/Firefox và điện thoại thật. Native timeline và fallback được kiểm tra trong Chromium; fallback được bật bằng cách mô phỏng thiếu CSS timeline API. Request do Kaspersky chèn bị allowlist local chặn và được ghi riêng trong `browser.json`; không phải lỗi ứng dụng hoặc Supabase. Không đổi antivirus/permissions.

**Phần sửa cuộn đã nghiệm thu local. Goal tổng thể còn mục tiêu LCP 2,5 giây chưa đạt và kiểm chứng thiết bị thật chưa có.** Không coi việc sửa overlap hoặc build PASS là bằng chứng các mục tiêu đó đã đạt. Không tự deploy; trước phát hành cần review diff local và kiểm tra thêm Safari/iOS, Firefox và signed media trên môi trường được phép.

## Tiếp tục tối ưu tải đầu, 11/11/2026

Source hiện hành thêm `src/preloadInvitation.ts` và entry riêng trong `vite.config.ts`. Entry async chỉ prefetch deep link thiệp có slug hợp lệ, qua resolver/cache hiện hành, song song với tải React DOM. Router vẫn là fallback nếu script tối ưu bị chặn hoặc URL không phù hợp. Không thay `Auth.tsx`, Supabase client, resolver, query settings, schema hoặc dữ liệu. Không thêm dependency. HTML nguồn giữ nguyên; Vite chèn script build/dev với base `/bookclub/`.

Đã xác minh bằng browser: trì hoãn module renderer thì request thiệp vẫn bắt đầu; khi trả module lại, cùng một cache được dùng và không có request resolver thứ hai. Trang chủ và login không gọi resolver thiệp. Chặn script prefetch vẫn mở thiệp đúng tên người nhận. Sáu lượt desktop/mobile PASS tại `warmup-targeted.log`.

Các phép đo dưới đây dùng cùng Lighthouse 13.6.0, gzip, fixtures và thông số mobile đã mô tả. Các mode không so trực tiếp với nhau. Mỗi giá trị là một lượt đo; không diễn giải chênh lệch nhỏ thành bảo đảm tốc độ production.

| Bản / mode | Performance | Accessibility | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|
| Đối chứng trước warmup, simulated | 92 | 100 | 3.281,3ms | 0 | 0ms |
| Entry riêng, simulated | 93 | 100 | 3.166,2ms | 0 | 0ms |
| Đối chứng trước warmup, applied | 87 | 100 | 3.349,1ms | 0 | 15,4ms |
| Entry riêng, applied | 86 | 100 | 3.291,5ms | 0 | 0ms |

Evidence: `performance-control/`, `performance-control-applied/`, `performance-warmup-entry/`, `performance-warmup-entry-applied/`. Bản thử entry ảo cho 3.167,0ms simulated và 3.240,8ms applied, lưu tại `performance-warmup*/`; số của bản source thật được dùng trong bảng. LCP vẫn **FAIL ≤2.500ms**; không thay ngưỡng throttling để đạt chỉ tiêu. Performance applied vẫn trên 85 nhưng biến thiên một điểm giữa các lần chạy. Request Kaspersky bị allowlist chặn vẫn được ghi riêng, không sửa bảo vệ máy.

Hai thử nghiệm không giữ trong sản phẩm:

- Texture vector tĩnh thay SVG filters: CSS gzip tăng 14,57 → 16,68kB; simulated LCP 3.315,2ms, không cải thiện so đối chứng 3.281,3ms. Đã so ảnh desktop/mobile và khôi phục toàn bộ texture gốc. Script/ảnh/report chỉ nằm trong `.local/ui-redesign/content-scroll-fix/`.
- Thêm script async trực tiếp vào HTML: Vite báo gộp async/defer về một entry, LCP 3.315,3ms. Đã gỡ dòng HTML; dùng entry riêng để tránh phụ thuộc renderer. Không giữ warning này trong production build.

Bundle production sau warmup: entry UI **347,94kB / 110,35kB gzip**, shared query/client **252,22 / 67,06kB**, script prefetch khoảng **0,36 / 0,29kB**. Đây là phân bổ lại các module dùng chung, không phải giảm tổng JavaScript 25kB. Không tải Home/admin/editor trên đường vào thiệp. CSS giữ **64,80 / 14,57kB**; không sửa animation, logo hay layout trong vòng tối ưu này.

### Nghiệm thu source warmup, 12:38 (UTC+7)

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --maxWorkers=2` | PASS: 120 tests / 25 files, `unit-warmup.log` |
| `npm run test:e2e -- --workers=4` | PASS: 145 tests / 25 skips có chủ đích, `e2e-warmup.log` |
| `npm run build` | PASS, `build-warmup.log` |
| `npm run dev -- --mode e2e --host 127.0.0.1 --port 5190 --strictPort` + browser | PASS: 390/1440px, mở thiệp, 6 chương, một request resolver, không page exception hoặc overflow |
| `git -c core.safecrlf=false diff --check` | PASS |
| Đối chiếu Auth/domain/package/lockfile/backend với baseline | Không có thay đổi thêm; `scope.json` |

Hai bài E2E mới chạy trên desktop và mobile, tăng tổng PASS từ 141 lên 145. Ma trận và các kiểm tra scroll, live reduced motion, fallback, keyboard, audio, long agenda, các form quản trị vẫn chạy trong suite. Không bỏ test lỗi hoặc đổi số skips. Browser dev dùng fixtures; ảnh `warmup-dev/cover-{390,1440}.png` và `warmup-dev/emerald-{390,1440}.png` đã được xem lại. `warmup-dev/browser.json` chứa geometry và request count; các số first-paint trong dev không được dùng làm chỉ số production.

`warmup-acceptance.json` ghi hash source hiện hành. Phần production thay đổi trong lượt này chỉ gồm entry preload và Vite config; thêm assertions vào `scroll-v3.spec.ts` và cập nhật hai tài liệu thiết kế/nghiệm thu. Các thử nghiệm trong `.local/` không được đóng gói. Không dùng external AI worker, không thay database, không commit/push/deploy. Các server QA do lượt này dùng đã dừng sau kiểm thử.

### Kết thúc các thử nghiệm tải đầu

Đo đối chiếu trên Edge cho LCP 3.170,1ms (Performance 93), gần kết quả Chrome 3.166,2ms; chưa có bằng chứng cho lỗi riêng Chrome. Thu nhỏ tile giấy từ 128px xuống 64px cho LCP 3.165,6ms, không phải cải thiện có ý nghĩa. Thử preload thêm K2D 400 Latin/Vietnamese và 600 Latin cho LCP 3.309,7ms (Performance 92). Không giữ hai thay đổi thử nghiệm này trong source; texture và font loading vẫn là bản đã nghiệm thu. Evidence: `performance-edge/`, `performance-paper64/`, `performance-fonts/`.

Đã đối chiếu SHA-256 các file trong `warmup-acceptance.json`: source runtime và test cuộn không thay đổi sau lượt 145 E2E/120 unit tests PASS. Đã build lại `dist-e2e` từ cấu hình hiện hành để loại các thử nghiệm chỉ có trong output build. Typecheck, lint và diff whitespace được chạy lại, đều PASS. Mục tiêu LCP 2,5 giây vẫn chưa đạt; giới hạn này tách biệt với lỗi chồng nội dung đã sửa.

Lượt browser cuối lúc 12:49 (UTC+7), chạy Vite mode E2E với fixture: 160 mẫu tiến trình, 32 mẫu layout ở tám chiều rộng 320–1920px; không overlap, không horizontal overflow và không page exception. Đã xem lại ảnh chương trình mobile, các bước hiện dần và tiêu đề desktop. `browser.json` và ảnh trong gallery được cập nhật từ lượt này. Nội dung trước giữ trọn trong luồng đọc; các chi tiết bên trong phần tiếp theo có tiến trình riêng khi cuộn thuận/ngược.
