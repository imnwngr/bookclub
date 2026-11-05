> **Lưu trữ lịch sử:** Các hướng dẫn và trạng thái bên dưới phản ánh thời điểm trước. Production đã hoàn tất clean rebuild và refinement; không chạy lại các lệnh lịch sử. Xem README.md để biết trạng thái hiện hành.

## FINAL CHECK — chưa đủ dữ liệu chi tiết để kết luận SAFE TO APPLY

Preflight production do người dùng tóm tắt: 2 mốc, end_time/icon chưa có, 7/7 RLS, anon_save=false/authenticated_save=true, 10 aliases/0 secondary, 10 snapshots của một Draft, directory/snapshot Nguyễn Hoàng Viện đều chứa nội dung cũ. Chưa có toàn bộ JSON trong phiên này: chưa xác minh **snapshot khớp chính xác từng ký tự với nội dung cũ trong WHERE**, hay **primary_alias của từng snapshot khớp canonical trong directory**. Không suy ra hai điều này từ số lượng alias phụ bằng 0.

Migration production duy nhất sau review: supabase/migrations/202611050001_ui_refinement.sql. Trong một transaction + lock_timeout 5s, khóa bảng liên quan; dừng nếu schema đã đổi/đã áp dụng, không đúng 2 mốc, có alias phụ, canonical snapshot khác directory, không đúng một Draft target hoặc description cũ không khớp chính xác. UPDATE có điều kiện chính xác chỉ directory guest ID 10000000-0000-4000-8000-000000000001 và snapshot Draft tương ứng; Published snapshot/khách khác không thay đổi. Thêm end_time NULL và icon book, giữ 2 UUID mốc tại thời điểm migration; save_event về sau có thể thay UUID agenda do delete/insert. Không tự tạo suffix hay nhận invitation_edits phụ; direct authenticated alias writes bị thu hồi, trigger bảo vệ primary và resolver chỉ primary. Guard cuối kiểm tra ACL effective và 7 RLS trước COMMIT. Không thay Auth/Storage/RLS policies.

Kiểm thử local tests/refinement-database.test.ts + refinement-api.test.ts **9/9 PASS**, bao gồm cố ý gây lỗi cuối transaction rồi ROLLBACK kiểm tra description/schema/2 agenda IDs giữ nguyên, chạy lại bị chặn, canonical primary/alias phụ, range/icon, ACL/RLS và postflight JSON 1 hàng. Đây là PGlite với Auth/Storage shim, không phải live migration. ESLint và git diff --check PASS. Chưa chạy migration production.

Trình tự: (1) chạy supabase/refinement-final-guards.sql chỉ đọc trên đúng project, mong đợi agenda_count=2, directory_exact_match=1, target_draft_count=1, target_draft_exact_match=1, secondary_alias_count=0, noncanonical_invitation_count=0, refinement_columns_count=0; lưu export preflight đầy đủ gồm agenda IDs/RPC ACL để đối chiếu. (2) Nếu mọi giá trị khớp và người dùng phê duyệt riêng, chạy toàn bộ migration một lần; bất kỳ lỗi -> ROLLBACK và báo, không sửa guard để ép qua. (3) chạy supabase/refinement-postflight-json.sql, so sánh 2 agenda IDs/nội dung với export; end_time NULL/icon book, target description mới, các snapshot khác không đổi, secondary=0/noncanonical=0, anon_save=false, authenticated_save=true, anon_resolve=true, alias write privileges=false, RLS 7/7. (4) Live fixture Auth/agenda/icon/primary route/Draft/Published và cleanup; không chạy lại toàn bộ suite cũ.

Không áp dụng SQL, rebuild, commit, push hay deploy trong lượt review. Frontend production v1.0 vẫn có rủi ro không tương thích schema v1.1 hiện tại; không xác nhận UI production PASS. Đoạn BLOCKED cũ dưới đây là lịch sử, thay bằng điều kiện chính xác trên.

## FINAL REVIEW — BLOCKED chờ preflight production hiện tại

Ngày 2026-11-05: probe API chỉ đọc project trdofhdspbkwgernwybp: event_agenda_items.time HTTP 200; end_time,icon HTTP 400/42703. Migration cần thiết; chưa áp dụng. tests/refinement-database.test.ts + refinement-api.test.ts **6/6 PASS** trên PGlite/mock, không phải Supabase live. Production baseline user-reported 18/18 flags, 41+9 Auth/API PASS là bằng chứng trước migration, không thay cho preflight hiện tại.

Migration transaction thêm end_time nullable + icon whitelist/default, giữ mốc cũ NULL; save_event giữ signature, is_admin, optimistic locking, UTC fields và ACL anon/auth; resolve_invitation vẫn Published/admin. Trigger và REVOKE authenticated thay đổi quyền direct alias; existing secondary alias rows giữ lại nhưng link phụ sẽ ngừng resolve. Trước khi áp dụng phải kiểm tra số link phụ Published và chấp nhận ảnh hưởng, kể cả khi dữ liệu lịch sử hiện được phép bỏ. Không thay RLS policies/Storage; quyền alias table thay đổi có chủ đích. V1.0 frontend còn default_aliases và thiếu location_method nên có rủi ro lỗi CRUD với schema v1.1 đã tồn tại, độc lập migration này; migration cũng ngừng resolve link phụ. Không thể báo v1.0 tương thích toàn diện hoặc UI production PASS.

