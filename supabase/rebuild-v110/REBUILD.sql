-- TARGET PROJECT: trdofhdspbkwgernwybp ONLY. Verify Dashboard URL before Run.
-- DESTRUCTIVE BookClub reset; keeps Auth/system objects. Execute ENTIRE file once.
-- On any error: transaction aborts; issue ROLLBACK before retry. Not idempotent.
begin;
set local lock_timeout='5s';
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

-- Standalone v1.1 schema; requires reviewed scoped reset.

create function public.slug_v110(value text) returns text language sql immutable set search_path='' as $$
 select trim(both '-' from regexp_replace(lower(replace(replace(regexp_replace(normalize(value,NFD),'[̀-ͯ]','','g'),'đ','d'),'Đ','D')),'[^a-z0-9]+','-','g'));
$$;
create function public.guest_slug_v110(value text) returns text language sql immutable set search_path='' as $$
 select trim(both '-' from left(public.slug_v110(regexp_replace(value,'^((thầy|cô|anh|chị|thạc sĩ|ths\.?|ks\.?|đ/c)[[:space:]]+)+','','i')),80));
$$;


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
  location_method text not null default 'url' check(location_method in ('url','place')), venue_image_path text,
  check((location_method='url' and maps_url<>'') or (location_method='place' and place_id ~ '^[A-Za-z0-9_-]{5,255}$')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (maps_url = '' or maps_url ~ '^https://([a-zA-Z0-9-]+\.)*(google\.com|maps\.app\.goo\.gl|goo\.gl)(/|$)')
);
create index events_public_time on public.events(starts_at, ends_at) where status = 'published';
create table public.guests (
  id uuid primary key default gen_random_uuid(), salutation text not null default '' check(length(salutation) <= 80),
  name text not null check(length(btrim(name)) between 1 and 240), description text not null default '' check(length(description) <= 3000),
  kind text not null default 'individual' check(kind in ('individual','group')), active boolean not null default true,
  primary_alias text not null unique check(length(primary_alias) between 1 and 80 and primary_alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
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

create function public.guest_alias_v110() returns trigger language plpgsql set search_path='' as $$
begin new.primary_alias:=coalesce(nullif(new.primary_alias,''),public.guest_slug_v110(new.name)); return new; end $$;
create trigger guest_alias_v110 before insert or update on public.guests for each row execute function public.guest_alias_v110();
revoke all on function public.guest_alias_v110() from public,anon,authenticated;
create table public.event_agenda_items (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 time text not null check(time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 description text not null check(length(btrim(description)) between 1 and 1000),
 highlight boolean not null default false, sort_order integer not null check(sort_order>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(event_id,sort_order)
);
create index event_agenda_event on public.event_agenda_items(event_id);
create trigger touch_updated_at before update on public.event_agenda_items for each row execute function public.touch_updated_at();
alter table public.event_agenda_items enable row level security;
revoke all on public.event_agenda_items from anon,authenticated;
grant select on public.event_agenda_items to anon,authenticated;
grant insert,update,delete on public.event_agenda_items to authenticated;
create policy agenda_read on public.event_agenda_items for select to anon,authenticated using(public.is_admin() or exists(select 1 from public.events e where e.id=event_id and e.status='published'));
create policy agenda_admin on public.event_agenda_items for all to authenticated using(public.is_admin()) with check(public.is_admin());

create function public.event_payload_v110(e public.events) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(e)||jsonb_build_object('agenda',coalesce((select jsonb_agg(to_jsonb(a) order by a.time,a.sort_order) from public.event_agenda_items a where a.event_id=e.id),'[]'::jsonb));
$$;
revoke all on function public.event_payload_v110(public.events) from public,anon,authenticated;
create function public.get_event_v110(p_code text) returns jsonb language sql stable security definer set search_path='' as $$
 select public.event_payload_v110(e) from public.events e where e.code=p_code and (e.status='published' or public.is_admin());
$$;
revoke all on function public.get_event_v110(text) from public;
grant execute on function public.get_event_v110(text) to anon,authenticated;
create function public.resolve_invitation(p_code text,p_alias text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('event',public.event_payload_v110(e),'invitation',jsonb_build_object('salutation',eg.salutation,'name',eg.name,'description',eg.description,'kind',eg.kind))
 from public.events e join public.invitation_aliases a on a.event_id=e.id join public.event_guests eg on eg.id=a.event_guest_id
 where e.code=p_code and a.alias=p_alias and(e.status='published' or public.is_admin()) limit 1;
$$;

revoke all on function public.resolve_invitation(text,text) from public;
grant execute on function public.resolve_invitation(text,text) to anon,authenticated;
create function public.save_event(p_event jsonb, p_guest_ids uuid[], p_id uuid default null, p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.events; old_event public.events; g public.guests; eg_id uuid; base_alias text; candidate text; n integer; first_alias text; item jsonb; edit jsonb; target uuid; alias_value text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_guest_ids is null then raise exception 'Guest IDs required'; end if;
  if cardinality(p_guest_ids) <> (select count(distinct x) from unnest(p_guest_ids) x) then raise exception 'Duplicate guest'; end if;
  if exists(select 1 from unnest(p_guest_ids) x where not exists(select 1 from public.guests directory where directory.id=x)) then raise exception 'Unknown guest'; end if;
  if p_id is not null then
    select * into old_event from public.events where id=p_id for update;
    if not found then raise exception 'Event not found'; end if;
    if p_expected_updated_at is distinct from old_event.updated_at then raise exception 'Concurrent update' using errcode='40001'; end if;

  end if;
  if exists(select 1 from public.guests directory where directory.id=any(p_guest_ids) and not directory.active and not exists(select 1 from public.event_guests eg where eg.event_id=p_id and eg.guest_id=directory.id)) then raise exception 'Inactive guest'; end if;
  if p_id is null and coalesce(p_event->>'code','')='' then p_event:=p_event||jsonb_build_object('code',trim(both '-' from left(public.slug_v110(p_event->>'title'),80))); end if;
  v := jsonb_populate_record(null::public.events,p_event);
  if p_id is null then
    insert into public.events(code,title,description,starts_at,ends_at,status,venue_name,address,directions,latitude,longitude,place_id,maps_url,location_method,venue_image_path)
    values(v.code,v.title,coalesce(v.description,''),v.starts_at,v.ends_at,v.status,coalesce(v.venue_name,''),coalesce(v.address,''),coalesce(v.directions,''),v.latitude,v.longitude,coalesce(v.place_id,''),coalesce(v.maps_url,''),coalesce(v.location_method,'url'),v.venue_image_path) returning * into v;
  else
    update public.events set code=v.code,location_method=v.location_method,venue_image_path=v.venue_image_path,title=v.title,description=coalesce(v.description,''),starts_at=v.starts_at,ends_at=v.ends_at,status=v.status,venue_name=coalesce(v.venue_name,''),address=coalesce(v.address,''),directions=coalesce(v.directions,''),latitude=v.latitude,longitude=v.longitude,place_id=coalesce(v.place_id,''),maps_url=coalesce(v.maps_url,'') where id=p_id returning * into v;
  end if;
  delete from public.event_guests where event_id=v.id and not(guest_id=any(p_guest_ids));
  for g in select * from public.guests where id=any(p_guest_ids) order by id loop
    if exists(select 1 from public.event_guests where event_id=v.id and guest_id=g.id) then continue; end if;
    eg_id := gen_random_uuid(); base_alias:=g.primary_alias; candidate:=base_alias; n:=2;
    while exists(select 1 from public.invitation_aliases where event_id=v.id and alias=candidate) loop
      candidate:=trim(both '-' from left(base_alias,80-length(n::text)-1))||'-'||n; n:=n+1;
    end loop;
    first_alias:=candidate;
    insert into public.event_guests(id,event_id,guest_id,salutation,name,description,kind,primary_alias) values(eg_id,v.id,g.id,g.salutation,g.name,g.description,g.kind,first_alias);
    insert into public.invitation_aliases(event_id,event_guest_id,alias) values(v.id,eg_id,first_alias);

  end loop;
  n:=0;
 if p_event ? 'agenda' then
   if jsonb_typeof(p_event->'agenda')<>'array' or jsonb_array_length(p_event->'agenda')>100 then raise exception 'Invalid agenda'; end if;
   delete from public.event_agenda_items where event_id=v.id;
   for item in select value from jsonb_array_elements(p_event->'agenda') loop
     insert into public.event_agenda_items(event_id,time,description,highlight,sort_order) values(v.id,item->>'time',item->>'description',coalesce((item->>'highlight')::boolean,false),n); n:=n+1;
   end loop;
 end if;
 if p_event ? 'invitation_edits' then
  for edit in select value from jsonb_array_elements(p_event->'invitation_edits') loop
   target:=(edit->>'id')::uuid;
   if not exists(select 1 from public.event_guests eg where eg.id=target and eg.event_id=v.id) then continue; end if;
   if not exists(select 1 from public.event_guests eg where eg.id=target and (edit->'aliases') ? eg.primary_alias) then raise exception 'Primary alias must remain' using errcode='23514'; end if;
   delete from public.invitation_aliases a where a.event_guest_id=target and not ((edit->'aliases') ? a.alias);
   for alias_value in select jsonb_array_elements_text(edit->'aliases') loop
    insert into public.invitation_aliases(event_id,event_guest_id,alias) values(v.id,target,alias_value) on conflict(event_guest_id,alias) do nothing;
   end loop;
  end loop;
 end if;
  return public.event_payload_v110(v);
end;
$$;
revoke execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) from public, anon;
grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to authenticated;
create table public.venue_image_uploads (
 path text primary key, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$')
);
alter table public.venue_image_uploads enable row level security;
revoke all on public.venue_image_uploads from anon,authenticated;
grant select,insert,delete on public.venue_image_uploads to authenticated;
create policy image_registry_admin on public.venue_image_uploads for all to authenticated using(public.is_admin()) with check(public.is_admin() and created_by=auth.uid());
alter table public.events add constraint event_image_registered foreign key(venue_image_path) references public.venue_image_uploads(path) on delete restrict;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bookclub-venues','bookclub-venues',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy bookclub_venue_read on storage.objects for select to anon,authenticated using(bucket_id='bookclub-venues' and (public.is_admin() or exists(select 1 from public.events e where e.venue_image_path=name and e.status='published')));
create policy bookclub_venue_insert on storage.objects for insert to authenticated with check(bucket_id='bookclub-venues' and public.is_admin() and exists(select 1 from public.venue_image_uploads r where r.path=name and r.created_by=auth.uid()));
create policy bookclub_venue_delete on storage.objects for delete to authenticated using(bucket_id='bookclub-venues' and public.is_admin() and not exists(select 1 from public.events e where e.venue_image_path=name));
-- No object UPDATE policy: replacing always uses a new immutable path.
create function public.unused_venue_images() returns setof public.venue_image_uploads language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
return query select r.* from public.venue_image_uploads r where r.created_by=auth.uid() and not exists(select 1 from public.events e where e.venue_image_path=r.path);
end $$;
revoke all on function public.unused_venue_images() from public;
grant execute on function public.unused_venue_images() to authenticated;

revoke all on function public.touch_updated_at() from public,anon,authenticated;

-- Canonical directory: one alias per guest.
insert into public.guests(id,salutation,name,description,kind,primary_alias) values
('10000000-0000-4000-8000-000000000001','Thầy ThS.','Nguyễn Hoàng Viện','Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.','individual',public.guest_slug_v110('Nguyễn Hoàng Viện')),
('10000000-0000-4000-8000-000000000002','Thầy ThS.','Nguyễn Phúc Huy','Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Phó Bí thư Đoàn Trường, Chủ tịch Hội Sinh viên Trường.','individual',public.guest_slug_v110('Nguyễn Phúc Huy')),
('10000000-0000-4000-8000-000000000003','Cô ThS.','Châu Miêu Thanh','Phó Chủ tịch Hội Sinh viên Trường.','individual',public.guest_slug_v110('Châu Miêu Thanh')),
('10000000-0000-4000-8000-000000000004','Anh Ks.','Huỳnh Nhật Đấu','Cố vấn công tác Hội và phong trào Sinh viên Trường.','individual',public.guest_slug_v110('Huỳnh Nhật Đấu')),
('10000000-0000-4000-8000-000000000005','Đ/c','Nguyễn Hoàng Kha','Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Ủy viên Ban Chủ nhiệm Câu lạc bộ Sinh viên 5 tốt thành phố Cần Thơ.','individual',public.guest_slug_v110('Nguyễn Hoàng Kha')),
('10000000-0000-4000-8000-000000000006','Đ/c','Nguyễn Quang Vinh','Chánh Văn phòng Hội Sinh viên Trường.','individual',public.guest_slug_v110('Nguyễn Quang Vinh')),
('10000000-0000-4000-8000-000000000007','Đ/c','Đỗ Trung Hậu','Phó chánh văn phòng, Trưởng ban In ấn.','individual',public.guest_slug_v110('Đỗ Trung Hậu')),
('10000000-0000-4000-8000-000000000008','Đ/c','Huỳnh Thiện Phúc','Phó Chánh Văn phòng, Trưởng ban Truyền Thông.','individual',public.guest_slug_v110('Huỳnh Thiện Phúc')),
('10000000-0000-4000-8000-000000000009','Đ/c','Ngô Công Minh','Phó chánh Văn phòng, Trưởng ban Tổ chức sự kiện.','individual',public.guest_slug_v110('Ngô Công Minh')),
('10000000-0000-4000-8000-000000000010','','Thành viên CLB Sách CTUT','Toàn thể Thành viên & Cộng tác viên, Tân thành viên khóa mới, CLB Sinh viên Yêu thích Sách Trường ĐH Kỹ thuật - Công nghệ Cần Thơ.','group',public.guest_slug_v110('Thành viên CLB Sách CTUT'))
on conflict(id) do nothing;

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

commit;
