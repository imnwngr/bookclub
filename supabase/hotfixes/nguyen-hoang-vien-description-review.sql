-- REVIEW ONLY. Directory update only; existing event snapshots are NOT rewritten.
begin;
update public.guests set description='Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra – Pháp chế và Triển khai Chiến lược và Truyền thông'
where id='10000000-0000-4000-8000-000000000001' and name='Nguyễn Hoàng Viện'
 and description='Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.';
-- Review affected row count; zero means data drift, not permission to overwrite.
commit;
