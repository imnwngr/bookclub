-- REVIEW ONLY. Requires production definition/ACL audit; never applies automatically.
begin;
set local lock_timeout='5s';
do $baseline$ declare r record; f oid; begin
 for r in select * from (values ('public.is_admin()','b11e704df80dcdb21b91e90747409eb1'),
('public.save_event(jsonb,uuid[],uuid,timestamp with time zone)','49105a95c8ead8a7f32c115943faee62'),
('public.reorder_guests(uuid[],uuid[])','a606d9f86880b975f12f66094ef09b67'),
('public.guest_order_write_lock()','8c7a699a6dffd3b4945710a92bf50941'),
('public.get_event_v110(text)','00a558934b4ea51b6e67ea1ac2371894'),
('public.resolve_invitation(text,text)','a8249304545b779d7c9197e226dd2125'),
('public.unused_venue_images()','430123e21b929b44cd95c23e0fb6cc2c')) as b(signature,expected_md5) loop
 f:=to_regprocedure(r.signature);
 if f is null or md5(pg_get_functiondef(f)) is distinct from r.expected_md5 then raise exception 'Reviewed production function changed: %',r.signature;end if;
 if not exists(select 1 from pg_proc where oid=f and pg_get_userbyid(proowner)='postgres' and prosecdef and proconfig @> array['search_path=""']) then raise exception 'Unexpected function security: %',r.signature;end if;
 end loop;
end $baseline$;

do $$ begin
 if to_regprocedure('public.valid_quote_document(jsonb)') is null or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='quote_two') then raise exception 'Expected applied quote schema';end if;
 if has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') then raise exception 'Unexpected anonymous content write privilege';end if;
end $$;

do $policies$ declare r record; actual text; begin
 for r in select * from (values ('public','admin_users','admin_membership_read','1970d8a6dc51917af3be8a5e36b7706a'),
('public','event_agenda_items','agenda_admin','f85f90bcb4c41de316eb8e1b8ebfd491'),
('public','event_agenda_items','agenda_read','c5f3f33dc28bf54f399ad913f905c5c1'),
('public','event_guests','admin_invitations','0c9da0fba525a79aeb82535596f84fe1'),
('public','events','admin_events_write','0c9da0fba525a79aeb82535596f84fe1'),
('public','events','published_events','42affb6f3021cca6e724a97b4529d52a'),
('public','guests','admin_guests','0c9da0fba525a79aeb82535596f84fe1'),
('public','invitation_aliases','admin_aliases','0c9da0fba525a79aeb82535596f84fe1'),
('public','venue_image_uploads','image_registry_admin','315b72bb43260f2a9ee9d3c5248e7689'),
('storage','objects','bookclub_venue_delete','e59856523888d9559f518141e22340f4'),
('storage','objects','bookclub_venue_insert','d64e39e57ce92ef06622cf768ec09ded'),
('storage','objects','bookclub_venue_read','8c8989774788f5d09311347cf840f9dc')) as b(schema_name,table_name,policy_name,expected_md5) loop
 select md5(coalesce(qual,'')||chr(31)||coalesce(with_check,'')||chr(31)||array_to_string(roles,',')||chr(31)||cmd||chr(31)||permissive) into actual from pg_policies where schemaname=r.schema_name and tablename=r.table_name and policyname=r.policy_name;
 if actual is distinct from r.expected_md5 then raise exception 'Reviewed policy changed: %.%.%',r.schema_name,r.table_name,r.policy_name;end if;
 end loop;
 if (select count(*) from pg_policies where schemaname='public' or (schemaname='storage' and policyname like 'bookclub_venue_%'))<>12 then raise exception 'Unexpected policy count';end if;
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname in ('events','guests','event_guests','invitation_aliases','event_agenda_items','admin_users','venue_image_uploads'))<>7 then raise exception 'RLS baseline changed';end if;
 if has_table_privilege('authenticated','public.admin_users','insert') or has_table_privilege('authenticated','public.admin_users','update') or has_table_privilege('authenticated','public.admin_users','delete') then raise exception 'Unexpected admin membership writes';end if;
