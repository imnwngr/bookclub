> **Lưu trữ lịch sử:** Các hướng dẫn và trạng thái bên dưới phản ánh thời điểm trước. Production đã hoàn tất clean rebuild và refinement; không chạy lại các lệnh lịch sử. Xem README.md để biết trạng thái hiện hành.

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

# Nghiệm thu UI Refinement (ưu tiên phần này)

Code local đủ 8/8 và tests local PASS; SQL mới chưa áp dụng live. Review UI-REFINEMENT-SQL-REVIEW.md trước test persistence khoảng giờ/icon hoặc primary-only API. Không chạy REBUILD.sql.

1. Editor không có hướng dẫn bảo toàn URL cũ; đổi mã vẫn giữ UUID, code cũ không redirect.
2. Chọn hai cards link/pin bằng chuột/keyboard; dữ liệu URL/Place ID không mất khi chuyển; 320px không tràn và thanh lưu không che thao tác.
3. Cover và phần kính mời: role tách dấu phẩy/newline, không dòng trống, đủ salutation/name; xem mô tả dài/nhóm trước và sau mở. Không tự override chức vụ trong React.
4. Agenda: đánh số lại khi thêm/xóa/sort; hai giờ HH:mm, end>start; grid icon/preview/highlight, lưu–reload–thiệp đúng sau SQL. Mốc cũ thiếu end vẫn giữ và có hướng dẫn bổ sung.
5. Không có add/edit/delete/list alias phụ; copy all một URL primary/guest. Sau migration, direct API/RPC thêm alias phụ bị từ chối; rows phụ cũ không bị xóa hàng loạt.
6. Mở thiệp, cuộn xuống/ngược qua 4 section; nội dung dài không kẹt, keyboard/touch/reduced motion; không ảnh/hướng dẫn/agenda thì không section rỗng.
7. Ảnh địa điểm/Maps/K2D/logos, mobile/desktop, lỗi save giữ dirty/cleanup ảnh; regression Auth/Draft/Published dùng fixture QA riêng.
8. Ghi PASS/FAIL/BLOCKED và cleanup đúng fixture. Không gửi credentials; chưa có live refinement PASS cho tới khi thực hiện thật.

---

# UI v1.1.0 Acceptance — local frontend / live database

Database: **DATABASE REBUILT — LIVE VERIFIED**. Không chạy lại migrations/rebuild. Dùng ứng dụng v1.1 local kết nối project trdofhdspbkwgernwybp; production frontend vẫn v1.0, không dùng production để nghiệm thu các tính năng mới.

Mở **http://127.0.0.1:5173/bookclub/**. Vite đang chạy và phục vụ đúng RPC get_event_v110; .env.local đúng project, không công khai credentials. Nếu server đã dừng, chạy npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort. Đăng nhập thủ công, không gửi mật khẩu/token vào báo cáo.

## Trạng thái đầu phiên

Agent đã smoke test Chrome thật không mock: homepage gọi events API HTTP 200, nội dung main/h1 hiển thị, pageerror=0; truy cập admin anonymous thấy form login/password, pageerror=0. Các mục tương tác dưới đây **NOT RUN trên UI live** cho tới khi được nghiệm thu. 38/38 Playwright mock trước đó là bằng chứng khác; 41 API + 9 hotfix API PASS không thay cho UI.

## Fixture và cách ghi nhận

Tạo một sự kiện Draft mã qa-ui-v110-<ngày>-<chuỗi riêng>, ghi internal UUID/mã vào biên bản. Chỉ sửa/xóa sự kiện và ảnh của lần nghiệm thu. Chọn khách mời từ danh bạ seed, không xóa khách mời hệ thống. Nếu kiểm thử autosave active trên guest có sẵn, ghi trạng thái ban đầu và khôi phục ngay. Không lưu token/session/credentials vào ảnh chụp hoặc Git.

Mỗi mục ghi PASS/FAIL/BLOCKED, desktop/mobile, URL fixture và quan sát thực tế. Thử desktop và mobile 390px/320px, keyboard và reduced motion.

