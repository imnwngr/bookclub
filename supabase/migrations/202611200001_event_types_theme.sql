-- Forward-only: no data rewrite, recipient refresh or storage rename.
begin;
set local lock_timeout = '5s';
lock table public.events in share row exclusive mode;
do $preflight$
declare f oid := to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)'); body text;
begin
  if f is null or to_regprocedure('public.can_edit_content()') is null then raise exception 'Content RPC prerequisites missing'; end if;
  select pg_get_functiondef(f) into body;
  if not exists(select 1 from pg_proc where oid=f and prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig @> array['search_path=""'])
     or has_function_privilege('anon',f,'execute') or not has_function_privilege('authenticated',f,'execute') then raise exception 'Unexpected save_event security'; end if;
  if position('if not public.can_edit_content()' in body)=0 or position('p_expected_updated_at is distinct from old_event.updated_at' in body)=0
     or position('music_path=case when' in body)=0 then raise exception 'Unexpected save_event baseline; audit deployed definition'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name in ('event_type','theme')) then raise exception 'Already applied or partial schema; do not replay'; end if;
  if exists(select 1 from public.events where code in ('thiep-moi','thiep-chuc')) then raise exception 'Reserved route collides with existing code; preserve data and review'; end if;
  if not (select relrowsecurity from pg_class where oid='public.events'::regclass) then raise exception 'Events RLS must be enabled'; end if;
end $preflight$;

create function public.valid_event_theme(value jsonb) returns boolean language sql immutable set search_path='' as $$
  select coalesce(jsonb_typeof(value)='object' and value->'version'='1'::jsonb
    and jsonb_typeof(value->'primary')='string' and value->>'primary' ~ '^#[0-9a-fA-F]{6}$'
    and (value - 'version' - 'primary')='{}'::jsonb, false)
$$;
revoke all on function public.valid_event_theme(jsonb) from public;
grant execute on function public.valid_event_theme(jsonb) to anon,authenticated;
alter table public.events add column event_type text not null default 'invitation' check(event_type in ('invitation','congratulation'));
alter table public.events add column theme jsonb not null default '{"version":1,"primary":"#174b78"}'::jsonb check(public.valid_event_theme(theme));
alter table public.events alter column starts_at drop not null, alter column ends_at drop not null;
-- Replace only the two audited temporal/location constraints. Other checks stay intact.
do $$ declare r record; time_count integer:=0; location_count integer:=0; begin
  for r in select conname,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.events'::regclass and contype='c' loop
    if r.definition = 'CHECK ((ends_at > starts_at))' then
      execute format('alter table public.events drop constraint %I',r.conname); time_count:=time_count+1;
    elsif r.definition like '%location_method%' and r.definition like '%maps_url <>%' and r.definition like '%place_id ~%' then
      execute format('alter table public.events drop constraint %I',r.conname); location_count:=location_count+1;
    end if;
  end loop;
  if time_count<>1 or location_count<>1 then raise exception 'Temporal/location constraint drift'; end if;
end $$;
alter table public.events add constraint events_invitation_time check(event_type='congratulation' or (starts_at is not null and ends_at is not null and isfinite(starts_at) and isfinite(ends_at) and ends_at>starts_at));
alter table public.events add constraint events_invitation_location check(event_type='congratulation' or ((location_method='url' and maps_url<>'') or (location_method='place' and place_id ~ '^[A-Za-z0-9_-]{5,255}$')));
alter table public.events add constraint events_v3_reserved_code check(code not in ('thiep-moi','thiep-chuc'));

do $rpc$
declare original text; changed text; needle text;
begin
  original:=pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure);
  needle:='v := jsonb_populate_record(null::public.events,p_event);';
  if (length(original)-length(replace(original,needle,'')))/length(needle)<>1 then raise exception 'save_event parse drift'; end if;
  changed:=replace(original,needle,$insert$
  if p_event ? 'event_type' and (p_event->>'event_type' is null or p_event->>'event_type' not in ('invitation','congratulation')) then raise exception 'Invalid event type' using errcode='23514'; end if;
  if p_event ? 'theme' and not public.valid_event_theme(p_event->'theme') then raise exception 'Invalid event theme' using errcode='23514'; end if;
  v := jsonb_populate_record(null::public.events,p_event);
  v.event_type:=coalesce(v.event_type,old_event.event_type,'invitation');
  v.theme:=coalesce(v.theme,old_event.theme,'{"version":1,"primary":"#174b78"}'::jsonb);
  $insert$);
  needle:='venue_image_path,quote_one,quote_two,description_rich,youtube_url,music_path)';
  if position(needle in changed)=0 or position('v.music_path) returning' in changed)=0 or position('update public.events set music_path=' in changed)=0 then raise exception 'save_event columns drift'; end if;
  changed:=replace(changed,needle,'venue_image_path,quote_one,quote_two,description_rich,youtube_url,music_path,event_type,theme)');
  changed:=replace(changed,'v.music_path) returning','v.music_path,v.event_type,v.theme) returning');
  changed:=replace(changed,'update public.events set music_path=','update public.events set event_type=v.event_type,theme=v.theme,music_path=');
  execute changed;
end $rpc$;
create function public.hsv_v3_capabilities() returns jsonb language sql immutable set search_path='' as $$
  select '{"version":3,"event_types":["invitation","congratulation"],"theme_version":1}'::jsonb
$$;
revoke all on function public.hsv_v3_capabilities() from public;
grant execute on function public.hsv_v3_capabilities() to anon,authenticated;
do $$ begin
  if exists(select 1 from public.events where event_type<>'invitation' or not public.valid_event_theme(theme)) then raise exception 'Legacy migration invariant failed'; end if;
  if has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') then raise exception 'Anonymous save unexpectedly enabled'; end if;
end $$;
commit;
