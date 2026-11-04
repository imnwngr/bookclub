import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const {
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
  BOOKCLUB_TEST_USER_JWT: userJwt,
  BOOKCLUB_TEST_DRAFT_CODE: draftCode,
  BOOKCLUB_TEST_PUBLISHED_CODE: publishedCode,
  BOOKCLUB_TEST_ALIAS: alias,
} = process.env;
if (!url || !key || !userJwt || !draftCode || !publishedCode || !alias) {
  console.error(
    "BLOCKED: live RLS requires Supabase URL/publishable key, ordinary-user JWT and known draft/published event codes plus alias. No live test executed.",
  );
  process.exit(2);
}
const anonymous = createClient(url, key, { auth: { persistSession: false } });
const user = createClient(url, key, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${userJwt}` } },
});
for (const [name, client] of [
  ["anonymous", anonymous],
  ["ordinary", user],
]) {
  const check = await client.rpc("is_admin");
  assert.ifError(check.error);
  assert.equal(check.data, false);
  const draft = await client.from("events").select("id").eq("code", draftCode);
  assert.ifError(draft.error);
  assert.equal(draft.data.length, 0);
  const published = await client
    .from("events")
    .select("id")
    .eq("code", publishedCode);
  assert.ifError(published.error);
  assert.equal(published.data.length, 1);
  for (const table of ["guests", "event_guests", "invitation_aliases"]) {
    const r = await client.from(table).select("*");
    assert.ok(r.error || r.data.length === 0);
  }
  const hidden = await client.rpc("resolve_invitation", {
    p_code: draftCode,
    p_alias: alias,
  });
  assert.ifError(hidden.error);
  assert.equal(hidden.data, null);
  const visible = await client.rpc("resolve_invitation", {
    p_code: publishedCode,
    p_alias: alias,
  });
  assert.ifError(visible.error);
  assert.ok(visible.data);
  const denied = await client.rpc("save_event", {
    p_event: {},
    p_guest_ids: [],
  });
  assert.ok(denied.error);
  const validation = await client
    .from("guests")
    .insert({ name: "RLS unauthorized write probe" })
    .select();
  assert.ok(validation.error);
  console.log(`PASS live read/RPC/write denial: ${name}`);
}
console.log(
  "PASS direct Supabase API checks. No admin CRUD exercised by this script.",
);
