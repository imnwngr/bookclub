// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
const admin = "20000000-0000-4000-8000-000000000001";
async function baseline() {
  const pg = new PGlite();
  await pg.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table auth.identities(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function public.rls_auto_enable() returns event_trigger language plpgsql as $$begin return;end$$;",
  );
  await pg.exec(
    "alter default privileges in schema public grant execute on functions to anon, authenticated;",
  );
  await pg.exec(
    readFileSync("supabase/migrations/202611030001_foundation.sql", "utf8"),
  );
  await pg.exec(readFileSync("supabase/seed.sql", "utf8"));
  await pg.query("insert into auth.users values($1),($2)", [
    admin,
    "20000000-0000-4000-8000-000000000002",
  ]);
  await pg.query("insert into admin_users(user_id) values($1)", [admin]);
  await pg.exec(
    "create schema unrelated;create table unrelated.preserved(value text);insert into unrelated.preserved values('keep');insert into events(code,title,starts_at,ends_at) values('old-data','Old',now(),now()+interval '1 hour');",
  );
  await pg.query("select set_config('bookclub.reviewed_admin_uid',$1,false)", [
    admin,
  ]);
  return pg;
}
it("atomic scoped rebuild replaces old data, restores admin, preserves Auth and unrelated schemas", async () => {
  const pg = await baseline();
  try {
    await pg.exec(readFileSync("supabase/rebuild-v110/REBUILD.sql", "utf8"));
    const flags = await pg.query<{ actual: string; expected: string }>(
      readFileSync("supabase/rebuild-v110/06-postflight-flags.sql", "utf8"),
    );
    expect(flags.rows.length).toBe(18);
    expect(flags.rows.filter((row) => row.actual !== row.expected)).toEqual([]);

    expect((await pg.query("select * from events")).rows).toHaveLength(0);
    expect((await pg.query("select * from guests")).rows).toHaveLength(10);
    expect((await pg.query("select * from admin_users")).rows[0]).toMatchObject(
      { user_id: admin },
    );
    expect((await pg.query("select * from auth.users")).rows).toHaveLength(2);
    expect((await pg.query("select * from unrelated.preserved")).rows).toEqual([
      { value: "keep" },
    ]);
    await expect(
      pg.exec(readFileSync("supabase/rebuild-v110/REBUILD.sql", "utf8")),
    ).rejects.toThrow("Inventory drift");
    await pg.exec("rollback");
    expect((await pg.query("select * from guests")).rows).toHaveLength(10);
  } finally {
    await pg.close();
  }
}, 30000);
it("external dependent view makes DROP RESTRICT fail and rolls all previous drops back", async () => {
  const pg = await baseline();
  try {
    await pg.exec(
      "create view unrelated.event_dependency as select * from public.events",
    );
    await expect(
      pg.exec(readFileSync("supabase/rebuild-v110/REBUILD.sql", "utf8")),
    ).rejects.toThrow();
    await pg.exec("rollback");
    expect((await pg.query("select * from events")).rows).toHaveLength(1);
    expect(
      (
        await pg.query(
          "select to_regprocedure('public.save_event(jsonb,uuid[],uuid,timestamptz)') f",
        )
      ).rows[0].f,
    ).not.toBeNull();
    expect((await pg.query("select * from admin_users")).rows).toHaveLength(1);
    expect((await pg.query("select * from storage.buckets")).rows).toHaveLength(
      0,
    );
  } finally {
    await pg.close();
  }
}, 30000);
it("hotfix removes direct and PUBLIC execute while preserving admin guard and other RPC ACLs", async () => {
  const pg = await baseline();
  try {
    await pg.exec(readFileSync("supabase/rebuild-v110/REBUILD.sql", "utf8"));
    await pg.exec(
      "grant execute on function public.save_event(jsonb,uuid[],uuid,timestamptz) to public,anon",
    );
    expect(
      (
        await pg.query(
          "select has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') a",
        )
      ).rows[0].a,
    ).toBe(true);
    const before = await pg.query(
      "select prosrc,proacl::text acl from pg_proc where oid='public.resolve_invitation(text,text)'::regprocedure",
    );
    const body = await pg.query(
      "select prosrc from pg_proc where oid='public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure",
    );
    await pg.exec(
      readFileSync("supabase/hotfixes/save-event-execute.sql", "utf8"),
    );
    await pg.exec(
      readFileSync("supabase/hotfixes/save-event-execute.sql", "utf8"),
    );
    expect(
      (
        await pg.query(
          "select has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') a,has_function_privilege('authenticated','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') b",
        )
      ).rows[0],
    ).toEqual({ a: false, b: true });
    expect(
      (
        await pg.query(
          "select prosrc,proacl::text acl from pg_proc where oid='public.resolve_invitation(text,text)'::regprocedure",
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (
        await pg.query(
          "select prosrc from pg_proc where oid='public.save_event(jsonb,uuid[],uuid,timestamptz)'::regprocedure",
        )
      ).rows,
    ).toEqual(body.rows);
    await pg.exec("set role anon");
    try {
      await expect(
        pg.query("select public.save_event($1,$2)", ["{}", []]),
      ).rejects.toThrow("permission denied for function save_event");
    } finally {
      await pg.exec("reset role");
    }
    await pg.exec("set role authenticated");
    try {
      await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
        "20000000-0000-4000-8000-000000000002",
      ]);
      await expect(
        pg.query("select public.save_event($1,$2)", ["{}", []]),
      ).rejects.toThrow("Admin required");
      await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
        admin,
      ]);
      const saved = await pg.query<{ e: { id: string } }>(
        "select public.save_event($1,$2) e",
        [
          JSON.stringify({
            code: "qa-acl-local",
            title: "ACL test",
            starts_at: "2099-01-01T01:00:00Z",
            ends_at: "2099-01-01T02:00:00Z",
            status: "draft",
            location_method: "url",
            maps_url: "https://maps.app.goo.gl/test",
          }),
          [],
        ],
      );
      expect(saved.rows[0].e.id).toBeTruthy();
      await pg.query("delete from public.events where id=$1", [
        saved.rows[0].e.id,
      ]);
    } finally {
      await pg.exec("reset role");
    }
  } finally {
    await pg.close();
  }
}, 30000);
