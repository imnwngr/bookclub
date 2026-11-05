-- READ ONLY. Confirm project ID in Dashboard; current_database() is not a project identifier.
select jsonb_build_object(
  'database',current_database(),'executor',current_user,'session_user',session_user,
  'guests_table',(select jsonb_build_object('schema',n.nspname,'name',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=to_regclass('public.guests')),
  'guest_count',(select count(*) from public.guests),
  'current_order',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'created_at',g.created_at,'name',to_jsonb(g)->>'name') order by g.created_at,g.id) from public.guests g),'[]'::jsonb),
  'guest_updated_at',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'updated_at',to_jsonb(g)->'updated_at') order by g.id) from public.guests g),'[]'::jsonb),
  'guest_full_fingerprint',(select md5(coalesce(string_agg(to_jsonb(g)::text,E'\n' order by g.id),'')) from public.guests g),
  'guest_content_fingerprint',(select md5(coalesce(string_agg((to_jsonb(g)-'updated_at'-'display_order')::text,E'\n' order by g.id),'')) from public.guests g),
  'event_guests_fingerprint',(select md5(coalesce(string_agg(to_jsonb(eg)::text,E'\n' order by eg.id),'')) from public.event_guests eg),
  'aliases_fingerprint',(select md5(coalesce(string_agg(to_jsonb(a)::text,E'\n' order by a.id),'')) from public.invitation_aliases a),
  'columns',coalesce((select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=to_regclass('public.guests') and a.attnum>0 and not a.attisdropped),'[]'::jsonb),
  'constraints',coalesce((select jsonb_agg(jsonb_build_object('name',c.conname,'table',c.conrelid::regclass::text,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated) order by c.conrelid::regclass::text,c.conname)
    from pg_constraint c where c.conrelid=to_regclass('public.guests') or c.confrelid=to_regclass('public.guests')),'[]'::jsonb),
  'dependencies',coalesce((select jsonb_agg(jsonb_build_object('type',d.deptype,'dependent',pg_describe_object(d.classid,d.objid,d.objsubid)) order by d.classid,d.objid,d.objsubid)
    from pg_depend d where d.refclassid='pg_class'::regclass and d.refobjid=to_regclass('public.guests')),'[]'::jsonb),
  'indexes',coalesce((select jsonb_agg(jsonb_build_object('name',indexname,'definition',indexdef) order by indexname) from pg_indexes where schemaname='public' and tablename='guests'),'[]'::jsonb),
  'triggers',coalesce((select jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid)) order by tgname) from pg_trigger where tgrelid=to_regclass('public.guests') and not tgisinternal),'[]'::jsonb),
  'policies',coalesce((select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_policies p where schemaname='public' and tablename='guests'),'[]'::jsonb),
  'table_privileges',jsonb_build_object('anon_select',has_table_privilege('anon','public.guests','select'),'anon_insert',has_table_privilege('anon','public.guests','insert'),'anon_update',has_table_privilege('anon','public.guests','update'),'authenticated_select',has_table_privilege('authenticated','public.guests','select'),'authenticated_insert',has_table_privilege('authenticated','public.guests','insert'),'authenticated_update',has_table_privilege('authenticated','public.guests','update')),
  'functions',coalesce((select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'search_path',p.proconfig,'acl',p.proacl,'definition',pg_get_functiondef(p.oid),'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute')) order by p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('reorder_guests','guest_order_available','is_admin','guest_order_timestamp','guest_order_write_lock','guest_order_append','touch_updated_at','guest_alias_v110')),'[]'::jsonb),
  'conflicting_named_objects',coalesce((select jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) order by c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('guest_display_order_seq','guests_display_order_idx')),'[]'::jsonb)
) as guest_order_preflight;
