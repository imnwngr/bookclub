# HSV 3.0.0: migration và chuyển đổi

**Production chưa được thay đổi.** Hai migration mới đã được thử local; chưa có bằng chứng schema, migration history, backup/restore và Edge revision hiện tại qua kết nối quản trị. REST công khai xác nhận project `trdofhdspbkwgernwybp` chưa có cột v3. CLI 3.2.0 lấy từ package chính thức `supabase` (repository github.com/supabase/cli) chạy được nhưng chưa được đăng nhập. Docker daemon trả 500, nên native Auth/SMTP sandbox chưa chạy. Không đưa password/token vào chat hoặc repository.

## Trước khi ghi production

1. Kết nối Supabase được cấp quyền phù hợp cho đúng project. Đọc schema/definitions/ACL/RLS và lịch sử migration bằng management API; chạy `supabase/hsv-v3-preflight.sql` read-only. So sánh definitions với source và guard, lưu bản kết quả trong `.local/hsv-v3/production/` với quyền truy cập hạn chế. Đọc được public API không chứng minh quyền ghi.
2. Xác minh backup mới nhất hoặc PITR window, phạm vi (database, Auth, Storage bytes, cấu hình managed services), operator có quyền restore, nơi khôi phục tách biệt, thời gian phục hồi và mất dữ liệu tối đa. Thử restore phù hợp; logical dump không tự chứng minh Auth/Storage/SMTP đã hoạt động. Các file backup có sẵn không được coi là hợp lệ chỉ vì tồn tại.
3. Đọc deployment/revision/source của `manage-editors`, JWT verification, tên secrets (không xuất giá trị), Auth Site URL/redirect allowlist, SMTP/provider và lỗi delivery. Kiểm tra các tài khoản fixture thuộc sandbox/mail sink; không thử email production.
4. So sánh bản schema tách biệt với production. Migration mới dùng guard cấu trúc/security, transaction, lock_timeout 5s và từ chối replay/partial state. Không thay guard chỉ để chạy cho qua. Nếu schema lệch, dừng apply và viết migration thích hợp sau audit.

## Schema và thứ tự

Chỉ áp dụng **các file mới chưa áp dụng**, qua migration management API hoặc pipeline được xác thực, theo thứ tự; không chạy `db push` cả thư mục và không chạy REBUILD/reset/seed lịch sử.

