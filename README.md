# Sự kiện Hội Sinh viên CTUT · 3.0.0

Nền tảng sự kiện Hội Sinh viên CTUT. Source 3.0.0 bổ sung Thiệp mời/Thiệp chúc, màu riêng cho từng sự kiện và luồng thêm Editor có trạng thái khôi phục. Giữ typography tiếng Việt, vật liệu giấy/dệt, opening và nhạc Liquid Glass. **Database v3 đã áp dụng; chưa phát hành frontend/Edge v3**: còn kiểm tra Auth/SMTP/secrets qua kênh quản trị bổ sung trước khi đổi repository/Pages. Xem [HSV-V3-PLAN.md](HSV-V3-PLAN.md), [HSV-V3-MIGRATION.md](HSV-V3-MIGRATION.md) và [HSV-V3-VERIFICATION.md](HSV-V3-VERIFICATION.md).

## Chạy local

Redesign frontend ngày 11/11/2026: xem [DESIGN.md](DESIGN.md), [UI-REDESIGN-PLAN.md](UI-REDESIGN-PLAN.md), [UI-REDESIGN-VERIFICATION.md](UI-REDESIGN-VERIFICATION.md) và [INVITATION-SCROLL-FIX-VERIFICATION.md](INVITATION-SCROLL-FIX-VERIFICATION.md) để đối chiếu source, kiểm thử và giới hạn performance. Screenshots/video kiểm thử nằm trong `.local/` và không được commit. Các báo cáo nghiệm thu local và báo cáo live lịch sử không chứng nhận deployment production mới.

Cần Node.js 24 và npm; dùng lockfile: `npm ci`. Tạo `.env.local` từ `.env.example`, cấu hình `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` của project được phép dùng. Các biến Vite là công khai trên frontend; không đặt service_role, mật khẩu hoặc token riêng. Chạy `npm run dev`, mở `/hsv/`. Không commit `.env.local`. Chưa áp dụng migration v3 thì thao tác lưu bị chặn rõ ràng, không giả vờ lưu loại thiệp/màu.

## SQL và môi trường dữ liệu

- `supabase/migrations/202611030001_foundation.sql` và `supabase/seed.sql`: lịch sử v1.0, không dùng làm quy trình nâng cấp production.
- `supabase/rebuild-v110/`: hồ sơ clean rebuild đã thực hiện trên production, bao gồm script destructive và schema/seed. **Không chạy lại REBUILD.sql hoặc các fragment reset**; chúng không phải quy trình setup thông thường.
- `supabase/migrations/202611040001_v110.sql`, `202611040002_venue_storage.sql`: phương án nâng cấp lịch sử đã bỏ, không chạy trên production.
- `supabase/migrations/202611050001_ui_refinement.sql`: refinement đã COMMIT và hậu kiểm production. Không chạy lại.
- Các file `*preflight*`, `*postflight*`, `supabase/hotfixes/` và hồ sơ review phục vụ kiểm tra/audit. Kiểm tra nội dung và project trước khi chạy; hậu kiểm chỉ đọc không thay cho Auth/RLS live tests.

Không chạy tự động chuỗi migrations cũ hoặc `supabase db push` trên production. Hai migration ngày 20/11/2026 **đã áp dụng**, không replay; mapping version thực tế, backup và thử phục hồi nằm trong [hướng dẫn v3](HSV-V3-MIGRATION.md). Người dùng đã chấp thuận thay đổi trong phạm vi HSV 3.0.0; điều kiện an toàn và quyền kết nối vẫn phải đáp ứng.

### Project mới riêng biệt

Tạo project Supabase mới, xác nhận đây là môi trường trống và độc lập. Chuẩn bị, review riêng một baseline không destructive từ `supabase/rebuild-v110/02-schema.sql` và seed canonical; refinement hiện tại chứa guard/data update gắn với preflight production, **không chạy nguyên xi trên project mới**. Thiết kế migration tương thích và test trên môi trường mới trước khi áp dụng. Tạo tài khoản qua Supabase Auth; quản trị viên có quyền SQL cấp membership bằng UUID lấy tại Dashboard:

```sql
insert into public.admin_users(user_id) values ('<UUID_AUTH_ADMIN>') on conflict do nothing;
```

Không đặt UUID tài khoản production, mật khẩu hoặc credentials vào repository. Không dùng REBUILD.sql để setup project mới.

## Maps, kiểm thử và phát hành

Địa điểm hỗ trợ Google Maps URL/Place ID thủ công. Nếu dùng API key, hạn chế theo HTTP referrer, API và quota. Chạy `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`; browser tests hiện dùng mocks, còn live checks được ghi riêng trong VERIFICATION.md.

Vite/Router dùng `/hsv/`, thiệp dùng `/thiep-moi/:code/:alias` hoặc `/thiep-chuc/:code/:alias`. GitHub Pages fallback dùng `404.html`, deep link có thể trả HTTP 404 ban đầu trước khi client khôi phục route. Workflow kiểm tra main/hsv-v3; deploy chỉ tại repo `imnwngr/hsv`, branch main, `HSV_V3_PRODUCTION_READY=true` và capability backend hợp lệ. Không bật gate khi chưa có bằng chứng production. Push nhánh triển khai không deploy Pages. Chưa rename repo; không cam kết `/bookclub/` tự chuyển hướng sau rename. Không rollback mù về v2 vì Thiệp chúc có thời gian null.
