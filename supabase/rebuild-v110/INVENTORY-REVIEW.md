> **Lưu trữ lịch sử:** Các hướng dẫn và trạng thái bên dưới phản ánh thời điểm trước. Production đã hoàn tất clean rebuild và refinement; không chạy lại các lệnh lịch sử. Xem README.md để biết trạng thái hiện hành.

# Đối chiếu inventory trước reset

Nguồn: JSON do chủ project cung cấp từ SQL Editor `trdofhdspbkwgernwybp`, trong phiên làm việc 2026-11-04. Đây là bằng chứng user-provided, không phải kết quả SQL do agent trực tiếp thực thi.

## Được phép thay thế

- 5 bảng: public.events, public.guests, public.event_guests, public.invitation_aliases, public.admin_users.
- 5 functions: save_event(jsonb,uuid[],uuid,timestamptz), resolve_invitation(text,text), is_admin(), touch_updated_at(), protect_event_code().
- 6 RLS policies trên 5 bảng và 6 triggers ứng dụng liệt kê trong inventory. Constraints/indexes thuộc các bảng này được thay bằng schema v1.1.
- Không có agenda/registry/history tables trong database hiện tại; chúng được tạo mới, không phải reset đối tượng không tồn tại.

## Giữ nguyên

- public.rls_auto_enable() và event trigger ensure_rls.
- issue_graphql_placeholder, pgrst_ddl_watch, pgrst_drop_watch, issue_pg_cron_access, issue_pg_net_access, issue_pg_graphql_access cùng các hàm hệ thống liên quan.
- auth.users, auth.identities, mật khẩu/credentials, extensions và schemas quản lý bởi Supabase.
- 2 Auth accounts. Membership được lưu tạm trong cùng transaction, JOIN lại auth.users và khôi phục UID [UID quản trị đã ẩn]; không tạo tài khoản hoặc đổi mật khẩu.
- Dữ liệu khác: không xóa schema, không dùng CASCADE. Phụ thuộc được PostgreSQL theo dõi từ schema khác sẽ chặn DROP RESTRICT.

## Storage

Inventory: buckets=[], bookclub_objects=0, không có Storage policies. Không cần cleanup file/bucket cũ, không gọi DELETE storage.objects. Tạo bucket bookclub-venues private, MIME JPG/PNG/WebP, giới hạn 5 MiB. Nếu Storage không còn rỗng ở thời điểm chạy, guard dừng toàn bộ transaction để review lại.

## Giới hạn

SQL không thể xác minh project ref chỉ từ current_database() vì các Supabase project thường cùng tên postgres. Người chạy bắt buộc xác nhận URL Dashboard có đúng project ref trước khi Run. Không suy ra project từ tên bookclub.

REBUILD.sql kiểm tra lại tên/count relations/functions, alias schema cũ, Storage rỗng, Auth count, admin mapping và trigger functions; DROP RESTRICT chặn dependencies có theo dõi. Đây không phải phép chứng minh mọi external client hoặc PL/pgSQL dynamic SQL đều không phụ thuộc: client v1.0 và tích hợp ngoài có thể ngừng hoạt động sau reset. Không tự deploy frontend để che khoảng gián đoạn.

Không chạy lại REBUILD.sql sau COMMIT. Nếu lỗi transaction, chạy ROLLBACK; dữ liệu trước transaction được giữ. Sau COMMIT reset không thể undo bằng rollback; dữ liệu v1.0 bị xóa theo phê duyệt. Không có chiến lược giữ URL/alias lịch sử.
