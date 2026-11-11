# BookClub CTUT · Hệ thống thiết kế

Cập nhật cho redesign local ngày 11/11/2026. Hướng do người dùng xác định: **Modern Editorial × Literary Culture × Digital Luxury × Interactive Storytelling**. Sản phẩm dành cho cộng đồng văn hóa đọc CTUT và người quản trị sự kiện; dữ liệu sự kiện, người nhận và quyền truy cập là bất biến của đợt thiết kế này.

## Art direction

Chữ lớn, khoảng thở, nhịp đường kẻ và bố cục bất đối xứng tạo tính editorial. Hình quyển sách bằng CSS, gáy sách, bookmark và các lớp giấy là motif riêng. Không dùng ảnh stock, thống kê hay sự kiện giả trong sản phẩm. Ảnh screenshot dùng fixture có nhãn kiểm thử.

Trang công khai dẫn người xem từ câu “Hẹn nhau giữa những trang sách.” đến lịch hoạt động. Thiệp đặt người nhận ở trung tâm, chuyển từ cover nền xanh sang lá thư trên giấy sáng. Quản trị sử dụng cùng nhận diện nhưng giảm chuyển động, ưu tiên đọc nhanh và thao tác.

## Tokens và typography

Nguồn: `src/styles/tokens.css`. Brand `#173F36`, forest `#102B26`, paper `#F7F4ED`, surface `#FFFDF8`, ink `#182C27`; sage và champagne dùng cho lớp giấy, dấu thư và đường nhấn. Có tokens cho text phụ, borders, focus, selected, success, warning, danger và disabled. Màu chữ phụ được làm đậm hơn gợi ý ban đầu để giữ độ tương phản.

**K2D được giữ làm font duy nhất**, thay cho chỉ dẫn serif/Segoe UI cũ trong tài liệu này. Không ép toàn bộ chữ cùng weight bằng universal `!important`. Bốn weight 400/500/600/700 tự host, chia Latin/Vietnamese, `font-display: swap`; chỉ preload hai subset weight 500 dùng cho tiêu đề, các weight khác tải khi cần. License SIL OFL kèm tại `public/fonts/OFL.txt`.

| Vai trò | Quy mô |
|---|---|
| Display | `clamp(3rem, 6.7vw, 6.5rem)` |
| Page title | `clamp(2.125rem, 5vw, 4.75rem)`; quản trị có scale gọn hơn |
| Section | `clamp(1.75rem, 3.3vw, 3rem)` |
| Body | 1rem, line height 1.65; văn bản dài 1.85 |
| Controls | 0.9375rem, weight 500 |
| Metadata | 0.8125–0.875rem, phân biệt bằng nội dung và vị trí |

Spacing: 4/8/12/16/24/32/48/64/96px. Control radius 6px, panel 12px; thiệp, lịch và hero giữ góc giấy. Shadow tập trung ở các lớp giấy và phần nổi cần phân tách.

## Layout và components

- `SiteLayout`: wordmark, active navigation, skip link, menu mobile bằng native dialog, footer, focus/scroll khi đổi route.
- `AdminShell`: sidebar desktop, breadcrumb, drawer mobile; toast nằm ngoài grid để không chiếm một cột. Giữ nguyên guard `can_edit_content`.
- Home: hero hai cột chuyển thành bố cục mobile; hàng sự kiện có ngày nổi bật, filter tháng/năm, reset, số kết quả và load more.
- Event detail: tiêu đề, mô tả an toàn, metadata/ảnh địa điểm, maps, agenda.
- Invitation: cover nhiều lớp giấy, tên người nhận, opening, lời chào, lịch/địa điểm, quote và timeline chỉ khi có dữ liệu; thứ tự logo **Đoàn → Hội → CTUT → BookClub**.
- Editor: bảy nhóm với điều hướng anchor, RangePicker 24h UTC+7, agenda sortable, guest search, công bố và invitation links. Sticky save bar có vùng đệm và safe area.
- Guest/Role: giữ CRUD, optimistic rollback, dirty guards và quyền backend; cải thiện list/editor, focus, dialogs và trạng thái.

CSS được chia thành `tokens`, `fonts`, `base`, `public`, `invitation`, `admin`, `controls`; các selector của lịch/thiệp/toolbar được scope theo component. `admin` và `controls` tải cùng vùng quản trị. Đây là stylesheet phân lớp theo phạm vi, không phải CSS Modules.

## Motion

