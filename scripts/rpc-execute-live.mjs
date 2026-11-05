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
  const deniedAnon = await anon.rpc("save_event", {
    p_event: {},
    p_guest_ids: [],
  });
  check(
    deniedAnon.error?.code === "42501" &&
      /permission denied for function save_event/i.test(
        deniedAnon.error?.message ?? "",
      ),
    "anonymous rejected by function EXECUTE ACL, not only is_admin guard",
  );
  const deniedUser = await user.rpc("save_event", {
    p_event: {},
    p_guest_ids: [],
  });
  check(
    deniedUser.error?.code === "42501" &&
      /Admin required/.test(deniedUser.error?.message ?? ""),
    "nonadmin can invoke but is_admin guard denies write",
  );
  let event = await data(
    admin.rpc("save_event", {
      p_event: {
        code,
        title: "[QA ACL] " + code,
        starts_at: "2099-01-01T01:00:00Z",
        ends_at: "2099-01-01T02:00:00Z",
        status: "draft",
        location_method: "url",
        maps_url: "https://maps.app.goo.gl/test",
      },
      p_guest_ids: [],
    }),
  );
  created = true;
  check(
    Boolean(event.id) && event.code === code,
    "authenticated admin RPC creates Draft",
  );
  event = await data(
    admin.rpc("save_event", {
      p_event: { ...event, title: "[QA ACL] updated " + code },
      p_guest_ids: [],
      p_id: event.id,
      p_expected_updated_at: event.updated_at,
    }),
  );
  const reloaded = await data(
    admin.from("events").select("id,title").eq("id", event.id).single(),
  );
  check(
    reloaded.title === event.title,
    "authenticated admin RPC update persists",
  );
} catch (error) {
  const kind =
    error?.name === "AssertionFailure"
      ? "FAIL ASSERTION"
      : lastStatus >= 400
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
      await data(admin.from("events").delete().eq("code", code));
      check(
        (await data(admin.from("events").select("id").eq("code", code)))
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
  const report = `\n## Targeted save_event ACL live runner ${new Date().toISOString()}\nFixture: ${code}\n\n${results.map((s) => "- " + s).join("\n")}\n`;
  appendFileSync("VERIFICATION.md", report);
  console.log(results.join("\n"));
}
