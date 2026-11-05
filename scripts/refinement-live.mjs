import { createClient } from "@supabase/supabase-js";
import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const url = process.env.VITE_SUPABASE_URL;
let lastRequest = "input";
let lastStatus = null;
let lastCode = null;
const safeMessages = {
  40001: "Concurrent update: expected updated_at differs from stored value",
  23505: "Unique constraint violation",
  23503: "Foreign key constraint violation",
  23514: "Check constraint violation",
  42501: "Permission denied by database",
  42702: "Ambiguous SQL column reference",
  PGRST202: "RPC signature not found in schema cache",
  PGRST201:
    "Ambiguous embedding: specify the intended foreign key relationship",
};
const diagnosticFetch = async (resource, options) => {
  const path = new URL(String(resource)).pathname;
  lastRequest = `${options?.method ?? "GET"} ${path}`;
  lastStatus = null;
  lastCode = null;
  const response = await globalThis.fetch(resource, options);
  lastStatus = response.status;
  if (!response.ok) {
    try {
      const body = await response.clone().json();
      if (
        typeof body.code === "string" &&
        /^[A-Za-z0-9_]{1,40}$/.test(body.code)
      )
        lastCode = body.code;
    } catch {
      /* Non-JSON gateway responses have no database code. */
    }
  }
  return response;
};
if (url !== "https://trdofhdspbkwgernwybp.supabase.co")
  throw Error("Wrong project");
const client = () =>
  createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: diagnosticFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
const admin = client(),
  user = client(),
  anon = client();
