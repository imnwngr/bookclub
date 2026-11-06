-- LOCAL REVIEW ONLY. Apply after the reviewed Editor Roles migration.
begin;
set local lock_timeout = '5s';
alter table public.events add column description_rich jsonb
  constraint events_description_rich_valid check (public.valid_quote_document(description_rich));
do $migration$
declare original text; changed text;
begin
  select pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure) into original;
  if position('public.can_edit_content()' in original)=0 then raise exception 'Editor Roles baseline required'; end if;
  if md5(original) <> '7f7ee461a29cad2aca2e9ebe1212f483' or not exists (
    select 1 from pg_proc where oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)')
    and pg_get_userbyid(proowner)='postgres' and prosecdef and proconfig @> array['search_path=""']
  ) or has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')
    or not has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') then
    raise exception 'Reviewed Editor Roles save_event baseline changed';
  end if;
  changed := replace(original, 'venue_image_path,quote_one,quote_two)', 'venue_image_path,quote_one,quote_two,description_rich)');
  changed := replace(changed, 'v.venue_image_path,coalesce(v.quote_one,'''')' || ',v.quote_two) returning', 'v.venue_image_path,coalesce(v.quote_one,'''')' || ',v.quote_two,v.description_rich) returning');
  changed := replace(changed, 'update public.events set quote_one=', 'update public.events set description_rich=case when p_event ? ''description_rich'' then v.description_rich else old_event.description_rich end, quote_one=');
  if changed=original or position('v.quote_two,v.description_rich) returning' in changed)=0 or position('description_rich=case when' in changed)=0 then raise exception 'Unexpected save_event definition'; end if;
  execute changed;
end $migration$;
commit;
