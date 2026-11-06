-- READ ONLY. Run after description and again after YouTube; compare results
-- with the immediately preceding snapshot and the reviewed phase-specific plan.
select jsonb_build_object(
  'captured_at', clock_timestamp(),
  'executor', current_user,
  'columns', (select coalesce(jsonb_agg(jsonb_build_object(
      'name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default
    ) order by column_name),'[]'::jsonb)
    from information_schema.columns where table_schema='public' and table_name='events'
      and column_name in ('description','description_rich','youtube_url','quote_one','quote_two')),
  'constraints', (select coalesce(jsonb_agg(jsonb_build_object(
      'name',conname,'definition',pg_get_constraintdef(oid),'validated',convalidated
    ) order by conname),'[]'::jsonb) from pg_constraint
    where conrelid='public.events'::regclass and conname in
      ('events_description_rich_valid','events_youtube_url_valid')),
  'save_event', (select jsonb_build_object(
      'definition_md5',md5(pg_get_functiondef(p.oid)),
      'definition',pg_get_functiondef(p.oid),
      'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,
      'config',p.proconfig,'acl',p.proacl,
      'anonymous_execute',has_function_privilege('anon',p.oid,'execute'),
      'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute')
    ) from pg_proc p where p.oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)')),
  'events_rls', (select relrowsecurity from pg_class where oid='public.events'::regclass),
  'original_events_fingerprint', (select md5(coalesce(string_agg(
      (to_jsonb(t)-'description_rich'-'youtube_url')::text,E'\n' order by id),'')) from public.events t),
  'new_description_count', (select count(*) from public.events t
    where to_jsonb(t)->'description_rich' is not null
      and to_jsonb(t)->'description_rich'<>'null'::jsonb),
  'new_youtube_count', (select count(*) from public.events t
    where to_jsonb(t)->'youtube_url' is not null
      and to_jsonb(t)->'youtube_url'<>'null'::jsonb)
) as event_fields_postflight;
