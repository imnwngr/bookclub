-- Read-only, project trdofhdspbkwgernwybp. Review results before approval.
select current_database(),current_user,version();
select name,to_regclass('public.'||name) as existing_upgrade_table from unnest(array['event_codes','event_agenda_items','venue_image_uploads']) name;
select p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proacl,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_event','resolve_invitation','protect_event_code','is_admin','rls_auto_enable','save_event_v100','get_event_v110');
select c.relname,con.conname,pg_get_constraintdef(con.oid) from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public';
select c.relname,t.tgname,pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal;
select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated');
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
select p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
select schemaname,tablename,policyname,cmd,qual,with_check from pg_policies where schemaname in ('public','storage');
select table_name,column_name,data_type from information_schema.columns where table_schema='public' and table_name in ('events','guests','event_guests','invitation_aliases');
select count(*) as event_count from public.events;
select count(*) as guest_count from public.guests;
select count(*) as invitation_count from public.event_guests;
select count(*) as alias_count from public.invitation_aliases;
with canonical as (
 select id,trim(both '-' from left(regexp_replace(lower(replace(replace(regexp_replace(normalize(regexp_replace(name,'^((thầy|cô|anh|chị|thạc sĩ|ths\.?|ks\.?|đ/c)[[:space:]]+)+','','i'),NFD),'[̀-ͯ]','','g'),'đ','d'),'Đ','D')),'[^a-z0-9]+','-','g'),80)) as slug from public.guests
) select slug,count(*) as collisions from canonical group by slug having count(*)>1 or slug='';
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='bookclub-venues';
-- Any canonical collision, existing new table/function or existing bucket needs review; never auto-delete.
