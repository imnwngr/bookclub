# Nghiệm thu UI với Supabase live

## Kết quả nghiệm thu cuối do người dùng xác nhận

**8/8 USER-REPORTED PASS** theo xác nhận trực tiếp của người dùng. Chưa có kiểm thử trình duyệt live độc lập của Codex. Checklist chi tiết bên dưới có 12 mục, còn xác nhận người dùng là 8 bước tổng hợp; chưa có bảng ánh xạ từng bước nên không coi đây là 12/12 PASS hoặc tự gán kết quả riêng cho từng mục. Các mục bên dưới được giữ làm phạm vi đối chiếu và hướng dẫn smoke test production.

Đối chiếu theo tiêu chí chức năng: trang chủ/lọc, Auth/dashboard, form/CRUD, guest selection, địa điểm thủ công, thiệp/alias, Draft/Published và dữ liệu lưu lại đều có mã triển khai; các thao tác database tương ứng có log live API 23 PASS. Live API không chứng minh giao diện responsive, hiệu ứng/keyboard hoặc hành vi refresh của host production. Google Maps picker chưa cấu hình key và chưa được nghiệm thu. Production chưa deploy.

Mở http://127.0.0.1:5173/bookclub/ khi Vite đang chạy. Khởi động lại nếu cần: `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`.

Chỉ ghi PASS sau khi tự thao tác, không dựa vào mock tests hoặc API runner. Nhập credentials trực tiếp trong ứng dụng; không gửi mật khẩu/token/ảnh có credentials vào báo cáo.

1. Trang chủ: kiểm tra danh sách hoặc empty state, đổi tháng/năm, xác nhận kết quả tương ứng. Kiểm tra lại sau khi tạo fixture Published ở bước sau.
2. Vào /bookclub/admin/, đăng nhập admin, xác nhận dashboard và danh bạ tải được.
3. Tạo sự kiện mã `qa-ui-` kèm UUID mới, tên `[QA UI]` cùng mã; thử submit thiếu tên hoặc kết thúc trước bắt đầu để kiểm tra validation. Chọn ngày/tháng dùng cho lọc ở bước 1.
4. Thử chọn từng khách, chọn tất cả, bỏ tất cả rồi chọn hai khách. Ghi số lượng, lưu Draft, reload và kiểm tra dữ liệu/selection được giữ.
5. Nhập địa điểm, hướng dẫn, tọa độ và mở link Maps. Khi chưa có API key, xác nhận thông báo nhập thủ công; không đánh dấu picker Google Maps PASS.
6. Sửa tên/thời gian, thử rời trang khi chưa lưu và hủy; lưu, reload, đối chiếu nội dung. Kiểm tra alias chính/phụ, sao chép link, thêm alias riêng; thử alias trùng phải báo lỗi. Chỉ xóa alias phụ vừa tạo để thử xác nhận xóa.
7. Mở link Draft trong cửa sổ ẩn danh: không xem được. Admin xem trước thiệp, mở bằng nút hoặc keyboard; đúng người nhận, tên sự kiện và địa điểm.
8. Công bố fixture, reload; mở event và các alias trong cửa sổ ẩn danh, kiểm tra cùng người nhận. Thiệp nhóm phải dùng nội dung nhóm. Kiểm tra bộ lọc trang chủ theo tháng/năm của fixture.
9. Với desktop và mobile 390px: kiểm tra không tràn ngang, nút/label/validation đọc được, Tab/focus, dialog Escape và reduced motion.
10. Đăng xuất admin, xác nhận route quản trị đòi login. Đăng nhập non-admin, xác nhận không có quyền quản trị; không tự cấp admin.
11. Truy cập trực tiếp rồi refresh các route: /bookclub/, /bookclub/admin/, /bookclub/admin/new, /bookclub/admin/edit/<fixture-code>, /bookclub/<fixture-code>, /bookclub/<fixture-code>/<alias>. Thử mở tab mới. Đây là nghiệm thu Vite local; cần kiểm tra riêng Pages thật sau khi được phép deploy.
12. Admin xóa đúng fixture vừa tạo với xác nhận, reload kiểm tra biến mất và các link thiệp không còn hoạt động. Không xóa dữ liệu khác.

Ghi kết quả từng mục PASS/FAIL/BLOCKED và mô tả lỗi vào VERIFICATION.md khi có bằng chứng chi tiết. Trạng thái mới nhất: nghiệm thu tổng hợp 8/8 USER-REPORTED PASS; không còn đánh dấu toàn bộ UI BLOCKED. Chi tiết không có ánh xạ hoặc bằng chứng riêng giữ trạng thái chưa xác minh độc lập.
