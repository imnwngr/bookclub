// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("extends the icon constraint without invalidating old rows or granting anonymous access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create table public.event_agenda_items(icon text not null constraint agenda_icon_valid check(icon in ('welcome','speech','book','chat','music','gift','summary','camera','finish')));
      insert into public.event_agenda_items values ('welcome'),('speech'),('book'),('chat'),('music'),('gift'),('summary'),('camera'),('finish');`);
    await db.exec(readFileSync("supabase/migrations/202611060001_agenda_icon_library.sql", "utf8"));
    await db.exec("insert into public.event_agenda_items values ('users'),('music'),('mic'),('film'),('award'),('sparkles'),('book-open'),('gift'),('trophy'),('camera'),('heart-handshake')");
    await expect(db.exec("insert into public.event_agenda_items values ('invalid')")).rejects.toThrow();
    const result = await db.query<{ anon: boolean; authenticated: boolean; count: number }>(`select
      has_function_privilege('anon','public.agenda_icon_capabilities()','execute') anon,
      has_function_privilege('authenticated','public.agenda_icon_capabilities()','execute') authenticated,
      (select count(*)::int from public.event_agenda_items) count`);
    expect(result.rows[0]).toEqual({ anon: false, authenticated: true, count: 20 });
  } finally { await db.close(); }
}, 30000);
