-- READ ONLY; one row, no credentials or personal descriptions exposed.
with target as (select 'Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.'::text old_description)
select jsonb_build_object(
 'agenda_count',(select count(*) from public.event_agenda_items),
 'directory_exact_match',(select count(*) from public.guests g,target t where g.id='10000000-0000-4000-8000-000000000001' and g.name='Nguyễn Hoàng Viện' and g.description=t.old_description),
 'target_draft_count',(select count(*) from public.event_guests eg join public.events e on e.id=eg.event_id where eg.guest_id='10000000-0000-4000-8000-000000000001' and e.status='draft'),
 'target_draft_exact_match',(select count(*) from public.event_guests eg join public.events e on e.id=eg.event_id cross join target t where eg.guest_id='10000000-0000-4000-8000-000000000001' and e.status='draft' and eg.description=t.old_description),
 'secondary_alias_count',(select count(*) from public.invitation_aliases a join public.event_guests eg on eg.id=a.event_guest_id where a.alias<>eg.primary_alias),
 'noncanonical_invitation_count',(select count(*) from public.event_guests eg join public.guests g on g.id=eg.guest_id where eg.primary_alias is distinct from g.primary_alias),
 'refinement_columns_count',(select count(*) from information_schema.columns where table_schema='public' and table_name='event_agenda_items' and column_name in ('end_time','icon'))
) as final_guard_preflight;
