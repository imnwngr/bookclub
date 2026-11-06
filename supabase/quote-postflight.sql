-- READ ONLY; compare count and fingerprint against immediately preceding preflight.
select jsonb_build_object('database',current_database(),'executor',current_user,
 'save_event_security',(select jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'md5',md5(pg_get_functiondef(p.oid))) from pg_proc p where p.oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamp with time zone)')),
 'validator',(select jsonb_build_object('owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute')) from pg_proc p where p.oid=to_regprocedure('public.valid_quote_document(jsonb)')),
 'validator_constraint',(select jsonb_build_object('validated',convalidated,'definition',pg_get_constraintdef(oid)) from pg_constraint where conrelid='public.events'::regclass and conname='events_quote_two_valid'),
 'invalid_quote_count',(select count(*) from public.events where not public.valid_quote_document(quote_two)),
 'events_count',(select count(*) from public.events),
 'events_original_fingerprint',(select md5(coalesce(string_agg((to_jsonb(e)-'quote_one'-'quote_two')::text,E'\n' order by e.id),'')) from public.events e),
 'nonempty_quote_one',(select count(*) from public.events where quote_one<>''),
 'nonnull_quote_two',(select count(*) from public.events where quote_two is not null),
 'events_rls',(select relrowsecurity from pg_class where oid='public.events'::regclass),
 'anon_save',has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamp with time zone)','execute'),
 'authenticated_save',has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamp with time zone)','execute'),
 'anon_resolve',has_function_privilege('anon','public.resolve_invitation(text,text)','execute'),
 'columns',(select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by column_name) from information_schema.columns where table_schema='public' and table_name='events' and column_name in ('quote_one','quote_two'))
) as quote_postflight;
