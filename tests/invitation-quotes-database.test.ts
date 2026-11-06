import { validQuoteDocument } from "../src/lib/quoteDocument";
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

it("stores independent quotes, preserves legacy saves, enforces access and clears values",async()=>{
 const audit=(await pg.query<{quote_production_audit:{functions:{signature:string;definition_md5:string}[];tables:unknown[]}}>(readFileSync("supabase/quote-production-audit.sql","utf8"))).rows[0].quote_production_audit;
 expect(audit.functions.some(f=>f.signature.startsWith("save_event(") && f.definition_md5.length===32)).toBe(true);
 expect(audit.tables.length).toBe(7);
 const localHash=(await pg.query<{hash:string}>("select md5(pg_get_functiondef('public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure)) hash")).rows[0].hash;
 const pre=(await pg.query<{quote_preflight:{events_fingerprint:string;events_count:number}}>(readFileSync("supabase/quote-preflight.sql","utf8"))).rows[0].quote_preflight;
 const quoteMigration=readFileSync("supabase/migrations/202611070001_invitation_quotes.sql","utf8");
 await expect(pg.exec(quoteMigration)).rejects.toThrow("Production baseline changed");await pg.exec("rollback");
 await pg.exec(quoteMigration.replace("91ca923e964e16cb3e4eca606b7a1e6b",localHash));
 const post=(await pg.query<{quote_postflight:{events_original_fingerprint:string;events_count:number;anon_save:boolean;authenticated_save:boolean;anon_resolve:boolean}}>(readFileSync("supabase/quote-postflight.sql","utf8"))).rows[0].quote_postflight;
 expect(post.events_original_fingerprint).toBe(pre.events_fingerprint);expect(post.events_count).toBe(pre.events_count);expect(post).toMatchObject({anon_save:false,authenticated_save:true,anon_resolve:true});
 const before=(await pg.query<{e:Record<string,unknown>}>("select get_event_v110($1) e",[payload.code])).rows[0].e;
 expect(before.quote_one).toBe("");expect(before.quote_two).toBeNull();
 const save=async (body:Record<string,unknown>) => (await pg.query<{e:Record<string,unknown>}>("select save_event($1,$2,$3,$4) e",[JSON.stringify(body),[guest],event.id,event.updated_at])).rows[0].e;
 const q={type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Quote riêng"}]}]};
 let updated=await save({...payload,description:"Mô tả riêng",quote_one:"Lời mời",quote_two:q});
 expect(updated.quote_one).toBe("Lời mời");expect(updated.quote_two).toEqual(q);event.updated_at=updated.updated_at as string;
 await pg.exec("select set_config('request.jwt.claim.sub','',false); set role anon");
 expect((await pg.query<{v:unknown}>("select resolve_invitation($1,$2) v",[payload.code,"nguyen-hoang-vien"])).rows[0].v).toBeNull();
 await pg.exec("reset role"); await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 updated=await save({...payload,description:"Đã đổi mô tả"});expect(updated.quote_one).toBe("Lời mời");expect(updated.quote_two).toEqual(q);event.updated_at=updated.updated_at as string;
 updated=await save({...payload,description:"Đã đổi mô tả",quote_one:"Lời mời",quote_two:q,status:"published"});event.updated_at=updated.updated_at as string;
 await pg.exec("select set_config('request.jwt.claim.sub','',false); set role anon");
 const shown=(await pg.query<{v:{event:{quote_one:string;quote_two:unknown}}}>("select resolve_invitation($1,$2) v",[payload.code,"nguyen-hoang-vien"])).rows[0].v;
 expect(shown.event.quote_one).toBe("Lời mời");expect(shown.event.quote_two).toEqual(q);
 await pg.exec("reset role");await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 updated=await save({...payload,description:"Đã đổi mô tả",quote_one:"",quote_two:null,status:"published"});expect(updated.description).toBe("Đã đổi mô tả");expect(updated.quote_one).toBe("");expect(updated.quote_two).toBeNull();
 await pg.exec("select set_config('request.jwt.claim.sub','',false); set role anon");
 const publicData=(await pg.query<{v:Record<string,unknown>}>("select resolve_invitation($1,$2) v",[payload.code,"nguyen-hoang-vien"])).rows[0].v;expect(publicData).not.toBeNull();
 await expect(pg.query("select save_event($1,$2)",[JSON.stringify(payload),[guest]])).rejects.toThrow();
 await pg.exec("reset role");
},30000);

it("enforces shared quote grammar on validator, event INSERT/UPDATE and atomic RPC",async()=>{
 const text=(value:string,marks:unknown[]=[])=>({type:'text',text:value,marks});
 const doc=(children:unknown[])=>({type:'doc',content:children});
 const para=(children:unknown[])=>({type:'paragraph',attrs:{textAlign:null},content:children});
 const good=[null,doc([]),doc([para([])]),doc([para([text('Chào tiếng Việt')]),para([text('Định dạng',['bold','italic','underline','strike','highlight'].map(type=>({type})))])]),doc([{type:'heading',attrs:{level:3,textAlign:'center'},content:[text('Tiêu đề',[{type:'textStyle',attrs:{color:'#377f7c'}}])]},{type:'orderedList',attrs:{start:2,type:null},content:[{type:'listItem',content:[para([text('Mục')])]}]}])];
 const bad=[{},[],{type:'paragraph'},doc([{type:'script'}]),doc([para([text('x',[{type:'link',attrs:{href:'javascript:alert(1)'}}])])]),doc([{type:'paragraph',attrs:{onclick:'evil'}}]),doc([{type:'heading',attrs:{level:'3'}}]),doc([para([text('x',[{type:'textStyle',attrs:{color:'red'}}])])]),doc([text('sai vị trí')]),doc([{type:'bulletList',content:[para([])]}]),doc([para([text('x'.repeat(10001))])]),doc(Array.from({length:2001},()=>para([]))),doc([para([text('x',[{type:'bold',attrs:{onclick:'x'}}])])]),doc([para([text('x')]),{type:'image',attrs:{src:'x'}}])];
 bad.push(doc([para([text('x'.repeat(9000)),text('x'.repeat(9000)),text('x'.repeat(9000)),text('x'.repeat(9000)),text('x'.repeat(9000)),text('x'.repeat(9000))])]),doc([{type:'paragraph',attrs:{textAlign:['left']}}]),doc([para([text('x',[{type:'highlight',attrs:{color:'red'}}])])]));
 let deep:unknown=para([]);for(let i=0;i<22;i++)deep={type:'bulletList',content:[{type:'listItem',content:[para([]),deep]}]};bad.push(doc([deep]));
 for(const value of good){expect(validQuoteDocument(value)).toBe(true);expect((await pg.query<{v:boolean}>('select valid_quote_document($1::jsonb) v',[value===null?null:JSON.stringify(value)])).rows[0].v).toBe(true);}
 for(const value of bad){expect(validQuoteDocument(value)).toBe(false);expect((await pg.query<{v:boolean}>('select valid_quote_document($1::jsonb) v',[JSON.stringify(value)])).rows[0].v).toBe(false);
 await expect(pg.query('update events set quote_two=$1 where id=$2',[JSON.stringify(value),event.id])).rejects.toThrow();
 await expect(pg.query("insert into events select (jsonb_populate_record(null::public.events,to_jsonb(e)||jsonb_build_object('id',gen_random_uuid(),'code','invalid-quote-test','quote_two',$1::jsonb))).* from events e where id=$2",[JSON.stringify(value),event.id])).rejects.toThrow();}
 const related=async()=> (await pg.query("select jsonb_build_object('guests',(select jsonb_agg(to_jsonb(x) order by id) from guests x),'snapshots',(select jsonb_agg(to_jsonb(x) order by id) from event_guests x),'aliases',(select jsonb_agg(to_jsonb(x) order by id) from invitation_aliases x),'agenda',(select jsonb_agg(to_jsonb(x) order by id) from event_agenda_items x)) v")).rows;
 const relationsBefore=await related();
 const before=(await pg.query('select to_jsonb(e) v from events e where id=$1',[event.id])).rows;
 await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 const current=(await pg.query<{updated_at:string}>('select updated_at from events where id=$1',[event.id])).rows[0];
 await expect(pg.query('select save_event($1,$2,$3,$4)',[JSON.stringify({...payload,title:'Must rollback',quote_two:bad[0]}),[guest],event.id,current.updated_at])).rejects.toThrow();
 expect((await pg.query('select to_jsonb(e) v from events e where id=$1',[event.id])).rows).toEqual(before);
 expect(await related()).toEqual(relationsBefore);
 await pg.exec('begin');await pg.query("update events set title='Rollback fixture' where id=$1",[event.id]);await expect(pg.query('update events set quote_two=$1 where id=$2',[JSON.stringify(bad[0]),event.id])).rejects.toThrow();await pg.exec('rollback');
 expect((await pg.query('select to_jsonb(e) v from events e where id=$1',[event.id])).rows).toEqual(before);expect(await related()).toEqual(relationsBefore);
 expect((await pg.query<{v:boolean}>("select has_function_privilege('anon','public.valid_quote_document(jsonb)','execute') v")).rows[0].v).toBe(false);
},30000);
