# Sự kiện Hội Sinh viên CTUT · Thiết kế 3.0.0

Ngày 20/11/2026. Nền tảng sự kiện của Hội Sinh viên CTUT, dành cho người nhận thiệp cá nhân/nhóm và người quản trị nội dung. Bản 3.0.0 kế thừa bố cục editorial, K2D tiếng Việt, vật liệu giấy/dệt, opening và điều khiển nhạc Liquid Glass đã có. Không dựng lại ứng dụng.

## Nhận diện và nội dung

Tên nền tảng: **Sự kiện Hội Sinh viên CTUT**. Header, footer, metadata và trạng thái hệ thống dùng tên này. Logo Hội lấy từ assets chính thức hiện có, giữ màu/tỉ lệ/transparency; không vẽ lại logo. Dải logo thiệp giữ thứ tự **Đoàn → Hội → CTUT**. Hình giấy ở trang chủ tiếp nối vật liệu thiệp, bỏ motif sách phục vụ nhận diện cũ.

Tên nền tảng không thay tên đơn vị tổ chức trong nội dung sự kiện. Salutation, tên, chức vụ/mô tả, cá nhân/nhóm và primary alias vẫn lấy từ snapshot người nhận. Không sửa nội dung lịch sử để xóa tên cũ. Logo cũ còn trong kho assets lịch sử nhưng không còn được component đang dùng tham chiếu.

Hướng duy nhất: trang trọng, ấm, tập trung vào người nhận; ENERGY 2 / RHYTHM 2 / MOTION 3. Không dùng sự kiện, con số hoặc lời chứng thực giả trong sản phẩm. Screenshots dùng fixture có nhãn kiểm thử.

## Typography và bố cục

K2D là font duy nhất, tự host Latin/Vietnamese ở weight 400/500/600/700 với `font-display: swap`. Chỉ preload hai subset weight 500; license SIL OFL ở `public/fonts/OFL.txt`. Không ép toàn bộ chữ bằng universal `!important`.

| Vai trò | Quy mô |
|---|---|
| Display | `clamp(3rem, 6.7vw, 6.5rem)` |
| Tiêu đề trang | `clamp(2.125rem, 5vw, 4.75rem)`; quản trị gọn hơn |
| Tiêu đề phần | `clamp(1.75rem, 3.3vw, 3rem)` |
| Nội dung | 1rem, line-height 1.65; văn bản dài 1.85 |
| Controls | 0.9375rem, weight 500; vùng bấm tối thiểu 44px |

Spacing 4/8/12/16/24/32/48/64/96px. Radius controls 6px, panel 12px; thiệp giữ mép giấy. SiteLayout có skip link, navigation và menu mobile bằng dialog. AdminShell giữ sidebar/drawer, breadcrumbs và guard quyền nội dung. Form dài có anchor, save bar, dirty state và cảnh báo rời trang.

## Hai loại thiệp

Editor dùng radio có tên và giải thích rõ: Thiệp mời để mời tham dự, có thời gian/địa điểm; Thiệp chúc để gửi lời chúc, không cần các trường đó. Khi đổi sang Thiệp chúc, giữ dữ liệu thời gian/địa điểm trong form và database, ẩn các nhóm không áp dụng và hiển thị thông báo. Đổi lại Thiệp mời phải vượt validation hiện hành, giờ 24h theo UTC+7.

Thiệp mời dùng “Trân trọng kính mời”; Thiệp chúc dùng “Trân trọng chúc mừng”, CTA “Mở thiệp chúc”. Cả hai giữ người nhận, tiêu đề, mô tả, quote, chương trình nếu có và phần kết. Thiệp chúc không tạo section lịch, countdown, địa điểm, ảnh địa điểm hay bản đồ. Không thay lời văn người dùng bằng replace toàn văn.

Danh sách và dashboard ghi “Thiệp chúc”, không gán sắp diễn ra/đã kết thúc. Bộ lọc dùng ngày tạo cho Thiệp chúc, ngày diễn ra cho Thiệp mời; có nhãn giải thích. Sắp xếp ưu tiên đang diễn ra → sắp diễn ra → Thiệp chúc mới nhất → đã kết thúc mới nhất.

## Màu của từng sự kiện

Nhóm **Giao diện** gồm năm presets Xanh Hội, Lá xanh, Đỏ son, Tím mực, Hổ phách; input màu tùy chỉnh; nút khôi phục mặc định; preview vật liệu. Preview không ghi dữ liệu. Schema duy nhất: `{version:1, primary:'#RRGGBB'}`, validation ở frontend và SQL, không nhận CSS hoặc key khác.

