# HSV 3.0.0: migration và chuyển đổi

**Hai migration database và Edge v3 đã triển khai production ngày 20/11/2026; Auth đã có callback cũ/mới; repository đã đổi thành `imnwngr/hsv`; frontend HSV v3 chưa phát hành.** MCP và CLI 3.2.0 đã xác thực với project `trdofhdspbkwgernwybp`, PostgreSQL 17.11, ACTIVE_HEALTHY trong đợt backend trước. Trước migration đã đọc schema/ACL/RLS/history, lấy snapshot phần bị ảnh hưởng, khôi phục trên PostgreSQL local và chạy hai file migration nguyên bản. SMTP Resend đã hoàn tất theo xác nhận của người dùng, chưa phải bằng chứng kiểm thử luồng mời Editor production. Đợt Git/tài liệu này không chạy migration hoặc thay cấu hình backend. Không đưa password/token vào chat hoặc repository.

## Trạng thái đã áp dụng

| File source | Version trong history production | Kết quả |
|---|---|---|
| `202611200001_event_types_theme.sql` | `20261119220329` / `hsv_v3_event_types_theme` | PASS, UTC 2026-11-19 22:03 |
| `202611200002_editor_add_operations.sql` | `20261119220343` / `hsv_v3_editor_add_operations` | PASS, UTC 2026-11-19 22:03 |

MCP tạo timestamp history thực tế khác tên file local; **không chạy lại hai file**. Bốn migration history có trước đã được đối chiếu với definitions, không suy luận từ tên file. Fingerprint cả 9 bảng cũ giữ nguyên sau khi bỏ hai thuộc tính mới khỏi phép so sánh `events`; 24 hàm không liên quan giữ nguyên. `hsv_v3_capabilities()` trả đủ hai loại, theme v1 và editor ledger. Ledger trống, có RLS, client không có SELECT/INSERT hoặc EXECUTE begin/finish; service_role có EXECUTE.

Edge hiện là revision 5, source khớp `e2670a0`, JWT verification bật. Action `capabilities` chỉ dành cho Admin, chỉ đọc cờ mời email và không tạo ledger/user. Đã thử trên native sandbox trước deploy; source/HTTP kiểm lại sau deploy. Không có migration mới cho action này. Chi tiết bản deploy và các bằng chứng trong [nghiệm thu](HSV-V3-VERIFICATION.md).

## Backup có phạm vi và thử phục hồi

Snapshot được đọc trong một SQL statement nhất quán, lưu tại `C:\dev\temp\hsv-v3-production` ngoài repository, ACL chỉ Windows user hiện tại và SYSTEM. Bao gồm 9 bảng `public`, columns/defaults/constraints/indexes/triggers/policies/grants, 26 functions, history, storage policy definitions và Edge source revision 1. Chỉ lưu Auth UUID cần cho FK, **không** lưu mật khẩu, token, email Auth hoặc session. Snapshot không gồm Storage bytes, toàn bộ Auth, managed-service configuration, roles toàn cluster hoặc backup/PITR của Supabase Free.

`node scripts/verify-hsv-production-snapshot.mjs` kiểm SHA-256 manifest, khôi phục schema/rows trong PostgreSQL 17.11 loopback dùng mật khẩu ngẫu nhiên, đối chiếu toàn bộ rows và definitions, chạy hai migration nguyên bản, kiểm null Thiệp chúc/validation Thiệp mời/draft resolver/ACL, rồi dừng cluster. Lần PASS có bằng chứng tại `C:\dev\temp\hsv-v3-production\restore-2026-11-19T22-02-15-763Z\result.json`. Đây là phục hồi phần `public` cần cho các migration tương thích, không phải diễn tập khôi phục cả Supabase/Auth/Storage. Không upload snapshot lên CI hoặc đưa vào git.

Containment: giữ cột và ledger mới cùng mọi dữ liệu phát sinh; không rollback mù về schema v2 hoặc restore snapshot lên production. Edge đã cập nhật v3, Pages còn v2. Kiểm tra lại ngày 20/11 xác nhận ledger vẫn trống. Backup trước đổi Auth và Edge nằm tại `C:\dev\temp\hsv-v3-rollout`, ngoài repo; bản revision 4 được lưu trước bổ sung action capability, SHA-256 `7EA652F02414BAEC2E5ABCB439BEF9627349545A913DB7B0431C856CEFD585C3`. Rollback Edge có thể dùng revision 4 để giữ ledger/v3, không quay về nhánh invite cũ và không xóa dữ liệu.

## Auth và email: trạng thái hiện tại

