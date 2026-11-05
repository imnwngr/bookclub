// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite();
const uid = "20000000-0000-4000-8000-000000000001";
const gid = "10000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  await pg.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  await pg.exec(
    readFileSync("supabase/migrations/202611030001_foundation.sql", "utf8"),
  );
  await pg.exec(readFileSync("supabase/seed.sql", "utf8"));
  await pg.query("insert into auth.users values($1)", [uid]);
  await pg.query("insert into public.admin_users(user_id) values($1)", [uid]);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await pg.exec(
    readFileSync("supabase/migrations/202611040001_v110.sql", "utf8"),
  );
}, 30000);
afterAll(() => pg.close());
it("keeps v1.0 RPC create/update/read working after migration 1 without Storage migration", async () => {
  await pg.exec("set role authenticated");
  try {
    const input = {
      code: "v100-client",
      title: "v1.0 payload",
      description: "old fields only",
      starts_at: "2099-01-01T01:00:00Z",
      ends_at: "2099-01-01T02:00:00Z",
      status: "published",
      venue_name: "Old venue",
      address: "Old address",
      directions: "Keep",
      latitude: 10,
      longitude: 105,
      place_id: "",
      maps_url: "",
    };
    const created = (
      await pg.query<{ e: Record<string, unknown> }>(
        "select public.save_event($1,$2) e",
        [JSON.stringify(input), [gid]],
      )
    ).rows[0].e;
    const updated = (
      await pg.query<{ e: Record<string, unknown> }>(
        "select public.save_event($1,$2,$3,$4) e",
        [
          JSON.stringify({ ...input, title: "Updated from old client" }),
          [gid],
          created.id,
          created.updated_at,
        ],
      )
    ).rows[0].e;
    expect(updated.id).toBe(created.id);
    expect(updated.latitude).toBe(10);
    expect(updated.address).toBe("Old address");
    expect(
      (
        await pg.query("select * from public.events where code=$1", [
          "v100-client",
        ])
      ).rows,
    ).toHaveLength(1);
    const alias = (
      await pg.query<{ primary_alias: string }>(
        "select primary_alias from public.event_guests where event_id=$1",
        [created.id],
      )
    ).rows[0].primary_alias;
    expect(
      (
        await pg.query<{ r: unknown }>(
          "select public.resolve_invitation($1,$2) r",
          ["v100-client", alias],
        )
      ).rows[0].r,
    ).not.toBeNull();
  } finally {
    await pg.exec("reset role");
  }
});
it("retains v1.0 explicit directory alias edits as canonical plus archived secondary values", async () => {
  await pg.exec("set role authenticated");
  try {
    await pg.query("update public.guests set default_aliases=$1 where id=$2", [
      ["edited-main", "edited-secondary"],
      gid,
    ]);
    const g = (
      await pg.query<{
        primary_alias: string;
        default_aliases: string[];
        legacy_default_aliases: string[];
      }>("select * from public.guests where id=$1", [gid])
    ).rows[0];
    expect(g.primary_alias).toBe("edited-main");
    expect(g.default_aliases).toEqual(["edited-main"]);
    expect(g.legacy_default_aliases).toContain("edited-secondary");
  } finally {
    await pg.exec("reset role");
  }
});
it("does not grant client roles trigger-helper execute privileges", async () => {
  for (const role of ["anon", "authenticated"])
    for (const fn of [
      "public.guest_alias_v110()",
      "public.protect_event_code()",
      "public.remember_event_code_v110()",
    ]) {
      const r = await pg.query<{ allowed: boolean }>(
        "select has_function_privilege($1,$2,$3) allowed",
        [role, fn, "EXECUTE"],
      );
      expect(r.rows[0].allowed).toBe(false);
    }
});