Migration không idempotent: ADD COLUMN/CONSTRAINT/FUNCTION/TRIGGER lần hai lỗi; transaction rollback khi lỗi trước COMMIT. Sau COMMIT ưu tiên roll-forward, lưu export definition/ACL trước khi chạy; không DROP range/icon đã có dữ liệu. save_event thay agenda bằng DELETE/INSERT khi payload có agenda: nội dung được lưu lại nhưng UUID các agenda item có thể thay đổi khi lưu; không tuyên bố bảo toàn ID qua các lần save. SQL mô tả riêng khớp nguyên văn yêu cầu, dùng điều kiện ID/name/description cũ, không sửa snapshot; nếu 0 rows dừng review, không nới WHERE. Chạy riêng chỉ khi review/cho phép cập nhật directory.

Preflight/postflight đã mở rộng kiểm tra columns, overload/signature, function body/ACL, RLS policies, alias counts và mô tả. Chưa có output preflight hiện tại, chưa xác nhận số link phụ/ACL thực tế, chưa test migration/Auth/Storage HTTP trên staging. Vì vậy kết luận **BLOCKED**: chưa đủ bằng chứng để nói SAFE TO APPLY. Sau khi có preflight, nếu có xung đột/ảnh hưởng ngoài dự kiến thì dừng và review; sau phê duyệt riêng mới thực hiện migration → postflight → live fixture tests.

# UI Refinement — SQL review (chưa áp dụng production)

Project duy nhất: trdofhdspbkwgernwybp. Không chạy REBUILD.sql. Auth, Storage và các RLS policies hiện có được giữ nguyên; migration này chỉ thêm metadata chương trình và giới hạn alias theo yêu cầu.

## Trình tự sau phê duyệt riêng

1. Chạy supabase/refinement-preflight.sql chỉ đọc. Export agenda và definition/ACL save_event/resolve_invitation để đối chiếu/khôi phục logic nếu cần. Đếm alias phụ hiện có và thông báo các link phụ sẽ không còn được resolver chấp nhận sau thay đổi primary-only.
2. Review rồi chạy toàn bộ supabase/migrations/202611050001_ui_refinement.sql trong một transaction, một lần. Không áp dụng lại sau COMMIT. Nếu lỗi, ROLLBACK, không chạy từng đoạn để vượt lỗi.
3. Chạy supabase/refinement-postflight.sql. Không đổi Auth/Storage để ép PASS.
4. Test live tập trung trên fixture QA: agenda giờ/icon lưu–reload–RPC, legacy milestone vẫn còn, primary route hoạt động, alias phụ bị từ chối cả direct API/RPC, nonadmin/Draft vẫn bị chặn. Chỉ cleanup fixture do lượt này tạo; không cần chạy lại toàn bộ 41 API tests không liên quan.

## Dữ liệu và quyền

- Thêm end_time nullable; mốc hiện có giữ nguyên time/description/highlight/ID, end_time=NULL vì không tự đoán giờ kết thúc. Icon cũ mặc định book.
- RPC cho phép mốc legacy không có end_time chỉ khi time/description không đổi; mốc mới/đã đổi phải có giờ kết thúc. Nếu có end_time, HH:mm và end_time>time. Không tự hỗ trợ khoảng qua nửa đêm; chia thành mốc hợp lệ khi cần.
- Whitelist icon: welcome/speech/book/chat/music/gift/summary/camera/finish. Không lưu SVG/HTML trong database.
- save_event vẫn signature jsonb,uuid[],uuid,timestamptz; giữ SECURITY DEFINER, is_admin và optimistic updated_at. Anon EXECUTE vẫn bị thu hồi; authenticated được gọi nhưng nonadmin bị guard chặn.
- Thu hồi INSERT/UPDATE/DELETE trực tiếp trên invitation_aliases từ authenticated, không thay policies hay schema-wide grants. save_event tạo alias chính trong transaction. Trigger không cho thêm/sửa alias khác primary snapshot; resolver chỉ chấp nhận primary.
- Không xóa alias cũ. Các dòng phụ nếu có vẫn nằm trong bảng để kiểm tra, nhưng không hiển thị UI và không được resolve sau migration. Xóa event qua flow được phép vẫn cascade bình thường.
- Frontend probe columns trước khi lưu agenda có range/icon; database chưa nâng cấp thì báo chưa lưu, tránh success giả/mất dữ liệu.

## Cập nhật mô tả riêng

supabase/hotfixes/nguyen-hoang-vien-description-review.sql chỉ UPDATE đúng guest ID/tên và description cũ mong đợi. Nội dung cuối dùng “Phó Trưởng phòng Kiểm tra – Pháp chế và Triển khai Chiến lược và Truyền thông”. Không âm thầm override tên trong React, không UPDATE các snapshot đã phát hành hoặc khách khác. Nếu affected rows=0, review dữ liệu drift; không bỏ WHERE để ghi đè. Muốn đổi snapshot thiệp có sẵn cần chỉ định và review riêng.

## Rollback

Nếu transaction chưa COMMIT, ROLLBACK giữ nguyên schema/dữ liệu. Sau COMMIT ưu tiên roll-forward; không DROP cột có dữ liệu range/icon. Có thể restore definition/ACL hai RPC và quyền alias từ bản export sau review, giữ cột mới và dữ liệu. Không có auto downmigration phá dữ liệu. Không dùng rebuild/force reset.

## Bằng chứng

PGlite PostgreSQL local: 5 SQL tests trong nhóm refinement (legacy preservation + save/reload + primary-only + constraints + nonadmin/Draft). Auth/Storage schema trong tests là shim, không phải Supabase live. Các tests khác và browser mock được báo riêng trong VERIFICATION.md. Chưa áp dụng SQL mới; baseline database LIVE VERIFIED vẫn là bản trước refinement.
