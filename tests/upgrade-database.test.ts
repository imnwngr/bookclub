// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
const pg = new PGlite();
const id = "20000000-0000-4000-8000-000000000001";
const guest = "10000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  await pg.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
  );
  await pg.exec(
    readFileSync("supabase/migrations/202611030001_foundation.sql", "utf8"),
  );
  await pg.exec(readFileSync("supabase/seed.sql", "utf8"));
  await pg.query("insert into auth.users values($1)", [id]);
  await pg.query("insert into public.admin_users(user_id) values($1)", [id]);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await pg.query("select public.save_event($1,$2)", [
    JSON.stringify({
      code: "legacy-100",
      title: "Legacy",
      starts_at: "2099-01-01T01:00:00Z",
      ends_at: "2099-01-01T02:00:00Z",
      status: "published",
    }),
    [guest],
  ]);
  await pg.exec(
    readFileSync("supabase/migrations/202611040001_v110.sql", "utf8"),
  );
  await pg.exec(
    "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;",
  );
  await pg.exec(
    readFileSync("supabase/migrations/202611040002_venue_storage.sql", "utf8"),
  );
}, 30000);
afterAll(() => pg.close());
it("aborts conflicting canonical directory migration without losing legacy data", async () => {
  const isolated = new PGlite();
  try {
    await isolated.exec(
      "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;",
    );
    await isolated.exec(
      readFileSync("supabase/migrations/202611030001_foundation.sql", "utf8"),
    );
    await isolated.exec(readFileSync("supabase/seed.sql", "utf8"));
    await isolated.exec(
      "insert into public.guests(name) values('Nguyễn Hoàng Viện')",
    );
    await expect(
      isolated.exec(
        readFileSync("supabase/migrations/202611040001_v110.sql", "utf8"),
      ),
    ).rejects.toThrow("Guest canonical alias conflict");
    await isolated.exec("rollback");
    expect(
      (
        await isolated.query(
          "select * from information_schema.columns where table_schema='public' and table_name='guests' and column_name='primary_alias'",
        )
      ).rows,
    ).toHaveLength(0);
    const row = await isolated.query<{ default_aliases: string[] }>(
      "select default_aliases from public.guests where id=$1",
      [guest],
    );
    expect(row.rows[0].default_aliases).toContain("nhvien");
  } finally {
    await isolated.close();
  }
}, 30000);
it("allows direct admin updates through namespace trigger while blocking ordinary users", async () => {
  await pg.exec("set role authenticated");
  try {
    await pg.exec(
      "update public.events set title='Legacy admin update' where code='legacy-100'",
    );
  } finally {
    await pg.exec("reset role");
  }
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    "20000000-0000-4000-8000-000000000002",
  ]);
  await pg.exec("set role authenticated");
  try {
    await expect(
      pg.exec(
        "insert into public.events(code,title,starts_at,ends_at) values('forbidden','Forbidden',now(),now()+interval '1 hour')",
      ),
    ).rejects.toThrow("Admin required");
    await expect(
      pg.exec("select public.save_event_v100('{}','{}',null,null)"),
    ).rejects.toThrow();
    expect(
      (await pg.query("select * from public.venue_image_uploads")).rows,
    ).toHaveLength(0);
  } finally {
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
});
it("does not expose Draft agendas or privileged helpers to anonymous and ordinary roles", async () => {
  await pg.exec(
    "insert into public.events(code,title,starts_at,ends_at,status) values('agenda-draft','Agenda draft',now(),now()+interval '1 hour','draft')",
  );
  const event = (
    await pg.query<{ id: string }>(
      "select id from public.events where code='agenda-draft'",
    )
  ).rows[0];
  await pg.query(
    "insert into public.event_agenda_items(event_id,time,description,sort_order) values($1,'08:00','Private agenda',0)",
    [event.id],
  );
  for (const role of ["anon", "authenticated"]) {
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      role === "anon" ? "" : "20000000-0000-4000-8000-000000000002",
    ]);
    await pg.exec(`set role ${role}`);
    try {
      expect(
        (
          await pg.query(
            "select * from public.event_agenda_items where event_id=$1",
            [event.id],
          )
        ).rows,
      ).toHaveLength(0);
      const resolved = await pg.query<{ value: unknown }>(
        "select public.get_event_v110('agenda-draft') value",
      );
      expect(resolved.rows[0].value).toBeNull();
      await expect(
        pg.exec("select public.event_payload_v110(null::public.events)"),
      ).rejects.toThrow();
    } finally {
      await pg.exec("reset role");
      await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    }
  }
});
it("executes read-only pre/postflight scripts and verifies no broken references", async () => {
  await pg.exec(readFileSync("supabase/preflight-v110.sql", "utf8"));
  const results = await pg.exec(
    readFileSync("supabase/postflight-v110.sql", "utf8"),
  );
  for (const result of results.slice(0, 4))
    expect(Number(Object.values(result.rows[0])[0])).toBe(0);
});
it("preserves historical aliases across code rename and keeps snapshots, agenda and UUID", async () => {
  let event: Record<string, unknown> = {
    code: "old-code",
    title: "Họp mặt",
    description: "",
    starts_at: "2099-01-01T01:00:00Z",
    ends_at: "2099-01-01T02:00:00Z",
    status: "published",
    venue_name: "",
    address: "",
    directions: "",
    latitude: null,
    longitude: null,
    place_id: "",
    maps_url: "",
  };
  const save = async () => {
    const r = await pg.query<{ value: Record<string, unknown> }>(
      "select public.save_event($1,$2,$3,$4) value",
      [
        JSON.stringify(event),
        [guest],
        event.id ?? null,
        event.updated_at ?? null,
      ],
    );
    event = r.rows[0].value;
  };
  await save();
  const stable = event.id;
  const alias = (
    await pg.query<{ primary_alias: string }>(
      "select primary_alias from public.event_guests where event_id=$1",
      [stable],
    )
  ).rows[0].primary_alias;
  event.code = "new-code";
  event.agenda = [{ time: "13:00", description: "Trọng tâm", highlight: true }];
  await save();
  expect(event.id).toBe(stable);
  const resolve = await pg.query<{
    value: { event: { code: string; agenda: unknown[] } };
  }>("select public.resolve_invitation($1,$2) value", ["old-code", alias]);
  expect(resolve.rows[0].value.event.code).toBe("new-code");
  expect(resolve.rows[0].value.event.agenda).toHaveLength(1);
});
it("normalizes directory without touching invitation alias table and enforces uniqueness", async () => {
  const row = await pg.query<{
    primary_alias: string;
    default_aliases: string[];
    legacy_default_aliases: string[];
  }>(
    "select primary_alias,default_aliases,legacy_default_aliases from public.guests where id=$1",
    [guest],
  );
  expect(row.rows[0].primary_alias).toBe("nguyen-hoang-vien");
  expect(row.rows[0].default_aliases).toEqual(["nguyen-hoang-vien"]);
  expect(row.rows[0].legacy_default_aliases).toContain("nhvien");
  await expect(
    pg.exec(
      "insert into public.guests(name,primary_alias) values('Trùng','nguyen-hoang-vien')",
    ),
  ).rejects.toThrow();
});
it("generates event slug once, rejects collisions, and rolls back invalid agenda without altering saved data", async () => {
  const input = {
    code: "",
    title: "Họp Mặt Tổng Kết & Chào Đón Tân Thành Viên",
    starts_at: "2099-01-01T01:00:00Z",
    ends_at: "2099-01-01T02:00:00Z",
    status: "draft",
  };
  const created = await pg.query<{ value: Record<string, unknown> }>(
    "select public.save_event($1,$2) value",
    [JSON.stringify(input), [guest]],
  );
  const e = created.rows[0].value;
  expect(e.code).toBe("hop-mat-tong-ket-chao-don-tan-thanh-vien");
  await expect(
    pg.query("select public.save_event($1,$2)", [
      JSON.stringify(input),
      [guest],
    ]),
  ).rejects.toThrow();
  const bad = {
    ...e,
    title: "Không được lưu",
    agenda: [{ time: "24:00", description: "Invalid", highlight: false }],
  };
  await expect(
    pg.query("select public.save_event($1,$2,$3,$4)", [
      JSON.stringify(bad),
      [guest],
      e.id,
      e.updated_at,
    ]),
  ).rejects.toThrow();
  const persisted = await pg.query<{ title: string }>(
    "select title from public.events where id=$1",
    [e.id],
  );
  expect(persisted.rows[0].title).toBe(input.title);
});
it("saves alias edits transactionally and keeps the primary alias immutable", async () => {
  const event = (
    await pg.query<{ value: Record<string, unknown> }>(
      "select public.get_event_v110('new-code') value",
    )
  ).rows[0].value;
  const inv = (
    await pg.query<{ id: string; primary_alias: string }>(
      "select id,primary_alias from public.event_guests where event_id=$1",
      [event.id],
    )
  ).rows[0];
  const input = {
    ...event,
    invitation_edits: [
      { id: inv.id, aliases: [inv.primary_alias, "new-guest-alias"] },
    ],
  };
  const saved = (
    await pg.query<{ value: Record<string, unknown> }>(
      "select public.save_event($1,$2,$3,$4) value",
      [JSON.stringify(input), [guest], event.id, event.updated_at],
    )
  ).rows[0].value;
  expect(
    (
      await pg.query(
        "select * from public.invitation_aliases where event_guest_id=$1 and alias=$2",
        [inv.id, "new-guest-alias"],
      )
    ).rows,
  ).toHaveLength(1);
  const bad = {
    ...saved,
    invitation_edits: [{ id: inv.id, aliases: ["another"] }],
  };
  await expect(
    pg.query("select public.save_event($1,$2,$3,$4)", [
      JSON.stringify(bad),
      [guest],
      saved.id,
      saved.updated_at,
    ]),
  ).rejects.toThrow("Primary alias must remain");
});
it("persists inactive guests without deleting historical invitations and forbids new selection", async () => {
  const before = await pg.query(
    "select id from public.event_guests where guest_id=$1",
    [guest],
  );
  await pg.query("update public.guests set active=false where id=$1", [guest]);
  expect(
    (
      await pg.query<{ active: boolean }>(
        "select active from public.guests where id=$1",
        [guest],
      )
    ).rows[0].active,
  ).toBe(false);
  expect(
    (
      await pg.query("select id from public.event_guests where guest_id=$1", [
        guest,
      ])
    ).rows,
  ).toEqual(before.rows);
  try {
    await expect(
      pg.query("select public.save_event($1,$2)", [
        JSON.stringify({
          code: "inactive-selection",
          title: "Inactive",
          starts_at: "2099-01-01T01:00:00Z",
          ends_at: "2099-01-01T02:00:00Z",
          status: "draft",
        }),
        [guest],
      ]),
    ).rejects.toThrow("Inactive guest");
  } finally {
    await pg.query("update public.guests set active=true where id=$1", [guest]);
  }
});
it("keeps all legacy invitation links and private Draft visibility after migration", async () => {
  for (const alias of ["nhvien", "1", "nguyen-hoang-vien"]) {
    const r = await pg.query<{ value: unknown }>(
      "select public.resolve_invitation($1,$2) value",
      ["legacy-100", alias],
    );
    expect(r.rows[0].value).not.toBeNull();
  }
  await pg.exec("set role anon");
  await pg.exec("select set_config('request.jwt.claim.sub','',false)");
  try {
    const r = await pg.query<{ value: unknown }>(
      "select public.get_event_v110('legacy-100') value",
    );
    expect(r.rows[0].value).not.toBeNull();
    await expect(pg.exec("select * from public.event_codes")).rejects.toThrow();
  } finally {
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
});
it("enforces private bucket and published-only image object reads without bypassing RLS", async () => {
  const path =
    "30000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000002.png";
  await pg.query(
    "insert into public.venue_image_uploads(path,created_by) values($1,$2)",
    [path, id],
  );
  await pg.query(
    "insert into storage.objects(bucket_id,name) values('bookclub-venues',$1)",
    [path],
  );
  await pg.query(
    "update public.events set venue_image_path=$1,status='draft' where code='legacy-100'",
    [path],
  );
  await pg.exec("set role anon");
  await pg.exec("select set_config('request.jwt.claim.sub','',false)");
  try {
    expect(
      (await pg.query("select * from storage.objects where name=$1", [path]))
        .rows,
    ).toHaveLength(0);
    await expect(
      pg.query(
        "insert into storage.objects(bucket_id,name) values('bookclub-venues',$1)",
        [path + "x"],
      ),
    ).rejects.toThrow();
  } finally {
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  await pg.exec(
    "update public.events set status='published' where code='legacy-100'",
  );
  await pg.exec("set role anon");
  await pg.exec("select set_config('request.jwt.claim.sub','',false)");
  try {
    expect(
      (await pg.query("select * from storage.objects where name=$1", [path]))
        .rows,
    ).toHaveLength(1);
  } finally {
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  await pg.exec("set role authenticated");
  try {
    await pg.query("delete from storage.objects where name=$1", [path]);
    expect(
      (await pg.query("select * from storage.objects where name=$1", [path]))
        .rows,
    ).toHaveLength(1);
  } finally {
    await pg.exec("reset role");
  }
  expect(
    (
      await pg.query<{ public: boolean }>(
        "select public from storage.buckets where id='bookclub-venues'",
      )
    ).rows[0].public,
  ).toBe(false);
});
