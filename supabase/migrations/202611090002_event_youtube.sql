-- LOCAL REVIEW ONLY. Stored values are canonical HTTPS watch URLs.
begin;
set local lock_timeout = '5s';
alter table public.events add column youtube_url text
  constraint events_youtube_url_valid check (youtube_url is null or youtube_url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$');
do $migration$
declare original text; changed text;
begin
  select pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure) into original;
  if position('public.can_edit_content()' in original)=0 then raise exception 'Editor Roles baseline required'; end if;
  if md5(original) <> 'a71f1a0580c5cf1e1535181db7b9e298' or not exists (
    select 1 from pg_proc where oid=to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)')
    and pg_get_userbyid(proowner)='postgres' and prosecdef and proconfig @> array['search_path=""']
  ) or has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')
    or not has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') then
    raise exception 'Reviewed rich description save_event baseline changed';
  end if;
  changed := replace(original, 'venue_image_path,quote_one,quote_two,description_rich)', 'venue_image_path,quote_one,quote_two,description_rich,youtube_url)');
  changed := replace(changed, 'v.quote_two,v.description_rich) returning', 'v.quote_two,v.description_rich,nullif(v.youtube_url,'''')' || ') returning');
  changed := replace(changed, 'update public.events set description_rich=', 'update public.events set youtube_url=case when p_event ? ''youtube_url'' then nullif(v.youtube_url,'''') else old_event.youtube_url end, description_rich=');
  if changed=original or position('youtube_url=case when' in changed)=0 or position('v.description_rich,nullif(v.youtube_url' in changed)=0 then raise exception 'Unexpected save_event definition'; end if;
  execute changed;
end $migration$;
commit;
