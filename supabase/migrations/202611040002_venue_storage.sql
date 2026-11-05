-- REVIEW ONLY. Run after v110; bucket remains private.
begin;
do $$ begin if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects') then raise exception 'Existing Storage policies: review overlapping grants before migration'; end if; end $$;
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
do $$ begin if exists(select 1 from storage.buckets where id='bookclub-venues') then raise exception 'Bucket already exists: inspect before applying migration'; end if; end $$;
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
commit;
