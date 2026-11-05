-- REVIEW ONLY: do not apply to production without separate approval.
begin;
create function public.slug_v110(value text) returns text language sql immutable set search_path='' as $$
 select trim(both '-' from regexp_replace(lower(replace(replace(regexp_replace(normalize(value,NFD),'[̀-ͯ]','','g'),'đ','d'),'Đ','D')),'[^a-z0-9]+','-','g'));
$$;
create function public.guest_slug_v110(value text) returns text language sql immutable set search_path='' as $$
 select trim(both '-' from left(public.slug_v110(regexp_replace(value,'^((thầy|cô|anh|chị|thạc sĩ|ths\.?|ks\.?|đ/c)[[:space:]]+)+','','i')),80));
$$;
alter table public.guests add column primary_alias text;
alter table public.guests add column legacy_default_aliases text[];
do $$ begin
 if exists(select public.guest_slug_v110(name) from public.guests group by public.guest_slug_v110(name) having count(*)>1)
 or exists(select 1 from public.guests where length(public.guest_slug_v110(name)) not between 1 and 80)
 then raise exception 'Guest canonical alias conflict: review names before migration'; end if;
end $$;
update public.guests set legacy_default_aliases=default_aliases,primary_alias=public.guest_slug_v110(name);
alter table public.guests alter column primary_alias set not null;
alter table public.guests add constraint guests_primary_alias_unique unique(primary_alias);
alter table public.guests add constraint guests_primary_alias_valid check(length(primary_alias) between 1 and 80 and primary_alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
update public.guests set default_aliases=array[primary_alias];
create function public.guest_alias_v110() returns trigger language plpgsql set search_path='' as $$
begin
 -- v1.0 sends default_aliases; preserve explicitly edited values during the rollout window.
 if TG_OP='UPDATE' and new.primary_alias is not distinct from old.primary_alias and new.default_aliases is distinct from old.default_aliases then
  new.primary_alias:=coalesce(nullif(new.default_aliases[1],''),public.guest_slug_v110(new.name));
 end if;
 if TG_OP='INSERT' then new.primary_alias:=coalesce(nullif(new.primary_alias,''),nullif(new.default_aliases[1],''),public.guest_slug_v110(new.name)); end if;
 new.primary_alias:=coalesce(nullif(new.primary_alias,''),public.guest_slug_v110(new.name));
 if cardinality(new.default_aliases)>1 then
  new.legacy_default_aliases:=array(select distinct a from unnest(coalesce(new.legacy_default_aliases,'{}')||new.default_aliases) a order by a);
 end if;
 new.default_aliases:=array[new.primary_alias]; return new;
end $$;
create trigger guest_alias_v110 before insert or update on public.guests for each row execute function public.guest_alias_v110();
revoke all on function public.guest_alias_v110() from public,anon,authenticated;

create table public.event_codes (
 code text primary key, event_id uuid not null references public.events(id) on delete cascade,
 created_at timestamptz not null default now(),
 check(length(code) between 1 and 80 and code ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
insert into public.event_codes(code,event_id) select code,id from public.events;
create index event_codes_event on public.event_codes(event_id);
alter table public.event_codes enable row level security;
revoke all on public.event_codes from anon,authenticated;
create or replace function public.protect_event_code() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(110110);
 if exists(select 1 from public.event_codes c where c.code=new.code and c.event_id<>new.id) then raise exception 'Event code already reserved' using errcode='23505'; end if;
 return new;
end $$;
create trigger reserve_event_code_v110 before insert on public.events for each row execute function public.protect_event_code();
create function public.remember_event_code_v110() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 insert into public.event_codes(code,event_id) values(new.code,new.id) on conflict(code) do nothing; return new; end $$;
create trigger remember_event_code_v110 after insert or update of code on public.events for each row execute function public.remember_event_code_v110();
revoke all on function public.protect_event_code() from public,anon,authenticated;
revoke all on function public.remember_event_code_v110() from public,anon,authenticated;

alter table public.events add column location_method text not null default 'legacy' check(location_method in ('legacy','url','place'));
alter table public.events add column venue_image_path text;
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
 select public.event_payload_v110(e) from public.events e join public.event_codes c on c.event_id=e.id where c.code=p_code and (e.status='published' or public.is_admin());
$$;
revoke all on function public.get_event_v110(text) from public;
grant execute on function public.get_event_v110(text) to anon,authenticated;
create or replace function public.resolve_invitation(p_code text,p_alias text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('event',public.event_payload_v110(e),'invitation',jsonb_build_object('salutation',eg.salutation,'name',eg.name,'description',eg.description,'kind',eg.kind))
 from public.event_codes c join public.events e on e.id=c.event_id join public.invitation_aliases a on a.event_id=e.id join public.event_guests eg on eg.id=a.event_guest_id
 where c.code=p_code and a.alias=p_alias and(e.status='published' or public.is_admin()) limit 1;
$$;
alter function public.save_event(jsonb,uuid[],uuid,timestamptz) rename to save_event_v100;
revoke all on function public.save_event_v100(jsonb,uuid[],uuid,timestamptz) from public,anon,authenticated;
create function public.save_event(p_event jsonb,p_guest_ids uuid[],p_id uuid default null,p_expected_updated_at timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; old_code text; desired text; item jsonb; n integer:=0; edit jsonb; target uuid; alias_value text;
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 desired:=p_event->>'code';
 if p_id is null and coalesce(desired,'')='' then desired:=trim(both '-' from left(public.slug_v110(p_event->>'title'),80)); end if;
 if p_id is not null then select code into old_code from public.events where id=p_id for update; end if;
 saved:=public.save_event_v100(p_event||jsonb_build_object('code',coalesce(old_code,desired)),p_guest_ids,p_id,p_expected_updated_at);
 if p_event ? 'location_method' and p_event->>'location_method'='url' and coalesce(p_event->>'maps_url','')='' then raise exception 'Google Maps URL required' using errcode='23514'; end if;
 if p_event ? 'location_method' and p_event->>'location_method'='place' and coalesce(p_event->>'place_id','') !~ '^[A-Za-z0-9_-]{5,255}$' then raise exception 'Google Place ID required' using errcode='23514'; end if;
 update public.events set code=desired,location_method=coalesce(p_event->>'location_method',location_method),venue_image_path=case when p_event ? 'venue_image_path' then p_event->>'venue_image_path' else venue_image_path end where id=(saved->>'id')::uuid;
 if p_event ? 'agenda' then
   if jsonb_typeof(p_event->'agenda')<>'array' or jsonb_array_length(p_event->'agenda')>100 then raise exception 'Invalid agenda'; end if;
   delete from public.event_agenda_items where event_id=(saved->>'id')::uuid;
   for item in select value from jsonb_array_elements(p_event->'agenda') loop
     insert into public.event_agenda_items(event_id,time,description,highlight,sort_order) values((saved->>'id')::uuid,item->>'time',item->>'description',coalesce((item->>'highlight')::boolean,false),n); n:=n+1;
   end loop;
 end if;
 if p_event ? 'invitation_edits' then
  for edit in select value from jsonb_array_elements(p_event->'invitation_edits') loop
   target:=(edit->>'id')::uuid;
   if not exists(select 1 from public.event_guests eg where eg.id=target and eg.event_id=(saved->>'id')::uuid) then continue; end if;
   if not exists(select 1 from public.event_guests eg where eg.id=target and (edit->'aliases') ? eg.primary_alias) then raise exception 'Primary alias must remain' using errcode='23514'; end if;
   delete from public.invitation_aliases a where a.event_guest_id=target and not ((edit->'aliases') ? a.alias);
   for alias_value in select jsonb_array_elements_text(edit->'aliases') loop
    insert into public.invitation_aliases(event_id,event_guest_id,alias) values((saved->>'id')::uuid,target,alias_value) on conflict(event_guest_id,alias) do nothing;
   end loop;
  end loop;
 end if;
 return(select public.event_payload_v110(e) from public.events e where id=(saved->>'id')::uuid);
end $$;
revoke all on function public.save_event(jsonb,uuid[],uuid,timestamptz) from public;
grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to authenticated;
commit;
