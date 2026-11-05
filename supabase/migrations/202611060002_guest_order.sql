-- REVIEW ONLY: do not apply without a separate production approval.
begin;
set local lock_timeout = '5s';
lock table public.guests in share row exclusive mode;
-- Re-entry fails transactionally before changing an already migrated database.
alter table public.guests add column display_order integer;
create function public.guest_order_timestamp() returns trigger language plpgsql set search_path='' as $$
begin
 if (to_jsonb(new)-'display_order'-'updated_at') is distinct from (to_jsonb(old)-'display_order'-'updated_at') then
  new.updated_at:=clock_timestamp();
 else new.updated_at:=old.updated_at;
 end if;
 return new;
end $$;
revoke all on function public.guest_order_timestamp() from public,anon,authenticated;
drop trigger touch_updated_at on public.guests;
create trigger touch_updated_at before update on public.guests for each row execute function public.guest_order_timestamp();
with ranked as (select id,row_number() over(order by created_at,id) n from public.guests)
update public.guests g set display_order=r.n from ranked r where r.id=g.id;
alter table public.guests alter column display_order set not null;
alter table public.guests add constraint guests_display_order_unique unique(display_order) deferrable initially deferred;
create function public.guest_order_write_lock() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(194827,110);
 return null;
end $$;
create function public.guest_order_append() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select coalesce(max(display_order),0)+1 into new.display_order from public.guests;
 return new;
end $$;
revoke all on function public.guest_order_write_lock(),public.guest_order_append() from public,anon,authenticated;
create trigger guest_order_write_lock before insert or update or delete on public.guests for each statement execute function public.guest_order_write_lock();
create trigger guest_order_append before insert on public.guests for each row execute function public.guest_order_append();

create function public.reorder_guests(p_expected uuid[], p_order uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare current_ids uuid[];
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_expected is null or p_order is null then raise exception 'Guest IDs required' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(194827,110);
  select coalesce(array_agg(id order by display_order,id),array[]::uuid[]) into current_ids from public.guests;
  if current_ids is distinct from p_expected then raise exception 'Guest order changed; reload before retry' using errcode='40001'; end if;
  if cardinality(p_order) <> cardinality(current_ids)
     or cardinality(p_order) <> (select count(distinct id) from unnest(p_order) id)
     or exists(select id from unnest(current_ids) id except select id from unnest(p_order) id) then
    raise exception 'Invalid guest order' using errcode='22023';
  end if;
  update public.guests g set display_order=x.position from unnest(p_order) with ordinality x(id,position)
    where g.id=x.id and g.display_order is distinct from x.position;
end $$;
revoke execute on function public.reorder_guests(uuid[],uuid[]) from public,anon;
grant execute on function public.reorder_guests(uuid[],uuid[]) to authenticated;
create function public.guest_order_available() returns boolean language sql stable security invoker set search_path = '' as $$ select true $$;
revoke execute on function public.guest_order_available() from public,anon;
grant execute on function public.guest_order_available() to authenticated;
commit;
