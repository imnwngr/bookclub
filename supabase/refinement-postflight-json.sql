-- READ ONLY; one row/one JSON column for SQL Editor. Compare agenda IDs/content with preflight export.
select jsonb_build_object(
 'agenda',coalesce((select jsonb_agg(to_jsonb(a) order by a.event_id,a.sort_order,a.id) from public.event_agenda_items a),'[]'::jsonb),
 'agenda_count',(select count(*) from public.event_agenda_items),
 'legacy_null_end_and_book',(select count(*) from public.event_agenda_items where end_time is null and icon='book'),
 'invalid_ranges',(select count(*) from public.event_agenda_items where end_time is not null and (end_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or end_time<=time)),
 'directory_description',(select description from public.guests where id='10000000-0000-4000-8000-000000000001'),
 'target_draft_snapshots',coalesce((select jsonb_agg(to_jsonb(eg) order by eg.id) from public.event_guests eg join public.events e on e.id=eg.event_id where eg.guest_id='10000000-0000-4000-8000-000000000001' and e.status='draft'),'[]'::jsonb),
 'all_invitation_snapshots',coalesce((select jsonb_agg(to_jsonb(eg) order by eg.event_id,eg.id) from public.event_guests eg),'[]'::jsonb),
 'alias_counts',(select jsonb_build_object('total',count(*),'secondary',count(*) filter(where a.alias<>eg.primary_alias)) from public.invitation_aliases a join public.event_guests eg on eg.id=a.event_guest_id),
 'noncanonical_invitation_count',(select count(*) from public.event_guests eg join public.guests g on g.id=eg.guest_id where eg.primary_alias is distinct from g.primary_alias),
 'privileges',jsonb_build_object('anon_save',has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute'),'authenticated_save',has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute'),'anon_resolve',has_function_privilege('anon','public.resolve_invitation(text,text)','execute'),'authenticated_alias_insert',has_table_privilege('authenticated','public.invitation_aliases','insert'),'authenticated_alias_update',has_table_privilege('authenticated','public.invitation_aliases','update'),'authenticated_alias_delete',has_table_privilege('authenticated','public.invitation_aliases','delete')),
 'rls',coalesce((select jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('events','guests','event_guests','invitation_aliases','event_agenda_items','admin_users','venue_image_uploads')),'[]'::jsonb),
 'alias_trigger',coalesce((select jsonb_agg(pg_get_triggerdef(t.oid)) from pg_trigger t where t.tgrelid='public.invitation_aliases'::regclass and t.tgname='primary_invitation_alias_only' and not t.tgisinternal),'[]'::jsonb),
 'agenda_constraints',coalesce((select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid='public.event_agenda_items'::regclass),'[]'::jsonb)
) as refinement_postflight;
