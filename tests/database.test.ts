// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const pg = new PGlite();
const admin = "20000000-0000-4000-8000-000000000001";
const ordinary = "20000000-0000-4000-8000-000000000002";
const guest1 = "10000000-0000-4000-8000-000000000001";
const guest2 = "10000000-0000-4000-8000-000000000002";
type E = {
  id: string;
  code: string;
  updated_at: string;
  title: string;
  status: string;
};
let counter = 0;
async function as<T>(
  role: "anon" | "authenticated",
  user: string,
  sql: string,
  args: unknown[] = [],
) {
  await pg.exec(`set role ${role}`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  try {
    return await pg.query<T>(sql, args);
  } finally {
    await pg.exec("reset role");
  }
}
async function save(guests = [guest1], existing?: E, status = "draft") {
  const event = {
    code: existing?.code ?? `test-${++counter}`,
    title: "Sự kiện kiểm thử",
    description: "",
    starts_at: "2026-11-10T01:00:00Z",
    ends_at: "2026-11-10T03:00:00Z",
    status,
    venue_name: "CTUT",
    address: "",
    directions: "",
    latitude: null,
    longitude: null,
    place_id: "",
    maps_url: "",
  };
  const result = await as<{ event: E }>(
    "authenticated",
    admin,
    "select public.save_event($1::jsonb,$2::uuid[],$3::uuid,$4::timestamptz) as event",
    [
      JSON.stringify(event),
      guests,
      existing?.id ?? null,
      existing?.updated_at ?? null,
    ],
  );
  return result.rows[0].event;
}
beforeAll(async () => {
  await pg.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;",
  );
  await pg.exec(
    readFileSync("supabase/migrations/202611030001_foundation.sql", "utf8"),
  );
  await pg.exec(readFileSync("supabase/seed.sql", "utf8"));
  await pg.query("insert into auth.users(id) values($1),($2)", [
    admin,
    ordinary,
  ]);
  await pg.query("insert into public.admin_users(user_id) values($1)", [admin]);
}, 30000);
afterAll(() => pg.close());
describe("PostgreSQL integration (PGlite, auth.uid test shim; not live Supabase)", () => {
  it("provides the exact FK used to disambiguate the alias collection embedding", async () => {
    const constraints = await pg.query<{ conname: string }>(
      "select conname from pg_constraint where conrelid='public.invitation_aliases'::regclass and confrelid='public.event_guests'::regclass and contype='f'",
    );
    expect(constraints.rows.map((r) => r.conname)).toContain(
      "invitation_aliases_event_guest_id_event_id_fkey",
    );
    const reverse = await pg.query<{ conname: string }>(
      "select conname from pg_constraint where conrelid='public.event_guests'::regclass and confrelid='public.invitation_aliases'::regclass and contype='f'",
    );
    expect(reverse.rows.map((r) => r.conname)).toContain(
      "primary_alias_exists",
    );
  });
  it("seeds exactly ten stable guests and preserves user directory changes on reseed", async () => {
    await pg.query(
      "update public.guests set salutation='Thầy ThS.' where id=$1",
      [guest1],
    );
    await pg.exec(readFileSync("supabase/seed.sql", "utf8"));
    expect(
      (
        await pg.query<{ n: number }>(
          "select count(*)::int n from public.guests",
        )
      ).rows[0].n,
    ).toBe(10);
  });
  it("creates invitations only for selected guests with explicit aliases", async () => {
    const event = await save();
    const aliases = await pg.query<{ alias: string }>(
      "select alias from public.invitation_aliases where event_id=$1 order by alias",
      [event.id],
    );
    expect(aliases.rows.map((r) => r.alias)).toEqual([
      "1",
      "nguyen-hoang-vien",
      "nhvien",
    ]);
    expect(
      (
        await pg.query("select * from public.event_guests where event_id=$1", [
          event.id,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("updates selection atomically while preserving previous aliases and snapshots", async () => {
    let event = await save();
    await pg.query("update public.guests set name='Tên cập nhật' where id=$1", [
      guest1,
    ]);
    event = await save([guest1, guest2], event);
    expect(
      (
        await pg.query<{ name: string }>(
          "select name from public.event_guests where event_id=$1 and guest_id=$2",
          [event.id, guest1],
        )
      ).rows[0].name,
    ).toBe("Nguyễn Hoàng Viện");
    expect(
      (
        await pg.query(
          "select * from public.invitation_aliases where event_id=$1 and alias=$2",
          [event.id, "nhvien"],
        )
      ).rows,
    ).toHaveLength(1);
    await save([guest2], event);
    expect(
      (
        await pg.query("select * from public.event_guests where event_id=$1", [
          event.id,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (await pg.query("select * from public.guests where id=$1", [guest1]))
        .rows,
    ).toHaveLength(1);
  });
  it("rejects stale updates, invalid time, duplicate guest IDs and conflicting codes", async () => {
    const event = await save();
    await save([guest1], event);
    await expect(save([guest1], event)).rejects.toThrow("Concurrent update");
    await expect(save([guest1, guest1])).rejects.toThrow("Duplicate guest");
    await expect(
      as(
        "authenticated",
        admin,
        "insert into public.events(code,title,starts_at,ends_at) values($1,$2,$3,$3)",
        ["invalid-time", "Invalid", "2026-11-10Z"],
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        admin,
        "update public.events set code=$1 where id=$2",
        ["admin", event.id],
      ),
    ).rejects.toThrow();
  });
  it("handles colliding default aliases without changing existing invitations", async () => {
    await pg.query(
      "update public.guests set default_aliases=array['nhvien','1'] where id=$1",
      [guest2],
    );
    let event = await save();
    event = await save([guest1, guest2], event);
    const rows = await pg.query<{ primary_alias: string }>(
      "select primary_alias from public.event_guests where event_id=$1 and guest_id=$2",
      [event.id, guest2],
    );
    expect(rows.rows[0].primary_alias).toMatch(/^khach-/);
    await expect(
      as(
        "authenticated",
        admin,
        "insert into public.invitation_aliases(event_id,event_guest_id,alias) select event_id,id,'nhvien' from public.event_guests where event_id=$1 and guest_id=$2",
        [event.id, guest2],
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        admin,
        "delete from public.invitation_aliases where event_id=$1 and alias='nhvien'",
        [event.id],
      ),
    ).rejects.toThrow();
  });
  it("enforces anonymous published-only access and prevents enumerating guest directory", async () => {
    const draft = await save();
    const published = await save([guest1], undefined, "published");
    expect(
      (
        await as("anon", "", "select * from public.events where id=$1", [
          draft.id,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await as("anon", "", "select * from public.events where id=$1", [
          published.id,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await as<{ value: unknown }>(
          "anon",
          "",
          "select public.resolve_invitation($1,'nhvien') as value",
          [draft.code],
        )
      ).rows[0].value,
    ).toBeNull();
    expect(
      (
        await as<{ value: unknown }>(
          "anon",
          "",
          "select public.resolve_invitation($1,'nhvien') as value",
          [published.code],
        )
      ).rows[0].value,
    ).not.toBeNull();
    for (const table of [
      "guests",
      "event_guests",
      "invitation_aliases",
      "admin_users",
    ])
      await expect(
        as("anon", "", `select * from public.${table}`),
      ).rejects.toThrow();
    await expect(
      as(
        "anon",
        "",
        "insert into public.events(code,title,starts_at,ends_at) values('forbidden','X',now(),now()+interval '1 hour')",
      ),
    ).rejects.toThrow();
  });
  it("denies ordinary authenticated users CRUD and admin self-promotion", async () => {
    expect(
      (
        await as<{ value: boolean }>(
          "authenticated",
          ordinary,
          "select public.is_admin() value",
        )
      ).rows[0].value,
    ).toBe(false);
    expect(
      (await as("authenticated", ordinary, "select * from public.guests")).rows,
    ).toHaveLength(0);
    await expect(
      as(
        "authenticated",
        ordinary,
        "insert into public.admin_users(user_id) values($1)",
        [ordinary],
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "authenticated",
        ordinary,
        "insert into public.guests(name) values('Forbidden')",
      ),
    ).rejects.toThrow();
    await expect(
      as("authenticated", ordinary, "select public.save_event('{}','{}')"),
    ).rejects.toThrow("Admin required");
    const event = await save();
    await as(
      "authenticated",
      ordinary,
      "delete from public.events where id=$1",
      [event.id],
    );
    expect(
      (await pg.query("select * from public.events where id=$1", [event.id]))
        .rows,
    ).toHaveLength(1);
  });
  it("cascades deleting event invitations/aliases and preserves directory", async () => {
    const event = await save();
    await as("authenticated", admin, "delete from public.events where id=$1", [
      event.id,
    ]);
    for (const table of ["event_guests", "invitation_aliases"])
      expect(
        (
          await pg.query(`select * from public.${table} where event_id=$1`, [
            event.id,
          ])
        ).rows,
      ).toHaveLength(0);
    expect(
      (await pg.query("select * from public.guests where id=$1", [guest1]))
        .rows,
    ).toHaveLength(1);
  });
});
