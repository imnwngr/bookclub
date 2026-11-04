# BookClub Event Manager CTUT

**v1.0.0 đã deploy:** https://imnwngr.github.io/bookclub/ — RELEASED — PARTIALLY VERIFIED. Actions run 41797854015 thành công cho source 4c679c9. HTTP/assets/API production đã kiểm tra; UI production còn cần nghiệm thu thủ công. Xem mục PRODUCTION RELEASE mới nhất trong VERIFICATION.md; các ghi chú chưa triển khai bên dưới là lịch sử chuẩn bị dự án.

Quản lý sự kiện và thiệp mời Câu lạc bộ Sinh viên Yêu thích Sách, Trường Đại học Kỹ thuật – Công nghệ Cần Thơ.

- Local: `C:\Users\Tio\Downloads\bookclub`
- Repository: https://github.com/imnwngr/bookclub (Public), branch `main`.
- Production dự kiến: https://imnwngr.github.io/bookclub/ (chưa triển khai).
- **PARTIALLY COMPLETE / BLOCKED**: chưa có Supabase project; chưa phê duyệt commit/push/phát hành. Kết quả và giới hạn kiểm thử: [VERIFICATION.md](VERIFICATION.md).

## Chạy local

Cần Node.js 24, npm. TypeScript 6 tương thích typescript-eslint; lockfile cố định dependency.

```powershell
cd C:\Users\Tio\Downloads\bookclub
npm.cmd ci
Copy-Item .env.example .env.local
# Điền cấu hình vào .env.local trên máy của bạn.
npm.cmd run dev
```

Mở `/bookclub/` tại URL Vite cung cấp. `.env`, `.env.*` được Git ignore, chỉ `.env.example` được theo dõi. Mọi biến `VITE_*` đều công khai trong bundle: chỉ dùng Supabase publishable/anon key, không dùng service_role hay mật khẩu.

## Supabase project, migrations và seed

1. Tạo project Supabase riêng cho BookClub; không dùng database không liên quan.
2. SQL Editor: chạy `supabase/migrations/202611030001_foundation.sql` một lần trên project mới, rồi `supabase/seed.sql`. Nếu dùng Supabase CLI đã cài, link đúng project và dùng `supabase db push`. Không reset database có dữ liệu. Migrations áp dụng theo thứ tự một lần qua migration history; redeploy vào project mới chạy từ đầu. Seed chạy lại được, `ON CONFLICT DO NOTHING` giữ nguyên chỉnh sửa danh bạ.
3. Lấy Project URL và publishable key (hoặc anon key legacy). Điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` vào .env.local.
4. Authentication: bật Email/Password, tạo tài khoản quản trị bằng Supabase Dashboard. Có thể tắt đăng ký công khai vì ứng dụng không có nhu cầu tự đăng ký. Site URL: `https://imnwngr.github.io/bookclub/`; chỉ allow redirect URLs production/dev cần dùng. Ứng dụng không cần OAuth.
5. Cấp admin bằng SQL Editor của chủ project, thay bằng UUID thật từ Authentication:

```sql
insert into public.admin_users(user_id)
values ('UUID-NGUOI-QUAN-TRI')
on conflict do nothing;
```

Không có API frontend tự cấp quyền. Sau đăng nhập phải qua `is_admin()`. Người dùng thường không ghi được admin_users hoặc tự nâng quyền qua metadata. Chủ project thu hồi bằng xóa đúng membership sau khi xác minh UUID.

### Schema và bảo mật

| Bảng               | Mục đích                                                | Quyền đọc công khai              |
| ------------------ | ------------------------------------------------------- | -------------------------------- |
| events             | UUID nội bộ, code URL unique, UTC, địa điểm, trạng thái | Published                        |
| guests             | Danh bạ stable IDs, active, alias gợi ý                 | Không                            |
| event_guests       | Snapshot người nhận, unique(event_id,guest_id)          | Không trực tiếp                  |
| invitation_aliases | Nhiều alias/thiệp, unique(event_id,alias)               | Không trực tiếp                  |
| admin_users        | Membership theo auth.users.id                           | Chỉ user đọc membership của mình |

