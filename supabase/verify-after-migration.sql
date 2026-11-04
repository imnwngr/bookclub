-- Read-only post-migration verification; run in the designated project's SQL Editor.
select current_database(), current_user;
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' order by tablename,policyname;
select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
order by c.relname,con.conname;
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
 p.prosecdef as security_definer, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by p.proname;
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated') order by table_name,grantee,privilege_type;
select count(*) as guest_count from public.guests;
select id,salutation,name,description,kind,active,default_aliases
from public.guests order by id;
