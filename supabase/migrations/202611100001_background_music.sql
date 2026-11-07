-- New forward-only migration. Retains legacy youtube_url for historical data.
begin;
set local lock_timeout='5s';
do $$ begin
 if md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure))<>'4fced5d235d96447205401bf885d82ae' then raise exception 'Production save_event baseline drift';end if;
 if not exists(select 1 from pg_proc where oid='public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure and pg_get_userbyid(proowner)='postgres' and prosecdef and proconfig @> array['search_path=""']) or has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') then raise exception 'Unexpected save_event security';end if;
end $$;
alter table public.events add column music_path text check(music_path is null or (length(music_path)<=500 and music_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]+[.]mp3$'));
create table public.music_uploads(path text primary key,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
alter table public.music_uploads enable row level security;
revoke all on public.music_uploads from public,anon,authenticated;
grant select,insert,delete on public.music_uploads to authenticated;
create policy music_registry_read on public.music_uploads for select to authenticated using(public.can_edit_content());
create policy music_registry_insert on public.music_uploads for insert to authenticated with check(public.can_edit_content() and created_by=auth.uid() and split_part(path,'/',1)=auth.uid()::text and path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]+[.]mp3$');
create policy music_registry_delete on public.music_uploads for delete to authenticated using(public.can_edit_content() and not exists(select 1 from public.events e where e.music_path=path) and not exists(select 1 from storage.objects o where o.bucket_id='bookclub-music' and o.name=path));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('bookclub-music','bookclub-music',false,20971520,array['audio/mpeg']);
create policy music_read on storage.objects for select to anon,authenticated using(bucket_id='bookclub-music' and (public.can_edit_content() or exists(select 1 from public.events e where e.music_path=name and e.status='published')));
create policy music_insert on storage.objects for insert to authenticated with check(bucket_id='bookclub-music' and public.can_edit_content() and exists(select 1 from public.music_uploads r where r.path=name and r.created_by=auth.uid()));
create policy music_delete on storage.objects for delete to authenticated using(bucket_id='bookclub-music' and public.can_edit_content() and not exists(select 1 from public.events e where e.music_path=name));
-- Immutable object keys: no UPDATE policy, and clients upload with upsert=false.
create function public.guard_music_reference() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.music_path is not null then
  perform 1 from storage.objects where bucket_id='bookclub-music' and name=new.music_path for key share;
  if not found then raise exception 'Music object missing' using errcode='23503';end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_music_reference() from public,anon,authenticated;
create trigger events_music_reference before insert or update of music_path on public.events for each row execute function public.guard_music_reference();
create function public.guard_music_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='bookclub-music' and exists(select 1 from public.events e where e.music_path=old.name) then raise exception 'Music is referenced by an event' using errcode='23503';end if;
 return old;
end $$;
revoke all on function public.guard_music_delete() from public,anon,authenticated;
create trigger bookclub_music_delete before delete on storage.objects for each row execute function public.guard_music_delete();
create function public.unused_music() returns table(path text) language plpgsql security definer set search_path='' as $$
begin
 if not public.can_edit_content() then raise exception 'Content access required' using errcode='42501';end if;
 return query select r.path from public.music_uploads r where not exists(select 1 from public.events e where e.music_path=r.path) order by r.created_at;
end $$;
revoke all on function public.unused_music() from public,anon;
grant execute on function public.unused_music() to authenticated;
do $$ declare original text; changed text;begin
 original:=pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure);
 changed:=replace(original,'venue_image_path,quote_one,quote_two,description_rich,youtube_url)','venue_image_path,quote_one,quote_two,description_rich,youtube_url,music_path)');
 changed:=replace(changed,'v.description_rich,nullif(v.youtube_url,'''')' || ') returning','v.description_rich,nullif(v.youtube_url,'''')' || ',v.music_path) returning');
 changed:=replace(changed,'update public.events set youtube_url=','update public.events set music_path=case when p_event ? ''music_path'' then nullif(v.music_path,'''') else old_event.music_path end, youtube_url=');
 if changed=original or position('v.music_path) returning' in changed)=0 or position('music_path=case when' in changed)=0 then raise exception 'Unexpected save_event body';end if;
 execute changed;
end $$;
commit;
