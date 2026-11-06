-- READ ONLY: confirm project trdofhdspbkwgernwybp in Dashboard. Stop if editor_users already exists.
select jsonb_build_object(
 'database',current_database(),'executor',current_user,
 'functions',(select jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl,'md5',md5(pg_get_functiondef(p.oid)),'definition',pg_get_functiondef(p.oid),'anon_execute',has_function_privilege('anon',p.oid,'execute'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'execute'),'service_execute',has_function_privilege('service_role',p.oid,'execute')) order by p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_admin','can_edit_content','effective_role','role_directory','set_editor_role','save_event','get_event_v110','resolve_invitation','reorder_guests','guest_order_write_lock','unused_venue_images','valid_quote_document')),
 'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname='public' or (schemaname='storage' and policyname like 'bookclub_venue_%')),
 'tables',(select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,'owner',pg_get_userbyid(c.relowner)) order by c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),
 'editor_table_exists',to_regclass('public.editor_users') is not null,
 'role_write_acl',jsonb_build_object('anon_execute',has_function_privilege('anon',to_regprocedure('public.set_editor_role(uuid,uuid,boolean)'),'execute'),'authenticated_execute',has_function_privilege('authenticated',to_regprocedure('public.set_editor_role(uuid,uuid,boolean)'),'execute'),'service_execute',has_function_privilege('service_role',to_regprocedure('public.set_editor_role(uuid,uuid,boolean)'),'execute'),'client_membership_insert',has_table_privilege('authenticated',to_regclass('public.editor_users'),'insert'),'client_membership_update',has_table_privilege('authenticated',to_regclass('public.editor_users'),'update'),'client_membership_delete',has_table_privilege('authenticated',to_regclass('public.editor_users'),'delete')),
 'auth_count',(select count(*) from auth.users),
 'admins_fingerprint',(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by user_id),'')) from public.admin_users t),
 'events_fingerprint',(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by id),'')) from public.events t),
 'guests_fingerprint',(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by id),'')) from public.guests t),
 'invitations_fingerprint',(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by id),'')) from public.event_guests t),
 'aliases_fingerprint',(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by id),'')) from public.invitation_aliases t),
 'agenda_fingerprint',(select md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by id),'')) from public.event_agenda_items t)
) as role_audit;
