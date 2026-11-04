-- Stable IDs and explicit numeric aliases. Re-running never overwrites directory edits.
insert into public.guests(id,salutation,name,description,kind,default_aliases) values
('10000000-0000-4000-8000-000000000001','Thầy ThS.','Nguyễn Hoàng Viện','Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.','individual',array['nhvien','1','nguyen-hoang-vien']),
('10000000-0000-4000-8000-000000000002','Thầy ThS.','Nguyễn Phúc Huy','Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Phó Bí thư Đoàn Trường, Chủ tịch Hội Sinh viên Trường.','individual',array['nphuy','2','nguyen-phuc-huy']),
('10000000-0000-4000-8000-000000000003','Cô ThS.','Châu Miêu Thanh','Phó Chủ tịch Hội Sinh viên Trường.','individual',array['cmthanh','3','chau-mieu-thanh']),
('10000000-0000-4000-8000-000000000004','Anh Ks.','Huỳnh Nhật Đấu','Cố vấn công tác Hội và phong trào Sinh viên Trường.','individual',array['hndau','4','huynh-nhat-dau']),
('10000000-0000-4000-8000-000000000005','Đ/c','Nguyễn Hoàng Kha','Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Ủy viên Ban Chủ nhiệm Câu lạc bộ Sinh viên 5 tốt thành phố Cần Thơ.','individual',array['nhkha','nguyen-hoang-kha']),
('10000000-0000-4000-8000-000000000006','Đ/c','Nguyễn Quang Vinh','Chánh Văn phòng Hội Sinh viên Trường.','individual',array['nqvinh','5','nguyen-quang-vinh']),
('10000000-0000-4000-8000-000000000007','Đ/c','Đỗ Trung Hậu','Phó chánh văn phòng, Trưởng ban In ấn.','individual',array['dthau','do-trung-hau']),
('10000000-0000-4000-8000-000000000008','Đ/c','Huỳnh Thiện Phúc','Phó Chánh Văn phòng, Trưởng ban Truyền Thông.','individual',array['htphuc','huynh-thien-phuc']),
('10000000-0000-4000-8000-000000000009','Đ/c','Ngô Công Minh','Phó chánh Văn phòng, Trưởng ban Tổ chức sự kiện.','individual',array['ncminh','ngo-cong-minh']),
('10000000-0000-4000-8000-000000000010','','Thành viên CLB Sách CTUT','Toàn thể Thành viên & Cộng tác viên, Tân thành viên khóa mới, CLB Sinh viên Yêu thích Sách Trường ĐH Kỹ thuật - Công nghệ Cần Thơ.','group',array['thanh-vien','thanhvien','tv','clb','member','bookclub','6'])
on conflict(id) do nothing;
