import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const pg=new PGlite();const file=p=>readFileSync(p,'utf8');
try {
 await pg.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,invited_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,bucket_id text,name text);");
 await pg.exec(file('supabase/rebuild-v110/02-schema.sql')); await pg.exec(file('supabase/rebuild-v110/03-seed.sql'));
 const admin='20000000-0000-4000-8000-000000000001',guest='10000000-0000-4000-8000-000000000001';await pg.query('insert into auth.users(id) values($1)',[admin]);await pg.query('insert into admin_users(user_id) values($1)',[admin]);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 const body={code:'migration-check',title:'Kiểm tra',description:'Mô tả cũ',starts_at:'2099-01-01T01:00:00Z',ends_at:'2099-01-01T02:00:00Z',status:'draft',maps_url:'https://maps.app.goo.gl/test',location_method:'url',agenda:[{time:'08:00',description:'Existing agenda',highlight:false},{time:'09:00',description:'Second agenda',highlight:false}]};
 const first=(await pg.query('select save_event($1,$2) e',[JSON.stringify(body),[guest]])).rows[0].e;
 await pg.exec(file('supabase/migrations/202611050001_ui_refinement.sql'));
 let hash=(await pg.query("select md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure)) h")).rows[0].h;
 await pg.exec(file('supabase/migrations/202611070001_invitation_quotes.sql').replace('91ca923e964e16cb3e4eca606b7a1e6b',hash));
 await pg.exec(file('supabase/migrations/202611060002_guest_order.sql'));await pg.exec(file('supabase/migrations/202611060001_agenda_icon_library.sql'));
 try { await pg.exec(file('supabase/migrations/202611090001_event_description_rich.sql')); throw Error('description migration unexpectedly succeeded without Editor Roles'); } catch(e) { if(!e.message.includes('Editor Roles baseline required')) throw e; await pg.exec('rollback'); }
 if((await pg.query("select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='description_rich'")).rows.length) throw Error('failed migration left column behind');
 console.log('PASS description migration blocked and rolled back without Editor Roles');
 let migration=file('supabase/migrations/202611080001_editor_roles.sql');
 for(const [sig,expected] of [['public.is_admin()','b11e704df80dcdb21b91e90747409eb1'],['public.save_event(jsonb,uuid[],uuid,timestamp with time zone)','49105a95c8ead8a7f32c115943faee62'],['public.reorder_guests(uuid[],uuid[])','a606d9f86880b975f12f66094ef09b67'],['public.guest_order_write_lock()','8c7a699a6dffd3b4945710a92bf50941'],['public.get_event_v110(text)','00a558934b4ea51b6e67ea1ac2371894'],['public.resolve_invitation(text,text)','a8249304545b779d7c9197e226dd2125'],['public.unused_venue_images()','430123e21b929b44cd95c23e0fb6cc2c']]) {let actual=(await pg.query('select md5(pg_get_functiondef($1::regprocedure)) h',[sig])).rows[0].h;migration=migration.replace(expected,actual)}
 await pg.exec(migration);
 if(process.env.BOOKCLUB_BASELINE_FUNCTION_SQL) {
  const definition=file(process.env.BOOKCLUB_BASELINE_FUNCTION_SQL);
  await pg.exec(definition.replace('public.is_admin()','public.can_edit_content()'));
  const hash=(await pg.query("select md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure)) h")).rows[0].h;
  if(hash!=='7f7ee461a29cad2aca2e9ebe1212f483') throw Error('production-derived fixture fingerprint mismatch: '+hash);
  console.log('PASS production-derived save_event fingerprint');
 }
 try { await pg.exec(file('supabase/migrations/202611090002_event_youtube.sql')); throw Error('YouTube migration unexpectedly succeeded before description'); } catch(e) { if(!e.message.includes('baseline changed')) throw e; await pg.exec('rollback'); }
 if((await pg.query("select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='youtube_url'")).rows.length) throw Error('failed migration left YouTube column behind');
 console.log('PASS YouTube migration blocked and rolled back before description');
 for(const [name,expected] of [['202611090001_event_description_rich.sql','7f7ee461a29cad2aca2e9ebe1212f483'],['202611090002_event_youtube.sql','a71f1a0580c5cf1e1535181db7b9e298']]){
  const actual=(await pg.query("select md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure)) h")).rows[0].h;
  let sql=file('supabase/migrations/'+name);
  if(process.env.BOOKCLUB_BASELINE_FUNCTION_SQL && actual!==expected) throw Error('production-derived migration guard mismatch: '+name+' '+actual);
  if(actual!==expected) { try {await pg.exec(sql);throw Error('unmodified production guard accepted fixture drift');} catch(e) {if(!e.message.includes('baseline changed')) throw e;await pg.exec('rollback');} }
  await pg.exec(sql.replace(expected,actual));console.log('MIGRATION PASS',name,actual===expected?'(unmodified guard)':'(fixture hash substituted)');
 }
 const before=(await pg.query('select * from events where id=$1',[first.id])).rows[0];if(before.description!=='Mô tả cũ'||before.description_rich!==null) throw Error('legacy lost');
 const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Tiếng Việt',marks:[{type:'bold'}]}]}]};
 let e=(await pg.query('select save_event($1,$2,$3,$4) e',[JSON.stringify({...body,description_rich:doc,youtube_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',quote_one:'Quote 1'}),[guest],first.id,before.updated_at])).rows[0].e;
 if(e.description_rich?.content?.[0]?.content?.[0]?.text!=='Tiếng Việt'||!e.youtube_url||e.quote_one!=='Quote 1')throw Error('save result');
 let read=(await pg.query('select get_event_v110($1) e',[body.code])).rows[0].e;if(!read.youtube_url||read.description_rich?.content?.[0]?.content?.[0]?.text!=='Tiếng Việt')throw Error('reload');
 await pg.query('select save_event($1,$2,$3,$4)',[JSON.stringify(body),[guest],first.id,e.updated_at]);
 read=(await pg.query('select get_event_v110($1) e',[body.code])).rows[0].e;if(!read.youtube_url||!read.description_rich)throw Error('omitted data lost');
 for(const [col,val] of [['youtube_url','https://evil.example/watch?v=dQw4w9WgXcQ'],['description_rich',JSON.stringify({type:'doc',content:[{type:'script'}]})]]) {try {await pg.query(`update events set ${col}=$1 where id=$2`,[val,first.id]);throw Error('accepted invalid '+col)}catch(e){if(String(e).includes('accepted invalid'))throw e;}}
 console.log('PASS legacy retention, save/reload, omitted fields and invalid constraints');

 const musicHash=(await pg.query("select md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure)) h")).rows[0].h;
 const musicSql=file('supabase/migrations/202611100001_background_music.sql');
 try{await pg.exec(musicSql.replace('4fced5d235d96447205401bf885d82ae','00000000000000000000000000000000'));throw Error('drift accepted')}catch(e){if(!e.message.includes('baseline drift'))throw e;await pg.exec('rollback')}
 await pg.exec(musicSql.replace('4fced5d235d96447205401bf885d82ae',musicHash));
 const path=admin+'/30000000-0000-4000-8000-000000000001/test.mp3';
 await pg.query('insert into music_uploads(path,created_by) values($1,$2)',[path,admin]);
 await pg.query("insert into storage.objects(id,bucket_id,name) values('40000000-0000-4000-8000-000000000001','bookclub-music',$1)",[path]);
 const current=(await pg.query('select * from events where id=$1',[first.id])).rows[0];
 const saved=(await pg.query('select save_event($1,$2,$3,$4) e',[JSON.stringify({...body,music_path:path}),[guest],first.id,current.updated_at])).rows[0].e;
 if(saved.music_path!==path)throw Error('music save failed');
 try{await pg.query('delete from storage.objects where name=$1',[path]);throw Error('referenced delete accepted')}catch(e){if(!e.message.includes('referenced'))throw e}
 await pg.query('update events set music_path=null where id=$1',[first.id]);await pg.query('delete from storage.objects where name=$1',[path]);

 await pg.exec('alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated');
 await pg.exec('set role anon');
 if((await pg.query("select * from storage.objects where bucket_id='bookclub-music'")).rows.length)throw Error('anonymous draft leak');
 await pg.exec('reset role');
 const editorMusic='20000000-0000-4000-8000-000000000099';await pg.query('insert into auth.users(id) values($1)',[editorMusic]);await pg.query('insert into editor_users(user_id) values($1)',[editorMusic]);
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[editorMusic]);await pg.exec('set role authenticated');
 const editorPath=editorMusic+'/30000000-0000-4000-8000-000000000002/editor.mp3';
 await pg.query('insert into music_uploads(path,created_by) values($1,$2)',[editorPath,editorMusic]);
 await pg.query("insert into storage.objects(id,bucket_id,name) values('40000000-0000-4000-8000-000000000002','bookclub-music',$1)",[editorPath]);
 await pg.exec('reset role');await pg.query('update events set music_path=$1,status=$2 where id=$3',[editorPath,'published',first.id]);
 await pg.query("select set_config('request.jwt.claim.sub','',false)");await pg.exec('set role anon');
 if((await pg.query("select * from storage.objects where name=$1",[editorPath])).rows.length!==1)throw Error('published music unavailable');
 try{await pg.query("insert into storage.objects(id,bucket_id,name) values('40000000-0000-4000-8000-000000000003','bookclub-music','forbidden.mp3')");throw Error('anonymous upload allowed')}catch(e){if(!e.message.includes('row-level security'))throw e}
 await pg.exec('reset role');await pg.query('update events set music_path=null where id=$1',[first.id]);await pg.query('delete from storage.objects where name=$1',[editorPath]);await pg.query('delete from music_uploads where path=$1',[editorPath]);await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 console.log('PASS actual SQL roles: Editor upload, anonymous Published read, denied anonymous upload');
 console.log('PASS MP3 migration, baseline rejection, save/reload, referenced deletion guard and unreferenced cleanup (synthetic fixture hash substituted only in memory)');
 const editor='20000000-0000-4000-8000-000000000002';
 await pg.query('insert into auth.users(id) values($1)',[editor]);
 await pg.query('select public.set_editor_role($1,$2,true)',[admin,editor]);
 const snapshot=(await pg.query('select * from events where id=$1',[first.id])).rows[0];
 await pg.exec('begin');
 await pg.exec("create or replace function public.can_edit_content() returns boolean language sql stable security definer set search_path='' as $$ select true $$");
 try { await pg.exec(file('supabase/rollback/editor-roles-disable.sql').replace(/^begin;/m,'')); throw Error('rollback accepted function drift'); } catch(e) { if(!e.message.includes('function drift')) throw e; await pg.exec('rollback'); }
 await pg.exec(file('supabase/rollback/editor-roles-disable.sql'));
 const after=(await pg.query('select * from events where id=$1',[first.id])).rows[0];
 if(JSON.stringify(snapshot)!==JSON.stringify(after)) throw Error('rollback changed event data');
 if((await pg.query('select count(*)::integer n from public.editor_users where user_id=$1',[editor])).rows[0].n!==1)throw Error('rollback deleted membership');
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[editor]);
 const editorAccess=(await pg.query('select public.can_edit_content() allowed, public.effective_role() role')).rows[0];
 if(editorAccess.allowed||editorAccess.role!==null)throw Error('editor remains enabled');
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 const adminAccess=(await pg.query('select public.can_edit_content() allowed, public.effective_role() role')).rows[0];
 if(!adminAccess.allowed||adminAccess.role!=='admin')throw Error('admin access lost');
 if((await pg.query("select has_function_privilege('service_role','public.set_editor_role(uuid,uuid,boolean)','execute') allowed")).rows[0].allowed)throw Error('role writes still enabled');
 console.log('PASS selective disable preserves new event data and editor membership, rejects drift, disables Editor and retains Admin');
} catch(e) { console.error("FAIL:",e.message); process.exitCode=1 } finally {await pg.close()}