Audit CLI trước khi người dùng bổ sung Resend xác nhận bốn callback accept/callback dưới `/bookclub/` và `/hsv/`, Site URL còn `https://imnwngr.github.io/bookclub/`, Edge xác minh JWT, CORS origin `https://imnwngr.github.io`, mode `live` và gửi lời mời `disabled`. Khi đó custom SMTP và send-email hook chưa bật. Đây là bằng chứng lịch sử; đợt Git/tài liệu không đọc lại Auth/SMTP/Edge secrets và không chứng nhận cấu hình hiện tại từ dữ liệu cũ.

Người dùng đã xác nhận tự cấu hình SMTP Resend và nhận email thử thành công; hạng mục SMTP được ghi nhận hoàn tất theo xác nhận này, không còn BLOCKED vì thiếu provider. Agent không gửi email hoặc đọc thông tin SMTP trong đợt này. Email thử chưa xác nhận chuỗi Admin thêm email → Auth invite → cấp Editor → mở callback → nhận lời mời/đăng nhập. Không yêu cầu cung cấp mật khẩu hoặc token qua chat.

Trong đợt phát hành riêng: đối chiếu cấu hình Auth/redirect đã che secrets, kiểm chứng luồng mời Editor với môi trường/địa chỉ kiểm thử được phép và ghi rõ phạm vi kết quả. Chỉ mở gửi thư sau khi frontend HSV phục vụ `/hsv/auth/accept` và các gate liên quan PASS. Đợt Git/tài liệu không bật cờ gửi lời mời. Hộp thoại đọc capability từ Edge cho Admin; server vẫn kiểm điều kiện ở mỗi thao tác add.

## Trước khi ghi production

1. Kết nối Supabase được cấp quyền phù hợp cho đúng project. Đọc schema/definitions/ACL/RLS và lịch sử migration bằng management API; chạy `supabase/hsv-v3-preflight.sql` read-only (nếu công cụ chỉ trả result cuối, dùng một JSON result tổng hợp). So sánh definitions với source và guard, lưu phần chứa dữ liệu tại thư mục ACL bảo vệ ngoài repository. Đọc được public API không chứng minh quyền ghi.
2. Xác minh backup mới nhất hoặc PITR window, phạm vi (database, Auth, Storage bytes, cấu hình managed services), operator có quyền restore, nơi khôi phục tách biệt, thời gian phục hồi và mất dữ liệu tối đa. Thử restore phù hợp; logical dump không tự chứng minh Auth/Storage/SMTP đã hoạt động. Các file backup có sẵn không được coi là hợp lệ chỉ vì tồn tại.
3. Đọc deployment/revision/source của `manage-editors`, JWT verification, tên secrets (không xuất giá trị), Auth Site URL/redirect allowlist, SMTP/provider và lỗi delivery. Kiểm tra các tài khoản fixture thuộc sandbox/mail sink; không thử email production.
4. So sánh bản schema tách biệt với production. Migration mới dùng guard cấu trúc/security, transaction, lock_timeout 5s và từ chối replay/partial state. Không thay guard chỉ để chạy cho qua. Nếu schema lệch, dừng apply và viết migration thích hợp sau audit.

## Schema và thứ tự

Chỉ áp dụng **các file mới chưa áp dụng**, qua migration management API hoặc pipeline được xác thực, theo thứ tự; không chạy `db push` cả thư mục và không chạy REBUILD/reset/seed lịch sử.

