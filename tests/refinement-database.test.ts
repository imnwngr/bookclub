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
it("postflight JSON has one row and confirms agenda, RLS and permissions", async () => {
  const r = await pg.query<{
    refinement_postflight: {
      agenda_count: number;
      legacy_null_end_and_book: number;
      rls: { enabled: boolean }[];
      privileges: {
        anon_save: boolean;
        authenticated_save: boolean;
        authenticated_alias_insert: boolean;
      };
    };
  }>(readFileSync("supabase/refinement-postflight-json.sql", "utf8"));
  expect(r.rows).toHaveLength(1);
  expect(r.fields).toHaveLength(1);
  const v = r.rows[0].refinement_postflight;
  expect(v.agenda_count).toBe(2);
  expect(v.legacy_null_end_and_book).toBe(2);
  expect(v.rls).toHaveLength(7);
  expect(v.rls.every((x) => x.enabled)).toBe(true);
  expect(v.privileges).toMatchObject({
    anon_save: false,
    authenticated_save: true,
    authenticated_alias_insert: false,
  });
});
it("updates only matching directory and Draft snapshot and preserves both agenda IDs", async () => {
  const expected =
    "Ủy viên Ban Chấp hành Thành đoàn Cần Thơ, Bí thư Đoàn Trường, Phó Trưởng phòng Kiểm tra – Pháp chế và Triển khai Chiến lược và Truyền thông";
  expect(
    (await pg.query("select description from guests where id=$1", [guest]))
      .rows[0].description,
  ).toBe(expected);
  expect(
    (await pg.query("select description from event_guests where id=$1", [inv]))
      .rows[0].description,
  ).toBe(expected);
  expect(
    (await pg.query("select * from event_agenda_items")).rows,
  ).toHaveLength(2);
  expect(
    (
      await pg.query("select name,description from guests where id=$1", [
        "10000000-0000-4000-8000-000000000002",
      ])
    ).rows[0],
  ).toMatchObject({
    name: "Nguyễn Phúc Huy",
    description:
      "Ủy viên Ban Chấp hành Hội Sinh viên Việt Nam thành phố Cần Thơ, Phó Bí thư Đoàn Trường, Chủ tịch Hội Sinh viên Trường.",
  });
});
it("fails closed on reapplication and rolls back without changing data", async () => {
  await expect(
    pg.exec(
      readFileSync(
        "supabase/migrations/202611050001_ui_refinement.sql",
        "utf8",
      ),
    ),
  ).rejects.toThrow("Migration already applied or schema drift");
  await pg.exec("rollback");
  expect(
    (await pg.query("select * from event_agenda_items")).rows,
  ).toHaveLength(2);
  expect(
    (await pg.query("select description from event_guests where id=$1", [inv]))
      .rows[0].description,
  ).toContain("Triển khai Chiến lược");
});
it("preserves old agenda and alias rows without guessing end times; only primary resolves", async () => {
  expect(
    (
      await pg.query(
        "select time,end_time,icon,description from event_agenda_items order by time",
      )
    ).rows[0],
  ).toEqual({
    time: "08:00",
    end_time: null,
    icon: "book",
    description: "Existing agenda",
  });
  expect(
    (await pg.query("select * from invitation_aliases")).rows,
  ).toHaveLength(1);
  expect(
    (
      await pg.query<{ e: unknown }>(
        "select resolve_invitation('refine-test','old-extra') e",
      )
    ).rows[0].e,
  ).toBeNull();
  expect(
    (
      await pg.query<{ e: unknown }>(
        "select resolve_invitation('refine-test','nguyen-hoang-vien') e",
      )
    ).rows[0].e,
  ).not.toBeNull();
});
it("keeps an unchanged legacy milestone but rejects new milestones without end times", async () => {
  event = (
    await pg.query<{ e: typeof event }>("select save_event($1,$2,$3,$4) e", [
      JSON.stringify(payload),
      [guest],
      event.id,
      event.updated_at,
    ])
  ).rows[0].e;
  expect(
    (await pg.query("select end_time from event_agenda_items")).rows[0]
      .end_time,
  ).toBeNull();
  await expect(
    pg.query("select save_event($1,$2,$3,$4)", [
      JSON.stringify({
        ...payload,
        agenda: [
          { time: "10:00", description: "New without end", highlight: false },
        ],
      }),
      [guest],
      event.id,
      event.updated_at,
    ]),
  ).rejects.toThrow("End time required");
});
it("persists ranges and selected icons through save_event and public RPC", async () => {
  await pg.exec("set role authenticated");
  try {
    event = (
      await pg.query<{ e: typeof event }>("select save_event($1,$2,$3,$4) e", [
        JSON.stringify({
          ...payload,
          agenda: [
            {
              time: "08:00",
              end_time: "09:00",
              icon: "speech",
              description: "Phát biểu",
              highlight: true,
            },
          ],
        }),
        [guest],
        event.id,
        event.updated_at,
      ])
    ).rows[0].e;
  } finally {
    await pg.exec("reset role");
  }
  await pg.query("update events set status='published' where id=$1", [
    event.id,
  ]);
  event = (
    await pg.query<{ updated_at: string }>(
      "select updated_at from events where id=$1",
      [event.id],
    )
  ).rows[0]
    ? {
        ...event,
        updated_at: (
          await pg.query<{ updated_at: string }>(
            "select updated_at from events where id=$1",
            [event.id],
          )
        ).rows[0].updated_at,
      }
    : event;
  await pg.exec("set role anon");
  try {
    const r = await pg.query<{
      e: { agenda: { end_time: string; icon: string }[] };
    }>("select get_event_v110('refine-test') e");
    expect(r.rows[0].e.agenda[0]).toMatchObject({
      end_time: "09:00",
      icon: "speech",
    });
  } finally {
    await pg.exec("reset role");
  }
});
it("blocks secondary aliases by direct API and RPC; malformed range rolls back", async () => {
  await pg.exec("set role authenticated");
  try {
    await expect(
      pg.query(
        "insert into invitation_aliases(event_id,event_guest_id,alias) values($1,$2,$3)",
        [event.id, inv, "new-extra"],
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      pg.query("select save_event($1,$2,$3,$4)", [
        JSON.stringify({
          ...payload,
          agenda: undefined,
          invitation_edits: [
            { id: inv, aliases: ["nguyen-hoang-vien", "nguyen-hoang-vien-2"] },
          ],
        }),
        [guest],
        event.id,
        event.updated_at,
      ]),
    ).rejects.toThrow("Secondary alias editing is disabled");
    await expect(
      pg.query("select save_event($1,$2,$3,$4)", [
        JSON.stringify({
          ...payload,
          agenda: [
            {
              time: "09:00",
              end_time: "08:00",
              icon: "book",
              description: "Invalid",
              highlight: false,
            },
          ],
        }),
        [guest],
        event.id,
        event.updated_at,
      ]),
    ).rejects.toThrow();
  } finally {
    await pg.exec("reset role");
  }
  expect(
    (await pg.query("select end_time,icon from event_agenda_items")).rows[0],
  ).toEqual({ end_time: "09:00", icon: "speech" });
  expect(
    (
      await pg.query(
        "select has_function_privilege('anon','public.save_event(jsonb,uuid[],uuid,timestamptz)','execute') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
});
it("enforces icon whitelist while preserving Draft visibility and nonadmin guard", async () => {
  await expect(
    pg.exec("update public.event_agenda_items set icon='not-an-icon'"),
  ).rejects.toThrow();
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    "20000000-0000-4000-8000-000000000002",
  ]);
  await pg.exec("set role authenticated");
  try {
    await expect(
      pg.query("select save_event($1,$2)", [JSON.stringify(payload), [guest]]),
    ).rejects.toThrow("Admin required");
  } finally {
    await pg.exec("reset role");
  }
  await pg.query("update public.events set status='draft' where id=$1", [
    event.id,
  ]);
  await pg.exec("set role anon");
  try {
    expect(
      (
        await pg.query<{ e: unknown }>(
          "select resolve_invitation('refine-test','nguyen-hoang-vien') e",
        )
      ).rows[0].e,
    ).toBeNull();
  } finally {
    await pg.exec("reset role");
  }
});