1. `202611200001_event_types_theme.sql`: thêm `events.event_type` default invitation và `theme` JSON version 1; bỏ NOT NULL của starts_at/ends_at và thay hai CHECK thời gian/địa điểm bằng quy tắc theo loại. Kiểu invitation vẫn bắt buộc đủ thời gian hữu hạn, kết thúc sau bắt đầu và liên kết địa điểm. Congratulation có thể null thời gian và không có liên kết địa điểm. Những giá trị đã có vẫn được giữ, các CHECK cú pháp khác giữ nguyên. Thêm hai slug dành riêng, cập nhật `save_event` mà không thay snapshot/primary alias/guest reconciliation/concurrency guard, expose capability. `event_payload_v110` dùng to_jsonb nên tự trả hai thuộc tính qua get/resolve; kiểm chứng thực tế sau apply.
2. Chạy postflight tương ứng, đối chiếu fingerprint trước/sau, RLS/ACL và resolver. Ngay sau migration đầu, mọi dữ liệu cũ phải là invitation. Không có update nội dung lịch sử hoặc media.
3. `202611200002_editor_add_operations.sql`: ledger email có RLS, không grant trực tiếp cho client/service role. `begin_editor_add` và `finish_editor_add` chỉ service_role EXECUTE; `editor_add_recovery` chỉ authenticated EXECUTE và kiểm tra Admin bên trong. Giữ RLS/Editor policy nội dung hiện hành. Bổ sung vào nhánh revoke đã kiểm tra của `set_editor_role`: vô hiệu hóa lease đang chạy và đánh dấu revoked, giữ nguyên các guard/ACL còn lại. Cập nhật capability để release gate biết cả hai schema có mặt.
4. Chạy `supabase/hsv-v3-postflight.sql` và audit schema/ACL đầy đủ lần nữa. Không suy ra RLS live từ frontend mock tests.
5. Deploy Edge source với JWT verification bật và service-role chỉ có trong Edge environment. Ban đầu để `BOOKCLUB_ROLE_MODE=fixture`, `BOOKCLUB_ROLE_FIXTURE_USER_ID` trỏ fixture đã xác minh, không bật gửi email. Mã mới vẫn dùng tên biến cũ để tránh mất cấu hình ngầm.
6. Thử native sandbox `BOOKCLUB_ROLE_MODE=sandbox`, `HSV_LOCAL_ORIGIN=http://127.0.0.1:<port>`, Supabase URL loopback hoặc Kong local, email sink thật (không relay). Chỉ sandbox đã xác minh mới đặt `HSV_INVITATIONS_ENABLED=verified`. Thử email nhận được, accept/mật khẩu/Editor, expired/reused links, SMTP lỗi, response bị mất và request đồng thời. Mode sandbox từ chối URL Supabase cloud.
7. Cấu hình production Auth redirect chính xác `https://imnwngr.github.io/hsv/auth/accept` và `/hsv/auth/callback`. Giữ redirect `/bookclub/auth/accept` trong thời gian chuyển đổi nếu còn thư đang chờ, nhưng đường dẫn đó còn cần hosting phục vụ. Site URL mới `/hsv/`. CORS dùng origin `https://imnwngr.github.io`, không có base path.
8. Khi các gate email/server được xác minh, production chuyển `BOOKCLUB_ROLE_MODE=live` và `HSV_INVITATIONS_ENABLED=verified`. Chưa có giá trị `verified` thì vẫn cấp tài khoản có sẵn được, email mới nhận `invitation_not_ready`; không tuyên bố đã mời.

## Ngữ nghĩa và phục hồi tài khoản

Admin nhập email một bước. Server xác minh session/Admin và DB kiểm tra lại actor, target bị cấm/anonymous/Admin. Khoá advisory dùng chung với set_editor_role. Ledger khóa email chuẩn hóa và cấp lease 90 giây trước Auth invite. Request đang chạy trả 202; UI giữ trạng thái, không báo thành công.

Auth và database không có transaction chung. Nếu email/API response bị mất, ledger giữ unknown; sau lease, lần kiểm tra tìm tài khoản Auth chính xác theo email rồi chỉ khôi phục quyền. Không tự gọi invite lần nữa. Nếu chưa có tài khoản, cần operator đối chiếu log email; code này không cung cấp nút resend hoặc tự xóa ledger. Nếu process dừng sau claim nhưng trước Auth, hệ thống cũng giữ unknown để tránh gửi trùng khi chưa biết kết quả. Trạng thái granted chỉ trả sau SQL cấp Editor; invited/unconfirmed/confirmed được phân biệt, không chứng nhận email đã đến hộp thư.

Retry Admin đã mất quyền, target bị cấm hoặc Admin không được cấp quyền. Editor/anonymous không gọi được ledger RPC hay đọc bảng. Recovery chỉ Admin; không đưa Auth directory vào frontend ngoài directory quyền hiện hành. Account invitation thành công nhưng grant thất bại xuất hiện trong danh sách cần khôi phục; không xóa user Auth hoặc gửi thêm email.

Thu hồi quyền vô hiệu hóa lease; worker cũ không hoàn tất grant sau revoke. Retry cùng request vừa hoàn tất nhưng quyền sau đó bị thu hồi trả `role_changed`, không tự thêm Editor. Admin muốn thêm lại phải bắt đầu thao tác mới. Các test SQL local kiểm tra cả retry response bị mất và worker đến muộn; không coi đây là bằng chứng deploy production.

