// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite(),
  admin = "20000000-0000-4000-8000-000000000001",
  guest = "10000000-0000-4000-8000-000000000001";
let event: { id: string; updated_at: string }, inv: string;
const payload = {
  code: "refine-test",
  title: "Refinement",
  starts_at: "2099-01-01T01:00:00Z",
  ends_at: "2099-01-01T02:00:00Z",
  status: "draft",
  maps_url: "https://maps.app.goo.gl/test",
  location_method: "url",
  agenda: [
    { time: "08:00", description: "Existing agenda", highlight: false },
    { time: "09:00", description: "Second agenda", highlight: false },
  ],
};
beforeAll(async () => {
  await pg.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,bucket_id text,name text);",
  );
  await pg.exec(readFileSync("supabase/rebuild-v110/02-schema.sql", "utf8"));
  await pg.exec(readFileSync("supabase/rebuild-v110/03-seed.sql", "utf8"));
  await pg.query("insert into auth.users values($1)", [admin]);
  await pg.query("insert into admin_users(user_id) values($1)", [admin]);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    admin,
  ]);
  event = (
    await pg.query<{ e: typeof event }>("select save_event($1,$2) e", [
      JSON.stringify(payload),
      [guest],
    ])
  ).rows[0].e;
  inv = (
    await pg.query<{ id: string }>(
      "select id from event_guests where event_id=$1",
      [event.id],
    )
  ).rows[0].id;
  const migration = readFileSync(
    "supabase/migrations/202611050001_ui_refinement.sql",
    "utf8",
  );
  const idsBefore = (
    await pg.query("select id from event_agenda_items order by id")
  ).rows;
  const descriptionBefore = (
    await pg.query("select description from event_guests where id=$1", [inv])
  ).rows[0];
  await expect(
    pg.exec(migration.replace(/commit;\s*$/i, "select 1/0; commit;")),
  ).rejects.toThrow();
  await pg.exec("rollback");
  expect(
    (await pg.query("select id from event_agenda_items order by id")).rows,
  ).toEqual(idsBefore);
  expect(
    (await pg.query("select description from event_guests where id=$1", [inv]))
      .rows[0],
  ).toEqual(descriptionBefore);
  expect(
    (
      await pg.query(
        "select column_name from information_schema.columns where table_schema='public' and table_name='event_agenda_items' and column_name='end_time'",
      )
    ).rows,
  ).toHaveLength(0);
  await pg.exec(migration);
  expect(
    (await pg.query("select id from event_agenda_items order by id")).rows,
  ).toEqual(idsBefore);
}, 30000);
afterAll(() => pg.close());