1. `202611200001_event_types_theme.sql`: thêm `events.event_type` default invitation và `theme` JSON version 1; bỏ NOT NULL của starts_at/ends_at và thay hai CHECK thời gian/địa điểm bằng quy tắc theo loại. Kiểu invitation vẫn bắt buộc đủ thời gian hữu hạn, kết thúc sau bắt đầu và liên kết địa điểm. Congratulation có thể null thời gian và không có liên kết địa điểm. Những giá trị đã có vẫn được giữ, các CHECK cú pháp khác giữ nguyên. Thêm hai slug dành riêng, cập nhật `save_event` mà không thay snapshot/primary alias/guest reconciliation/concurrency guard, expose capability. `event_payload_v110` dùng to_jsonb nên tự trả hai thuộc tính qua get/resolve; kiểm chứng thực tế sau apply.
2. Chạy postflight tương ứng, đối chiếu fingerprint trước/sau, RLS/ACL và resolver. Ngay sau migration đầu, mọi dữ liệu cũ phải là invitation. Không có update nội dung lịch sử hoặc media.
3. `202611200002_editor_add_operations.sql`: ledger email có RLS, không grant trực tiếp cho client/service role. `begin_editor_add` và `finish_editor_add` chỉ service_role EXECUTE; `editor_add_recovery` chỉ authenticated EXECUTE và kiểm tra Admin bên trong. Giữ RLS/Editor policy nội dung hiện hành. Bổ sung vào nhánh revoke đã kiểm tra của `set_editor_role`: vô hiệu hóa lease đang chạy và đánh dấu revoked, giữ nguyên các guard/ACL còn lại. Cập nhật capability để release gate biết cả hai schema có mặt.
4. Chạy `supabase/hsv-v3-postflight.sql` và audit schema/ACL đầy đủ lần nữa. Không suy ra RLS live từ frontend mock tests.
5. Thử native sandbox `BOOKCLUB_ROLE_MODE=sandbox`, `HSV_LOCAL_ORIGIN=http://127.0.0.1:<port>`, Supabase URL loopback hoặc Kong local, email sink thật (không relay). Chỉ sandbox đã xác minh mới đặt `HSV_INVITATIONS_ENABLED=verified`. Thử email nhận được, accept/mật khẩu/Editor, expired/reused links, SMTP lỗi, response bị mất và request đồng thời. Mode sandbox từ chối URL Supabase cloud.
6. Sau native sandbox PASS, deploy Edge production với JWT verification bật, service-role chỉ trong Edge environment, mode `live` và gửi thư `disabled`. Đọc lại source/revision và smoke read-only; không lấy tài khoản thật làm fixture. Mã vẫn dùng các tên biến cũ để giữ tương thích cấu hình.
7. Cấu hình production Auth redirect chính xác `https://imnwngr.github.io/hsv/auth/accept` và `/hsv/auth/callback`. Giữ redirect `/bookclub/auth/accept` trong thời gian chuyển đổi nếu còn thư đang chờ, nhưng đường dẫn đó còn cần hosting phục vụ. Site URL mới `/hsv/`. CORS dùng origin `https://imnwngr.github.io`, không có base path.
8. Audit backend trước ghi nhận mode `live` và `HSV_INVITATIONS_ENABLED=disabled`; rename và SMTP Resend nay đã hoàn tất. Trong đợt phát hành riêng, đối chiếu lại cờ trước khi thay đổi; chỉ chuyển sang `verified` sau khi các gate email/server PASS và frontend HSV phục vụ `/hsv/auth/accept`, smoke callback thành công. Chưa mở gửi thư thì vẫn cấp tài khoản có sẵn được, email mới nhận `invitation_not_ready`; không tuyên bố đã mời. Không thực hiện bước này trong đợt Git/tài liệu.

## Ngữ nghĩa và phục hồi tài khoản

Admin nhập email một bước. Server xác minh session/Admin và DB kiểm tra lại actor, target bị cấm/anonymous/Admin. Khoá advisory dùng chung với set_editor_role. Ledger khóa email chuẩn hóa và cấp lease 90 giây trước Auth invite. Request đang chạy trả 202; UI giữ trạng thái, không báo thành công.

Auth và database không có transaction chung. Nếu email/API response bị mất, ledger giữ unknown; sau lease, lần kiểm tra tìm tài khoản Auth chính xác theo email rồi chỉ khôi phục quyền. Không tự gọi invite lần nữa. Nếu chưa có tài khoản, cần operator đối chiếu log email; code này không cung cấp nút resend hoặc tự xóa ledger. Nếu process dừng sau claim nhưng trước Auth, hệ thống cũng giữ unknown để tránh gửi trùng khi chưa biết kết quả. Trạng thái granted chỉ trả sau SQL cấp Editor; invited/unconfirmed/confirmed được phân biệt, không chứng nhận email đã đến hộp thư.

Retry Admin đã mất quyền, target bị cấm hoặc Admin không được cấp quyền. Editor/anonymous không gọi được ledger RPC hay đọc bảng. Recovery chỉ Admin; không đưa Auth directory vào frontend ngoài directory quyền hiện hành. Account invitation thành công nhưng grant thất bại xuất hiện trong danh sách cần khôi phục; không xóa user Auth hoặc gửi thêm email.

Thu hồi quyền vô hiệu hóa lease; worker cũ không hoàn tất grant sau revoke. Retry cùng request vừa hoàn tất nhưng quyền sau đó bị thu hồi trả `role_changed`, không tự thêm Editor. Admin muốn thêm lại phải bắt đầu thao tác mới. Các test SQL local kiểm tra cả retry response bị mất và worker đến muộn; không coi đây là bằng chứng deploy production.

## Theme và chuyển loại

