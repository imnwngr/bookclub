# Review migration icon chương trình

Trạng thái: **BLOCKED chờ preflight trên đúng project production và phê duyệt riêng**. Không có SQL production nào được thực thi trong đợt review này.

Kiểm thử thực tế: 13/13 Vitest liên quan PASS, gồm PGlite PostgreSQL local với cả chín icon cũ, cả 11 icon mới, owner role tạo function, search_path rỗng, ACL, RLS, save_event admin/non-admin, lỗi và rollback transaction, chạy lặp và hai truy vấn audit; frontend trước/sau capability được kiểm tra bằng mock. ESLint PASS. PGlite mô phỏng Auth và không chứng minh ACL production hiện tại.

## Thứ tự review

1. Xác nhận project ID `trdofhdspbkwgernwybp` trên Dashboard. Chạy `supabase/agenda-icons-preflight.sql` trong SQL Editor và lưu JSON. `current_database()` chỉ cho biết tên database, không chứng minh project ID.
2. Đối chiếu `agenda_icon_valid` có chín giá trị cũ, đã validated; RLS đang bật; `save_event` có kiểm tra `is_admin()`, anon không EXECUTE và authenticated có EXECUTE. Dừng nếu có overload `agenda_icon_capabilities` hoặc dependency ngoài dự kiến, ACL lạ, dữ liệu icon bất thường, hoặc khác biệt schema. Kiểm tra owner và quyền của tài khoản chạy SQL. Không thay thế function đã tồn tại mà chưa review.
3. Chỉ sau review và phê duyệt riêng, áp dụng `supabase/migrations/202611060001_agenda_icon_library.sql`. Lệnh `ALTER TABLE` cần khóa mạnh và có thể chờ giao dịch khác; lên lịch phù hợp. Migration tạo hoặc thay thế function với owner của function đang tồn tại (nếu có), hoặc owner là role thực thi (nếu tạo mới); `CREATE OR REPLACE` có thể giữ ACL cũ ngoài các grant được thu hồi rõ ràng.
4. Chạy `supabase/agenda-icons-postflight.sql`. Xác nhận `exact_allowlist`, `validated`, `agenda_rls` là true; RPC trả đúng 11 tên, `security_definer=false`, `return_type=text[]`, search_path rỗng, `anon_execute=false`, `public_execute=false`, `authenticated_execute=true`, owner và các grant khác phù hợp. So sánh fingerprint/số hàng, policy và hash `save_event`, `resolve_invitation` với preflight; dữ liệu thay đổi đồng thời sẽ làm fingerprint khác và cần điều tra. Kiểm tra `other_execute_grantees` và các quyền kế thừa nếu có.
5. Sau đó kiểm tra live bằng phiên thật: non-admin không ghi được, admin lưu/reload icon mới và thiệp hiển thị đúng. Frontend kiểm tra capability trước khi gửi tám tên mới; `music`, `gift`, `camera` vốn đã hợp lệ.

## An toàn và giới hạn

RPC là `SECURITY INVOKER`, search_path rỗng, trả hằng số; authenticated không phải admin cũng có thể xem danh sách tên icon. Nó không đọc dữ liệu và không cấp quyền ghi. ACL hiệu lực còn phụ thuộc role membership và default privileges thực tế, vì vậy phải kiểm tra kết quả production, không suy luận từ PGlite.

SQL có transaction bao gồm cả thay constraint và tạo/grant function; lỗi trước COMMIT rollback toàn bộ. PGlite đã thử cố ý gây lỗi và chạy lại hai lần. Sau COMMIT không tự động rollback: quay về constraint cũ chỉ an toàn khi không có hàng sử dụng tám icon mới và frontend tương thích; cần kế hoạch SQL riêng và phê duyệt, không tự xóa/chuyển dữ liệu. Hai thao tác `ALTER TABLE` có khóa nên preflight và apply không phải một kiểm tra nguyên tử; nếu schema hoặc function có thể thay đổi giữa hai bước, dừng và review lại.


## UI Overhaul release — current database status (2026-11-06)
User confirms Guest Order and Agenda Icon Library migrations APPLIED & POSTFLIGHT VERIFIED, and successful persistence of new icons in production. This supersedes earlier migration-pending/blocker entries retained as historical evidence. These are USER-REPORTED production results, not an independent SQL execution by this agent. No migration is to be rerun. Release includes Agenda segmented time inputs and Lucide icons, plus dnd-kit guest directory and persistent ordering. Production UI smoke remains pending deployment.
