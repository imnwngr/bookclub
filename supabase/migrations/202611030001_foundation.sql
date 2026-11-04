begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(code) between 1 and 80 and code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and code not in ('admin','auth','assets','404','index','login','new','edit')),
  title text not null check (length(btrim(title)) between 1 and 240), description text not null default '' check(length(description) <= 10000),
  starts_at timestamptz not null, ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'draft' check(status in ('draft','published')),
  venue_name text not null default '' check(length(venue_name) <= 240), address text not null default '' check(length(address) <= 1000), directions text not null default '' check(length(directions) <= 3000),
  latitude double precision check(latitude between -90 and 90), longitude double precision check(longitude between -180 and 180),
  place_id text not null default '', maps_url text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (maps_url = '' or maps_url ~ '^https://([a-zA-Z0-9-]+\.)*(google\.com|maps\.app\.goo\.gl|goo\.gl)(/|$)')
);
create index events_public_time on public.events(starts_at, ends_at) where status = 'published';
create table public.guests (
  id uuid primary key default gen_random_uuid(), salutation text not null default '' check(length(salutation) <= 80),
  name text not null check(length(btrim(name)) between 1 and 240), description text not null default '' check(length(description) <= 3000),
  kind text not null default 'individual' check(kind in ('individual','group')), active boolean not null default true,
  default_aliases text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.event_guests (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete restrict,
  salutation text not null, name text not null, description text not null, kind text not null check(kind in ('individual','group')),
  primary_alias text not null check(length(primary_alias) between 1 and 80 and primary_alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(event_id, guest_id), unique(id, event_id)
);
create index event_guests_guest on public.event_guests(guest_id);
create table public.invitation_aliases (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, event_guest_id uuid not null,
  alias text not null check(length(alias) between 1 and 80 and alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(event_guest_id,event_id) references public.event_guests(id,event_id) on delete cascade,
  unique(event_id, alias), unique(event_guest_id, alias)
);
create index invitation_aliases_invitation on public.invitation_aliases(event_guest_id);
alter table public.event_guests add constraint primary_alias_exists foreign key(id, primary_alias)
  references public.invitation_aliases(event_guest_id, alias) deferrable initially deferred;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end;
$$;
create function public.protect_event_code() returns trigger language plpgsql set search_path = '' as $$
begin if new.code <> old.code then raise exception 'Mã sự kiện không được thay đổi sau khi tạo.' using errcode = '23514'; end if; return new; end;
$$;
create trigger immutable_event_code before update on public.events for each row execute function public.protect_event_code();
do $$ declare t text; begin foreach t in array array['events','guests','event_guests','invitation_aliases','admin_users'] loop
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
end loop; end $$;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.guests, public.event_guests, public.invitation_aliases to authenticated;
grant select on public.admin_users to authenticated;
create policy published_events on public.events for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
create policy admin_events_write on public.events for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_guests on public.guests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_invitations on public.event_guests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_aliases on public.invitation_aliases for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy admin_membership_read on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

create function public.resolve_invitation(p_code text, p_alias text) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('event',to_jsonb(e),'invitation',jsonb_build_object('salutation',eg.salutation,'name',eg.name,'description',eg.description,'kind',eg.kind))
  from public.events e join public.invitation_aliases a on a.event_id=e.id join public.event_guests eg on eg.id=a.event_guest_id
  where e.code=p_code and a.alias=p_alias and (e.status='published' or public.is_admin()) limit 1;
$$;
revoke all on function public.resolve_invitation(text,text) from public;
grant execute on function public.resolve_invitation(text,text) to anon,authenticated;

create function public.save_event(p_event jsonb, p_guest_ids uuid[], p_id uuid default null, p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.events; old_event public.events; g public.guests; eg_id uuid; base_alias text; candidate text; n integer; a text; first_alias text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_guest_ids is null then raise exception 'Guest IDs required'; end if;
  if cardinality(p_guest_ids) <> (select count(distinct x) from unnest(p_guest_ids) x) then raise exception 'Duplicate guest'; end if;
  if exists(select 1 from unnest(p_guest_ids) x where not exists(select 1 from public.guests directory where directory.id=x)) then raise exception 'Unknown guest'; end if;
  if p_id is not null then
    select * into old_event from public.events where id=p_id for update;
    if not found then raise exception 'Event not found'; end if;
    if p_expected_updated_at is distinct from old_event.updated_at then raise exception 'Concurrent update' using errcode='40001'; end if;
    if p_event->>'code' is distinct from old_event.code then raise exception 'Event code immutable' using errcode='23514'; end if;
  end if;
  if exists(select 1 from public.guests directory where directory.id=any(p_guest_ids) and not directory.active and not exists(select 1 from public.event_guests eg where eg.event_id=p_id and eg.guest_id=directory.id)) then raise exception 'Inactive guest'; end if;
  v := jsonb_populate_record(null::public.events,p_event);
  if p_id is null then
    insert into public.events(code,title,description,starts_at,ends_at,status,venue_name,address,directions,latitude,longitude,place_id,maps_url)
    values(v.code,v.title,coalesce(v.description,''),v.starts_at,v.ends_at,v.status,coalesce(v.venue_name,''),coalesce(v.address,''),coalesce(v.directions,''),v.latitude,v.longitude,coalesce(v.place_id,''),coalesce(v.maps_url,'')) returning * into v;
  else
    update public.events set title=v.title,description=v.description,starts_at=v.starts_at,ends_at=v.ends_at,status=v.status,venue_name=v.venue_name,address=v.address,directions=v.directions,latitude=v.latitude,longitude=v.longitude,place_id=v.place_id,maps_url=v.maps_url where id=p_id returning * into v;
  end if;
  delete from public.event_guests where event_id=v.id and not(guest_id=any(p_guest_ids));
  for g in select * from public.guests where id=any(p_guest_ids) order by id loop
    if exists(select 1 from public.event_guests where event_id=v.id and guest_id=g.id) then continue; end if;
    eg_id := gen_random_uuid(); first_alias := null;
    foreach a in array g.default_aliases loop
      if a !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(a)>80 then raise exception 'Invalid default alias'; end if;
      if not exists(select 1 from public.invitation_aliases where event_id=v.id and alias=a) then first_alias:=a; exit; end if;
    end loop;
    if first_alias is null then
      base_alias := 'khach-' || replace(g.id::text,'-',''); candidate:=base_alias; n:=2;
      while exists(select 1 from public.invitation_aliases where event_id=v.id and alias=candidate) loop candidate:=base_alias || '-' || n; n:=n+1; end loop;
      first_alias:=candidate;
    end if;
    insert into public.event_guests(id,event_id,guest_id,salutation,name,description,kind,primary_alias) values(eg_id,v.id,g.id,g.salutation,g.name,g.description,g.kind,first_alias);
    insert into public.invitation_aliases(event_id,event_guest_id,alias) values(v.id,eg_id,first_alias);
    foreach a in array g.default_aliases loop
      if not exists(select 1 from public.invitation_aliases where event_id=v.id and alias=a) then insert into public.invitation_aliases(event_id,event_guest_id,alias) values(v.id,eg_id,a); end if;
    end loop;
  end loop;
  return to_jsonb(v);
end;
$$;
revoke all on function public.save_event(jsonb,uuid[],uuid,timestamptz) from public;
grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to authenticated;

commit;
