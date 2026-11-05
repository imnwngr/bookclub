-- Canonical directory: one alias per guest.
insert into public.guests(id,salutation,name,description,kind,primary_alias) values
('10000000-0000-4000-8000-000000000001','Thầy ThS.','Nguyễn Hoàng Viện','Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.','individual',public.guest_slug_v110('Nguyễn Hoàng Viện')),
('10000000-0000-4000-8000-000000000002','Thầy ThS.','Nguyễn Phúc Huy','Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Phó Bí thư Đoàn Trường, Chủ tịch Hội Sinh viên Trường.','individual',public.guest_slug_v110('Nguyễn Phúc Huy')),
('10000000-0000-4000-8000-000000000003','Cô ThS.','Châu Miêu Thanh','Phó Chủ tịch Hội Sinh viên Trường.','individual',public.guest_slug_v110('Châu Miêu Thanh')),
('10000000-0000-4000-8000-000000000004','Anh Ks.','Huỳnh Nhật Đấu','Cố vấn công tác Hội và phong trào Sinh viên Trường.','individual',public.guest_slug_v110('Huỳnh Nhật Đấu')),
('10000000-0000-4000-8000-000000000005','Đ/c','Nguyễn Hoàng Kha','Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Ủy viên Ban Chủ nhiệm Câu lạc bộ Sinh viên 5 tốt thành phố Cần Thơ.','individual',public.guest_slug_v110('Nguyễn Hoàng Kha')),
('10000000-0000-4000-8000-000000000006','Đ/c','Nguyễn Quang Vinh','Chánh Văn phòng Hội Sinh viên Trường.','individual',public.guest_slug_v110('Nguyễn Quang Vinh')),
('10000000-0000-4000-8000-000000000007','Đ/c','Đỗ Trung Hậu','Phó chánh văn phòng, Trưởng ban In ấn.','individual',public.guest_slug_v110('Đỗ Trung Hậu')),
('10000000-0000-4000-8000-000000000008','Đ/c','Huỳnh Thiện Phúc','Phó Chánh Văn phòng, Trưởng ban Truyền Thông.','individual',public.guest_slug_v110('Huỳnh Thiện Phúc')),
('10000000-0000-4000-8000-000000000009','Đ/c','Ngô Công Minh','Phó chánh Văn phòng, Trưởng ban Tổ chức sự kiện.','individual',public.guest_slug_v110('Ngô Công Minh')),
('10000000-0000-4000-8000-000000000010','','Thành viên CLB Sách CTUT','Toàn thể Thành viên & Cộng tác viên, Tân thành viên khóa mới, CLB Sinh viên Yêu thích Sách Trường ĐH Kỹ thuật - Công nghệ Cần Thơ.','group',public.guest_slug_v110('Thành viên CLB Sách CTUT'))
on conflict(id) do nothing;
