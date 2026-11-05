-- Additive icon upgrade; legacy values remain valid. Review before applying.
begin;
alter table public.event_agenda_items drop constraint agenda_icon_valid;
alter table public.event_agenda_items add constraint agenda_icon_valid check (
  icon in ('welcome','speech','book','chat','music','gift','summary','camera','finish',
    'users','mic','film','award','sparkles','book-open','trophy','heart-handshake')
);

-- Allows the editor to avoid sending a value before this migration is installed.
create or replace function public.agenda_icon_capabilities()
returns text[] language sql stable security invoker set search_path = ''
as $$ select array['users','music','mic','film','award','sparkles','book-open','gift','trophy','camera','heart-handshake']::text[] $$;
revoke all on function public.agenda_icon_capabilities() from public, anon;
grant execute on function public.agenda_icon_capabilities() to authenticated;
commit;