it("separates role administration from Editor content permissions",async()=>{
 await pg.exec("create role service_role;alter table auth.users add column email text, add column email_confirmed_at timestamptz, add column invited_at timestamptz;");
 const hash=(await pg.query<{v:string}>("select md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure)) v")).rows[0].v;
 await pg.exec(readFileSync('supabase/migrations/202611070001_invitation_quotes.sql','utf8').replace('91ca923e964e16cb3e4eca606b7a1e6b',hash));
 await pg.exec(readFileSync('supabase/migrations/202611060002_guest_order.sql','utf8'));
 await pg.exec(readFileSync('supabase/migrations/202611060001_agenda_icon_library.sql','utf8'));
 let migration=readFileSync('supabase/migrations/202611080001_editor_roles.sql','utf8');
 await expect(pg.exec(migration)).rejects.toThrow('Reviewed production function changed');await pg.exec('rollback');
 for(const [signature,expected] of [["public.is_admin()","b11e704df80dcdb21b91e90747409eb1"],["public.save_event(jsonb,uuid[],uuid,timestamp with time zone)","49105a95c8ead8a7f32c115943faee62"],["public.reorder_guests(uuid[],uuid[])","a606d9f86880b975f12f66094ef09b67"],["public.guest_order_write_lock()","8c7a699a6dffd3b4945710a92bf50941"],["public.get_event_v110(text)","00a558934b4ea51b6e67ea1ac2371894"],["public.resolve_invitation(text,text)","a8249304545b779d7c9197e226dd2125"],["public.unused_venue_images()","430123e21b929b44cd95c23e0fb6cc2c"]]){
 const actual=(await pg.query<{hash:string}>('select md5(pg_get_functiondef($1::regprocedure)) hash',[signature])).rows[0].hash;
 migration=migration.replace(expected,actual);
 }
 const pre=(await pg.query<{role_audit:Record<string,unknown>}>(readFileSync('supabase/editor-roles-preflight.sql','utf8'))).rows[0].role_audit;
 const functionsBefore=(await pg.query<{name:string;def:string;acl:unknown}>("select p.oid::regprocedure::text name, pg_get_functiondef(p.oid) def, p.proacl acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_admin','valid_quote_document','save_event','reorder_guests','guest_order_write_lock','get_event_v110','resolve_invitation','unused_venue_images') order by 1")).rows;
 const policiesBefore=(await pg.query<{schemaname:string;tablename:string;policyname:string;qual:string|null;with_check:string|null}>('select schemaname,tablename,policyname,qual,with_check from pg_policies where schemaname in (\'public\',\'storage\') order by 1,2,3')).rows;
 await expect(pg.exec(migration.replace(/commit;\s*$/i,'select 1/0; commit;'))).rejects.toThrow();await pg.exec('rollback');
 expect((await pg.query<{v:unknown}>("select to_regclass('public.editor_users') v")).rows[0].v).toBeNull();
 await pg.exec(migration);
 const functionsAfter=(await pg.query<{name:string;def:string;acl:unknown}>("select p.oid::regprocedure::text name, pg_get_functiondef(p.oid) def, p.proacl acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('is_admin','valid_quote_document','save_event','reorder_guests','guest_order_write_lock','get_event_v110','resolve_invitation','unused_venue_images') order by 1")).rows;
 expect(functionsAfter).toEqual(functionsBefore.map(f=>({...f,def:['is_admin()','valid_quote_document(jsonb)'].includes(f.name)?f.def:f.def.replace('public.is_admin()','public.can_edit_content()')})));
 const policiesAfter=(await pg.query<{schemaname:string;tablename:string;policyname:string;qual:string|null;with_check:string|null}>('select schemaname,tablename,policyname,qual,with_check from pg_policies where schemaname in (\'public\',\'storage\') order by 1,2,3')).rows;
 const changedPolicies=new Set(['admin_events_write','published_events','admin_guests','admin_invitations','admin_aliases','agenda_admin','agenda_read','image_registry_admin','bookclub_venue_delete','bookclub_venue_insert','bookclub_venue_read']);
 for(const before of policiesBefore){const after=policiesAfter.find(p=>p.schemaname===before.schemaname&&p.tablename===before.tablename&&p.policyname===before.policyname);expect(after).toEqual({...before,qual:changedPolicies.has(before.policyname)?before.qual?.replaceAll('is_admin()', 'can_edit_content()')??null:before.qual,with_check:changedPolicies.has(before.policyname)?before.with_check?.replaceAll('is_admin()', 'can_edit_content()')??null:before.with_check});}
 const post=(await pg.query<{role_audit:Record<string,unknown>}>(readFileSync('supabase/editor-roles-postflight.sql','utf8'))).rows[0].role_audit;
 for(const k of ['admins_fingerprint','events_fingerprint','guests_fingerprint','invitations_fingerprint','aliases_fingerprint','agenda_fingerprint','auth_count'])expect(post[k]).toEqual(pre[k]);
 await pg.exec('grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;alter table storage.objects enable row level security');
 const editor='20000000-0000-4000-8000-000000000002';await pg.query('insert into auth.users(id,email) values($1,$2)',[editor,'editor@example.invalid']);
 await pg.exec('set role authenticated');await expect(pg.query('select set_editor_role($1,$2,true)',[admin,editor])).rejects.toThrow();
 await pg.exec('reset role;set role service_role');await pg.query('select set_editor_role($1,$2,true)',[admin,editor]);
 await expect(pg.query('select set_editor_role($1,$2,true)',[admin,editor])).rejects.toThrow('Already Editor');
 await pg.exec('begin');await pg.query('select set_editor_role($1,$2,false)',[admin,editor]);await expect(pg.exec('select 1/0')).rejects.toThrow();await pg.exec('rollback');
 await pg.exec('reset role');expect((await pg.query('select * from editor_users where user_id=$1',[editor])).rows).toHaveLength(1);await pg.exec('set role service_role');
 await expect(pg.query('select set_editor_role($1,$2,false)',[admin,admin])).rejects.toThrow('Admin targets locked');
 await expect(pg.query('select set_editor_role($1,$2,true)',[editor,admin])).rejects.toThrow('Admin required');
 await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[editor]);await pg.exec('set role authenticated');
 expect((await pg.query<{r:string}>('select effective_role() r')).rows[0].r).toBe('editor');expect((await pg.query('select * from role_directory()')).rows).toHaveLength(2);
 await expect(pg.query('insert into editor_users(user_id) values($1)',[editor])).rejects.toThrow();
 const created=(await pg.query<{e:{id:string;updated_at:string}}>('select save_event($1,$2) e',[JSON.stringify({...payload,code:'editor-fixture',agenda:[{time:'08:00',end_time:'09:00',icon:'film',description:'Editor agenda',highlight:true}],quote_one:'Editor quote'}),[guest]])).rows[0].e;
 const updated=(await pg.query<{e:{id:string;title:string;quote_one:string}}>('select save_event($1,$2,$3,$4) e',[JSON.stringify({...payload,code:'editor-fixture',title:'Editor updated',agenda:[{time:'08:00',end_time:'09:00',icon:'film',description:'Editor agenda',highlight:true}]}),[guest],created.id,created.updated_at])).rows[0].e;
 expect(updated.title).toBe('Editor updated');expect(updated.quote_one).toBe('Editor quote');
 await pg.query('update guests set description=description where id=$1',[guest]);
 const newGuest='10000000-0000-4000-8000-000000000099';await pg.query("insert into guests(id,name,primary_alias) values($1,'Fixture','fixture-role')",[newGuest]);
 const path=created.id+'/20000000-0000-4000-8000-000000000099.png';await pg.query('insert into venue_image_uploads(path,created_by) values($1,$2)',[path,editor]);
 await pg.query("insert into storage.objects(id,bucket_id,name) values($1,'bookclub-venues',$2)",[newGuest,path]);
 await pg.query('update events set venue_image_path=$1 where id=$2',[path,created.id]);
 expect((await pg.query('select * from storage.objects')).rows).toHaveLength(1);
 await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub','',false)");await pg.exec('set role anon');expect((await pg.query('select * from storage.objects')).rows).toHaveLength(0);
 await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[editor]);await pg.exec('set role authenticated');
 await pg.query("update events set status='published' where id=$1",[created.id]);
 await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub','',false)");await pg.exec('set role anon');expect((await pg.query('select * from storage.objects')).rows).toHaveLength(1);
 await expect(pg.query("insert into storage.objects(id,bucket_id,name) values($1,'bookclub-venues','denied')",[guest])).rejects.toThrow();
 await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[editor]);await pg.exec('set role authenticated');
 await pg.query('update events set venue_image_path=null where id=$1',[created.id]);await pg.query('delete from storage.objects where name=$1',[path]);await pg.query('delete from venue_image_uploads where path=$1',[path]);
 const ids=(await pg.query<{id:string}>('select id from guests order by display_order')).rows.map(r=>r.id);await pg.query('select reorder_guests($1,$2)',[ids,[...ids].reverse()]);
 await pg.query('delete from events where id=$1',[created.id]);
 await expect(pg.query('select set_editor_role($1,$2,false)',[admin,editor])).rejects.toThrow();
 await pg.exec('reset role;set role service_role');await pg.query('select set_editor_role($1,$2,false)',[admin,editor]);await pg.exec('reset role;set role authenticated');
 expect((await pg.query<{v:boolean}>('select can_edit_content() v')).rows[0].v).toBe(false);await expect(pg.query('select * from role_directory()')).rejects.toThrow();
 await expect(pg.query('select save_event($1,$2)',[JSON.stringify({...payload,code:'denied'}),[guest]])).rejects.toThrow('Admin required');
 await pg.exec('reset role;set role anon');await expect(pg.query('select * from role_directory()')).rejects.toThrow();await pg.exec('reset role');
 expect((await pg.query('select * from admin_users')).rows).toHaveLength(1);
 await pg.query('insert into editor_users(user_id) values($1)',[admin]);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);await pg.exec('set role authenticated');
 expect((await pg.query<{r:string}>('select effective_role() r')).rows[0].r).toBe('admin');
 const adminEvent=(await pg.query<{e:{id:string}}>('select save_event($1,$2) e',[JSON.stringify({...payload,code:'admin-still-works',agenda:[]}),[guest]])).rows[0].e;
 await pg.query('delete from events where id=$1',[adminEvent.id]);await pg.exec('reset role');
 await pg.exec('set role service_role');await expect(pg.query('select set_editor_role($1,$2,false)',[admin,admin])).rejects.toThrow('Admin targets locked');await pg.exec('reset role');
},30000);
