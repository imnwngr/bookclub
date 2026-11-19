import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

// Local synthetic database only. No environment connection strings or production credentials.
const bin = path.resolve(process.env.HSV_PG_BIN || ".local/postgresql-tools/pgsql/bin");
const out = path.resolve(".local/hsv-v3/concurrency",new Date().toISOString().replace(/[:.]/g,"-"));
const data = path.join(out,"pgdata");
mkdirSync(out,{recursive:true});
const exe = name => path.join(bin,name+(process.platform==="win32"?".exe":""));
const run = (name,args) => execFileSync(exe(name),args,{encoding:"utf8",windowsHide:true,timeout:30000,...(name==="pg_ctl"?{stdio:"ignore"}:{})});
const args = ["-X","-A","-t","-v","ON_ERROR_STOP=1","-h","127.0.0.1","-p","55439","-U","postgres","-d","postgres"];
const query = sql => run("psql",[...args,"-c",sql]);
if(existsSync(data)) throw Error("Synthetic cluster already exists; use its result or choose a fresh reviewed local location. Never reset it automatically.");
run("initdb",["-D",data,"-U","postgres","--auth=trust","--encoding=UTF8","--no-locale"]);
let started=false;
try {
  run("pg_ctl",["-D",data,"-l",path.join(out,"postgres.log"),"-o","-h 127.0.0.1 -p 55439 -F","-w","start"]);started=true;
  const roles=readFileSync("supabase/migrations/202611080001_editor_roles.sql","utf8");
  const setRole=roles.match(/create function public\.set_editor_role[\s\S]+?grant execute on function public\.set_editor_role[^;]+;/)?.[0];
  assert.ok(setRole,"Expected exact role function source");
  const setup=`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,invited_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.admin_users(user_id uuid primary key references auth.users(id));
    create table public.editor_users(user_id uuid primary key references auth.users(id));
    create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_users where user_id=auth.uid())$$;
    ${setRole}
    create function public.hsv_v3_capabilities() returns jsonb language sql immutable set search_path='' as $$select '{"version":3}'::jsonb$$;
    ${readFileSync("supabase/migrations/202611200002_editor_add_operations.sql","utf8")}
    insert into auth.users(id,email) values('20000000-0000-4000-8000-000000000001','admin@fixture.invalid');
    insert into admin_users values('20000000-0000-4000-8000-000000000001');`;
  const file=path.join(out,"setup.sql");writeFileSync(file,setup);run("psql",[...args,"-f",file]);
  const call="select begin_editor_add('20000000-0000-4000-8000-000000000001','concurrent@fixture.invalid','30000000-0000-4000-8000-000000000001',true)";
  const worker = sql => new Promise((resolve,reject)=>{
    const child=spawn(exe("psql"),[...args,"-c",sql],{windowsHide:true});let output="",errors="";
    child.stdout.on("data",d=>{output+=d;});child.stderr.on("data",d=>{errors+=d;});child.on("error",reject);
    child.on("close",code=>code===0?resolve(output):reject(Error(errors)));
  });
  const results=await Promise.all([worker(`begin;select pg_backend_pid();${call};select pg_sleep(1);commit;`),worker(`begin;select pg_backend_pid();${call};select pg_sleep(1);commit;`)]);
  const states=results.map(r=>JSON.parse(r.split(/\r?\n/).find(l=>l.startsWith('{'))).state).sort();
  const pids=results.map(r=>r.split(/\r?\n/).find(l=>/^\d+$/.test(l)));
  assert.notEqual(pids[0],pids[1]);assert.deepEqual(states,["invite","processing"]);
  assert.equal(query("select count(*) from editor_add_operations").trim(),"1");
  const result={engine:"PostgreSQL 17.11 portable, loopback only",independentSessions:true,distinctPids:true,states,ledgerRows:1,emailSent:0};
  writeFileSync(path.join(out,"result.json"),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {if(started)run("pg_ctl",["-D",data,"-m","fast","-w","stop"]);}