RLS bật trên cả 5 bảng. CRUD yêu cầu admin; cấp membership chỉ qua chủ project. `resolve_invitation(code,alias)` trả đúng thiệp Published, hoặc cho admin xem trước Draft, không trả UUID người nhận/danh bạ. Alias dễ đoán là link công khai, không phải token bí mật; chỉ lưu nội dung cần công khai trên thiệp. Hàm SECURITY DEFINER có search_path rỗng, execute grants rõ ràng; `save_event` kiểm tra admin trước mọi ghi dữ liệu.

`save_event` lưu event, guest selection và aliases trong cùng transaction. updated_at ngăn ghi đè từ tab khác. Code cố định sau tạo. Alias chính cố định với FK deferred bảo vệ khỏi xóa nhầm. Alias phụ có thể thêm/xóa có xác nhận. Alias gợi ý trùng thì giữ alias chưa dùng; nếu tất cả trùng, tạo alias từ UUID, không suy ra số theo vị trí danh sách. Danh bạ thay đổi không đổi snapshot có sẵn. Bỏ chọn chỉ xóa thiệp trong event; thêm lại tạo snapshot theo danh bạ hiện tại. Xóa event cascade thiệp/alias, giữ guests. Seed chỉ có 10 khách mời do người dùng cung cấp, không có sự kiện demo.

Thời gian lưu timestamptz UTC, nhập/hiển thị `Asia/Ho_Chi_Minh`. Ongoing là `[starts_at,ends_at)`. Trang chủ ưu tiên đang/sắp diễn ra, sau đó kết thúc gần nhất; hiển thị 10 mục và xem thêm. Bộ lọc theo tháng bắt đầu tại Việt Nam. API đọc events theo batch 500 (Supabase max_rows cần >=500); với dữ liệu rất lớn nên chuyển sang phân trang/lọc server qua RPC.

## Google Maps

Bật Maps JavaScript API và Places API (New) trong Google Cloud project của bạn. Điền `VITE_GOOGLE_MAPS_API_KEY`; tùy chọn `VITE_GOOGLE_MAPS_MAP_ID`. Không có key vẫn nhập địa chỉ, tọa độ và link thủ công được. Bản đồ có tìm kiếm, marker, click chọn vị trí; tọa độ hỗ trợ nhập bằng bàn phím. Event/thiệp có link Maps khi có địa chỉ hoặc tọa độ.

Hạn chế key bằng Website HTTP referrers: `https://imnwngr.github.io/*` và chỉ host/port local cần dùng. Referrer cross-origin có thể bị rút gọn nên không dùng path `/bookclub/` làm ranh giới bảo mật. API restrictions chỉ Maps JavaScript API và Places API. Đặt quota/ngân sách/cảnh báo trong Cloud Console; cảnh báo ngân sách không phải hard cap. Key frontend vẫn công khai dù lưu trong GitHub Secret. Chủ tài khoản tự quyết định bật billing/dịch vụ có phí; ứng dụng không tự làm các thao tác này.

## Kiểm thử

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Vitest gồm unit/component và SQL integration trên PostgreSQL WASM (PGlite): thực thi migrations/seed/CRUD/constraints/snapshot/role grants/RLS. `auth.uid()` và auth.users được shim tại local; đây không phải Supabase live.

Playwright local dùng Chrome đã cài, CI dùng Chromium. `dist-e2e/` riêng có endpoint `.invalid` chỉ trong test runner, API intercept bằng fixture; không triển khai bundle test. Server test trả 404 theo static hosting, không dùng Vite SPA fallback. Bao gồm desktop/mobile, alias, CRUD, confirm dialog, unsaved changes, direct URL/refresh. Mock API không chứng minh Supabase hoạt động.