const code = "qa-auth-" + randomUUID();
const results = [];
let created = false;
let fixtureId = null;
const check = (ok, label) => {
  results.push(`${ok ? "PASS" : "FAIL"} API: ${label}`);
  if (!ok) {
    const failure = Error("Assertion failed");
    failure.name = "AssertionFailure";
    throw failure;
  }
};
const data = async (promise) => {
  const r = await promise;
  if (r.error) throw Error("API rejected operation");
  return r.data;
};
let input = "";
for await (const chunk of process.stdin) input += chunk;
let credentials;
try {
  credentials = JSON.parse(input);
  input = "";
  await data(
    admin.auth.signInWithPassword({
      email: credentials.adminEmail,
      password: credentials.adminPassword,
    }),
  );
  results.push("PASS API: admin password authentication");
  await data(
    user.auth.signInWithPassword({
      email: credentials.userEmail,
      password: credentials.userPassword,
    }),
  );
  credentials = null;
  results.push("PASS API: non-admin password authentication");
  check((await data(admin.rpc("is_admin"))) === true, "admin is_admin=true");
  check(
    (await data(user.rpc("is_admin"))) === false,
    "non-admin is_admin=false",
  );

  const legacy = await data(
    admin
      .from("event_agenda_items")
      .select("id,event_id,time,end_time,icon,description,highlight,sort_order")
      .is("end_time", null)
      .order("id"),
  );
  check(
    legacy.length >= 2 &&
      legacy.every((x) => x.end_time === null && x.icon === "book"),
    "legacy NULL-end agenda reads safely (read only)",
  );
  const directory = await data(
    admin
      .from("guests")
      .select("id,primary_alias,name,description")
      .eq("active", true)
      .order("id")
      .limit(1),
  );
  check(directory.length === 1, "active canonical guest available");
  const guest = directory[0];
  const agenda = [
    {
      time: "18:00",
      end_time: "18:30",
      icon: "welcome",
      description: "[QA] Reception",
      highlight: false,
    },
    {
      time: "18:30",
      end_time: "19:00",
      icon: "speech",
      description: "[QA] Focus",
      highlight: true,
    },
  ];
  let event = await data(
    admin.rpc("save_event", {
      p_event: {
        code,
        title: "[QA REFINEMENT] " + code,
        status: "draft",
        starts_at: "2099-01-01T11:00:00Z",
        ends_at: "2099-01-01T12:00:00Z",
        location_method: "url",
        maps_url: "https://maps.app.goo.gl/test",
        agenda,
      },
      p_guest_ids: [guest.id],
    }),
  );
  fixtureId = event.id;
  created = true;
  check(!!fixtureId, "admin creates separate Draft fixture");
  const read = await data(admin.rpc("get_event_v110", { p_code: code }));
  const project = (rows) =>
    rows.map((x) => ({
      time: x.time,
      end_time: x.end_time,
      icon: x.icon,
      description: x.description,
      highlight: x.highlight,
    }));
  check(
    JSON.stringify(project(read.agenda)) === JSON.stringify(agenda),
    "reload preserves time/end_time/icon/highlight/content",
  );
  check(
    (await data(
      anon.rpc("resolve_invitation", {
        p_code: code,
        p_alias: guest.primary_alias,
      }),
    )) === null,
    "anonymous Draft invitation hidden",
  );
  const eg = await data(
    admin
      .from("event_guests")
      .select("id,primary_alias")
      .eq("event_id", fixtureId)
      .single(),
  );
  check(
    eg.primary_alias === guest.primary_alias,
    "fixture uses directory canonical primary alias",
  );
  const denied = await user.rpc("save_event", {
    p_event: { ...event, agenda },
    p_guest_ids: [guest.id],
    p_id: fixtureId,
    p_expected_updated_at: event.updated_at,
  });
  check(denied.error?.code === "42501", "nonadmin cannot save fixture");
  for (const [name, actor] of [
    ["nonadmin", user],
    ["admin", admin],
  ]) {
    const r = await actor
      .from("invitation_aliases")
      .insert({
        event_id: fixtureId,
        event_guest_id: eg.id,
        alias: guest.primary_alias + "-2",
      });
    check(
      r.error?.code === "42501",
      name + " cannot directly create secondary numeric-suffix alias",
    );
  }
  const deniedEdits = await admin.rpc("save_event", {
    p_event: {
      ...event,
      agenda,
      invitation_edits: [
        {
          id: eg.id,
          aliases: [guest.primary_alias, guest.primary_alias + "-2"],
        },
      ],
    },
    p_guest_ids: [guest.id],
    p_id: fixtureId,
    p_expected_updated_at: event.updated_at,
  });
  check(
    deniedEdits.error?.code === "42501",
    "save_event rejects secondary invitation edits",
  );
  event = await data(
    admin.rpc("save_event", {
      p_event: { ...event, status: "published", agenda },
      p_guest_ids: [guest.id],
      p_id: fixtureId,
      p_expected_updated_at: event.updated_at,
    }),
  );
  const publicData = await data(
    anon.rpc("resolve_invitation", {
      p_code: code,
      p_alias: guest.primary_alias,
    }),
  );
  check(publicData?.invitation?.name===guest.name && publicData?.invitation?.description===guest.description, "Published primary invitation resolves correct snapshot");
  check(
    JSON.stringify(project(publicData.event.agenda)) === JSON.stringify(agenda),
    "anonymous Published agenda roundtrip preserves all fields",
  );
  check(
    (await data(
      anon.rpc("resolve_invitation", {
        p_code: code,
        p_alias: guest.primary_alias + "-2",
      }),
    )) === null,
    "secondary alias cannot resolve",
  );
  const unchanged = await data(
    admin
      .from("event_agenda_items")
      .select("id,event_id,time,end_time,icon,description,highlight,sort_order")
      .in(
        "id",
        legacy.map((x) => x.id),
      )
      .order("id"),
  );
  check(
    JSON.stringify(unchanged) === JSON.stringify(legacy),
    "existing legacy agenda untouched",
  );
} catch (error) {
  const kind =
    error?.name === "AssertionFailure"
      ? "FAIL ASSERTION"
      : lastStatus >= 300
        ? "FAIL API"
        : "BLOCKED SYSTEM";
  results.push(
    `${kind}: step=${lastRequest}; HTTP=${lastStatus ?? "unavailable"}; code=${lastCode ?? "unavailable"}; message=${safeMessages[lastCode] ?? "Operation did not complete; untrusted raw message suppressed"}`,
  );
  results.push(
    "NOT RUN: remaining checks after the failed step; previous PASS results preserved",
  );
  process.exitCode = 1;
} finally {
  if (created) {
    try {
      await data(admin.from("events").delete().eq("id", fixtureId));
      check(
        (await data(admin.from("events").select("id").eq("id", fixtureId)))
          .length === 0,
        "cleanup deleted only run fixture",
      );
    } catch {
      results.push(`FAIL CLEANUP: inspect fixture code ${code}`);
      results.push(
        `Cleanup diagnostic: step=${lastRequest}; HTTP=${lastStatus ?? "unavailable"}; code=${lastCode ?? "unavailable"}; message=${safeMessages[lastCode] ?? "Cleanup failed; raw message suppressed"}`,
      );
      process.exitCode = 1;
    }
  }
  await Promise.allSettled([
    admin.auth.signOut({ scope: "local" }),
    user.auth.signOut({ scope: "local" }),
  ]);
  results.push("UI: NOT RUN by API runner");
  const report = `\n## Refinement focused live runner ${new Date().toISOString()}\nFixture: ${code}\n\n${results.map((s) => "- " + s).join("\n")}\n`;
  appendFileSync("VERIFICATION.md", report);
  console.log(results.join("\n"));
}
