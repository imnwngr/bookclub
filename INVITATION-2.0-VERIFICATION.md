# BookClub CTUT · Invitation 2.0

Ngày 11/11/2026. Phạm vi: frontend invitation/audio/material/motion; kế thừa working tree redesign chưa commit. Không sửa database/schema/RLS/RPC/auth/business logic, không ghi dữ liệu production, không commit/push/deploy.

## Audit và quyết định

| Hiện tại | Vấn đề | Thay đổi |
|---|---|---|
| Audio mount sau khi mở, volume 35%, panel chữ trong luồng trang | Không tận dụng trực tiếp gesture mở thiệp, chiếm không gian đọc | Một audio mount từ cover, autoplay theo chính sách browser, 25%, orb/capsule cố định chỉ icon |
| Cover giấy phẳng, backdrop emerald solid, flap sage | Thiếu chất liệu bìa sách và độ dày | Linen emerald có dệt/thớ/ánh sáng, gáy bìa, giấy xếp lớp, viền ép chìm và seal foil |
| Reveal giống nhau cho nhiều section | Nhịp trải nghiệm ít thay đổi | Mép giấy mở và nét foil; lịch/địa điểm cascade; timeline vẽ dần và marker đóng dấu; quote/closing riêng |
| CSS timeline và reduced motion đã có | Cần tránh animation chồng nhau hoặc mất nội dung ở browser cũ | Thay phần animation thiệp, một IntersectionObserver, WAAPI cleanup, CSS timeline có fallback |

Baseline mới: TypeScript PASS; 116/116 unit tests PASS; build:e2e PASS. Đã chạy browser và chụp cover/opened 1440/390 trước sửa; không page errors. Source trước lượt này lưu local tại `.local/ui-redesign/invitation-v2/before/`.

## Nguồn tham khảo