| # | Tiêu chí nghiệm thu | Kết quả |
|---|---|---|
| 1 | Editor load sạch không thanh lưu; sửa title/status/khách/alias/agenda/ảnh thì hiện; undo toàn bộ hoặc lưu thành công thì ẩn; lỗi lưu giữ dirty; mobile không che nội dung. | NOT RUN |
| 2 | Đổi mã sự kiện giữ internal UUID/khách/agenda/ảnh; URL mới hoạt động, URL cũ không tìm thấy theo quyết định clean rebuild. Không còn yêu cầu redirect lịch sử. | NOT RUN |
| 3 | Nhập/chọn 00:00, 08:00, 13:00, 23:45; không AM/PM, reload đúng giờ Việt Nam; 24:00 bị chặn. | NOT RUN |
| 4 | Switch Published chỉ tác động sau lưu; ẩn danh thấy Published, không thấy Draft; unpublish chặn request mới tới thiệp/ảnh. Nội dung đã tải trước đó không thể thu hồi khỏi bộ nhớ người xem. | NOT RUN |
| 5 | Mã trống lúc tạo sinh slug tên tiếng Việt; mã trùng báo lỗi không ghi đè; sửa tên không tự đổi mã đã lưu. | NOT RUN |
| 6 | Danh bạ chỉ một alias chính; không chứa danh xưng; blank auto slug; trùng bị chặn. Alias phụ chỉ thuộc từng thiệp nếu thêm thủ công, không có alias v1.0 tự seed. | NOT RUN |
| 7 | Active autosave pending/chống nhấp liên tục, reload đúng; offline/lỗi rollback/toast; inactive không tự chọn vào sự kiện mới. Khôi phục trạng thái guest ban đầu. | NOT RUN |
| 8 | K2D toàn website, tiếng Việt đúng; chặn Google Fonts vẫn có fallback đọc được. | NOT RUN |
| 9 | Guest đang sửa có marker và tên rõ; chuyển guest cập nhật; Khách mời mới bỏ highlight, mobile nhận biết được. | NOT RUN |
| 10 | Thiệp cá nhân/nhóm hiện danh xưng/tên/chức vụ đầy đủ, xuống dòng và không cắt ở mobile; dữ liệu dùng snapshot. | NOT RUN |
| 11 | URL Maps mặc định và Place ID đều validate/mở đúng link; radio ở đầu; không input latitude/longitude. Không cần Maps JS key cho luồng này. | NOT RUN |
| 12 | Copy all một dòng mỗi guest đã chọn, primary alias có hiệu lực và mã đã lưu; không trùng; clipboard bị từ chối phải báo lỗi. | NOT RUN |
| 13 | Agenda thêm/sửa/xóa/sort, nhiều highlight; lưu/reload/thiệp đúng; không agenda thì không heading rỗng. | NOT RUN |
| 14 | JPG/PNG/WebP, Ctrl+V OS thật, chọn file/drop; MIME sai/>5 MiB bị chặn; preview/thay/xóa; hủy không upload; upload/lưu lỗi có thông báo và cleanup/retry đúng fixture. | NOT RUN |
| 15 | Ảnh địa điểm trên thiệp đúng ảnh đã lưu, không méo, mobile hợp lý, không có ảnh thì không broken image; thay/xóa ảnh reload đúng. | NOT RUN |
| 16 | Đủ logo Đoàn/Hội/CTUT/BookClub đúng thứ tự, alt/tỉ lệ, không tràn ngang. | NOT RUN |

## Regression và kết thúc

- Login/logout, refresh session, dashboard, CRUD, chọn/bỏ chọn/tất cả, lọc tháng/năm và public empty state.
- URL sự kiện/alias chính/alias bổ sung/alias không tồn tại; direct/refresh/tab mới trên local. Pages HTTP 404 fallback chỉ kiểm được production sau deploy riêng; không suy ra từ Vite HTTP 200.
- Thử Draft/Published bằng cửa sổ ẩn danh dùng local v1.1 cùng database thật; không đổi RLS để vượt lỗi.
- Xóa đúng fixture event UUID, xác minh public link không còn; dọn ảnh/registry fixture bằng luồng quản trị. Không dọn dữ liệu người khác. Ghi cleanup PASS/FAIL.
- Sau đủ 16 mục + regression/cleanup: gửi biên bản để RELEASE REVIEW. Chưa commit/push/deploy trước phê duyệt riêng.
