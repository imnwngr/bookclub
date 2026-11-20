// @vitest-environment node
import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { hsvBaseline, adminId, guestId, sqlFile } from "./helpers/hsvDatabase";
let pg: PGlite;
let oldEvent: Record<string, unknown>, snapshots: unknown[], aliases: unknown[];
const migration = sqlFile(
  "supabase/migrations/202611200001_event_types_theme.sql",
);
beforeAll(async () => {
  ({ pg } = await hsvBaseline());
  oldEvent = (
    await pg.query<Record<string, unknown>>(
      "select * from events where code='legacy-fixture'",
    )
  ).rows[0];
  snapshots = (await pg.query("select * from event_guests order by id")).rows;
  aliases = (await pg.query("select * from invitation_aliases order by id"))
    .rows;
}, 30000);
afterAll(async () => {
  await pg?.close();
});
const save = async (body: object, guests = [guestId]) =>
  (
    await pg.query<{ e: Record<string, unknown> }>(
      "select save_event($1,$2) e",
      [JSON.stringify(body), guests],
    )
  ).rows[0].e;
it("rolls back all changes if a postflight fails, then applies the exact v3 migration preserving legacy records", async () => {
  await expect(
    pg.exec(migration.replace(/commit;\s*$/, "select 1/0; commit;")),
  ).rejects.toThrow();
  await pg.exec("rollback");
  expect(
    (await pg.query("select * from events where code='legacy-fixture'"))
      .rows[0],
  ).toEqual(oldEvent);
  await pg.exec(migration);
  expect(
    (await pg.query("select * from events where code='legacy-fixture'"))
      .rows[0],
  ).toEqual({
    ...oldEvent,
    event_type: "invitation",
    theme: { version: 1, primary: "#174b78" },
  });
  expect(
    (await pg.query("select * from event_guests order by id")).rows,
  ).toEqual(snapshots);
  expect(
    (await pg.query("select * from invitation_aliases order by id")).rows,
  ).toEqual(aliases);
  await expect(pg.exec(migration)).rejects.toThrow("Already applied");
  await pg.exec("rollback");
});
it("saves congratulations without invented dates or venue and resolves the exact primary snapshot", async () => {
  await pg.exec("set role authenticated");
  const created = await save({
    code: "congratulations",
    title: "Thiệp kiểm thử",
    event_type: "congratulation",
    starts_at: null,
    ends_at: null,
    status: "published",
    theme: { version: 1, primary: "#873c42" },
    agenda: [],
  });
  expect(created).toMatchObject({
    starts_at: null,
    ends_at: null,
    maps_url: "",
    venue_name: "",
    theme: { version: 1, primary: "#873c42" },
  });
  await pg.exec("reset role");
  const alias = (
    await pg.query<{ primary_alias: string }>(
      "select primary_alias from event_guests where event_id=$1",
      [created.id],
    )
  ).rows[0].primary_alias;
  await pg.exec("set role anon");
  const result = (
    await pg.query<{
      r: {
        event: Record<string, unknown>;
        invitation: Record<string, unknown>;
      };
    }>("select resolve_invitation('congratulations',$1) r", [alias])
  ).rows[0].r;
  expect(result.event).toMatchObject({
    event_type: "congratulation",
    starts_at: null,
    ends_at: null,
  });
  expect(result.invitation).toMatchObject({
    salutation: "Thầy ThS.",
    name: "Nguyễn Hoàng Viện",
  });
  expect(
    (
      await pg.query<{ r: unknown }>(
        "select resolve_invitation('congratulations','secondary') r",
      )
    ).rows[0].r,
  ).toBeNull();
  await pg.exec("reset role");
});
it("rejects missing invitation schedule, invalid types/themes/reserved slugs and non-editor writes", async () => {
  for (const changes of [
    { event_type: "invitation" },
    { event_type: "other" },
    { theme: { version: 2, primary: "#123456" } },
    { theme: { version: 1, primary: "red" } },
    { theme: { version: 1, primary: "#123456", css: "url(x)" } },
    { code: "thiep-chuc" },
    { code: "thiep-moi" },
  ])
    await expect(
      save({
        code: "invalid",
        title: "Fixture",
        status: "draft",
        event_type: "congratulation",
        ...changes,
      }),
    ).rejects.toThrow();
  await pg.exec("set role anon");
  await expect(save({})).rejects.toThrow();
  await pg.exec("reset role");
  await pg.query("select set_config('request.jwt.claim.sub','',false)");
  await pg.exec("set role authenticated");
  await expect(save({})).rejects.toThrow();
  await pg.exec("reset role");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    adminId,
  ]);
});
it("changing type preserves schedule, media, snapshots and optimistic concurrency; draft is private", async () => {
  const row = (
    await pg.query<Record<string, unknown>>(
      "select * from events where code='legacy-fixture'",
    )
  ).rows[0];
  const input = {
    ...row,
    event_type: "congratulation",
    theme: { version: 1, primary: "#ffffff" },
  };
  await pg.query("select save_event($1,$2,$3,$4)", [
    JSON.stringify(input),
    [guestId],
    row.id,
    row.updated_at,
  ]);
  const after = (
    await pg.query<Record<string, unknown>>(
      "select * from events where id=$1",
      [row.id],
    )
  ).rows[0];
  expect(after).toMatchObject({
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    music_path: row.music_path,
    venue_image_path: row.venue_image_path,
  });
  expect(
    (
      await pg.query(
        "select * from event_guests where event_id=$1 order by id",
        [row.id],
      )
    ).rows,
  ).toEqual(snapshots);
  await expect(
    pg.query("select save_event($1,$2,$3,$4)", [
      JSON.stringify(input),
      [guestId],
      row.id,
      row.updated_at,
    ]),
  ).rejects.toThrow("Concurrent update");
  await pg.query("select set_config('request.jwt.claim.sub','',false)");
  await pg.exec("set role anon");
  expect(
    (await pg.query("select * from events where code='legacy-fixture'")).rows,
  ).toHaveLength(0);
  await pg.exec("reset role");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    adminId,
  ]);
});
