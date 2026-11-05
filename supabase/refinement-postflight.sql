-- READ ONLY after approved additive migration; not a replacement for live Auth/Storage tests.
select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='event_agenda_items' and column_name in ('end_time','icon');
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.event_agenda_items'::regclass;
select count(*) as preserved_legacy_without_end from public.event_agenda_items where end_time is null;
select has_table_privilege('authenticated','public.invitation_aliases','insert')::text as authenticated_alias_insert_expected_false,
 has_table_privilege('authenticated','public.invitation_aliases','update')::text as authenticated_alias_update_expected_false,
 has_table_privilege('authenticated','public.invitation_aliases','delete')::text as authenticated_alias_delete_expected_false,
 has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')::text as anon_save_expected_false,
 has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')::text as authenticated_save_expected_true;
select pg_get_triggerdef(oid) from pg_trigger where tgname='primary_invitation_alias_only' and tgrelid='public.invitation_aliases'::regclass;
-- Check security invariants and preserved legacy data after migration.
select p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proconfig,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_event','resolve_invitation','primary_invitation_alias_only','is_admin') order by p.proname;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('events','guests','event_guests','invitation_aliases','event_agenda_items','admin_users','venue_image_uploads');
select count(*) as secondary_alias_rows_retained from public.invitation_aliases a join public.event_guests eg on eg.id=a.event_guest_id where a.alias<>eg.primary_alias;
select count(*) as invalid_existing_ranges from public.event_agenda_items where end_time is not null and (end_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or end_time<=time);