end $policies$;
create table public.editor_users(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.editor_users enable row level security;
revoke all on public.editor_users from public,anon,authenticated;
create function public.can_edit_content() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_admin() or exists(select 1 from public.editor_users where user_id=(select auth.uid()))
$$;
revoke all on function public.can_edit_content() from public;
grant execute on function public.can_edit_content() to anon,authenticated;
create function public.effective_role() returns text language sql stable security definer set search_path='' as $$
 select case when public.is_admin() then 'admin' when exists(select 1 from public.editor_users where user_id=(select auth.uid())) then 'editor' end
$$;
revoke all on function public.effective_role() from public,anon;
grant execute on function public.effective_role() to authenticated;
create function public.role_directory() returns table(user_id uuid,email text,role text,status text) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.can_edit_content() then raise exception 'Content access required' using errcode='42501';end if;
 return query select u.id,u.email::text,case when a.user_id is not null then 'admin' else 'editor' end,
 case when u.email_confirmed_at is not null then 'confirmed' when u.invited_at is not null then 'invited' else 'unconfirmed' end
 from auth.users u left join public.admin_users a on a.user_id=u.id left join public.editor_users e on e.user_id=u.id
 where a.user_id is not null or e.user_id is not null order by lower(u.email);
end $$;
revoke all on function public.role_directory() from public,anon;
grant execute on function public.role_directory() to authenticated;
-- Service-only entry point. Actor is verified against current membership again in this transaction.
create function public.set_editor_role(p_actor uuid,p_target uuid,p_grant boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(194827,112);
 lock table public.admin_users in share mode;
 if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'Admin required' using errcode='42501';end if;
 if exists(select 1 from public.admin_users where user_id=p_target) then raise exception 'Admin targets locked' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=p_target) then raise exception 'Account not found' using errcode='22023';end if;
 if p_grant is true then
  if exists(select 1 from public.editor_users where user_id=p_target) then raise exception 'Already Editor' using errcode='23505';end if;
  insert into public.editor_users(user_id) values(p_target);
 elsif p_grant is false then
  delete from public.editor_users where user_id=p_target;
  if not found then raise exception 'Editor not found' using errcode='22023';end if;
 else raise exception 'Action required' using errcode='22023';end if;
end $$;
revoke all on function public.set_editor_role(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_editor_role(uuid,uuid,boolean) to service_role;
-- Preserve current function bodies rather than copying obsolete save_event SQL.
-- Only these content helpers may have their current-user check changed.
do $$ declare sig text; f oid; definition text; begin
 foreach sig in array array['public.save_event(jsonb,uuid[],uuid,timestamp with time zone)','public.get_event_v110(text)','public.resolve_invitation(text,text)','public.unused_venue_images()','public.reorder_guests(uuid[],uuid[])','public.guest_order_write_lock()'] loop
 f:=to_regprocedure(sig);if f is null then raise exception 'Missing content function: %',sig;end if;
 definition:=pg_get_functiondef(f);
 if (length(definition)-length(replace(definition,'public.is_admin()','')))/length('public.is_admin()')<>1 then raise exception 'Unexpected content guard: %',sig;end if;
 execute replace(definition,'public.is_admin()','public.can_edit_content()');
 end loop;
end $$;
-- Exact policy allowlist: administrative membership policy is deliberately excluded.
do $$ declare r record; expr text; chk text; expected integer:=0; begin
 for r in select * from pg_policies where
 (schemaname='public' and (tablename,policyname) in (('events','admin_events_write'),('events','published_events'),('guests','admin_guests'),('event_guests','admin_invitations'),('invitation_aliases','admin_aliases'),('event_agenda_items','agenda_admin'),('event_agenda_items','agenda_read'),('venue_image_uploads','image_registry_admin')))
 or (schemaname='storage' and tablename='objects' and policyname in ('bookclub_venue_read','bookclub_venue_insert','bookclub_venue_delete')) loop
 expected:=expected+1;
 if position('is_admin()' in coalesce(r.qual,'')||coalesce(r.with_check,''))=0 then raise exception 'Unexpected policy %',r.policyname;end if;
 expr:=replace(replace(r.qual,'public.is_admin()','is_admin()'),'is_admin()','public.can_edit_content()');chk:=replace(replace(r.with_check,'public.is_admin()','is_admin()'),'is_admin()','public.can_edit_content()');
 execute format('alter policy %I on %I.%I%s%s',r.policyname,r.schemaname,r.tablename,case when expr is null then '' else ' using ('||expr||')' end,case when chk is null then '' else ' with check ('||chk||')' end);
 end loop;
 if expected<>11 then raise exception 'Expected 11 content policies, found %',expected;end if;
end $$;
commit;
