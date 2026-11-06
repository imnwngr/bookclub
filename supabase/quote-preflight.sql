-- READ ONLY; confirm project ID in Supabase Dashboard separately.
select jsonb_build_object('database',current_database(),'executor',current_user,
 'reviewed_save_event_md5','91ca923e964e16cb3e4eca606b7a1e6b',
 'baseline_matches',coalesce((select md5(pg_get_functiondef(p.oid))='91ca923e964e16cb3e4eca606b7a1e6b' and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef and p.proconfig @> array['search_path=""'] and has_function_privilege('authenticated',p.oid,'execute') and not has_function_privilege('anon',p.oid,'execute') from pg_proc p where p.oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamp with time zone)')),false),
 'validator_name_available',to_regprocedure('public.valid_quote_document(jsonb)') is null,
 'events_count',(select count(*) from public.events),
 'events_fingerprint',(select md5(coalesce(string_agg(to_jsonb(e)::text,E'\n' order by e.id),'')) from public.events e),
 'quote_columns',(select coalesce(jsonb_agg(column_name order by column_name),'[]'::jsonb) from information_schema.columns where table_schema='public' and table_name='events' and column_name in ('quote_one','quote_two')),
 'events_rls',(select relrowsecurity from pg_class where oid='public.events'::regclass),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'definition',pg_get_functiondef(p.oid)) order by p.proname),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_event','resolve_invitation','event_payload_v110'))
) as quote_preflight;
