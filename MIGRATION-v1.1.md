> **Lưu trữ lịch sử:** Các hướng dẫn và trạng thái bên dưới phản ánh thời điểm trước. Production đã hoàn tất clean rebuild và refinement; không chạy lại các lệnh lịch sử. Xem README.md để biết trạng thái hiện hành.

# KẾ HOẠCH NÀY ĐÃ ĐƯỢC THAY THẾ

Người dùng chọn clean database rebuild, không giữ dữ liệu/URL v1.0. Dùng supabase/rebuild-v110/README.md và REBUILD.sql; không chạy hai migration upgrade bên dưới cho project hiện tại. Nội dung dưới giữ lại làm lịch sử review, không phải quy trình được chọn.

# Review migration v1.1.0, chưa áp dụng production

## Kết luận review mới nhất: BLOCKED (live evidence), local fixes đã qua tests

Đã review đầy đủ hai SQL và chạy compatibility tests riêng. Hai vấn đề local đã sửa: trigger danh bạ trước đây bỏ qua alias do frontend v1.0 chỉnh trong default_aliases; nay lấy alias đầu làm primary khi primary chưa được chỉnh riêng, lưu các alias còn lại vào legacy_default_aliases, không đổi invitation_aliases. Trigger helpers SECURITY DEFINER trước đây giữ PUBLIC EXECUTE mặc định; nay revoke client execute và remember_event_code có admin guard. Triggers vẫn chạy khi admin ghi bảng/RPC, đã chứng minh bằng role SQL tests. Không sửa database thật.

Compatibility local PASS: sau migration 1, chưa có bucket/registry migration 2, payload v1.0 create/update vẫn chạy; SELECT events theo current code và resolve_invitation còn đúng, tọa độ/địa chỉ cũ giữ nguyên. Migration không đổi signature save_event, không xóa snapshot/alias event. Tuy nhiên v1.0 frontend dùng SELECT events WHERE code: **sau khi đổi mã bằng v1.1, trang event-detail ở client v1.0 cached không hiểu code history**. Thiệp qua resolve_invitation vẫn giải quyết được mã cũ. Vì vậy không bật đổi mã trước khi deploy frontend v1.1, yêu cầu reload client cũ, và không rollback nguyên frontend v1.0 sau khi đã có renames nếu chưa backport get_event_v110. Đây là giới hạn tương thích có điều kiện, không được mô tả là tương thích tuyệt đối.

Hai transaction không phải một release atomic: nếu migration 2 fail, giữ frontend v1.0, không bật upload/agenda editor mới; review và roll-forward migration 2. Không rerun migration đã COMMIT: CREATE/ADD/RENAME sẽ báo existing object; dùng migration history và kiểm tra to_regclass/functions trước. Nếu lỗi trong transaction, SQL Editor có thể còn trạng thái aborted: chạy ROLLBACK cho session đó trước khi kiểm tra, không chạy từng đoạn để ép qua lỗi. Không có down migration an toàn sau khi dùng tính năng mới vì code history/agenda/metadata là dữ liệu cần giữ.

Staging chưa có bằng chứng cấu hình: .env.local chỉ trỏ project production trdofhdspbkwgernwybp; không có staging URL/phiên SQL riêng khả dụng. Không dùng production làm staging. Preflight mới cung cấp function bodies/ACL/search_path, constraints/triggers/grants, object tồn tại, collisions, row counts, Storage bucket/policies. Chưa có kết quả preflight hiện tại từ SQL Editor hoặc backup production để đối chiếu row-level; kết quả seed/PGlite không thay thế dữ liệu thật. Cần chạy preflight read-only trên đúng project, review output/backup, và test hai migration cùng Storage HTTP trên staging riêng trước khi kết luận SAFE TO APPLY.

Baseline: foundation 202611030001 đã chạy production v1.0.0. Không sửa file đó. Cần review hai migration mới theo thứ tự:

1. `202611040001_v110.sql`: alias chính guests, backup legacy_default_aliases; event_codes; agenda; location method và metadata path; wrapper RPC save_event; old-code-aware get_event_v110/resolve_invitation.
2. `202611040002_venue_storage.sql`: registry upload, FK ảnh, bucket private bookclub-venues, RLS Storage.

## Trước khi áp dụng

Chạy `preflight-v110.sql` trên đúng project bằng SQL Editor khi được phép. Lưu backup dữ liệu/schema theo quy trình chủ project, không đưa backup hoặc credentials vào Git. Đối chiếu định nghĩa save_event/resolve_invitation/protect_event_code và FK với foundation thực tế. Dừng nếu có drift chưa review.

