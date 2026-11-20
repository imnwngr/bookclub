-- Read-only; compare preflight fingerprints and audit concurrent legitimate edits.
select public.hsv_v3_capabilities();
select event_type,status,count(*) from public.events group by event_type,status;
select count(*) as invalid_themes from public.events where not public.valid_event_theme(theme);
select count(*) as invalid_invitations from public.events where event_type='invitation' and (starts_at is null or ends_at is null or ends_at<=starts_at);
select 'events_without_v3_fields' relation,count(*) rows,md5(coalesce(string_agg((to_jsonb(e)-'event_type'-'theme')::text,chr(10) order by id),'')) fingerprint from public.events e
union all select 'event_guests',count(*),md5(coalesce(string_agg(to_jsonb(e)::text,chr(10) order by id),'')) from public.event_guests e
union all select 'invitation_aliases',count(*),md5(coalesce(string_agg(to_jsonb(e)::text,chr(10) order by id),'')) from public.invitation_aliases e;
select has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') anon_save,
       has_function_privilege('authenticated','public.begin_editor_add(uuid,text,uuid,boolean)','execute') authenticated_add,
       has_function_privilege('authenticated','public.finish_editor_add(uuid,text,uuid,uuid)','execute') authenticated_finish,
       has_table_privilege('authenticated','public.editor_add_operations','select') authenticated_ledger_read,
       has_table_privilege('authenticated','public.editor_add_operations','insert') authenticated_ledger_write,
       has_function_privilege('service_role','public.begin_editor_add(uuid,text,uuid,boolean)','execute') service_add,
       (select relrowsecurity from pg_class where oid='public.editor_add_operations'::regclass) ledger_rls;
