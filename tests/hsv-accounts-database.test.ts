// @vitest-environment node
import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { hsvBaseline, adminId, sqlFile } from "./helpers/hsvDatabase";
let pg: PGlite;
const target = "20000000-0000-4000-8000-000000000077";
const requestId = "30000000-0000-4000-8000-000000000001";
const begin = async (email: string, actor = adminId, allow = true) =>
  (
    await pg.query<{ r: { state: string; lease: string; target: string } }>(
      "select begin_editor_add($1,$2,$3,$4) r",
      [actor, email, requestId, allow],
    )
  ).rows[0].r;
const finish = async (
  email: string,
  lease: string,
  id: string | null,
  actor = adminId,
) =>
  (
    await pg.query<{ r: { state: string; account_status?: string } }>(
      "select finish_editor_add($1,$2,$3,$4) r",
      [actor, email, lease, id],
    )
  ).rows[0].r;
beforeAll(async () => {
  ({ pg } = await hsvBaseline());
  await pg.exec(
    sqlFile("supabase/migrations/202611200001_event_types_theme.sql"),
  );
  await pg.exec(
    sqlFile("supabase/migrations/202611200002_editor_add_operations.sql"),
  );
}, 30000);
afterAll(async () => {
  await pg?.close();
});
it("service-only entry points reject anonymous, Editor and direct ledger access", async () => {
  for (const role of ["anon", "authenticated"]) {
    await pg.exec(`set role ${role}`);
    await expect(begin("blocked@fixture.invalid")).rejects.toThrow();
    await expect(
      pg.query("select * from editor_add_operations"),
    ).rejects.toThrow();
    await pg.exec("reset role");
  }
  await pg.exec("set role service_role");
  await expect(begin("blocked@fixture.invalid", target)).rejects.toThrow(
    "Admin required",
  );
  await pg.exec("reset role");
});
it("claims one send for concurrent/retried email, records invitation then grants atomically inside SQL", async () => {
  await pg.exec("set role service_role");
  const claim = await begin(" Invite@fixture.invalid ");
  expect(claim.state).toBe("invite");
  expect((await begin("invite@fixture.invalid")).state).toBe("processing");
  await pg.exec("reset role");
  await pg.query(
    "insert into auth.users(id,email,invited_at) values($1,'invite@fixture.invalid',now())",
    [target],
  );
  await pg.exec("set role service_role");
  expect(await finish("invite@fixture.invalid", claim.lease, target)).toEqual({
    state: "granted",
    account_status: "invited",
  });
  expect((await begin("invite@fixture.invalid")).state).toBe("already_editor");
  await pg.exec("reset role");
  expect(
    (await pg.query("select * from editor_users where user_id=$1", [target]))
      .rows,
  ).toHaveLength(1);
});
it("lost response never permits a second send, but recovers an Auth-created account without email", async () => {
  const claim = await begin("lost@fixture.invalid");
  expect(await finish("lost@fixture.invalid", claim.lease, null)).toEqual({
    state: "delivery_unknown",
  });
  expect((await begin("lost@fixture.invalid")).state).toBe("delivery_unknown");
  const lost = "20000000-0000-4000-8000-000000000078";
  await pg.query(
    "insert into auth.users(id,email,invited_at) values($1,'lost@fixture.invalid',now())",
    [lost],
  );
  const recovery = await begin("lost@fixture.invalid");
  expect(recovery.state).toBe("grant");
  expect(
    (await finish("lost@fixture.invalid", recovery.lease, lost)).state,
  ).toBe("granted");
});
it("expired worker lease and absent target remain uncertain without automatic resend", async () => {
  await begin("timeout@fixture.invalid");
  await pg.query(
    "update editor_add_operations set lease_until=now()-interval '1 minute' where email='timeout@fixture.invalid'",
  );
  expect((await begin("timeout@fixture.invalid")).state).toBe(
    "delivery_unknown",
  );
  expect(
    (await begin("not-enabled@fixture.invalid", adminId, false)).state,
  ).toBe("invitation_not_ready");
  expect(
    (
      await pg.query(
        "select * from editor_add_operations where email='not-enabled@fixture.invalid'",
      )
    ).rows,
  ).toHaveLength(0);
});
it("a revoke prevents an old successful request or delayed worker from restoring access", async () => {
  const id = "20000000-0000-4000-8000-000000000085";
  const email = "revoke-retry@fixture.invalid";
  await pg.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
    [id, email],
  );
  const claim = await begin(email);
  expect((await finish(email, claim.lease, id)).state).toBe("granted");
  await pg.query("select set_editor_role($1,$2,false)", [adminId, id]);
  expect((await begin(email)).state).toBe("role_changed");
  expect((await finish(email, claim.lease, id)).state).toBe("role_changed");
  expect(
    (await pg.query("select * from editor_users where user_id=$1", [id])).rows,
  ).toHaveLength(0);
  const next = (
    await pg.query<{ r: { state: string; lease: string } }>(
      "select begin_editor_add($1,$2,$3,true) r",
      [adminId, email, "30000000-0000-4000-8000-000000000002"],
    )
  ).rows[0].r;
  expect(next.state).toBe("grant");
  // Another grant followed by revoke while the first worker is delayed.
  await pg.query("select set_editor_role($1,$2,true)", [adminId, id]);
  await pg.query("select set_editor_role($1,$2,false)", [adminId, id]);
  expect((await finish(email, next.lease, id)).state).toBe("role_changed");
  expect(
    (await pg.query("select * from editor_users where user_id=$1", [id])).rows,
  ).toHaveLength(0);
});
it("rejects protected/banned accounts and rechecks Admin after Auth delivery", async () => {
  expect((await begin("admin@fixture.invalid")).state).toBe("admin_protected");
  await pg.query(
    "update auth.users set banned_until='2099-01-01' where id=$1",
    [target],
  );
  expect((await begin("invite@fixture.invalid")).state).toBe(
    "account_ineligible",
  );
  await pg.query("update auth.users set banned_until=null where id=$1", [
    target,
  ]);
  const id = "20000000-0000-4000-8000-000000000079";
  await pg.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'race@fixture.invalid',now())",
    [id],
  );
  const claim = await begin("race@fixture.invalid");
  await pg.query("delete from admin_users where user_id=$1", [adminId]);
  expect((await finish("race@fixture.invalid", claim.lease, id)).state).toBe(
    "grant_failed",
  );
  expect(
    (await pg.query("select * from editor_users where user_id=$1", [id])).rows,
  ).toHaveLength(0);
  await pg.query("insert into admin_users(user_id) values($1)", [adminId]);
  const next = await begin("race@fixture.invalid");
  expect((await finish("race@fixture.invalid", claim.lease, id)).state).toBe(
    "processing",
  );
  expect((await finish("race@fixture.invalid", next.lease, id)).state).toBe(
    "granted",
  );
});
it("only Admin can inspect recovery and no account is escalated to Admin", async () => {
  await pg.exec("set role authenticated");
  expect(
    (await pg.query("select * from editor_add_recovery()")).rows,
  ).toHaveLength(1);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    target,
  ]);
  await expect(pg.query("select * from editor_add_recovery()")).rejects.toThrow(
    "Admin required",
  );
  await pg.exec("reset role");
  expect((await pg.query("select * from admin_users")).rows).toHaveLength(1);
});
