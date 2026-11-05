-- READ ONLY. Run on the intended project before review/approval; one JSON row.
select jsonb_build_object(
  'database', current_database(), 'executor', current_user,
  'agenda', (select jsonb_build_object('rls',c.relrowsecurity,'forced_rls',c.relforcerowsecurity,
    'owner',pg_get_userbyid(c.relowner),'row_count',(select count(*) from public.event_agenda_items),
    'row_fingerprint',(select md5(coalesce(string_agg(row_to_json(a)::text, E'\n' order by a.id),'')) from public.event_agenda_items a))
    from pg_class c where c.oid=to_regclass('public.event_agenda_items')),
  'constraints',coalesce((select jsonb_agg(jsonb_build_object('name',conname,'validated',convalidated,'definition',pg_get_constraintdef(oid)) order by conname)
    from pg_constraint where conrelid=to_regclass('public.event_agenda_items')),'[]'::jsonb),
  'constraint_dependencies',coalesce((select jsonb_agg(jsonb_build_object('type',d.deptype,'dependent',pg_describe_object(d.classid,d.objid,d.objsubid)) order by d.classid,d.objid,d.objsubid)
    from pg_depend d join pg_constraint c on d.refclassid='pg_constraint'::regclass and d.refobjid=c.oid
    where c.conrelid=to_regclass('public.event_agenda_items') and c.conname='agenda_icon_valid'),'[]'::jsonb),
  'icons_in_use',coalesce((select jsonb_agg(jsonb_build_object('icon',icon,'count',n) order by icon) from (select icon,count(*) n from public.event_agenda_items group by icon) q),'[]'::jsonb),
  'agenda_policies',coalesce((select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_policies p where schemaname='public' and tablename='event_agenda_items'),'[]'::jsonb),
  'rpc_overloads',coalesce((select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
    'security_definer',p.prosecdef,'configuration',p.proconfig,'acl',p.proacl,'definition',pg_get_functiondef(p.oid),
    'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute')) order by p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='agenda_icon_capabilities'),'[]'::jsonb),
  'save_event', (select jsonb_build_object('signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),
    'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'))
    from pg_proc p where p.oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamp with time zone)')),
  'resolve_invitation', (select jsonb_build_object('definition_md5',md5(pg_get_functiondef(p.oid)),
    'anon_execute',has_function_privilege('anon',p.oid,'execute')) from pg_proc p where p.oid=to_regprocedure('public.resolve_invitation(text,text)'))
) as agenda_icons_preflight;
