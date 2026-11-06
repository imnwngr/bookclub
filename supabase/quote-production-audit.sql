-- READ ONLY. Confirm project trdofhdspbkwgernwybp in the dashboard separately.
-- Historical comparison only: save_event md5 91ca923e964e16cb3e4eca606b7a1e6b.
with relevant_functions as (
 select p.oid,p.proname,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('save_event','save_event_v100','resolve_invitation','get_event_v110','event_payload_v110','is_admin','slug_v110','guest_alias_v110','reorder_guests','guest_order_available','agenda_icon_capabilities','touch_updated_at','guest_order_timestamp','guest_order_append','guest_order_write_lock')
), relevant_tables as (
 select c.oid,c.relname,n.nspname,c.relrowsecurity,c.relforcerowsecurity,c.relacl,c.relowner
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('events','guests','event_guests','invitation_aliases','event_agenda_items','admin_users','venue_image_uploads') and c.relkind in ('r','p')
)
select jsonb_build_object(
 'database',current_database(),'executor',current_user,'session_user',session_user,
 'historical_save_event_md5','91ca923e964e16cb3e4eca606b7a1e6b',
 'functions',coalesce((select jsonb_agg(jsonb_build_object(
   'signature',p.oid::regprocedure::text,'identity_arguments',pg_get_function_identity_arguments(p.oid),
   'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,
   'search_path_config',p.proconfig,'acl',p.proacl,'definition',pg_get_functiondef(p.oid),'definition_md5',md5(pg_get_functiondef(p.oid)),
   'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),
   'public_execute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')) order by p.oid::regprocedure::text)
   from relevant_functions rf join pg_proc p on p.oid=rf.oid),'[]'::jsonb),
 'tables',coalesce((select jsonb_agg(jsonb_build_object('schema',t.nspname,'name',t.relname,'owner',pg_get_userbyid(t.relowner),'rls',t.relrowsecurity,'force_rls',t.relforcerowsecurity,'acl',t.relacl) order by t.relname) from relevant_tables t),'[]'::jsonb),
 'columns',coalesce((select jsonb_agg(jsonb_build_object('table',t.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by t.relname,a.attnum)
   from relevant_tables t join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=t.oid and d.adnum=a.attnum),'[]'::jsonb),
 'constraints',coalesce((select jsonb_agg(jsonb_build_object('table',t.relname,'name',c.conname,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated) order by t.relname,c.conname) from relevant_tables t join pg_constraint c on c.conrelid=t.oid or c.confrelid=t.oid),'[]'::jsonb),
 'policies',coalesce((select jsonb_agg(to_jsonb(pol) order by pol.tablename,pol.policyname) from pg_policies pol where pol.schemaname='public' and pol.tablename in (select relname from relevant_tables)),'[]'::jsonb),
 'triggers',coalesce((select jsonb_agg(jsonb_build_object('table',t.relname,'name',tr.tgname,'definition',pg_get_triggerdef(tr.oid),'function',tr.tgfoid::regprocedure::text) order by t.relname,tr.tgname) from relevant_tables t join pg_trigger tr on tr.tgrelid=t.oid and not tr.tgisinternal),'[]'::jsonb),
 'dependencies',coalesce((select jsonb_agg(jsonb_build_object('function',rf.oid::regprocedure::text,'referenced_class',d.refclassid::regclass::text,'referenced_oid',d.refobjid,'referenced_subid',d.refobjsubid,'kind',d.deptype,'description',pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid)) order by rf.oid::regprocedure::text,d.refclassid,d.refobjid,d.refobjsubid) from relevant_functions rf join pg_depend d on d.classid='pg_proc'::regclass and d.objid=rf.oid),'[]'::jsonb)
) as quote_production_audit;
