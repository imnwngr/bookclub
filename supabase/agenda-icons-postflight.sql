-- READ ONLY. Run only after the reviewed migration; compare fingerprints with preflight.
with expected as (
  select array['award','book','book-open','camera','chat','film','finish','gift','heart-handshake','mic','music','sparkles','speech','summary','trophy','users','welcome']::text[] icons
), constraint_info as (
  select c.oid, c.convalidated, pg_get_constraintdef(c.oid) definition,
    array(select m[1] from regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''::text', 'g') m order by m[1]) icons
  from pg_constraint c where c.conrelid='public.event_agenda_items'::regclass and c.conname='agenda_icon_valid'
), capability as (
  select p.*, pg_get_functiondef(p.oid) definition from pg_proc p where p.oid=to_regprocedure('public.agenda_icon_capabilities()')
)
select jsonb_build_object(
  'constraint',(select jsonb_build_object('definition',definition,'validated',convalidated,'icons',icons,
    'exact_allowlist',icons=(select icons from expected)) from constraint_info),
  'rpc',(select jsonb_build_object('signature',oid::regprocedure::text,'owner',pg_get_userbyid(proowner),
    'security_definer',prosecdef,'configuration',proconfig,'return_type',pg_get_function_result(oid),'acl',proacl,'definition',definition,
    'anon_execute',has_function_privilege('anon',oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',oid,'execute'),
    'public_execute',exists(select 1 from aclexplode(coalesce(proacl,acldefault('f',proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
    'other_execute_grantees',coalesce((select jsonb_agg(pg_get_userbyid(a.grantee) order by pg_get_userbyid(a.grantee)) from aclexplode(coalesce(proacl,acldefault('f',proowner))) a
      where a.privilege_type='EXECUTE' and a.grantee<>0 and a.grantee<>proowner and pg_get_userbyid(a.grantee) not in ('authenticated','service_role')),'[]'::jsonb)) from capability),
  'capability_result',public.agenda_icon_capabilities(),
  'agenda_rls',(select relrowsecurity from pg_class where oid='public.event_agenda_items'::regclass),
  'agenda_row_count',(select count(*) from public.event_agenda_items),
  'agenda_row_fingerprint',(select md5(coalesce(string_agg(row_to_json(a)::text, E'\n' order by a.id),'')) from public.event_agenda_items a),
  'agenda_policies',coalesce((select jsonb_agg(to_jsonb(p) order by p.policyname) from pg_policies p where schemaname='public' and tablename='event_agenda_items'),'[]'::jsonb),
  'save_event',(select jsonb_build_object('definition_md5',md5(pg_get_functiondef(p.oid)),
    'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'))
    from pg_proc p where p.oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamp with time zone)')),
  'resolve_invitation',(select jsonb_build_object('definition_md5',md5(pg_get_functiondef(p.oid)),
    'anon_execute',has_function_privilege('anon',p.oid,'execute')) from pg_proc p where p.oid=to_regprocedure('public.resolve_invitation(text,text)'))
) as agenda_icons_postflight;
