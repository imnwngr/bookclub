// Supabase Edge runtime; this module is never imported by Vite.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
declare const Deno: { env: {get(key:string):string|undefined}; serve(handler:(r:Request)=>Promise<Response>):void };
const origin = "https://imnwngr.github.io";
const cors = {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
Deno.serve(async request => {
 const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
 let invited=false;
 try {
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return reply(405,{error:'POST required'});
 const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!key||!anon)return reply(503,{error:'Server configuration missing'});
 const token=request.headers.get('Authorization')??'';
 const caller=createClient(url,anon,{global:{headers:{Authorization:token}},auth:{persistSession:false}});
 const user=await caller.auth.getUser();if(user.error||!user.data.user)return reply(401,{error:'Session missing or expired'});
 const admin=await caller.rpc('is_admin');if(admin.error||admin.data!==true)return reply(403,{error:'Admin required'});
 let body:Record<string,unknown>;try{body=await request.json()}catch{return reply(400,{error:'Invalid JSON'})}
 if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!['action','email','role','user_id'].includes(k))||body.role!=='editor'||!['invite','grant','revoke'].includes(String(body.action)))return reply(400,{error:'Only Editor actions are supported'});
 if(body.action==='invite')return reply(403,{error:'Invitations are disabled pending safety verification'});
 const mode=Deno.env.get('BOOKCLUB_ROLE_MODE');
 if(mode!=='fixture'&&mode!=='live')return reply(503,{error:'Role operation mode is not configured'});
 const fixture=Deno.env.get('BOOKCLUB_ROLE_FIXTURE_USER_ID');
 if(mode==='fixture'&&(!fixture||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fixture)))return reply(503,{error:'Fixture account is not configured'});
 if(mode==='fixture'&&body.action==='invite')return reply(403,{error:'Invitations are disabled in fixture mode'});
 const service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 let target:string|undefined;
 if(body.action==='revoke') {if(typeof body.user_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id))return reply(400,{error:'Invalid account ID'});target=body.user_id;}
 else {
 if(typeof body.email!=='string'||body.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))return reply(400,{error:'Invalid email'});
 const email=body.email.trim().toLowerCase();let found=false;
 for(let page=1;page<=100;page++){
 const users=await service.auth.admin.listUsers({page,perPage:100});if(users.error)return reply(502,{error:'Account lookup failed'});
 const match=users.data.users.find(u=>u.email?.toLowerCase()===email);if(match){if(match.is_anonymous || (match.banned_until && new Date(match.banned_until).getTime()>Date.now()))return reply(409,{error:'Account is not eligible'});target=match.id;found=true;break;}
 if(users.data.users.length<100){found=true;break;}
 }
 if(!found)return reply(503,{error:'Account directory too large; administrator assistance required'});
 if(body.action==='invite'&&target)return reply(409,{error:'Account already exists; use grant Editor'});
 if(body.action==='grant'&&!target)return reply(404,{error:'Account not found'});
 if(!target){const result=await service.auth.admin.inviteUserByEmail(email,{redirectTo:'https://imnwngr.github.io/bookclub/auth/accept'});if(result.error||!result.data.user)return reply(409,{error:'Invitation failed or already pending'});target=result.data.user.id;invited=true;}
 }
 if(mode==='fixture'&&target?.toLowerCase()!==fixture?.toLowerCase())return reply(403,{error:'Only the configured fixture may be changed'});
 const result=await service.rpc('set_editor_role',{p_actor:user.data.user.id,p_target:target,p_grant:body.action!=='revoke'});
 if(result.error)return reply(invited?502:result.error.code==='42501'?403:409,{error:invited?'Invitation sent but Editor grant failed; grant access to existing account to recover':'Role operation refused',partial:invited,code:result.error.code});
 return reply(200,{ok:true,invited});
 } catch { return reply(502,{error:invited?'Invitation sent; role update status unknown. Verify account before retrying.':'Request failed. Verify account status before retrying.',partial:invited}); }
});
