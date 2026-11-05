-- REVIEW BEFORE APPLYING. Project trdofhdspbkwgernwybp only.
-- ACL-only, repeatable. Does not reset data or change any function body/default privileges.
begin;
do $$ begin
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='save_event')<>1
 or to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)') is null then
 raise exception 'Unexpected save_event overloads/signature: inspect ACL audit first'; end if;
 if not exists(select 1 from pg_proc where oid='public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure and prosecdef and position('public.is_admin()' in prosrc)>0) then
 raise exception 'Expected admin guard/security definer not found'; end if;
end $$;
revoke execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) from public, anon;
grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to authenticated;
do $$ begin
 if has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')
 or not has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') then
 raise exception 'Unexpected inherited privileges: rollback; inspect role memberships'; end if;
end $$;
commit;
