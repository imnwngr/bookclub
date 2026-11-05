# BookClub Event Manager CTUT — v1.1.0

Ứng dụng quản lý sự kiện và thiệp mời của CLB Sinh viên Yêu thích Sách CTUT. Frontend v1.1 đang chuẩn bị phát hành; GitHub Pages hiện vẫn phục vụ v1.0. Database Supabase production đã clean rebuild v1.1 và refinement đã được áp dụng, hậu kiểm đạt. Xem [VERIFICATION.md](VERIFICATION.md) và [UPGRADE-v1.1.md](UPGRADE-v1.1.md) để đối chiếu bằng chứng; các đoạn báo cáo cũ là lịch sử theo thời điểm.

## Chạy local

Cần Node.js 24 và npm; dùng lockfile: `npm ci`. Tạo `.env.local` từ `.env.example`, cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` của project được phép dùng. Các biến Vite là công khai trên frontend; không đặt service_role, mật khẩu hoặc token riêng. Chạy `npm run dev`, mở `/bookclub/`. Không commit `.env.local`.

## SQL và môi trường dữ liệu

- `supabase/migrations/202611030001_foundation.sql` và `supabase/seed.sql`: lịch sử v1.0, không dùng làm quy trình nâng cấp production.
- `supabase/rebuild-v110/`: hồ sơ clean rebuild đã thực hiện trên production, bao gồm script destructive và schema/seed. **Không chạy lại REBUILD.sql hoặc các fragment reset**; chúng không phải quy trình setup thông thường.
- `supabase/migrations/202611040001_v110.sql`, `202611040002_venue_storage.sql`: phương án nâng cấp lịch sử đã bỏ, không chạy trên production.
- `supabase/migrations/202611050001_ui_refinement.sql`: refinement đã COMMIT và hậu kiểm production. Không chạy lại.
- Các file `*preflight*`, `*postflight*`, `supabase/hotfixes/` và hồ sơ review phục vụ kiểm tra/audit. Kiểm tra nội dung và project trước khi chạy; hậu kiểm chỉ đọc không thay cho Auth/RLS live tests.

Không chạy tự động chuỗi migrations cũ hoặc `supabase db push` trên production. Mọi thay đổi schema production tiếp theo cần migration riêng, review dữ liệu/quyền, backup và phê duyệt riêng; giữ Auth và dữ liệu người dùng.

### Project mới riêng biệt

Tạo project Supabase mới, xác nhận đây là môi trường trống và độc lập. Chuẩn bị, review riêng một baseline không destructive từ `supabase/rebuild-v110/02-schema.sql` và seed canonical; refinement hiện tại chứa guard/data update gắn với preflight production, **không chạy nguyên xi trên project mới**. Thiết kế migration tương thích và test trên môi trường mới trước khi áp dụng. Tạo tài khoản qua Supabase Auth; quản trị viên có quyền SQL cấp membership bằng UUID lấy tại Dashboard:

```sql
insert into public.admin_users(user_id) values ('<UUID_AUTH_ADMIN>') on conflict do nothing;
```

Không đặt UUID tài khoản production, mật khẩu hoặc credentials vào repository. Không dùng REBUILD.sql để setup project mới.

## Maps, kiểm thử và phát hành

Địa điểm hỗ trợ Google Maps URL/Place ID thủ công. Nếu dùng API key, hạn chế theo HTTP referrer, API và quota. Chạy `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`; browser tests hiện dùng mocks, còn live checks được ghi riêng trong VERIFICATION.md.

Vite và Router dùng `/bookclub/`; GitHub Pages fallback dùng `404.html` nên deep link có thể trả HTTP 404 ban đầu trước khi client khôi phục route. Workflow kiểm tra và deploy `dist` từ branch main; commit/push/deploy chỉ thực hiện khi được phê duyệt riêng. Sau deploy cần smoke test production và xác minh đúng commit. Không mặc định rollback sang frontend v1.0 vì có nguy cơ không tương thích schema hiện tại.
