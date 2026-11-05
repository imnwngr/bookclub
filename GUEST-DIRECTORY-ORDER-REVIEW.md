# Review lưu thứ tự danh bạ

## Kết luận security review: NEEDS FIX

Không áp dụng migration hiện tại. PGlite xác nhận hai vấn đề: (1) `GRANT USAGE, SELECT` trên sequence cho toàn bộ `authenticated` cho phép một non-admin gọi `nextval` và đọc sequence, dù RLS/RPC vẫn ngăn người đó đổi thứ tự; (2) UPDATE backfill và reorder kích hoạt trigger `touch_updated_at`, ghi lại timestamp kiểm toán của khách. Hai hành vi này là thay đổi thực tế cần được xử lý hoặc chấp nhận rõ trước khi review lại. Thu hồi đơn thuần quyền USAGE sẽ làm INSERT mặc định của admin thất bại; cần thiết kế lại cách cấp số cho khách mới và kiểm thử, không tự áp dụng bản vá production.

PGlite chạy với Auth giả lập: non-admin bị chặn sửa bảng/RPC, duplicate/missing/null ID bị từ chối, expected-order cũ bị từ chối, lỗi trigger giữa reorder và lỗi trong migration rollback, admin sửa tên không đổi thứ tự. Đây không chứng minh đồng thời thực hoặc quyền Supabase live. `SECURITY DEFINER` của reorder dùng search_path rỗng và gọi `is_admin()`; owner và ACL thực tế phải được đối chiếu khi có preflight.

Chạy `supabase/guest-order-preflight.sql` chỉ đọc trên SQL Editor sau khi xác nhận đúng project; xuất một JSON. Không chạy migration trong lượt review này. Sau khi migration được sửa, review và phê duyệt riêng, `supabase/guest-order-postflight.sql` cung cấp JSON đối chiếu. Fingerprint nội dung loại `updated_at` và `display_order`; so sánh riêng `guest_updated_at` vì timestamp hiện bị thay đổi. Kiểm tra `backfill_matches_original_order` chỉ ngay sau backfill, trước bất kỳ reorder có chủ ý nào. Một truy vấn chỉ đọc không chứng minh reorder qua Auth hay persistence sau reload; các kiểm thử đó cần fixture và phiên thật sau khi được cho phép.

Migration `supabase/migrations/202611060002_guest_order.sql` chỉ được chuẩn bị local; chưa áp dụng production. Trước khi phê duyệt cần kiểm tra schema thực tế, quyền owner, các đối tượng cùng tên, sequence và số lượng khách, sau đó review riêng SQL.

Thứ tự hiện tại được backfill xác định theo `created_at, id`. Cột `display_order` có sequence để khách mới được thêm vào cuối; RPC `reorder_guests` khóa bảng trong transaction, kiểm tra `is_admin()` và so sánh danh sách ID trước khi thay đổi. Nếu danh sách hoặc thứ tự đã thay đổi, RPC trả lỗi để client tải lại; thao tác thất bại được rollback. SQL không sửa event, invitation hay snapshot. Trigger cập nhật `updated_at` hiện có có thể chạy khi backfill/reorder; thứ tự không dùng cột này.

Trước migration, frontend thử đọc theo `display_order`, sau đó fallback theo `created_at, id` nếu cột không tồn tại; RPC capability thiếu hoặc lỗi làm khóa tay nắm và hiển thị thông báo. Không có thông báo lưu thành công giả. Sau migration phải kiểm tra bằng tài khoản thật việc admin reorder, non-admin bị từ chối, thứ tự sau reload và khách mới; local PGlite không thay thế Supabase live.

Migration dùng `SHARE ROW EXCLUSIVE` và lock timeout 5 giây, có thể ảnh hưởng thao tác ghi danh bạ trong thời gian chạy. Không chạy lại nếu đã áp dụng: các CREATE/ADD sẽ báo lỗi và transaction rollback. Revert sau khi đã có thứ tự mới cần kế hoạch riêng và phê duyệt; không tự xóa cột hoặc sequence.

