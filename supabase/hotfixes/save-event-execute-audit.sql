-- READ ONLY. Exact live overloads, effective ACL, default grants and role inheritance.
select p.oid::regprocedure::text as signature,pg_get_userbyid(p.proowner) as owner,
 p.prosecdef,p.proconfig,p.proacl::text as explicit_acl,pg_get_functiondef(p.oid) as definition,
 has_function_privilege('anon',p.oid,'execute')::text as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute')::text as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_event';
select p.oid::regprocedure::text as signature,
 case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
 pg_get_userbyid(a.grantor) as grantor,a.privilege_type,a.is_grantable
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
where n.nspname='public' and p.proname='save_event';
select pg_get_userbyid(d.defaclrole) as creator,coalesce(n.nspname,'ALL SCHEMAS') as scope,
 case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,a.privilege_type
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) a
where d.defaclobjtype='f' and (d.defaclnamespace=0 or n.nspname='public');
select r.rolname as inherited_role from pg_roles r where r.rolname<>'anon' and pg_has_role('anon',r.oid,'MEMBER');
