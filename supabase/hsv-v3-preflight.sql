-- Read-only. Run only after independently confirming project trdofhdspbkwgernwybp.
-- Keep output in an ignored, access-restricted location. No account rows are returned.
select current_user as executor, current_database() as database, version();
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name in ('events','editor_users','event_guests','invitation_aliases','editor_add_operations') order by table_name,ordinal_position;
select c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname;
select conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.events'::regclass order by conname;
select p.oid::regprocedure signature,md5(pg_get_functiondef(p.oid)) definition_md5,p.prosecdef,p.proconfig,p.proacl,pg_get_userbyid(p.proowner) owner
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_event','get_event_v110','event_payload_v110','resolve_invitation','is_admin','can_edit_content','effective_role','role_directory','set_editor_role','begin_editor_add','finish_editor_add','editor_add_recovery','hsv_v3_capabilities') order by p.proname;
select schemaname,tablename,policyname,roles,cmd,permissive,md5(coalesce(qual,'')||chr(31)||coalesce(with_check,'')) definition_md5
from pg_policies where schemaname='public' or (schemaname='storage' and policyname like '%bookclub%') order by schemaname,tablename,policyname;
select 'events_without_v3_fields' relation,count(*) rows,md5(coalesce(string_agg((to_jsonb(e)-'event_type'-'theme')::text,chr(10) order by id),'')) fingerprint from public.events e
union all select 'event_guests',count(*),md5(coalesce(string_agg(to_jsonb(e)::text,chr(10) order by id),'')) from public.event_guests e
union all select 'invitation_aliases',count(*),md5(coalesce(string_agg(to_jsonb(e)::text,chr(10) order by id),'')) from public.invitation_aliases e;
select count(*) as reserved_code_collisions from public.events where code in ('thiep-moi','thiep-chuc');
select has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') anon_save,
       has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') authenticated_save,
       has_function_privilege('authenticated','public.set_editor_role(uuid,uuid,boolean)','execute') authenticated_role_write;
-- Inspect through the migration management API too; an empty table/list is not proof of unapplied SQL.
select to_regclass('supabase_migrations.schema_migrations') as migration_history_table;
