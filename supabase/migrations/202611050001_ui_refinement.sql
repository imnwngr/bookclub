-- REVIEW ONLY. Additive UI refinement; never run REBUILD.sql for this change.
begin;
set local lock_timeout = '5s';
-- Fail closed if the reviewed production preflight has drifted. All writes are in this transaction.
lock table public.events,public.guests,public.event_guests,public.invitation_aliases,public.event_agenda_items in share row exclusive mode;
do $$
declare old_description constant text := 'Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra - Pháp chế - Truyền thông.';
 new_description constant text := 'Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra – Pháp chế và Triển khai Chiến lược và Truyền thông';
 changed integer;
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='event_agenda_items' and column_name in ('end_time','icon')) then raise exception 'Migration already applied or schema drift'; end if;
 if (select count(*) from public.event_agenda_items)<>2 then raise exception 'Agenda count differs from reviewed preflight'; end if;
 if exists(select 1 from public.invitation_aliases a join public.event_guests eg on eg.id=a.event_guest_id where a.alias<>eg.primary_alias) then raise exception 'Secondary aliases appeared; review before proceeding'; end if;
 if exists(select 1 from public.event_guests eg join public.guests g on g.id=eg.guest_id where eg.primary_alias is distinct from g.primary_alias) then raise exception 'Invitation primary alias differs from directory; review before proceeding'; end if;
 if (select count(*) from public.event_guests eg join public.events e on e.id=eg.event_id where eg.guest_id='10000000-0000-4000-8000-000000000001' and e.status='draft')<>1
 or exists(select 1 from public.event_guests eg join public.events e on e.id=eg.event_id where eg.guest_id='10000000-0000-4000-8000-000000000001' and e.status='draft' and eg.description is distinct from old_description) then raise exception 'Draft invitation snapshot differs from reviewed preflight'; end if;
 update public.guests set description=new_description where id='10000000-0000-4000-8000-000000000001' and name='Nguyễn Hoàng Viện' and description=old_description;
 get diagnostics changed = row_count; if changed<>1 then raise exception 'Directory description differs from reviewed preflight'; end if;
 update public.event_guests eg set description=new_description from public.events e where e.id=eg.event_id and e.status='draft' and eg.guest_id='10000000-0000-4000-8000-000000000001' and eg.description=old_description;
 get diagnostics changed = row_count; if changed<>1 then raise exception 'Expected one matching draft snapshot'; end if;
end $$;
alter table public.event_agenda_items add column end_time text;
alter table public.event_agenda_items add column icon text not null default 'book';
alter table public.event_agenda_items add constraint agenda_end_time_valid check(end_time is null or (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and end_time>time));
alter table public.event_agenda_items add constraint agenda_icon_valid check(icon in ('welcome','speech','book','chat','music','gift','summary','camera','finish'));
-- Legacy rows retain time and a NULL end_time. Do not invent an end time.
create or replace function public.save_event(p_event jsonb, p_guest_ids uuid[], p_id uuid default null, p_expected_updated_at timestamptz default null)
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
    eg_id := gen_random_uuid(); first_alias:=g.primary_alias;
    if exists(select 1 from public.invitation_aliases where event_id=v.id and alias=first_alias) then raise exception 'Primary alias conflict: review existing invitation aliases' using errcode='23505'; end if;
    insert into public.event_guests(id,event_id,guest_id,salutation,name,description,kind,primary_alias) values(eg_id,v.id,g.id,g.salutation,g.name,g.description,g.kind,first_alias);
    insert into public.invitation_aliases(event_id,event_guest_id,alias) values(v.id,eg_id,first_alias);

  end loop;
  n:=0;
 if p_event ? 'agenda' then
   if jsonb_typeof(p_event->'agenda')<>'array' or jsonb_array_length(p_event->'agenda')>100 then raise exception 'Invalid agenda'; end if;
   -- Only unchanged legacy milestones may retain a missing end time.
   for item in select value from jsonb_array_elements(p_event->'agenda') loop
    if item->>'end_time' is null and not exists(select 1 from public.event_agenda_items old_item where old_item.event_id=v.id and old_item.end_time is null and old_item.time=item->>'time' and old_item.description=item->>'description') then
     raise exception 'End time required for new or edited milestone' using errcode='23514';
    end if;
   end loop;
   delete from public.event_agenda_items where event_id=v.id;
   for item in select value from jsonb_array_elements(p_event->'agenda') loop
     insert into public.event_agenda_items(event_id,time,end_time,icon,description,highlight,sort_order) values(v.id,item->>'time',item->>'end_time',coalesce(item->>'icon','book'),item->>'description',coalesce((item->>'highlight')::boolean,false),n); n:=n+1;
   end loop;
 end if;
 if p_event ? 'invitation_edits' and p_event->'invitation_edits'<>'[]'::jsonb then raise exception 'Secondary alias editing is disabled' using errcode='42501'; end if;
  return public.event_payload_v110(v);
end;
$$;
revoke execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) from public, anon;
grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to authenticated;

revoke insert,update,delete on public.invitation_aliases from authenticated;
create function public.primary_invitation_alias_only() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.event_guests eg where eg.id=new.event_guest_id and eg.event_id=new.event_id and eg.primary_alias=new.alias) then raise exception 'Only primary invitation alias is allowed' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function public.primary_invitation_alias_only() from public,anon,authenticated;
create trigger primary_invitation_alias_only before insert or update on public.invitation_aliases for each row execute function public.primary_invitation_alias_only();
-- Existing aliases are not deleted. Resolver accepts only the snapshot primary alias.
create or replace function public.resolve_invitation(p_code text,p_alias text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('event',public.event_payload_v110(e),'invitation',jsonb_build_object('salutation',eg.salutation,'name',eg.name,'description',eg.description,'kind',eg.kind))
 from public.events e join public.invitation_aliases a on a.event_id=e.id join public.event_guests eg on eg.id=a.event_guest_id
 where e.code=p_code and a.alias=p_alias and a.alias=eg.primary_alias and (e.status='published' or public.is_admin()) limit 1;
$$;
revoke execute on function public.resolve_invitation(text,text) from public;
grant execute on function public.resolve_invitation(text,text) to anon,authenticated;
do $$ begin
 if has_table_privilege('authenticated','public.invitation_aliases','insert') or has_table_privilege('authenticated','public.invitation_aliases','update') or has_table_privilege('authenticated','public.invitation_aliases','delete') then raise exception 'Unexpected inherited alias write privileges'; end if;
 if has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') or not has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') or not has_function_privilege('anon','public.resolve_invitation(text,text)','execute') then raise exception 'Unexpected RPC privileges'; end if;
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('events','guests','event_guests','invitation_aliases','event_agenda_items','admin_users','venue_image_uploads') and c.relrowsecurity)<>7 then raise exception 'Expected seven RLS-enabled tables'; end if;
end $$;
commit;
