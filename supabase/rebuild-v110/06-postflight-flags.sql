-- Read-only. Export as rows; booleans cast to text to avoid copy/paste losing values.
select 'rls_'||c.relname as check_name,c.relrowsecurity::text as actual,'true'::text as expected
from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'
union all select 'bucket_private',(not public)::text,'true' from storage.buckets where id='bookclub-venues'
union all select 'ten_active_canonical_guests',((select count(*) from public.guests where active and primary_alias=public.guest_slug_v110(name))=10)::text,'true'
union all select 'admin_restored',exists(select 1 from public.admin_users a join auth.users u on u.id=a.user_id where a.user_id=current_setting('bookclub.reviewed_admin_uid', true)::uuid)::text,'true'
union all select 'auth_count_preserved',((select count(*) from auth.users)=2)::text,'true'
union all select 'old_codes_absent',(to_regclass('public.event_codes') is null)::text,'true'
union all select 'legacy_rpc_absent',(to_regprocedure('public.save_event_v100(jsonb,uuid[],uuid,timestamptz)') is null)::text,'true'
union all select 'system_helper_present',(to_regprocedure('public.rls_auto_enable()') is not null)::text,'true'
union all select 'anon_save_execute',has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')::text,'false'
union all select 'authenticated_save_execute',has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute')::text,'true'
union all select 'anon_invitation_execute',has_function_privilege('anon','public.resolve_invitation(text,text)','execute')::text,'true'
union all select 'anon_payload_helper_execute',has_function_privilege('anon','public.event_payload_v110(public.events)','execute')::text,'false'
order by check_name;
