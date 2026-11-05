-- READ ONLY. Run after REBUILD.sql COMMIT on trdofhdspbkwgernwybp.
select jsonb_build_object(
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity)) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'),
 'guests',(select jsonb_agg(jsonb_build_object('id',g.id,'salutation',g.salutation,'name',g.name,'description',g.description,'alias',g.primary_alias,'active',g.active) order by g.id) from public.guests g),
 'admin_uids',(select jsonb_agg(user_id) from public.admin_users),
 'auth_user_count',(select count(*) from auth.users),
 'event_count',(select count(*) from public.events),
 'old_code_table_absent',to_regclass('public.event_codes') is null,
 'legacy_rpc_absent',to_regprocedure('public.save_event_v100(jsonb,uuid[],uuid,timestamptz)') is null,
 'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname in ('public','storage')),
 'bucket',(select to_jsonb(b) from storage.buckets b where id='bookclub-venues'),
 'system_helper_preserved',to_regprocedure('public.rls_auto_enable()') is not null,
 'rpc_privileges',jsonb_build_object(
  'anon_save',has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute'),
  'authenticated_save',has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute'),
  'anon_resolve',has_function_privilege('anon','public.resolve_invitation(text,text)','execute'),
  'anon_payload_helper',has_function_privilege('anon','public.event_payload_v110(public.events)','execute')),
 'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid))) from pg_constraint c where c.connamespace='public'::regnamespace)
) as rebuild_postflight;
-- SQL owner output confirms configuration only; NOT proof of end-user Auth/RLS/Storage HTTP.
