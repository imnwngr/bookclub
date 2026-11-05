-- Included inside REBUILD.sql transaction; preserve only verified existing memberships.
insert into public.admin_users(user_id) select a.user_id from bookclub_rebuild_admins a join auth.users u on u.id=a.user_id;
do $$ begin
 if exists((select id from bookclub_rebuild_auth except select id from auth.users) union all (select id from auth.users except select id from bookclub_rebuild_auth)) then raise exception 'Auth UID set changed'; end if;
 if (select definition from bookclub_rebuild_system) is distinct from pg_get_functiondef('public.rls_auto_enable()'::regprocedure) then raise exception 'System RLS helper changed'; end if;
 if exists((select * from bookclub_rebuild_event_triggers except select oid,evtname,evtevent,evtfoid,evtenabled,evttags from pg_event_trigger) union all (select oid,evtname,evtevent,evtfoid,evtenabled,evttags from pg_event_trigger except select * from bookclub_rebuild_event_triggers)) then raise exception 'System event triggers changed'; end if;
 if (select count(*) from public.guests)<>10 or exists(select 1 from public.guests where not active or primary_alias<>public.guest_slug_v110(name)) then raise exception 'Seed verification failed'; end if;
 if (select count(*) from public.admin_users)<>1 or not exists(select 1 from public.admin_users where user_id=current_setting('bookclub.reviewed_admin_uid', true)::uuid) then raise exception 'Admin restore failed'; end if;
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity)<>7 then raise exception 'Expected seven RLS application tables'; end if;
 if not exists(select 1 from storage.buckets where id='bookclub-venues' and not public and file_size_limit=5242880) then raise exception 'Private bucket missing'; end if;
end $$;
notify pgrst, 'reload schema';
