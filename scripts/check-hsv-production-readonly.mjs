import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

process.loadEnvFile(".env.local");
const origin = new URL(process.env.VITE_SUPABASE_URL).origin;
assert.equal(origin, "https://trdofhdspbkwgernwybp.supabase.co");
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const root = path.resolve(process.argv[2] || "C:/dev/temp/hsv-v3-production");
const read = (name) =>
  JSON.parse(readFileSync(path.join(root, name + ".json"), "utf8"));
assert.equal(read("project_ref"), "trdofhdspbkwgernwybp");
const events = read("tables/events"),
  guests = read("tables/event_guests");
const call = async (endpoint, body) => {
  const response = await globalThis.fetch(origin + "/rest/v1/" + endpoint, {
    method: body === undefined ? "GET" : "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: globalThis.AbortSignal.timeout(15000),
  });
  return { status: response.status, data: await response.json() };
};
try {
  const capabilities = await call("rpc/hsv_v3_capabilities", {});
  assert.equal(capabilities.status, 200);
  assert.equal(capabilities.data.editor_add_operations, true);
  const listed = await call("events?select=id,status,event_type,theme");
  assert.equal(listed.status, 200);
  assert.ok(
    listed.data.every(
      (e) =>
        e.status === "published" &&
        e.event_type === "invitation" &&
        e.theme.version === 1,
    ),
  );
  let publicEvents = 0,
    draftEvents = 0,
    invitations = 0;
  for (const event of events) {
    const detail = await call("rpc/get_event_v110", { p_code: event.code });
    assert.equal(detail.status, 200);
    if (event.status !== "published") {
      assert.equal(detail.data, null);
      draftEvents++;
      continue;
    }
    assert.equal(detail.data.id, event.id);
    assert.equal(detail.data.event_type, "invitation");
    assert.deepEqual(detail.data.theme, { version: 1, primary: "#174b78" });
    publicEvents++;
    for (const guest of guests.filter((g) => g.event_id === event.id)) {
      const resolved = await call("rpc/resolve_invitation", {
        p_code: event.code,
        p_alias: guest.primary_alias,
      });
      assert.equal(resolved.status, 200);
      assert.equal(resolved.data.event.id, event.id);
      assert.equal(resolved.data.event.event_type, "invitation");
      assert.deepEqual(
        resolved.data.invitation,
        Object.fromEntries(
          ["salutation", "name", "description", "kind"].map((k) => [
            k,
            guest[k],
          ]),
        ),
      );
      invitations++;
    }
  }
  for (const table of [
    "editor_add_operations",
    "editor_users",
    "admin_users",
    "guests",
  ]) {
    const denied = await call(table + "?select=*&limit=0");
    assert.ok(
      [401, 403].includes(denied.status),
      "Anonymous table access unexpectedly allowed: " + table,
    );
  }
  const recovery = await call("rpc/editor_add_recovery", {});
  assert.ok([401, 403].includes(recovery.status));
  const result = {
    scope:
      "Production anonymous HTTP read-only; no event/account changes or email",
    publicEvents,
    actualDraftEventsChecked: draftEvents,
    invitationSnapshotsChecked: invitations,
    eventTypeAndTheme: "PASS",
    privateTableAccessDenied: true,
    recoveryDenied: true,
  };
  writeFileSync(
    ".local/hsv-v3/production-http-smoke.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(
    JSON.stringify({
      result: "FAIL",
      scope: "Production read-only",
      error: error.name,
    }),
  );
  process.exitCode = 1;
}
