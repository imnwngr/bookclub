-- REVIEW ONLY: do not apply to production without separate approval.
begin;
set local lock_timeout='5s';
do $$
declare f oid := to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamp with time zone)');
begin
 if f is null then raise exception 'Missing reviewed save_event signature'; end if;
 if md5(pg_get_functiondef(f)) <> '91ca923e964e16cb3e4eca606b7a1e6b' then raise exception 'Production baseline changed; review required'; end if;
 if not exists(select 1 from pg_proc where oid=f and pg_get_userbyid(proowner)='postgres' and prosecdef and proconfig @> array['search_path=""']) then raise exception 'Unexpected save_event security configuration'; end if;
 if has_function_privilege('anon',f,'execute') or not has_function_privilege('authenticated',f,'execute') then raise exception 'Unexpected save_event privileges'; end if;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name in ('quote_one','quote_two')) then raise exception 'Quote columns already exist'; end if;
 if not (select relrowsecurity from pg_class where oid='public.events'::regclass) then raise exception 'Events RLS disabled'; end if;
end $$;

create function public.valid_quote_document(p jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $q$
declare r record; n jsonb; a jsonb; m jsonb; ma jsonb; t text; seen text[]; total integer:=0;
begin
 if p is null then return true; end if;
 if jsonb_typeof(p)<>'object' or octet_length(p::text)>50000 then return false; end if;
 for r in with recursive walk(n,parent,depth,idx) as (
 select p,''::text,0,1::bigint union all
 select c.value,w.n->>'type',w.depth+1,c.ordinality from walk w cross join lateral jsonb_array_elements(case when jsonb_typeof(w.n->'content')='array' then w.n->'content' else '[]'::jsonb end) with ordinality c where w.depth<21
 ) select * from walk loop
 total:=total+1;n:=r.n;t:=n->>'type';a:=coalesce(n->'attrs','{}'::jsonb);
 if total>2000 or r.depth>20 or jsonb_typeof(n)<>'object' or t is null or n-array['type','attrs','content','marks','text']<>'{}'::jsonb or jsonb_typeof(a)<>'object' then return false; end if;
 if r.parent='' then if t<>'doc' then return false;end if;
 elsif r.parent='doc' then if t not in ('paragraph','heading','bulletList','orderedList') then return false;end if;
 elsif r.parent in ('paragraph','heading') then if t not in ('text','hardBreak') then return false;end if;
 elsif r.parent in ('bulletList','orderedList') then if t<>'listItem' then return false;end if;
 elsif r.parent='listItem' then if (r.idx=1 and t<>'paragraph') or (r.idx>1 and t not in ('paragraph','heading','bulletList','orderedList')) then return false;end if;
 else return false;end if;
 if a-(case when t='heading' then array['level','textAlign'] when t='paragraph' then array['textAlign'] when t='orderedList' then array['start','type'] else array[]::text[] end)<>'{}'::jsonb then return false;end if;
 if a ? 'textAlign' and a->'textAlign'<>'null'::jsonb and (jsonb_typeof(a->'textAlign')<>'string' or a->>'textAlign' not in ('left','center','right','justify')) then return false;end if;
 if t='heading' and (jsonb_typeof(a->'level') is distinct from 'number' or a->>'level' not in ('1','2','3','4','5','6')) then return false;end if;
 if t='orderedList' and ((a ? 'start' and (jsonb_typeof(a->'start')<>'number' or (a->>'start') !~ '^[0-9]+$' or (a->>'start')::numeric not between 1 and 10000)) or (a ? 'type' and a->'type'<>'null'::jsonb and a->'type'<>'"1"'::jsonb)) then return false;end if;
 if t='text' then if jsonb_typeof(n->'text') is distinct from 'string' or length(n->>'text') not between 1 and 10000 or n ? 'content' then return false;end if;
 elsif n ? 'text' then return false;end if;
 if n ? 'marks' then
 if t<>'text' or jsonb_typeof(n->'marks')<>'array' or jsonb_array_length(n->'marks')>6 then return false;end if;
 seen:=array[]::text[];
 for m in select value from jsonb_array_elements(n->'marks') loop
 ma:=coalesce(m->'attrs','{}'::jsonb);
 if jsonb_typeof(m)<>'object' or m-array['type','attrs']<>'{}'::jsonb or m->>'type' is null or m->>'type' not in ('bold','italic','underline','strike','highlight','textStyle') or m->>'type'=any(seen) or jsonb_typeof(ma)<>'object' then return false;end if;
 seen:=array_append(seen,m->>'type');
 if ma-(case when m->>'type'='textStyle' then array['color'] else array[]::text[] end)<>'{}'::jsonb then return false;end if;
 if ma ? 'color' and ma->'color'<>'null'::jsonb and (jsonb_typeof(ma->'color')<>'string' or lower(ma->>'color') not in ('#1c2845','#377f7c','#c78087','#000000')) then return false;end if;
 end loop;end if;
 if t in ('text','hardBreak') then if n ? 'content' then return false;end if;
 elsif n ? 'content' then if jsonb_typeof(n->'content')<>'array' or (t in ('listItem','bulletList','orderedList') and jsonb_array_length(n->'content')=0) then return false;end if;
 elsif t not in ('doc','paragraph','heading') then return false;end if;
 end loop;return true;
exception when others then return false;
end $q$;
revoke all on function public.valid_quote_document(jsonb) from public,anon;
grant execute on function public.valid_quote_document(jsonb) to authenticated;

alter table public.events add column quote_one text not null default '' check(length(quote_one)<=5000);
alter table public.events add column quote_two jsonb constraint events_quote_two_valid check(public.valid_quote_document(quote_two));
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
    insert into public.events(code,title,description,starts_at,ends_at,status,venue_name,address,directions,latitude,longitude,place_id,maps_url,location_method,venue_image_path,quote_one,quote_two)
    values(v.code,v.title,coalesce(v.description,''),v.starts_at,v.ends_at,v.status,coalesce(v.venue_name,''),coalesce(v.address,''),coalesce(v.directions,''),v.latitude,v.longitude,coalesce(v.place_id,''),coalesce(v.maps_url,''),coalesce(v.location_method,'url'),v.venue_image_path,coalesce(v.quote_one,''),v.quote_two) returning * into v;
  else
    update public.events set quote_one=case when p_event ? 'quote_one' then coalesce(v.quote_one,'') else old_event.quote_one end, quote_two=case when p_event ? 'quote_two' then v.quote_two else old_event.quote_two end, code=v.code,location_method=v.location_method,venue_image_path=v.venue_image_path,title=v.title,description=coalesce(v.description,''),starts_at=v.starts_at,ends_at=v.ends_at,status=v.status,venue_name=coalesce(v.venue_name,''),address=coalesce(v.address,''),directions=coalesce(v.directions,''),latitude=v.latitude,longitude=v.longitude,place_id=coalesce(v.place_id,''),maps_url=coalesce(v.maps_url,'') where id=p_id returning * into v;
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
revoke execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) from public,anon;
grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to authenticated;
commit;