Mặc định `#174b78`. `themeStyle` suy ra chữ/nền/đường nhấn và nút; màu rất sáng được điều chỉnh để nền nút vẫn tương phản với chữ trắng. Vẫn giữ SVG linen, thớ giấy, ánh sáng có hướng, foil và chiều sâu. Theme scope trong route sự kiện và preview; cleanup khi chuyển về home/dashboard. Các màu báo lỗi/thành công giữ ý nghĩa chung.

Theme đọc trực tiếp từ sự kiện: đổi màu đã lưu sẽ áp dụng cho mọi thiệp của sự kiện. Theme **không** thay cơ chế snapshot người nhận. Dữ liệu theme thiếu/lỗi khi đọc fallback về Xanh Hội; payload sai khi ghi bị từ chối.

## Chuyển động và nhạc

Giữ tokens 120/180/300/550/900ms, easing `cubic-bezier(.2,.7,.2,1)`. Mở thiệp chuyển focus về tên người nhận, hai lớp giấy chỉ trang trí; cleanup timer khi unmount. Không scroll hijacking.

`InvitationChapter` nằm trong normal flow: không sticky, margin âm hoặc transform toàn section. Reveal chỉ gắn vào thành phần bên trong qua `useChapterScroll`; hoàn tất trong tối đa 180px cuộn, biên độ 28px desktop/16px mobile. Cuộn ngược đảo tiến trình tự nhiên. Fallback dùng passive scroll listener/rAF theo nhu cầu; cleanup listener/ResizeObserver/styles. Thiếu API, print và reduced motion giữ nội dung đọc được. Keyboard focus làm hiện thành phần ngay.

Nhạc khởi tạo 25%, thử autoplay theo chính sách trình duyệt, tiếp tục từ gesture mở thiệp hoặc nút Play. Không phát lại nếu người dùng chủ động pause. Giữ signed URL refresh và giải phóng nguồn khi unmount. Liquid Glass chỉ ở điều khiển nhạc: blur, viền và phản chiếu với opaque fallback; orb 52px desktop/48px mobile. Tab qua Play → Mute → Volume, Escape trả focus; hỗ trợ reduced transparency/motion.

## Tài khoản và khả năng tiếp cận

Admin nhập email, hệ thống tự phân biệt tài khoản hiện có và email mới; quyền mặc định Editor. Không có select invite/grant. Nút disabled trong request, chống double-click, thông báo kết quả ngay trong dialog; Escape/focus restoration khi không busy. Các trạng thái đã cấp quyền, chờ nhận lời mời, chưa xác nhận email, đang xử lý, lỗi một phần và cần khôi phục khác nhau. Có danh sách yêu cầu cần kiểm tra. Không khẳng định email đã đến hộp thư.

Session và quyền Admin kiểm lại ở server/RPC; không dựa vào ẩn nút. Retry không tự gửi lại email; revoke vô hiệu hóa worker cũ, retry của yêu cầu vừa bị thu hồi không tự cấp lại. Chi tiết kỹ thuật và giới hạn nằm trong [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md), không đưa vào luồng thao tác thông thường.

## Phương pháp và bằng chứng

Design-team đã đọc catalog, dùng hệ thiết kế hiện có làm hướng. Hallmark dùng hướng dẫn nhất quán cho component, không chạy scaffold/theme mới; better-accessibility dùng semantics, focus và error recovery; Anti-slop `during` theo global preference và audit cuối. Không gọi dịch vụ tạo ảnh, thêm GSAP hoặc external AI worker. Không tuyên bố đã chạy Hallmark sloplint.

Kiểm tra Chrome/Playwright ở 320/390/430/768/1024/1440/1920px, keyboard, axe, reduced motion, scroll thuận/ngược và các trạng thái. Kết quả và giới hạn: [HSV-V3-VERIFICATION.md](HSV-V3-VERIFICATION.md). Ảnh/log trong `.local/hsv-v3/`, ignored. Các báo cáo `UI-REDESIGN-*`, `INVITATION-2.0-*`, `INVITATION-3.0-*`, `INVITATION-SCROLL-FIX-*` là lịch sử; “Invitation 3.0” trong báo cáo cũ là vòng thiết kế, không phải release HSV 3.0.0.
