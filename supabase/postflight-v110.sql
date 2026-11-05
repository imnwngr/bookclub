-- Read-only verification after applying approved migrations to staging first.
select count(*) as missing_current_codes from public.events e where not exists(select 1 from public.event_codes c where c.event_id=e.id and c.code=e.code);
select count(*) as invalid_primary_aliases from public.guests where primary_alias !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or default_aliases<>array[primary_alias];
select count(*) as broken_invitation_primary from public.event_guests eg where not exists(select 1 from public.invitation_aliases a where a.event_guest_id=eg.id and a.alias=eg.primary_alias);
select count(*) as image_references_without_registry from public.events e where e.venue_image_path is not null and not exists(select 1 from public.venue_image_uploads r where r.path=e.venue_image_path);
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
select schemaname,tablename,policyname,cmd,qual,with_check from pg_policies where schemaname in ('public','storage');
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='bookclub-venues';
select p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proconfig,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_event','save_event_v100','resolve_invitation','get_event_v110','event_payload_v110','protect_event_code','remember_event_code_v110','unused_venue_images');
select role_name,fn,has_function_privilege(role_name,fn,'EXECUTE') as allowed from unnest(array['anon','authenticated']) role_name cross join unnest(array['public.save_event_v100(jsonb,uuid[],uuid,timestamptz)','public.event_payload_v110(public.events)','public.protect_event_code()','public.remember_event_code_v110()','public.guest_alias_v110()']) fn;
-- All helper allowed values above must be false; public API grants are checked separately.
