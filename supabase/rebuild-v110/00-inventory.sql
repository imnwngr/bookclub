-- READ ONLY. Run only in project trdofhdspbkwgernwybp SQL Editor.
-- Return a single JSON inventory; inspect BEFORE preparing the scoped DROP list.
select jsonb_build_object(
 'database',current_database(),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity)),'[]') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','S','f')),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object('identity',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'acl',p.proacl)),'[]') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f'),
 'constraints',(select coalesce(jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid))),'[]') from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' or c.confrelid in (select oid from pg_class where relnamespace='public'::regnamespace)),
 'triggers',(select coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'definition',pg_get_triggerdef(t.oid))),'[]') from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and not t.tgisinternal),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from pg_policies p where p.schemaname in ('public','storage')),
 'buckets',(select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'limit',b.file_size_limit,'mime',b.allowed_mime_types)),'[]') from storage.buckets b),
 'bookclub_objects',(select count(*) from storage.objects where bucket_id='bookclub-venues'),
 'admin_uids',(select coalesce(jsonb_agg(a.user_id),'[]') from public.admin_users a join auth.users u on u.id=a.user_id),
 'auth_user_count',(select count(*) from auth.users),
 'event_triggers',(select coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'function',e.evtfoid::regprocedure::text)),'[]') from pg_event_trigger e)
) as rebuild_inventory;
