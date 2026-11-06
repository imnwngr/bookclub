-- REVIEW ONLY. Emergency access rollback after Editor Roles deployment.
-- Preserve memberships, event columns and all event data. Requires a coordinated
-- maintenance window, dependency/ACL review, and separate production approval.
-- Disable the manage-editors endpoint before running this transaction.
begin;
set local lock_timeout = '5s';
do $guard$
declare p oid; expected text; actual text;
begin
  if to_regclass('public.editor_users') is null or
     not (select relrowsecurity from pg_class where oid=to_regclass('public.editor_users')) then
    raise exception 'Editor membership baseline changed';
  end if;
  for p, expected in
    select to_regprocedure(signature), body from (values
      ('public.can_edit_content()', $body$
 select public.is_admin() or exists(select 1 from public.editor_users where user_id=(select auth.uid()))
$body$),
      ('public.effective_role()', $body$
 select case when public.is_admin() then 'admin' when exists(select 1 from public.editor_users where user_id=(select auth.uid())) then 'editor' end
$body$)
    ) as expected_functions(signature,body)
  loop
    if p is null then raise exception 'Expected Editor Roles function missing'; end if;
    select prosrc into actual from pg_proc where oid=p and pg_get_userbyid(proowner)='postgres'
      and prosecdef and proconfig @> array['search_path=""'];
    if actual is distinct from expected then raise exception 'Editor Roles function drift: %',p::regprocedure; end if;
  end loop;
  p:=to_regprocedure('public.set_editor_role(uuid,uuid,boolean)');
  if p is null or not exists(select 1 from pg_proc where oid=p and pg_get_userbyid(proowner)='postgres'
      and prosecdef and proconfig @> array['search_path=""'])
      or not has_function_privilege('service_role',p,'execute')
      or has_function_privilege('anon',p,'execute')
      or has_function_privilege('authenticated',p,'execute') then
    raise exception 'Editor role write ACL or security drift';
  end if;
end $guard$;
create or replace function public.can_edit_content() returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_admin()
$$;
create or replace function public.effective_role() returns text
language sql stable security definer set search_path='' as $$
 select case when public.is_admin() then 'admin' end
$$;
revoke execute on function public.set_editor_role(uuid,uuid,boolean) from service_role;
do $verify$
begin
  if has_function_privilege('service_role','public.set_editor_role(uuid,uuid,boolean)','execute') then
    raise exception 'Role write still executable by service_role';
  end if;
end $verify$;
commit;
