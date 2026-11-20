import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export const adminId = "20000000-0000-4000-8000-000000000001";
export const guestId = "10000000-0000-4000-8000-000000000001";
export const sqlFile = (path: string) => readFileSync(path, "utf8");
export async function hsvBaseline() {
  const pg = new PGlite();
  await pg.exec(
    "create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,invited_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,bucket_id text,name text);",
  );
  await pg.exec(sqlFile("supabase/rebuild-v110/02-schema.sql"));
  await pg.exec(sqlFile("supabase/rebuild-v110/03-seed.sql"));
  await pg.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'admin@fixture.invalid',now())",
    [adminId],
  );
  await pg.query("insert into admin_users(user_id) values($1)", [adminId]);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    adminId,
  ]);
  const legacy = (
    await pg.query<{ e: { id: string } }>("select save_event($1,$2) e", [
      JSON.stringify({
        code: "legacy-fixture",
        title: "Dữ liệu thử nghiệm",
        description: "BookClub là nội dung lịch sử cần giữ",
        starts_at: "2099-01-01T01:00:00Z",
        ends_at: "2099-01-01T02:00:00Z",
        status: "draft",
        maps_url: "https://maps.app.goo.gl/test",
        location_method: "url",
        agenda: [
          { time: "08:00", description: "Existing agenda", highlight: false },
          { time: "09:00", description: "Second agenda", highlight: false },
        ],
      }),
      [guestId],
    ])
  ).rows[0].e;
  await pg.exec(sqlFile("supabase/migrations/202611050001_ui_refinement.sql"));
  const hash = async (
    signature = "public.save_event(jsonb,uuid[],uuid,timestamptz)",
  ) =>
    (
      await pg.query<{ h: string }>(
        "select md5(pg_get_functiondef($1::regprocedure)) h",
        [signature],
      )
    ).rows[0].h;
  // Historical migrations pin production fingerprints. This synthetic baseline has different formatting.
  await pg.exec(
    sqlFile("supabase/migrations/202611070001_invitation_quotes.sql").replace(
      "91ca923e964e16cb3e4eca606b7a1e6b",
      await hash(),
    ),
  );
  await pg.exec(sqlFile("supabase/migrations/202611060002_guest_order.sql"));
  await pg.exec(
    sqlFile("supabase/migrations/202611060001_agenda_icon_library.sql"),
  );
  let roles = sqlFile("supabase/migrations/202611080001_editor_roles.sql");
  for (const [signature, expected] of [
    ["public.is_admin()", "b11e704df80dcdb21b91e90747409eb1"],
    [
      "public.save_event(jsonb,uuid[],uuid,timestamptz)",
      "49105a95c8ead8a7f32c115943faee62",
    ],
    [
      "public.reorder_guests(uuid[],uuid[])",
      "a606d9f86880b975f12f66094ef09b67",
    ],
    ["public.guest_order_write_lock()", "8c7a699a6dffd3b4945710a92bf50941"],
    ["public.get_event_v110(text)", "00a558934b4ea51b6e67ea1ac2371894"],
    [
      "public.resolve_invitation(text,text)",
      "a8249304545b779d7c9197e226dd2125",
    ],
    ["public.unused_venue_images()", "430123e21b929b44cd95c23e0fb6cc2c"],
  ])
    roles = roles.replace(expected, await hash(signature));
  await pg.exec(roles);
  for (const [name, expected] of [
    [
      "202611090001_event_description_rich.sql",
      "7f7ee461a29cad2aca2e9ebe1212f483",
    ],
    ["202611090002_event_youtube.sql", "a71f1a0580c5cf1e1535181db7b9e298"],
    ["202611100001_background_music.sql", "4fced5d235d96447205401bf885d82ae"],
  ])
    await pg.exec(
      sqlFile("supabase/migrations/" + name).replace(expected, await hash()),
    );
  return { pg, legacy };
}