Kéo thả local dùng dnd-kit với sensor chuột, touch và bàn phím; DragOverlay hiển thị thẻ nổi, còn hàng gốc là placeholder. Các hàng dùng transition 180 ms; reduced motion tắt chuyển động. Việc lưu thứ tự thực tế vẫn cần migration và kiểm thử Supabase live.


## Revised migration after production preflight — local verification

The previous NEEDS FIX findings are superseded for source implementation only.
- Sequence removed entirely. Existing frontend contract remains display_order (integer); no nextval grants.
- Database BEFORE INSERT statement trigger acquires transaction advisory lock (194827,110); row trigger assigns max(display_order)+1. Reorder and all guest writes use the same lock. Lock is held through transaction end.
- Deferred unique constraint allows swaps; reorder validates expected full order and complete unique ID membership. Stale writes fail with 40001.
- Only guests' touch_updated_at trigger is replaced with a guest-specific function: content changes update timestamp; order-only writes restore OLD.updated_at. Shared function and alias trigger are unchanged. Repository rebuild definitions were inspected; live definitions must still match preflight.
- Table ACL and RLS are not altered. Reorder is SECURITY DEFINER with empty search_path, authenticated EXECUTE only and runtime is_admin check. Trigger helpers have no PUBLIC/anon/authenticated EXECUTE. Execute migration as postgres so helper owner is postgres.
- Re-entry is fail-closed, not a successful no-op: existing column causes transaction failure; issue ROLLBACK if SQL client retains the failed transaction. Do not re-run after COMMIT.
- Postflight full fingerprint removes only display_order, matching original preflight; content fingerprint also excludes updated_at. Compare all four fingerprints and timestamps against private baseline, plus 14 rows, no null/duplicate positions and original deterministic order. No production names/UUIDs are recorded here.

Evidence: focused PGlite test 1/1 PASS with 14 synthetic rows (10 tied timestamps), rollback injection, backfill timestamp preservation, reorder timestamp preservation, data/snapshot fingerprints, malformed/stale reorder rejection, ACL checks, failed second application, admin append and stable order on edit. ESLint PASS; diff check PASS (line-ending warnings only).

Limitations: PGlite does not establish multi-connection locking behavior. No native PostgreSQL multi-connection concurrency test or live frontend save/reload was performed. Production is unchanged; migration and postflight await review. Final gate: BLOCKED on real concurrency evidence before unconditional SAFE TO APPLY. UI persistence remains MIGRATION PENDING.

### Additional environment and audit check
No psql, postgres or docker executable was found on PATH, and the standard PostgreSQL installation directory was absent. Multi-connection PostgreSQL verification requires an existing isolated test server or separately approved installation. Preflight/postflight function inventories now include all new trigger helpers and existing timestamp/alias helpers so owner, ACL and definitions can be reviewed. No production operation was performed.


## Production authorization received — execution pending
User authorized public Guest Order migration and waived pre-deployment concurrency testing. Earlier sequence/timestamp concerns are no longer approval blockers. Current reviewed migration uses display_order integer, no sequence, and preserves timestamps for order-only writes; do not substitute the historical sequence version. No PostgreSQL execution connector or configured SQL connection is available to this session. Production migration has NOT been executed by the agent; current row count, fingerprints and RPC status remain unverified. Run read-only guest-order-preflight.sql in project trdofhdspbkwgernwybp, save JSON privately, run migrations/202611060002_guest_order.sql as postgres, then guest-order-postflight.sql. On any migration error stop; if transaction remains aborted issue ROLLBACK only. Do not rerun after successful COMMIT. Compare current pre/post fingerprints and count; historical baseline alone does not prove current data unchanged. No install, QA schema, Agenda Icon migration, commit, push or deploy is authorized in this step.


## UI Overhaul release — current database status (2026-11-06)
User confirms Guest Order and Agenda Icon Library migrations APPLIED & POSTFLIGHT VERIFIED, and successful persistence of new icons in production. This supersedes earlier migration-pending/blocker entries retained as historical evidence. These are USER-REPORTED production results, not an independent SQL execution by this agent. No migration is to be rerun. Release includes Agenda segmented time inputs and Lucide icons, plus dnd-kit guest directory and persistent ordering. Production UI smoke remains pending deployment.