Live API/RLS chỉ chạy trên **staging riêng** đã migrate/seed, có fixture Draft/Published và alias. Thiết lập environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `BOOKCLUB_TEST_USER_JWT` (JWT user thường, không admin/service_role), `BOOKCLUB_TEST_DRAFT_CODE`, `BOOKCLUB_TEST_PUBLISHED_CODE`, `BOOKCLUB_TEST_ALIAS`; chạy `npm.cmd run test:rls`. Script không log token; thiếu cấu hình thoát code 2 với BLOCKED. Probe insert phải bị RLS chặn; nếu quyền cấu hình sai có thể tạo record probe, vì vậy chỉ dùng staging. Admin CRUD live cần kiểm tra thêm bằng tài khoản staging riêng.

## Deploy GitHub Pages

Chỉ commit/push sau phê duyệt. Repository Public; Settings > Pages > Source: GitHub Actions. Thêm Repository Variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, tùy chọn `VITE_GOOGLE_MAPS_MAP_ID`; Secret `VITE_GOOGLE_MAPS_API_KEY` nếu có. Không thêm service_role. Workflow chặn deploy khi thiếu cấu hình dữ liệu.

Workflow: checkout, npm ci, typecheck, ESLint, Vitest/SQL tests, Playwright, build, upload, deploy Pages. PR chỉ kiểm tra, không deploy; push main hoặc workflow_dispatch mới deploy. Có thể đặt required reviewer cho environment `github-pages`.

Vite base `/bookclub/`; BrowserRouter basename `/bookclub`. Routes: trang chủ, `/admin/`, `/admin/new`, `/admin/edit/:eventCode`, `/admin/guests`, `/:eventCode`, `/:eventCode/:guestAlias` bên dưới base này.

`public/404.html` chuyển path/query/hash về index qua `?__spa=...`; script trước React phục hồi URL sạch bằng history.replaceState. Refresh/tab mới hoạt động khi JavaScript bật. **Deep link request đầu vẫn HTTP 404**, sau đó index 200: giới hạn GitHub Pages ảnh hưởng crawler, SEO/social preview. HTTP 200/OG tags riêng cần host rewrite/SSR; không tự đổi HashRouter. Phải xác minh production thật sau deploy, local mô phỏng không thay thế bước này.

## Troubleshooting

- Lỗi dữ liệu: kiểm tra URL/key, .env.local, migrations, khởi động lại Vite. Không có dữ liệu fallback giả.
- Đăng nhập nhưng không vào admin: kiểm tra membership UUID và logout/login; không cấp quyền qua metadata.
- Phiên hết hạn: AuthProvider nhận thay đổi user/session, reset cache; admin quay lại đăng nhập. Lỗi 42501/PGRST301 báo quyền/phiên.
- Lỗi code/alias: kiểm tra định dạng, reserved codes và unique; code không đổi sau tạo, alias chính không xóa.
- Concurrent update: lưu tạm nội dung chưa lưu ở nơi an toàn rồi tải lại, không ghi đè tab khác.
- Maps lỗi: kiểm tra APIs/billing/referrer/quota, dùng nhập thủ công.
- Deep link 404: kiểm tra dist/404.html và base. HTTP 404 ban đầu là giới hạn có chủ ý.
- gh báo token invalid/proxy 127.0.0.1:9 trong sandbox: kiểm tra qua network approval trước khi kết luận; không đổi tài khoản hoặc in token.

## Source

`src/pages`: màn hình; `features/events`: data access và maps; `features/admin`: auth/guard; `features/guests`, `features/invitations`: khách mời/alias; `lib`: Supabase, validation/time/URL; `components`: điều khiển dùng chung. `supabase/`: migration/seed; `tests/`, `scripts/`: kiểm thử; `.github/workflows/`: CI/CD.

Tài liệu nền: [Vite GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google Places widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new).