Tokens 120 / 180 / 300 / 550 / 900ms, easing `cubic-bezier(.2,.7,.2,1)`. Hover underline, phản hồi nút, chiều sâu quyển sách, reveal khi cuộn và opening giấy có vai trò khác nhau; form không chờ animation.

`Reveal` dùng IntersectionObserver và Web Animations API, chạy một lần, disconnect/cancel khi unmount. CSS scroll timelines điều khiển reading progress và timeline với fallback nội dung luôn đọc được. Opening chuyển focus ngay đến tên người nhận, chỉ trang trí bằng hai lớp giấy; timer được cleanup. Không scroll hijacking, không WebGL, không thêm GSAP hay thư viện animation.

`prefers-reduced-motion` tắt spatial motion, progress trang trí và smooth scroll; thiệp vẫn mở ngay. Sortable dùng dnd-kit sẵn có, có bàn phím và nút Lên/Xuống; identity nội bộ không thay schema agenda.

Routes chi tiết/thiệp bắt đầu tải module và prefetch public query song song; dùng cùng QueryClient/cache key hiện hành để tránh request nối tiếp. Không thay resolver hoặc retry/staleTime.

Route thiệp dùng `lazy` của React Router thay cho React.lazy bên trong Suspense. Router tải module song song với loader; `useQuery` tiếp tục sở hữu loading/error/retry. Kiểm thử trì hoãn module xác nhận request người nhận bắt đầu trước khi module tải xong và cache chỉ tạo một request. Không áp dụng thay đổi này vào luồng xác thực.

## Accessibility và dữ liệu

Controls có labels, focus ring, trạng thái disabled/error; native dialog hỗ trợ Escape và focus restoration. Menu danh bạ mobile có focus trap và đóng khi chuyển breakpoint. Không dùng hover làm cách duy nhất truy cập hành động. Kiểm tra bằng axe và trình duyệt ở 320/360/390/430/768/1024/1280/1440/1920px.

Nhạc khởi tạo 25%, thử autoplay theo chính sách trình duyệt, thử tiếp từ gesture **Mở thiệp mời** và có Play thủ công nếu bị chặn. Orb/capsule chỉ icon, có accessible names, pause/volume/mute/retry; không phát lại khi re-render hoặc khi người dùng đã chủ động pause. Giữ signed URL refresh; unmount dừng và giải phóng nguồn. VenueImage giữ cơ chế storage hiện có, dành sẵn tỉ lệ ảnh và xử lý lỗi.

Không đổi resolver/snapshot, primary alias, Auth, RLS, RPC, schema hoặc timezone. Draft tiếp tục bị loại khỏi trang công khai. Không thêm RSVP. Basename `/bookclub/` và cơ chế 404 phục hồi deep link của GitHub Pages được giữ nguyên.

## Bằng chứng

Audit và baseline: `UI-REDESIGN-PLAN.md`. Kết quả cuối, giới hạn đo và điều kiện trước deploy: `UI-REDESIGN-VERIFICATION.md`. Ảnh và Lighthouse được giữ local trong `.local/ui-redesign/` (gitignored).

## Invitation 2.0 — vật liệu và chuyển động

Hướng mở rộng: **Emerald bookbinding × Fine art paper × Liquid glass controls**. Giữ bố cục, K2D, dữ liệu cá nhân hóa và thứ tự logo của redesign. Thiệp là vật thể chính; kính chỉ dùng cho điều khiển nổi. Nền dệt nhẹ hơn bìa để không cạnh tranh với tên người nhận. Không dùng vật liệu vào bảng/form quản trị.

Design read: thiệp dành cho khách mời cá nhân/nhóm của BookClub, trang trọng và có cảm giác sách đóng bìa; **ENERGY 2 / RHYTHM 2 / MOTION 3**. Gold tập trung vào seal/đường kẻ, không dùng làm màu chữ chính. Chuyển động dẫn từ lời chào đến lịch và chương trình, không kéo dài thời gian đọc hoặc thao tác.

`materials.css` định nghĩa bề mặt linen emerald, giấy ấm và foil: SVG thớ dệt/giấy tự viết, ánh sáng có hướng, viền ép chìm, contact shadow và các lớp giấy lệch nhẹ. Hai SVG ở `src/assets/materials/` tổng 1.224 byte được Vite nhúng trong CSS route để tránh hai request tải nối tiếp, không bitmap/stock asset hoặc dependency mới. Base `/bookclub/` được giữ nguyên.