## Theme và chuyển loại

Schema `{version:1,primary:'#RRGGBB'}` không nhận key khác/raw CSS. Giá trị thiếu/lỗi khi đọc fallback xanh Hội `#174b78`. Màu chữ/nền được suy ra để giữ contrast; theme chỉ scope trên route sự kiện và preview, cleanup khi về quản trị/home. Theme đọc trực tiếp từ event, không phải snapshot thiệp; đổi màu sẽ đổi mọi thiệp của sự kiện. Snapshot người nhận hoàn toàn không thay đổi.

Đổi loại giữ dữ liệu thời gian/địa điểm đã nhập cả trong form và database. Congratulation ẩn toàn bộ lịch/venue/maps, không gọi formatter thời gian sự kiện null. Bộ lọc dùng ngày tạo và ghi nhãn đúng. Trở lại invitation cần hoàn tất validation cũ trước save. Preview chưa lưu không thay link đã lưu.

## Rename, Pages và link cũ

Chỉ rename khi backend/recovery gate và local/CI tests đã PASS. Recheck `imnwngr/hsv` không tồn tại; `gh api -X PATCH repos/imnwngr/bookclub -f name=hsv`, rồi `git remote set-url origin https://github.com/imnwngr/hsv.git`. Không đổi thư mục local. Kiểm tra lại Pages source workflow, repository variables/secrets và quyền Actions sau rename. Chưa thực hiện các lệnh này trong lần triển khai local.

Workflow mới chạy verify cho main/hsv-v3 và PR. Deploy chỉ cho main tại `imnwngr/hsv`, khi repository variable `HSV_V3_PRODUCTION_READY=true`; trước deploy chạy capability check read-only. Biến gate chỉ được bật sau khi operator có bằng chứng backup, migration, native Auth/Edge/email và smoke phù hợp. Không set true chỉ vì unit tests xanh. Không overwrite tag v3.0.0; tag tạo sau đủ điều kiện release.

Canonical: `/hsv/thiep-moi/:code/:alias`, `/hsv/thiep-chuc/:code/:alias`; detail bỏ phần alias. Sai loại hoặc URL ngắn `/hsv/:code/:alias` chuyển canonical sau resolver kiểm quyền, giữ query/hash. Slug admin/auth/thiep-moi/thiep-chuc được bảo vệ. 404 Pages round-trip đã được test ở local server mô phỏng HTTP 404.

`/bookclub/` hiện còn phục vụ bản cũ vì repo chưa rename. GitHub repository redirect không chứng minh GitHub Pages redirect. Sau rename, giữ link cũ cần một hosting riêng ở `/bookclub/` phục vụ bridge sang `/hsv/` rồi resolver xác định loại. Chưa tạo compatibility repository/hosting; không cam kết link cũ còn chạy sau rename. Không thay tên bucket bookclub-venues/bookclub-music.

## Rollback / containment

Nếu transaction chưa commit, lỗi tự rollback. Sau commit, không drop cột/bảng mới, không reset database hoặc xóa ledger. Trước thay production lưu definitions/ACL/Edge revision/cấu hình đã được kiểm tra. Có thể tắt `HSV_INVITATIONS_ENABLED` và đặt mode không hợp lệ để ngừng Edge; điều này không thu hồi email đã gửi hay quyền đã cấp. Phải chờ/drain request đang chạy và kiểm ledger trước kết luận đã ngừng mọi side effect.

Nếu cần chặn chức năng mới ở database, thu hồi service EXECUTE của begin/finish trong transaction riêng sau audit, giữ bảng và mọi rows; service gọi lại sẽ lỗi. Không đổi RLS hàng loạt. UI containment dùng bản v3 có thông báo bảo trì, không rollback mù về v2 vì v2 không hiểu thời gian null của Thiệp chúc. Phục hồi backup có thể mất dữ liệu phát sinh sau backup, nên cần operator và cửa sổ bảo trì riêng.
