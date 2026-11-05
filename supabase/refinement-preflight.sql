-- READ ONLY: before 202611050001_ui_refinement.sql, project trdofhdspbkwgernwybp.
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='event_agenda_items';
select count(*) as existing_milestones from public.event_agenda_items;
select eg.event_id,eg.id as invitation_id,count(*) as secondary_alias_count
from public.invitation_aliases a join public.event_guests eg on eg.id=a.event_guest_id
where a.alias<>eg.primary_alias group by eg.event_id,eg.id;
select p.oid::regprocedure::text,pg_get_functiondef(p.oid),p.proacl from pg_proc p where p.oid in ('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure,'public.resolve_invitation(text,text)'::regprocedure);
-- Export definitions/ACL and agenda rows as backup before approval. Do not delete secondary rows.
-- Kiểm tra schema/ACL hiện tại, không in credentials hoặc sửa dữ liệu.
select 'refinement_columns' as check_name,column_name from information_schema.columns where table_schema='public' and table_name='event_agenda_items' and column_name in ('end_time','icon');
select p.proname,pg_get_function_identity_arguments(p.oid) as signature,p.prosecdef,p.proconfig,p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_event','resolve_invitation','primary_invitation_alias_only','event_payload_v110','is_admin') order by p.proname;
select has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')::text as anon_save,
 has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')::text as authenticated_save,
 has_function_privilege('anon','public.resolve_invitation(text,text)','execute')::text as anon_resolve,
 has_table_privilege('authenticated','public.invitation_aliases','insert')::text as authenticated_alias_insert,
 has_table_privilege('authenticated','public.invitation_aliases','delete')::text as authenticated_alias_delete;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('events','guests','event_guests','invitation_aliases','event_agenda_items','admin_users','venue_image_uploads');
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
select id,name,description,description='Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.' as matches_expected_old_description from public.guests where id='10000000-0000-4000-8000-000000000001';
select count(*) as all_aliases,count(*) filter(where a.alias<>eg.primary_alias) as secondary_aliases,count(*) filter(where a.alias<>eg.primary_alias and e.status='published') as published_secondary_links_will_stop_resolving from public.invitation_aliases a join public.event_guests eg on eg.id=a.event_guest_id join public.events e on e.id=eg.event_id;
