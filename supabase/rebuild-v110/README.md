> **Lưu trữ lịch sử:** Các hướng dẫn và trạng thái bên dưới phản ánh thời điểm trước. Production đã hoàn tất clean rebuild và refinement; không chạy lại các lệnh lịch sử. Xem README.md để biết trạng thái hiện hành.

# Quy trình rebuild BookClub v1.1

Inventory live do người dùng cung cấp đã đối chiếu: xem INVENTORY-REVIEW.md. Chuỗi migrations nâng cấp cũ không dùng cho đợt clean rebuild.

## Thực hiện thủ công trên Dashboard đã đăng nhập

1. Chuẩn bị nghiệm thu frontend v1.1 local. Production v1.0 có thể không tương thích ngay sau reset; cần phối hợp thời điểm deploy, chưa được tự deploy.
2. Mở SQL Editor đúng project `https://supabase.com/dashboard/project/trdofhdspbkwgernwybp/sql`.
3. Mở **REBUILD.sql**, sao chép toàn bộ và chạy một lần trong query mới. Không chạy riêng 01-reset.sql. File gộp reset + schema + seed + restore admin trong **một transaction**; lock timeout 5 giây. Không tiếp tục từng đoạn sau khi lỗi.
4. Nếu lỗi: chạy `ROLLBACK;`, gửi thông báo lỗi đã bỏ thông tin nhạy cảm. Không thay RESTRICT thành CASCADE hoặc tắt RLS. Guard thay đổi inventory cần review lại.
5. Nếu COMMIT thành công: chạy **05-postflight.sql** chỉ đọc, gửi JSON kết quả. Mong đợi 7 bảng RLS, 10 guests canonical active, 2 Auth accounts, 1 admin UID như inventory, bucket private, event_count=0; anon_save=false, authenticated_save=true, anon_resolve=true, anon_payload_helper=false.
6. Chạy runner live bằng PowerShell; nhập admin/nonadmin qua Read-Host secure trên máy, không gửi tài khoản/mật khẩu vào chat:

```powershell
& {
  Set-Location -LiteralPath 'C:\Users\Tio\Downloads\bookclub'
  powershell -NoProfile -File '.\scripts\auth-live.ps1' -RebuildV110
}
```

Runner dùng Supabase Auth thật và publishable key từ .env.local; chỉ fixture QA UUID của lượt chạy, cleanup theo internal event UUID + image path, giữ guest directory. Bản auth-live cũ vẫn giữ để lưu lịch sử v1.0; dùng cờ RebuildV110 cho schema mới. Kết quả ghi VERIFICATION.md; chưa chạy thì không có live PASS.

7. Chạy `npm.cmd run dev`, mở `/bookclub/`, nghiệm thu theo UI-ACCEPTANCE-v1.1.md. Không coi Playwright mocks là UI kết nối database thật.

## Các file

- 00-inventory.sql: tiền kiểm chỉ đọc đã được người dùng chạy.
- 01-reset.sql: fragment reset đúng allowlist, DROP RESTRICT; snapshot admin/Auth/system helper/event triggers tạm trong transaction.
- 02-schema.sql: schema độc lập, không history/default aliases/wrapper v1.0.
- 03-seed.sql: 10 khách mời canonical.
- 04-restore-verify.sql: restore membership và assertions trước COMMIT.
- REBUILD.sql: gói thực thi duy nhất cho database cũ đã được inventory xác nhận.
- 05-postflight.sql: hậu kiểm chỉ đọc; không thay cho kiểm thử Auth/RLS/Storage HTTP.

## Bằng chứng

PostgreSQL local/PGlite: rebuild transaction + schema **10/10 PASS** (Auth/Storage schemas shim). Có test phụ thuộc ngoài làm rollback toàn bộ và test chặn chạy lại sau COMMIT. Kiểm tra thêm alias collision suffix, code unique, stale update, invalid agenda rollback, snapshot và Storage Draft/Published/admin/anonymous. Component/image + SQL test run: 20/20 PASS (gồm 8 schema tests, không cộng trùng). Playwright **38/38 PASS** với API mocks desktop/mobile. TypeScript, ESLint, Node syntax và production build PASS.

Chưa chạy SQL rebuild production, live Auth/Storage runner hoặc nghiệm thu UI kết nối schema mới. Không commit/push/deploy. Sau reset cần live evidence trước khi kết luận DATABASE REBUILT / LIVE VERIFIED / READY FOR RELEASE REVIEW.