`music.css` là lớp kính riêng: blur/saturation, nền emerald trong, phản chiếu, viền trong/ngoài và bóng mềm; có fallback opaque cho thiếu backdrop-filter, reduced transparency và tăng contrast. Orb 52px desktop/48px mobile, controls 44px; safe area và khoảng đệm cuối trang. Capsule mở sang trái bằng transform 380ms, icon/slider vào theo nhịp 100/140/180ms. Tab từ orb đi qua play → mute → volume; Escape trả focus về orb, click ngoài/Tab ra ngoài đóng panel. Chỉ equalizer/breathing khi thực sự phát và không mute.

`useInvitationMotion` thay reveal đồng loạt bằng ba nhịp: (1) mép giấy mở cùng nét foil theo cuộn, (2) lịch/địa điểm xoay rất nhẹ và metadata vào theo nhịp, (3) timeline vẽ dần, các mục dịch ngang và marker như đóng dấu. Quote/closing có chuyển động riêng, chữ luôn giữ contrast trong scroll reveal. Dùng một IntersectionObserver, WAAPI và native CSS view timeline có fallback; không scroll listener/Lenis/WebGL. Mobile giảm biên độ và thời lượng. Reduced motion thay đổi ngay trong phiên, hủy WAAPI/observer và giữ toàn bộ nội dung đọc được.

Nghiệm thu vòng này: [INVITATION-2.0-VERIFICATION.md](INVITATION-2.0-VERIFICATION.md). Đây là tài liệu hiện hành cho audio/material/motion, thay hành vi audio của báo cáo redesign trước.

## Invitation 3.0 — nhận diện và các lớp thư

Logo BookClub chính thức thay monogram `b.` ở header, seal và phần kết. `BookClubLogo` dùng bản WebP 192px đã được tạo từ `public/logos/logo-bookclub.png`, PNG gốc là fallback; giữ vòng trắng, transparency, màu và tỷ lệ nguyên bản. Kích thước hiển thị 44–80px, có đủ pixel ở DPR 2; các URL dựa vào `import.meta.env.BASE_URL`. Thứ tự bốn logo đơn vị không đổi.

Tham khảo chuyển động là **video MP4 5,27s trong Dribbble shot 27851575**, không phải giao diện trang Dribbble. Đã xem các khung hình 0,01 / 0,8 / 1,6 / 2,5 / 3,4 / 4,6 giây: bề mặt trắng đi lên khỏi ảnh hero; chữ và ảnh xuất hiện theo nhịp riêng; khung ngoài giữ kích thước. Không thể xác minh source, thư viện, scroll distance hay easing chính xác từ video. BookClub diễn giải chuyển động này bằng các lớp giấy, không dùng ảnh du lịch hoặc sao chép layout.

`InvitationChapter` chia lời chào → sự kiện → lịch/địa điểm → quote nếu có → agenda nếu có → phần kết. Theo phản hồi người dùng ngày 11/11/2026, giấy nằm trong luồng đọc bình thường: **không sticky, không margin âm, không scale/translate toàn section**. Các section không được che nhau, kể cả tiêu đề “Nội Dung & Tiến Trình Buổi Lễ”.

`useChapterScroll` gắn reveal vào từng tiêu đề, đoạn văn, chi tiết lịch/địa điểm và mục agenda. Native CSS view timeline ưu tiên khi có hỗ trợ; tiến trình phụ thuộc vị trí từng phần tử, nên tiêu đề vào trước rồi lần lượt đến nội dung. Biên độ 28px desktop/16px mobile, agenda dịch ngang nhẹ; hoàn tất trong khoảng cuộn tối đa 180px. Cuộn ngược đảo tiến trình, dừng cuộn thì chuyển động cũng dừng. Không thêm khoảng chờ hoặc khóa wheel/touch.

Fallback dùng một passive scroll listener và một rAF theo nhu cầu, đo offset không biến đổi và cache style để tránh tự kích hoạt vòng lặp. ResizeObserver cập nhật khi nội dung/font thay chiều cao. Cleanup listener/observer/rAF đầy đủ. Thiếu API đo thì nội dung hiện sẵn. Reduced motion và print hiện toàn bộ chữ, kể cả khi đổi tùy chọn trong phiên. Focus bàn phím làm hiện chi tiết ngay; pointer focus không đổi transform để tránh hụt click.