Migration 1 tự dừng và rollback transaction nếu canonical aliases trống/trùng hoặc không hợp lệ. Không tự thêm suffix vào dữ liệu khách production để che xung đột. Guest ID và event UUID không đổi; default_aliases được chuẩn hóa thành array một phần tử, toàn bộ giá trị cũ giữ ở legacy_default_aliases. **Không có thao tác xóa invitation_aliases khi chuyển danh bạ.** Việc xóa alias phụ sau đó chỉ xảy ra trong save_event khi admin chủ động bỏ alias trong editor; alias chính được bảo vệ.

Migration 2 dừng nếu có bucket cùng tên hoặc bất kỳ policy Storage objects có sẵn. Đây là gate bảo thủ để chủ project review permissive policies có thể cộng quyền, không tự xóa policy của bucket khác. Chỉ bỏ gate trong bản migration được review khi đã chứng minh các policy hiện có không cấp quyền rộng cho bucket BookClub. File tối đa 5 MiB; image/jpeg, image/png, image/webp.

## Compatibility và transaction

event_codes ghi mọi mã hiện tại/cũ. Trigger serialize namespace và từ chối reuse mã của event khác. Đổi code không đổi ID; get_event_v110 và resolve_invitation tìm qua event_codes rồi kiểm tra Published/admin. Đây là alias giải quyết dữ liệu, không bắt buộc HTTP redirect. Link cũ vẫn có thể giữ URL cũ và hiển thị event hiện tại. Bản v1.0 đang mở tiếp tục gọi save_event cùng chữ ký: wrapper giữ tương thích payload không có agenda/image/alias edits; hàm cũ đổi tên thành save_event_v100, chỉ owner gọi được. Không đổi FK invitation_aliases_event_guest_id_event_id_fkey đã dùng để xử lý PGRST201.

save_event mới lưu event, selection, đổi mã, agenda và staged aliases cùng transaction. Nếu constraint/conflict/updated_at lỗi, transaction rollback. Thời gian event là UTC, agenda là HH:mm Việt Nam theo ngày chương trình, không hỗ trợ 24:00. Không tự đổi code khi chỉ sửa title. Code để trống ở lần tạo được sinh từ title; unique conflict báo lỗi để admin chỉnh, không ghi đè.

## Ảnh và private access

Frontend giữ File/preview trong bộ nhớ, chưa upload trước save. Upload tạo registry trước, rồi object UUID riêng; RPC save gắn path. Bucket không public, không có signed URL tồn tại lâu; thiệp tải Blob qua Storage API bằng phiên hiện tại, nên RLS được xét khi tải. Published được đọc, Draft chỉ admin. Không có policy UPDATE object, replacement dùng path mới. Object DELETE chỉ khi không event nào tham chiếu; FK bảo vệ registry đang dùng.

Storage và PostgreSQL không chung transaction: khi save/upload fail frontend cố xóa object và registry của path vừa tạo. Nếu mạng chết hoặc cleanup fail, path vẫn được đăng ký, không trở thành object vô chủ không truy vết; UI báo rõ và cho chủ upload dọn các pending quá 24h. Không tự xóa pending của admin khác hoặc pending mới ở tab khác. Auth user có upload registry không thể bị xóa cho tới khi xử lý các registry liên quan (FK restrict); cần đưa vào quy trình quản lý tài khoản. Cần staging Storage HTTP tests trước production, PGlite không kiểm tra Storage service thực.

## Hậu kiểm và rollback

Chạy `postflight-v110.sql`; bốn counters lỗi phải bằng 0. Đối chiếu row counts/ID và snapshot/alias cũ với backup; registry/bucket private và policies đúng phạm vi. Chạy live Auth runner/CRUD và thêm smoke staging: rename -> old links, canonical alias conflict, agenda reload, upload/download Draft/Published/depublish, thay/xóa ảnh, lỗi network và cleanup.

Nếu migration 1 hoặc 2 lỗi trước COMMIT: transaction tự rollback; dừng để review, không chạy lại từng đoạn. Hai migration là hai transaction riêng; nếu migration 2 lỗi, migration 1 có thể đã commit: không deploy frontend mới trước khi cả hai qua review. Sau khi có dữ liệu v1.1, ưu tiên roll-forward; không cung cấp down migration DROP các bảng/history vì sẽ mất URL/agenda/metadata. Rollback frontend cần giữ resolver/wrapper tương thích và kiểm tra old-code routing; không khôi phục snapshot database đè dữ liệu mới nếu chưa có kế hoạch được phê duyệt.
