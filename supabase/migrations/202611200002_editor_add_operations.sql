begin;
set local lock_timeout='5s';
do $$ begin
  if to_regprocedure('public.hsv_v3_capabilities()') is null then raise exception 'HSV event migration prerequisite missing'; end if;
  if to_regprocedure('public.set_editor_role(uuid,uuid,boolean)') is null or to_regclass('public.editor_users') is null then raise exception 'Editor Roles prerequisite missing'; end if;
  if has_function_privilege('authenticated','public.set_editor_role(uuid,uuid,boolean)','execute') or has_function_privilege('anon','public.set_editor_role(uuid,uuid,boolean)','execute') then raise exception 'Role RPC ACL drift'; end if;
end $$;

-- No client can read this Auth coordination ledger directly. Email is never logged.
create table public.editor_add_operations (
  email text primary key check(email=lower(btrim(email)) and length(email)<=254),
  actor uuid not null,
  request_id uuid not null,
  lease uuid,
  lease_until timestamptz,
  state text not null check(state in ('sending','granting','granted','grant_failed','delivery_unknown','revoked')),
  target uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.editor_add_operations enable row level security;
revoke all on public.editor_add_operations from public,anon,authenticated,service_role;

-- Preserve the deployed revoke guards and invalidate any worker waiting on Auth.
do $$ declare original text; needle text:='if not found then raise exception ''Editor not found'' using errcode=''22023'';end if;'; begin
  original:=pg_get_functiondef('public.set_editor_role(uuid,uuid,boolean)'::regprocedure);
  if (length(original)-length(replace(original,needle,'')))/length(needle)<>1 then raise exception 'Revoke definition drift'; end if;
  execute replace(original,needle,needle || $patch$
  update public.editor_add_operations set state='revoked',lease=null,lease_until=null,updated_at=clock_timestamp()
    where email in (select lower(email) from auth.users where id=p_target);
  $patch$);
end $$;

create function public.begin_editor_add(p_actor uuid,p_email text,p_request_id uuid,p_allow_invite boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare email_value text:=lower(btrim(p_email)); target_user auth.users; op public.editor_add_operations; token uuid:=gen_random_uuid();
begin
  perform pg_advisory_xact_lock(194827,112);
  lock table public.admin_users in share mode;
  if not exists(select 1 from public.admin_users a join auth.users u on u.id=a.user_id where a.user_id=p_actor and coalesce(u.is_anonymous,false)=false and (u.banned_until is null or u.banned_until<=now())) then raise exception 'Admin required' using errcode='42501'; end if;
  if p_request_id is null or email_value is null or length(email_value)>254 or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid email/request' using errcode='22023'; end if;
  if (select count(*) from auth.users where lower(email)=email_value)>1 then return jsonb_build_object('state','ambiguous_account'); end if;
  select * into target_user from auth.users where lower(email)=email_value;
  if target_user.id is not null and (coalesce(target_user.is_anonymous,false) or target_user.banned_until>now()) then return jsonb_build_object('state','account_ineligible'); end if;
  if exists(select 1 from public.admin_users where user_id=target_user.id) then return jsonb_build_object('state','admin_protected'); end if;
  select * into op from public.editor_add_operations where email=email_value for update;
  if op.request_id=p_request_id and (op.state='revoked' or (op.state='granted' and not exists(select 1 from public.editor_users where user_id=target_user.id))) then
    return jsonb_build_object('state','role_changed');
  end if;
  if exists(select 1 from public.editor_users where user_id=target_user.id) then
    return jsonb_build_object('state','already_editor','account_status',case when target_user.email_confirmed_at is not null then 'confirmed' when target_user.invited_at is not null then 'invited' else 'unconfirmed' end);
  end if;
  if op.lease is not null and op.lease_until>now() then return jsonb_build_object('state','processing'); end if;
  if target_user.id is null and op.email is not null then
    update public.editor_add_operations set state='delivery_unknown',lease=null,lease_until=null,updated_at=clock_timestamp() where email=email_value;
    return jsonb_build_object('state','delivery_unknown');
  end if;
  if target_user.id is null and not coalesce(p_allow_invite,false) then return jsonb_build_object('state','invitation_not_ready'); end if;
  insert into public.editor_add_operations(email,actor,request_id,lease,lease_until,state,target)
    values(email_value,p_actor,p_request_id,token,now()+interval '90 seconds',case when target_user.id is null then 'sending' else 'granting' end,target_user.id)
    on conflict(email) do update set actor=excluded.actor,request_id=excluded.request_id,lease=excluded.lease,lease_until=excluded.lease_until,state=excluded.state,target=excluded.target,updated_at=clock_timestamp();
  return jsonb_build_object('state',case when target_user.id is null then 'invite' else 'grant' end,'lease',token,'target',target_user.id);
end $$;

create function public.finish_editor_add(p_actor uuid,p_email text,p_lease uuid,p_target uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare email_value text:=lower(btrim(p_email)); op public.editor_add_operations; target_user auth.users;
begin
  perform pg_advisory_xact_lock(194827,112);
  lock table public.admin_users in share mode;
  select * into op from public.editor_add_operations where email=email_value for update;
  if op.state='revoked' then return jsonb_build_object('state','role_changed'); end if;
  if op.email is null or op.lease is distinct from p_lease or op.lease is null or op.actor<>p_actor then return jsonb_build_object('state','processing'); end if;
  if p_target is null then
    update public.editor_add_operations set state='delivery_unknown',lease=null,lease_until=null,updated_at=clock_timestamp() where email=email_value;
    return jsonb_build_object('state','delivery_unknown');
  end if;
  select * into target_user from auth.users where id=p_target and lower(email)=email_value;
  if target_user.id is null or coalesce(target_user.is_anonymous,false) or target_user.banned_until>now()
     or exists(select 1 from public.admin_users where user_id=p_target)
     or not exists(select 1 from public.admin_users a join auth.users u on u.id=a.user_id where a.user_id=p_actor and coalesce(u.is_anonymous,false)=false and (u.banned_until is null or u.banned_until<=now())) then
    update public.editor_add_operations set state='grant_failed',lease=null,lease_until=null,updated_at=clock_timestamp() where email=email_value;
    return jsonb_build_object('state','grant_failed');
  end if;
  begin
    insert into public.editor_users(user_id) values(p_target) on conflict(user_id) do nothing;
    update public.editor_add_operations set state='granted',target=p_target,lease=null,lease_until=null,updated_at=clock_timestamp() where email=email_value;
  exception when others then
    update public.editor_add_operations set state='grant_failed',target=p_target,lease=null,lease_until=null,updated_at=clock_timestamp() where email=email_value;
    return jsonb_build_object('state','grant_failed');
  end;
  return jsonb_build_object('state','granted','account_status',case when target_user.email_confirmed_at is not null then 'confirmed' when target_user.invited_at is not null then 'invited' else 'unconfirmed' end);
end $$;

create function public.editor_add_recovery() returns table(email text,state text,updated_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  return query select o.email,o.state,o.updated_at from public.editor_add_operations o
    where o.state not in ('granted','revoked') and not exists(select 1 from auth.users u join public.editor_users e on e.user_id=u.id where lower(u.email)=o.email)
    order by o.updated_at desc;
end $$;
revoke all on function public.begin_editor_add(uuid,text,uuid,boolean),public.finish_editor_add(uuid,text,uuid,uuid),public.editor_add_recovery() from public,anon,authenticated;
grant execute on function public.begin_editor_add(uuid,text,uuid,boolean),public.finish_editor_add(uuid,text,uuid,uuid) to service_role;
grant execute on function public.editor_add_recovery() to authenticated;
create or replace function public.hsv_v3_capabilities() returns jsonb language sql immutable set search_path='' as $$
  select '{"version":3,"event_types":["invitation","congratulation"],"theme_version":1,"editor_add_operations":true}'::jsonb
$$;
do $$ begin
  if has_function_privilege('authenticated','public.begin_editor_add(uuid,text,uuid,boolean)','execute') or has_table_privilege('authenticated','public.editor_add_operations','select') then raise exception 'Operation ledger exposed'; end if;
end $$;
commit;