`chapters.css` giữ mép foil và chiều dày giấy ở cạnh bên, không tạo bóng/lớp trang trí lấn lên nội dung trước. `useInvitationMotion` chỉ phụ trách ornament fold/foil/timeline, tránh chạy hai animation trên cùng chữ. Mở thiệp vẫn đưa người xem về đầu lời chào. Không thêm GSAP/Motion/Lenis hoặc dependency nào. Bằng chứng cho thay đổi cuộn hiện hành: [INVITATION-SCROLL-FIX-VERIFICATION.md](INVITATION-SCROLL-FIX-VERIFICATION.md).

Bằng chứng và giới hạn: [INVITATION-3.0-VERIFICATION.md](INVITATION-3.0-VERIFICATION.md).

Kiểm tra bổ sung 3.0 dùng native touch input của Chromium để vuốt thuận/ngược và đổi viewport khi thiệp đang mở. Tám chiều rộng vẫn có screenshot; gallery có video MP4 tham chiếu và video BookClub để đối chiếu trực tiếp. Thử tải sớm JS/CSS theo deep link đã được đo rồi gỡ vì không cải thiện LCP; không giữ thêm cơ chế preload hoặc dependency sau thử nghiệm.

Các bản WebP logo 192px dùng quality 0,92, tổng 47.876 bytes so với 109.054 bytes trước tối ưu. PNG gốc không thay đổi. Đã so sánh ở kích thước hiển thị 64px, DPR 2 trên nền cream/emerald; chữ, tỷ lệ và alpha vẫn rõ. Bằng chứng `experiments/logo-comparison.png` trong gallery 3.0. Đây là giảm dung lượng ảnh, không được diễn giải thành LCP đạt 2,5s.

Texture cuối vẫn là SVG gốc. Thử rasterize thành WebP làm CSS route tăng từ 4,73 lên 91,97 kB gzip và không cải thiện LCP, nên bitmap/helper thử nghiệm được chuyển về thư mục `.local/ui-redesign/brand-scroll-v3/experiments/`, không nằm trong assets build. Mode `e2e` của Vite luôn dùng endpoint `bookclub-test.invalid` và khóa giả để phép đo thủ công cũng tách khỏi `.env.local`; build production không bị thay cấu hình.

Tải ban đầu của vòng 3.0: module thiệp nằm trong entry để bỏ bước chờ tải JS/CSS sau bootstrap. Home, EventDetail và các trang quản trị vẫn tải riêng; không tải Tiptap hoặc editor vào thiệp. Loader tiếp tục dùng query cache và resolver sẵn có, không thay dữ liệu hay Auth. Chỉ preload hai subset K2D weight 500 thực sự dùng cho tiêu đề; các weight khác do trình duyệt tải khi cần. Không nhúng toàn bộ CSS vào HTML và không giữ cấu hình chia bundle thủ công sau khi đo đối chứng.

Thứ tự CSS là một phần của hệ vật liệu: `main.tsx` tải `app.css` trước module ứng dụng, để material/music/chapter enhancements được áp dụng sau foundation. `materials.css` dùng cùng specificity với selector chương trình trong `invitation.css`. Test trình duyệt kiểm tra texture SVG và ánh sáng gradient trên bìa, giấy, nền emerald, lời chào, chương sự kiện và agenda, cả lần tải đầu lẫn quay lại route; tránh trường hợp các test chức năng đều xanh nhưng nền vật liệu bị ghi đè thành màu phẳng.

### Tải dữ liệu song song với renderer

`preloadInvitation.ts` là entry nhỏ chạy `async`, bắt đầu prefetch cho deep link thiệp có slug hợp lệ trong lúc React DOM tải. Vite tạo entry riêng vì nhiều module script trong HTML sẽ bị gộp lại; plugin chỉ thêm URL script với base `/bookclub/`, không thêm loader dữ liệu khác. Entry dùng cùng `client`, query key và `resolveInvitation` với router. Không khởi tạo Supabase client thứ hai, không thay Auth/session, retry, stale time hoặc resolver. URL trang chủ/quản trị/xác thực được bỏ qua; các URL không phù hợp và trường hợp script bị chặn vẫn do loader hiện hành xử lý.

Kiểm thử giữ module renderer chưa tải xong xác nhận request thiệp bắt đầu sớm, rồi cùng một cache được dùng khi React sẵn sàng, tổng cộng một request. CSS, vật liệu và nội dung cuộn không thay đổi. LCP simulated quan sát giảm từ 3,28 xuống 3,17 giây; đây là cải thiện nhỏ trong lab, chưa đạt mục tiêu 2,5 giây. Chi tiết và phép đo đối chứng ở báo cáo sửa cuộn.