Schema `{version:1,primary:'#RRGGBB'}` không nhận key khác/raw CSS. Giá trị thiếu/lỗi khi đọc fallback xanh Hội `#174b78`. Màu chữ/nền được suy ra để giữ contrast; theme chỉ scope trên route sự kiện và preview, cleanup khi về quản trị/home. Theme đọc trực tiếp từ event, không phải snapshot thiệp; đổi màu sẽ đổi mọi thiệp của sự kiện. Snapshot người nhận hoàn toàn không thay đổi.

Đổi loại giữ dữ liệu thời gian/địa điểm đã nhập cả trong form và database. Congratulation ẩn toàn bộ lịch/venue/maps, không gọi formatter thời gian sự kiện null. Bộ lọc dùng ngày tạo và ghi nhãn đúng. Trở lại invitation cần hoàn tất validation cũ trước save. Preview chưa lưu không thay link đã lưu.

## Rename, Pages và link cũ

Rename đã hoàn tất: repository [imnwngr/hsv](https://github.com/imnwngr/hsv), origin `https://github.com/imnwngr/hsv.git`. Không chạy lại lệnh rename hoặc chuyển thư mục local. Đối chiếu GitHub sau rename xác nhận quyền ADMIN, nhánh mặc định `main` tại `8ee2e3e`, Pages dùng workflow và URL `https://imnwngr.github.io/hsv/`. Source v3 nằm trên `hsv-v3`; đợt này chỉ commit/push nhánh đó, không merge, đổi default branch, tạo tag/release hoặc deploy. `HSV_V3_PRODUCTION_READY` chưa được đặt trong lần đọc lại; không tạo hoặc bật biến này.

Workflow mới chạy verify và native account sandbox cho main/hsv-v3 và PR; deploy cần cả hai job PASS. Native workflow có thể chạy thủ công; harness chỉ dùng stack loopback tên `hsv-v3-native`, không nhận URL/credential production. CLI 3 dùng `[local_smtp]`, bật verify_jwt, không relay; chỉ upload result JSON và screenshots fixture, không upload status keys/logs Auth. Deploy chỉ cho main tại `imnwngr/hsv`, khi repository variable `HSV_V3_PRODUCTION_READY=true`; trước deploy chạy capability check read-only. Biến gate chỉ được bật sau khi operator có bằng chứng backup, migration, native Auth/Edge/email và smoke phù hợp. Không set true chỉ vì unit tests xanh. Không overwrite tag v3.0.0; tag tạo sau đủ điều kiện release.

Canonical: `/hsv/thiep-moi/:code/:alias`, `/hsv/thiep-chuc/:code/:alias`; detail bỏ phần alias. Sai loại hoặc URL ngắn `/hsv/:code/:alias` chuyển canonical sau resolver kiểm quyền, giữ query/hash. Slug admin/auth/thiep-moi/thiep-chuc được bảo vệ. 404 Pages round-trip đã được test ở local server mô phỏng HTTP 404.

HTTP kiểm tra ngày 20/11 sau rename: `/bookclub/` trả 404; `/hsv/` trả 200 nhưng title vẫn là BookClub, tham chiếu `/bookclub/assets/index-QrJGegpT.js` và `/bookclub/assets/preloadInvitation-CAOmjNHy.js`, đều trả 404. URL Pages mới chưa chứng minh frontend HSV v3 đã phát hành hoặc hoạt động. Bằng chứng chỉ đọc ở `.local/hsv-v3/repo-rename-pages.json`. Giữ link cũ cần hosting bridge riêng ở `/bookclub/`; chưa tạo hoặc kiểm chứng bridge. Phát hành frontend và xử lý link cũ là công việc còn lại ngoài đợt Git/tài liệu. Không thay tên bucket bookclub-venues/bookclub-music.

## Rollback / containment

Nếu transaction chưa commit, lỗi tự rollback. Sau commit, không drop cột/bảng mới, không reset database hoặc xóa ledger. Trước thay production lưu definitions/ACL/Edge revision/cấu hình đã được kiểm tra. Có thể tắt `HSV_INVITATIONS_ENABLED` và đặt mode không hợp lệ để ngừng Edge; điều này không thu hồi email đã gửi hay quyền đã cấp. Phải chờ/drain request đang chạy và kiểm ledger trước kết luận đã ngừng mọi side effect.

Nếu cần chặn chức năng mới ở database, thu hồi service EXECUTE của begin/finish trong transaction riêng sau audit, giữ bảng và mọi rows; service gọi lại sẽ lỗi. Không đổi RLS hàng loạt. UI containment dùng bản v3 có thông báo bảo trì, không rollback mù về v2 vì v2 không hiểu thời gian null của Thiệp chúc. Phục hồi backup có thể mất dữ liệu phát sinh sau backup, nên cần operator và cửa sổ bảo trì riêng.
