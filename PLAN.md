# Kế hoạch BookClub CTUT

1. Foundation: đúng thư mục/repository public/main; React/TypeScript/Vite; routing /bookclub/.
2. Database: migrations, seed 10 khách mời, snapshot thiệp, RLS, transaction.
3. Public: danh sách, bộ lọc, thời gian, chi tiết, trạng thái dữ liệu.
4. Admin: Supabase Auth, CRUD, danh bạ, guest selection.
5. Invitations: alias theo sự kiện, mở thiệp, quản trị alias.
6. Integrations: Google Maps, fallback thủ công, lỗi và phiên đăng nhập.
7. Quality: typecheck, ESLint, unit/integration, Playwright, RLS live, build và triển khai.

Thiếu cấu hình Supabase: không thể xác minh CRUD/RLS live. Cần phê duyệt commit/push và triển khai trước khi công khai source và sản phẩm.