- [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials): kính dành cho điều khiển, phân lớp và giữ rõ nội dung.
- [Motion scroll](https://motion.dev/docs/react-scroll-animations): phân biệt scroll-linked và scroll-triggered, ưu tiên native timeline/observer.
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) và skill GSAP React đã lưu: lifecycle, cleanup và reduced motion.
- [React Bits Glass Surface](https://reactbits.dev/components/glass-surface): tham khảo chất liệu, không chép demo/source hay chạy installer.
- [Danh sách design skills](https://github.com/stars/imnwngr/lists/design-skills); Anti-slop core/UI/human/mobile và Hallmark/Impeccable đã có ở lượt trước dùng làm guidance critique. Không chạy launcher hoặc hook tải executable bên ngoài.

Chọn CSS/WAAPI/IntersectionObserver, không thêm dependency. Texture SVG tự viết nhỏ, không ảnh stock, không WebGL, không Lenis, không đổi scroll/history. Glass là diễn giải bằng CSS của optical layering, không tuyên bố dùng native Apple Liquid Glass API.

## Kết quả triển khai

Đã triển khai trực tiếp trên checkout local. Giữ tên/danh xưng/chức vụ và snapshot cá nhân/nhóm, description/quotes, lịch/địa điểm/agenda, primary alias, logo và thứ tự Đoàn → Hội → CTUT → BookClub. Không thay resolver hay luồng quản trị. Không có ảnh tham chiếu đính kèm truy cập được trong lượt này; art direction dựa trên brief và giao diện local đã có.

- **Music orb**: 52px desktop/48px mobile, fixed dưới phải có safe area, lớp kính trong/ngoài, reflection, blur và bóng. Capsule chỉ icon mở sang trái, nút 44px, slider 0–100%, keyboard, Escape, click ngoài, focus restoration. Tab đi từ orb vào Play/Pause → Mute → Volume. Controller không render khi thiếu music_path.
- **Audio**: một audio element tồn tại từ cover, khởi tạo volume 0,25. Thử autoplay hợp lệ; nếu bị chặn thì thử lại đồng bộ từ click Mở thiệp, sau đó có Play thủ công. UI theo trạng thái audio thật. Giữ ý định pause qua opening/refresh; đổi volume/mute hoặc re-render không ký URL/phát lại. Signed URL tiếp tục dùng helper hiện có, refresh 50 phút; timer/listeners/src cleanup khi rời route. Không lưu volume giữa các lần mở: mỗi lần mount mới bắt đầu 25%.
- **Emerald/paper**: bìa dệt với gáy, ánh sáng một hướng, cạnh ép chìm, foil và contact shadow; giấy có grain/fiber, các tờ xếp lớp và bóng mép. Nền chung dùng dệt nhẹ hơn bìa, giữ chữ nổi bật. Material chỉ áp dụng invitation, không đưa texture vào form/bảng quản trị.
- **Ba nhịp scroll**: mép giấy mở + vẽ nét foil; lịch/địa điểm xoay nhẹ và metadata theo nhịp; timeline vẽ dần + marker đóng dấu + agenda vào lần lượt. Quote/closing có chuyển động riêng. Không hijack cuộn hoặc chặn back/history. Reduced motion tắt chuyển động và hủy WAAPI/observer ngay trong phiên; fallback không có IntersectionObserver vẫn hiện nội dung.

## File và kiến trúc

| File | Thay đổi trong vòng này |
|---|---|
| `src/components/BackgroundAudio.tsx` | Thay panel chữ bằng orb/capsule, lifecycle audio, volume/mute/autoplay/fallback và a11y |
| `src/pages/InvitationPage.tsx` | Mount audio từ cover, truyền opening gesture, nối hook motion và mép giấy; nội dung dữ liệu giữ nguyên |
| `src/hooks/useInvitationMotion.ts` | Mới: một observer, WAAPI theo loại section, native view timeline + fallback/cleanup |
| `src/styles/music.css` | Mới: material kính, controls, animation mở/đóng, safe area, reduced motion/transparency, forced colors |
| `src/styles/materials.css` | Mới: material tokens/utility, bìa/giấy/foil, scroll timeline, mobile |
| `src/styles/invitation.css` | Bỏ CSS panel nhạc cũ và timeline cũ để tránh animation chồng nhau |
| `src/assets/materials/linen.svg`, `paper.svg` | Texture tự viết, tổng **1.224 byte**, Vite inline trong CSS thiệp, không license bên thứ ba |
| `tests/background-audio.test.tsx` | 9 audio tests: autoplay, fallback, state, volume/mute, focus, unmount/StrictMode, signing/retry/refresh |
| `tests/e2e/invitation-v2.spec.ts` | Ma trận 8 chiều rộng, screenshots, music/touch/keyboard/a11y, motion/reduced/fallback |
| `tests/e2e/app.spec.ts`, `redesign.spec.ts` | Cập nhật kỳ vọng audio mới, vẫn giữ kiểm thử các luồng cũ |
| `scripts/review-invitation.mjs`, `measure-invitation.mjs` | Preview/screenshot baseline và phép đo local với fixture |
| `DESIGN.md`, `UI-REDESIGN-VERIFICATION.md`, tài liệu này | Ghi design system mới và phân biệt báo cáo lịch sử |

**Không thêm hoặc nâng dependency trong Invitation 2.0**. Dùng Lucide, React 19, Playwright, axe và Lighthouse đã có; animation bằng CSS/WAAPI. Materials/music CSS được tách trong chunk route thiệp. Không tải GSAP/Motion/Lenis hay WebGL. Không dùng Antigravity/API model hoặc external AI worker. Guidance Anti-slop/Hallmark dùng để critique; tài liệu Impeccable/GSAP đã đọc để tham khảo, không tuyên bố chạy các CLI upstream.

Working tree vốn có nhiều thay đổi từ redesign và công việc khác, gồm `Auth.tsx`, `domain.ts`, package files và tài liệu production. Các diff đó không phải thay đổi mới của vòng Invitation 2.0; không reset/revert chúng.

## Visual QA và evidence

Ảnh dùng fixture được ghi rõ là dữ liệu kiểm thử, không đưa dữ liệu/sự kiện giả vào sản phẩm hoặc database. Thư mục `.local/ui-redesign/invitation-v2/` được gitignore.

| Trạng thái | Evidence |
|---|---|
| Before | [before/](.local/ui-redesign/invitation-v2/before/) — 1440/390, source snapshot của audio/page/CSS |
| Cover + orb thu gọn | [Desktop](.local/ui-redesign/invitation-v2/after/cover-1440.png) · [Mobile](.local/ui-redesign/invitation-v2/after/cover-390.png) |
| Thiệp mở toàn trang | [Desktop](.local/ui-redesign/invitation-v2/after/opened-1440.png) · [Mobile](.local/ui-redesign/invitation-v2/after/opened-390.png) |
| Kính mở, volume 25% | [1440px](.local/ui-redesign/invitation-v2/after/glass-expanded-25-1440.png) · [320px](.local/ui-redesign/invitation-v2/after/glass-expanded-25-320.png) |
| Pause / mute | [Pause](.local/ui-redesign/invitation-v2/after/glass-paused-360.png) · [Mute](.local/ui-redesign/invitation-v2/after/glass-muted-mobile.png) |
| Time & place | [Desktop](.local/ui-redesign/invitation-v2/after/time-place-1440.png) · [Mobile](.local/ui-redesign/invitation-v2/after/time-place-430.png) |
| Agenda | [Desktop](.local/ui-redesign/invitation-v2/after/agenda-1440.png) · [Tablet](.local/ui-redesign/invitation-v2/after/agenda-1024.png) |
| Closing | [Mobile](.local/ui-redesign/invitation-v2/after/closing-390.png) |
| Reduced motion | [Desktop](.local/ui-redesign/invitation-v2/after/reduced-1920.png) · [Mobile](.local/ui-redesign/invitation-v2/after/reduced-390.png) |
| Các frame chuyển động | [Fold](.local/ui-redesign/invitation-v2/after/fold-motion-desktop.png) · [Schedule](.local/ui-redesign/invitation-v2/after/schedule-motion-mobile.png) · [Timeline](.local/ui-redesign/invitation-v2/after/timeline-motion-desktop.png) |

**72 ảnh** trong `after/`: 8 trạng thái × 8 chiều rộng **320/360/390/430/768/1024/1440/1920**, cộng 8 ảnh mute/motion desktop/touch mobile. Đã xem ảnh đại diện ở cả 8 chiều rộng, cover/opened, kính thu/mở, pause, lịch, timeline, cuối trang và reduced motion. Kiểm tra tự động scrollWidth, bounds panel, media state, focus, lỗi JavaScript và HTTP asset. Bộ regression cũ cũng chạy lại cho thiệp dài, nhóm và thiếu optional sections.

Critique và sửa thực tế:

1. Lượt đầu texture dệt và các sợi giấy lặp quá rõ: giảm opacity và giảm thêm contrast dệt trên backdrop; bìa giữ texture rõ hơn để tạo phân lớp.
2. Hover CSS chung làm orb mất gradient kính và đổi màu icon: scope hover riêng cho orb, giữ background/material và màu icon forest.
3. Axe bắt chữ agenda bị nhạt trong lúc reveal: chuyển animation chữ sang transform, giữ nguyên opacity; giữ fade chỉ ở chi tiết trang trí.
4. Tab từ orb có thể đi ra ngoài panel do thứ tự DOM: đặt orb trước controls, thêm test Tab/Tab/Tab, Escape/focus restoration.
5. Vite cảnh báo path texture chưa resolve: dùng public asset path để Vite thêm base; build cuối không còn cảnh báo này.
6. Lighthouse nhận bề mặt giấy làm LCP: chuyển hai texture SVG sang source assets và nhúng vào CSS route, loại hai lượt request texture nối tiếp.

## Kiểm thử

| Lệnh | Kết quả | Log |
|---|---|---|
| `npm run typecheck` | **PASS** | `typecheck-final.log` |
| `npm run lint` | **PASS** | `lint-final.log` |
| `npm test -- --reporter=dot` | **PASS**, 120 tests / 25 files | `unit-final.log` |
| `npm run test:e2e -- --workers=2` | **PASS**, 115 passed / 17 skipped, 5 phút | `e2e-final.log` |
| `npm run test:e2e -- tests/e2e/invitation-v2.spec.ts --workers=2` | **PASS**, 14 passed / 8 ma trận trùng skipped sau sửa asset path | `e2e-confirm.log` |
| Cùng lệnh trên sau SVG inline | **PASS**, 14 passed / 8 ma trận trùng skipped | `e2e-inline-final.log` |
| `npm test -- tests/background-audio.test.tsx` | **PASS**, 9/9 sau bổ sung thông báo pause do browser | `audio-confirm.log` |
| Playwright `--grep 'keyboard, touch'` | **PASS**, 2/2 desktop/touch sau polish contrast track cuối | `glass-final.log` |
| `npm run build` | **PASS**, không cảnh báo texture | `build-final.log` |

Logs tại [.local/ui-redesign/invitation-v2/](.local/ui-redesign/invitation-v2/). 17 skipped là các ma trận trùng trong project mobile: 9 của redesign cũ và 8 của invitation mới, đã chạy đủ ở project desktop với từng viewport; kiểm thử tương tác vẫn chạy cả desktop và mobile touch. Không bỏ qua bài test lỗi để tạo PASS.

Coverage gồm autoplay được phép/bị chặn, mở thiệp qua gesture, manual fallback, audio bytes thực, pause/resume, 0/25/100% volume, mute/unmute, re-render không phát lại, StrictMode/late promises, URL refresh giữ vị trí/volume/mute/pause, navigation cleanup, keyboard/slider/touch, cuộn xuôi/ngược và reduced motion. Axe không có violations trong các lượt quét cover/kính mở/thiệp mở/timeline và các trang regression. Đây là frontend kiểm thử với API/Storage mock, không phải chứng nhận backend/RLS live.

## Hiệu năng

Đo bằng `node scripts/measure-invitation.mjs`. Lighthouse **13.6.0**, Chrome headless, Vite e2e production mode, gzip, fixture có MP3, simulated mobile RTT 150ms/CPU ×4. Báo cáo: [cover.html](.local/ui-redesign/invitation-v2/performance/cover.html) · [summary.json](.local/ui-redesign/invitation-v2/performance/summary.json). Lượt đo sau SVG inline, trước polish màu track cuối; layout/audio/motion không đổi ở polish đó, build và Playwright được xác nhận sau polish.

| Chỉ số cover | Đo thực tế | Đối chiếu mục tiêu redesign trước |
|---|---:|---|
| Lighthouse Performance | **91/100** | PASS ≥85 |
| Lighthouse Accessibility | **100/100** | PASS ≥95 trong phạm vi tự động |
| LCP | **3,471s** | **FAIL** mục tiêu 2,5s |
| CLS | **0,0352** | PASS ≤0,1 |
| TBT | **6ms** | Số đo phòng thử nghiệm, không phải INP |

LCP vẫn phụ thuộc vào tải route/dữ liệu/asset của cover. Inline hai texture đã loại request ảnh nối tiếp nhưng **không cải thiện đáng kể LCP** trong mẫu này (trước khoảng 3,47s, sau cũng khoảng 3,47s). Không báo đạt mục tiêu LCP hoặc lấy số Home của vòng trước thay cho trang thiệp.

Mẫu cuộn thiệp mở có glass capsule mở, 390×844, CPU ×4, 180 frame rAF: median **7,5ms**, p95 **8,5ms**, **0 frame >50ms**, **0 long task**, CLS trong mẫu cuộn **0**, một audio instance. Đây là phép cuộn tổng hợp trên máy local; không phải chứng minh FPS GPU/điện thoại thật hoặc field INP.

Bundle build cuối (decimal kB):

| Tài nguyên | Raw | Gzip |
|---|---:|---:|
| Invitation route JS | **19,85 kB** | **7,19 kB** |
| Invitation material/music CSS, gồm SVG inline | **16,04 kB** | **4,29 kB** |
| Global CSS | **46,59 kB** | **10,71 kB** |
| App entry JS | **369,74 kB** | **117,05 kB** |

Baseline route JS 13,57/4,92 kB; tăng khoảng **2,27 kB gzip** cho audio/motion. CSS riêng của thiệp tải lazy cùng route. Không thêm framework animation hoặc dependency; admin editor vẫn tách chunk riêng.

Phép đo Lighthouse dùng Chrome profile riêng gặp **một console resource error từ script Kaspersky được môi trường máy chèn**, bị allowlist local/mock của script đo chặn. `failedRequests`/`blockedRequests` ghi rõ nguyên nhân, không phải JavaScript app hay asset BookClub hỏng. Không tắt antivirus, không cho script bên ngoài chạy, không che lỗi trong báo cáo. Playwright fixture runs không ghi nhận page errors/asset errors/warnings ứng dụng.

## Giới hạn và điều kiện trước deploy

- Chưa xác minh Safari/iOS hoặc điện thoại vật lý, screen reader thực, field INP hay production network. Không tuyên bố 60 FPS trên mọi thiết bị. Trình duyệt hỗ trợ autoplay/volume khác nhau; iOS có thể quản lý âm lượng media bằng nút phần cứng.
- Autoplay có tiếng vẫn có thể bị chặn; fallback Play là hành vi có chủ đích, không phải lỗi và không cố vượt chính sách.
- Không có mock dữ liệu thật hoặc kiểm tra ghi production. Trước phát hành nên smoke-test Safari/iOS, thiết bị Android và URL thiệp thật theo quy trình chỉ đọc được phép.
- Không commit/push/deploy trong lượt này. Source và báo cáo sẵn sàng review local; evidence nằm ở thư mục gitignored.

## Kiểm tra chất lượng cuối theo Anti-slop/Hallmark

Đây là review của source và ảnh browser, không phải kết quả chạy CLI của skill. Yêu cầu cụ thể của người dùng ưu tiên hơn quy tắc thẩm mỹ chung: giữ K2D, emerald, orb kính, logo, cách ghi khoảng giờ và nhịp nội dung hiện có.

| Hạng mục | Kết quả và evidence |
|---|---|
| Responsive / R-03 | PASS: 8 chiều rộng, bounds panel + scrollWidth assertions và ảnh tương ứng; các trang regression vẫn qua |
| Nội dung thật / R-17/18/23/38, C-5 | PASS: không thêm metric/testimonial/event vào app; SVG tự viết được brief cho phép; fixture có nhãn kiểm thử |
| Navigation / controls / R-24/26, C-2 | PASS: mở thiệp, link sự kiện, music play/pause/mute/slider/retry, Tab/Escape/click ngoài có test |
| Contrast / R-25 | PASS trong phạm vi kiểm tra: axe quét không violation; chữ timeline giữ opacity 1; icon forest trên kính có contrast bảo thủ khoảng 7,24:1; track được làm đậm để đạt ≥3:1 trên lớp kính tối |
| States / R-27 | PASS: loading/signing failure/play blocked/paused/playing/muted; thiếu nhạc không render controller; empty/error của thiệp giữ nguyên |
| Keyboard / R-32 | PASS: focus opening, Tab vào controls, Home/End slider, Escape trả focus; hidden controls inert |
| Build/browser / R-35 | PASS: lệnh, logs và 72 ảnh; không dùng build PASS thay cho visual QA |
| Claims / R-36 | PASS: công bố LCP FAIL và giới hạn môi trường; không tuyên bố field INP hoặc mọi máy 60 FPS |
| Direction / R-37 | PASS: hướng bìa sách/giấy/kính theo brief; ENERGY 2 / RHYTHM 2 / MOTION 3 ghi trong DESIGN.md |
| Vật liệu / R-01/07/10/12/13 | PASS: ánh sáng/texture tạo khối bìa và giấy; kính giới hạn ở orb/capsule; shadow phân biệt vật thể và lớp giấy |
| Icons/type / R-04/06/08/09 | PASS: Lucide sẵn có cho thao tác nhạc và lịch; K2D giữ nhận diện; không thêm badge/emoji trang trí |
| Motion / R-19 | PASS: ba nhịp scroll có chủ đích; loop chỉ báo trạng thái nhạc, reduced motion/cleanup được kiểm thử |
| Composition / R-05/11/14/20, C-3 | PASS review thủ công: cover có gáy/giấy, thư có nhịp greeting/lịch/quote/timeline; capsule chỉ là công cụ nổi; không thay bằng card grid template |
| Resilience / C-4 | PASS trong Chromium desktop/touch: giảm motion giữa phiên, thiếu observer, thiếu optional/music, nội dung dài, navigation; Safari/thiết bị thật chưa xác minh |
| Intentionality / C-1, R-15/16/21/29/30/31 | PASS review thủ công: CTA cụ thể, palette theo nhận diện, giấy và bìa sách có lý do; không sao chép demo hoặc thêm marketing claims |

Definition of Done frontend trong goal này đã được triển khai và kiểm chứng local. Mục tiêu LCP 2,5s của redesign trước và xác minh thiết bị thật vẫn được ghi riêng là chưa đạt/chưa đo; không coi chúng là PASS.
