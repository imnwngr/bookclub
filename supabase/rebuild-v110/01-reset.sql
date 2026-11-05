-- Destructive BookClub-only reset, authorized by owner. Inventory: trdofhdspbkwgernwybp.
-- Included inside REBUILD.sql transaction. NEVER run this fragment on its own.
do $$
declare names text[];
begin
 select array_agg(c.relname::text order by c.relname) into names from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','S','f');
 if names is distinct from array['admin_users','event_guests','events','guests','invitation_aliases']::text[] then raise exception 'Inventory drift: public relations differ'; end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='guests' and column_name='primary_alias') then raise exception 'Rebuild already applied or schema changed'; end if;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public')<>6
 or to_regprocedure('public.rls_auto_enable()') is null
 or to_regprocedure('public.is_admin()') is null
 or to_regprocedure('public.touch_updated_at()') is null
 or to_regprocedure('public.protect_event_code()') is null
 or to_regprocedure('public.resolve_invitation(text,text)') is null
 or to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)') is null then raise exception 'Inventory drift: functions differ'; end if;
 if exists(select 1 from storage.buckets) or exists(select 1 from storage.objects) or exists(select 1 from pg_policies where schemaname='storage') then raise exception 'Inventory drift: Storage no longer empty; review before reset'; end if;
 if (select count(*) from auth.users)<>2 then raise exception 'Inventory drift: Auth account count differs'; end if;
 if (select count(*) from public.admin_users)<>1 or not exists(select 1 from public.admin_users a join auth.users u on u.id=a.user_id where a.user_id=current_setting('bookclub.reviewed_admin_uid', true)::uuid) then raise exception 'Admin mapping differs from reviewed inventory'; end if;
 if exists(select 1 from pg_trigger t where t.tgrelid in ('public.events'::regclass,'public.guests'::regclass,'public.event_guests'::regclass,'public.invitation_aliases'::regclass,'public.admin_users'::regclass) and not t.tgisinternal and t.tgfoid not in ('public.touch_updated_at()'::regprocedure,'public.protect_event_code()'::regprocedure)) then raise exception 'Unrecognized application trigger'; end if;
end $$;
create temporary table bookclub_rebuild_admins on commit drop as select a.user_id from public.admin_users a join auth.users u on u.id=a.user_id;
create temporary table bookclub_rebuild_auth on commit drop as select id from auth.users;
create temporary table bookclub_rebuild_system on commit drop as select pg_get_functiondef('public.rls_auto_enable()'::regprocedure) as definition;
create temporary table bookclub_rebuild_event_triggers on commit drop as select oid,evtname,evtevent,evtfoid,evtenabled,evttags from pg_event_trigger;
-- No CASCADE: unexpected dependencies must cause the entire transaction to fail.
drop function public.save_event(jsonb,uuid[],uuid,timestamptz) restrict;
drop function public.resolve_invitation(text,text) restrict;
alter table public.event_guests drop constraint primary_alias_exists;
drop table public.invitation_aliases restrict;
drop table public.event_guests restrict;
drop table public.events restrict;
drop table public.guests restrict;
drop table public.admin_users restrict;
drop function public.is_admin() restrict;
drop function public.protect_event_code() restrict;
drop function public.touch_updated_at() restrict;
