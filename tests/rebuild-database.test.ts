// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite();
const uid = "20000000-0000-4000-8000-000000000001";
const guest = "10000000-0000-4000-8000-000000000001";
let event: { id: string; code: string; updated_at: string };
const payload = {
  code: "",
  title: "Họp mặt sách",
  description: "",
  starts_at: "2099-01-01T01:00:00Z",
  ends_at: "2099-01-01T03:00:00Z",
  status: "draft",
  location_method: "url",
  maps_url: "https://maps.app.goo.gl/test",
  agenda: [{ time: "08:00", description: "Khai mạc", highlight: true }],
};
beforeAll(async () => {
  await pg.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;",
  );
  await pg.exec(readFileSync("supabase/rebuild-v110/02-schema.sql", "utf8"));
  await pg.exec(readFileSync("supabase/rebuild-v110/03-seed.sql", "utf8"));
  await pg.query("insert into auth.users values($1)", [uid]);
  await pg.query("insert into admin_users(user_id) values($1)", [uid]);
}, 30000);
afterAll(() => pg.close());
async function role<T>(user: string, sql: string, args: unknown[] = []) {
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await pg.exec(`set role ${user ? "authenticated" : "anon"}`);
  try {
    return await pg.query<T>(sql, args);
  } finally {
    await pg.exec("reset role");
  }
}
it("seeds exactly ten canonical aliases without legacy directory or code-history columns", async () => {
  const r = await pg.query<{ n: number }>(
    "select count(*)::int n from guests where active and primary_alias=guest_slug_v110(name)",
  );
  expect(r.rows[0].n).toBe(10);
  expect(
    (await pg.query("select to_regclass('public.event_codes') as history"))
      .rows[0],
  ).toEqual({ history: null });
  expect(
    (
      await pg.query(
        "select column_name from information_schema.columns where table_name='guests' and column_name in ('default_aliases','legacy_default_aliases')",
      )
    ).rows,
  ).toHaveLength(0);
});
it("admin saves draft with autoslug, agenda, selection and snapshot", async () => {
  const r = await role<{ e: typeof event & { agenda: unknown[] } }>(
    uid,
    "select save_event($1,$2) e",
    [JSON.stringify(payload), [guest]],
  );
  event = r.rows[0].e;
  expect(event.code).toBe("hop-mat-sach");
  expect(r.rows[0].e.agenda).toHaveLength(1);
  expect(
    (
      await pg.query(
        "select primary_alias,description from event_guests where event_id=$1",
        [event.id],
      )
    ).rows[0],
  ).toMatchObject({ primary_alias: "nguyen-hoang-vien" });
});
it("anonymous and nonadmin cannot read draft or write through RPC", async () => {
  expect((await role("", "select * from events")).rows).toHaveLength(0);
  expect(
    (
      await role<{ e: unknown }>("", "select resolve_invitation($1,$2) e", [
        event.code,
        "nguyen-hoang-vien",
      ])
    ).rows[0].e,
  ).toBeNull();
  await expect(
    role("20000000-0000-4000-8000-000000000002", "select save_event($1,$2)", [
      JSON.stringify(payload),
      [guest],
    ]),
  ).rejects.toThrow("Admin required");
});
it("publishes and renames preserving UUID and snapshot, without historical redirect", async () => {
  await pg.query(
    "update guests set description='Changed directory' where id=$1",
    [guest],
  );
  const r = await role<{ e: typeof event }>(
    uid,
    "select save_event($1,$2,$3,$4) e",
    [
      JSON.stringify({ ...payload, code: "new-code", status: "published" }),
      [guest],
      event.id,
      event.updated_at,
    ],
  );
  expect(r.rows[0].e.id).toBe(event.id);
  expect(
    (
      await role<{ e: unknown }>("", "select get_event_v110($1) e", [
        event.code,
      ])
    ).rows[0].e,
  ).toBeNull();
  const invitation = await role<{ e: { invitation: { description: string } } }>(
    "",
    "select resolve_invitation($1,$2) e",
    ["new-code", "nguyen-hoang-vien"],
  );
  expect(invitation.rows[0].e.invitation.description).not.toBe(
    "Changed directory",
  );
  event = r.rows[0].e;
});
it("keeps private storage and prevents anonymous uploads; cascades only event fixtures", async () => {
  expect(
    (
      await pg.query(
        "select public from storage.buckets where id='bookclub-venues'",
      )
    ).rows[0],
  ).toEqual({ public: false });
  await expect(
    role(
      "",
      "insert into storage.objects(bucket_id,name) values('bookclub-venues','forbidden.png')",
    ),
  ).rejects.toThrow();
  await role(uid, "delete from events where id=$1", [event.id]);
  expect((await pg.query("select * from event_guests")).rows).toHaveLength(0);
  expect(
    (await pg.query("select * from invitation_aliases")).rows,
  ).toHaveLength(0);
  expect(
    (await pg.query("select * from event_agenda_items")).rows,
  ).toHaveLength(0);
  expect((await pg.query("select * from auth.users")).rows).toHaveLength(1);
});
it("rejects duplicate codes, alias edits and stale writes atomically", async () => {
  const a = await role<{ e: typeof event }>(uid, "select save_event($1,$2) e", [
    JSON.stringify({ ...payload, code: "atomic-a" }),
    [guest],
  ]);
  const b = await role<{ e: typeof event }>(uid, "select save_event($1,$2) e", [
    JSON.stringify({ ...payload, code: "atomic-b" }),
    [guest],
  ]);
  const original = a.rows[0].e;
  await expect(
    role(uid, "select save_event($1,$2,$3,$4)", [
      JSON.stringify({ ...payload, code: "atomic-b", title: "Must roll back" }),
      [guest],
      original.id,
      original.updated_at,
    ]),
  ).rejects.toThrow();
  const invitation = (
    await pg.query<{ id: string }>(
      "select id from event_guests where event_id=$1",
      [original.id],
    )
  ).rows[0];
  await expect(
    role(uid, "select save_event($1,$2,$3,$4)", [
      JSON.stringify({
        ...payload,
        code: "atomic-a",
        title: "Must also roll back",
        agenda: [{ time: "24:00", description: "Invalid", highlight: false }],
      }),
      [guest],
      original.id,
      original.updated_at,
    ]),
  ).rejects.toThrow();
  await expect(
    role(uid, "select save_event($1,$2,$3,$4)", [
      JSON.stringify({
        ...payload,
        code: "atomic-a",
        invitation_edits: [{ id: invitation.id, aliases: ["removed-primary"] }],
      }),
      [guest],
      original.id,
      original.updated_at,
    ]),
  ).rejects.toThrow("Primary alias must remain");
  await expect(
    role(uid, "select save_event($1,$2,$3,$4)", [
      JSON.stringify({ ...payload, code: "atomic-a" }),
      [guest],
      original.id,
      "2000-01-01T00:00:00Z",
    ]),
  ).rejects.toThrow("Concurrent update");
  expect(
    (await pg.query("select title from events where id=$1", [original.id]))
      .rows[0],
  ).toEqual({ title: payload.title });
  await role(uid, "delete from events where id=any($1)", [
    [original.id, b.rows[0].e.id],
  ]);
});
it("generates canonical suffix for invitation collisions and never replaces another guest alias", async () => {
  const other = "10000000-0000-4000-8000-000000000002";
  const a = await role<{ e: typeof event }>(uid, "select save_event($1,$2) e", [
    JSON.stringify({ ...payload, code: "alias-conflict" }),
    [guest],
  ]);
  const id = a.rows[0].e.id;
  const eg = (
    await pg.query<{ id: string }>(
      "select id from event_guests where event_id=$1",
      [id],
    )
  ).rows[0].id;
  await role(
    uid,
    "insert into invitation_aliases(event_id,event_guest_id,alias) values($1,$2,$3)",
    [id, eg, "nguyen-phuc-huy"],
  );
  await role(uid, "select save_event($1,$2,$3,$4)", [
    JSON.stringify({ ...payload, code: "alias-conflict" }),
    [guest, other],
    id,
    a.rows[0].e.updated_at,
  ]);
  expect(
    (
      await pg.query(
        "select primary_alias from event_guests where event_id=$1 and guest_id=$2",
        [id, other],
      )
    ).rows[0],
  ).toEqual({ primary_alias: "nguyen-phuc-huy-2" });
  expect(
    (
      await pg.query(
        "select event_guest_id from invitation_aliases where event_id=$1 and alias=$2",
        [id, "nguyen-phuc-huy"],
      )
    ).rows[0],
  ).toEqual({ event_guest_id: eg });
  await role(uid, "delete from events where id=$1", [id]);
});
it("Storage RLS hides Draft images, exposes Published only, blocks nonadmin writes and referenced deletion", async () => {
  const path =
    "30000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002.png";
  await role(
    uid,
    "insert into venue_image_uploads(path,created_by) values($1,$2)",
    [path, uid],
  );
  await role(
    uid,
    "insert into storage.objects(bucket_id,name) values('bookclub-venues',$1)",
    [path],
  );
  const a = await role<{ e: typeof event }>(uid, "select save_event($1,$2) e", [
    JSON.stringify({ ...payload, code: "storage-rls", venue_image_path: path }),
    [guest],
  ]);
  expect(
    (await role("", "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  expect(
    (await role(uid, "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await role(
        uid,
        "delete from storage.objects where name=$1 returning name",
        [path],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(
    role(
      "20000000-0000-4000-8000-000000000002",
      "insert into storage.objects(bucket_id,name) values('bookclub-venues',$1)",
      [path + "bad"],
    ),
  ).rejects.toThrow();
  await role(uid, "update events set status='published' where id=$1", [
    a.rows[0].e.id,
  ]);
  expect(
    (await role("", "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  await role(uid, "update events set status='draft' where id=$1", [
    a.rows[0].e.id,
  ]);
  expect(
    (await role("", "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  await role(uid, "delete from events where id=$1", [a.rows[0].e.id]);
  expect(
    (await role(uid, "select * from unused_venue_images()")).rows,
  ).toHaveLength(1);
  expect(
    (
      await role(
        uid,
        "delete from storage.objects where name=$1 returning name",
        [path],
      )
    ).rows,
  ).toHaveLength(1);
  await role(uid, "delete from venue_image_uploads where path=$1", [path]);
});
