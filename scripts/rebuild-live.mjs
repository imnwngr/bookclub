import { Buffer } from "node:buffer";
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
  const timeout = globalThis.AbortSignal.timeout(30000);
  const response = await globalThis.fetch(resource, {
    ...options,
    signal: options?.signal
      ? globalThis.AbortSignal.any([options.signal, timeout])
      : timeout,
  });
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
const fixtureImagePaths = [];
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
  const guests = await data(
    admin.from("guests").select("id").eq("active", true).order("id").limit(2),
  );
  check(guests.length === 2, "admin reads guest directory");
  let event = {
    code,
    title: "[QA AUTH] " + code,
    description: "Disposable live verification",
    starts_at: "2099-01-01T01:00:00Z",
    ends_at: "2099-01-01T02:00:00Z",
    status: "draft",
    venue_name: "QA",
    address: "",
    directions: "",
    latitude: null,
    longitude: null,
    place_id: "",
    maps_url: "https://maps.app.goo.gl/bookclub-qa",
    location_method: "url",
    agenda: [{ time: "08:00", description: "QA agenda", highlight: true }],
  };
  const save = async (ids) =>
    data(
      admin.rpc("save_event", {
        p_event: event,
        p_guest_ids: ids,
        p_id: event.id ?? null,
        p_expected_updated_at: event.updated_at ?? null,
      }),
    );
  event = await save([guests[0].id]);
  created = true;
  fixtureId = event.id;
  check(
    (await data(admin.from("events").select("*").eq("id", event.id)))[0]
      .title === event.title,
    "create and reload persisted Draft",
  );
  for (const [name, c] of [
    ["anonymous", anon],
    ["non-admin", user],
  ])
    check(
      (await data(c.from("events").select("id").eq("id", event.id))).length ===
        0,
      `${name} cannot read Draft`,
    );
  event = await save(guests.map((g) => g.id));
  check(
    Boolean(event.id) && event.code === code,
    "save_event guest-selection update returned successfully before embedding read",
  );
  const invitations = await data(
    admin
      .from("event_guests")
      .select(
        "*,invitation_aliases!invitation_aliases_event_guest_id_event_id_fkey(alias)",
      )
      .eq("event_id", event.id),
  );
  check(invitations.length === 2, "guest selection persisted");
  const invitation = invitations[0];
  const alias = "qa-" + randomUUID();
  await data(
    admin
      .from("invitation_aliases")
      .insert({ event_id: event.id, event_guest_id: invitation.id, alias }),
  );
  const collision = await admin
    .from("invitation_aliases")
    .insert({ event_id: event.id, event_guest_id: invitations[1].id, alias });
  check(collision.error?.code === "23505", "alias uniqueness enforced");
  check(
    (await data(
      anon.rpc("resolve_invitation", { p_code: code, p_alias: alias }),
    )) === null,
    "anonymous Draft invitation hidden",
  );
  const denied = await user.rpc("save_event", {
    p_event: event,
    p_guest_ids: [],
    p_id: event.id,
    p_expected_updated_at: event.updated_at,
  });
  check(denied.error?.code === "42501", "non-admin RPC write denied");
  for (const operation of ["update", "delete"]) {
    const q = user.from("events");
    const r =
      operation === "update"
        ? await q
            .update({ title: "UNAUTHORIZED" })
            .eq("id", event.id)
            .select("id")
        : await q.delete().eq("id", event.id).select("id");
    check(
      !r.error && r.data.length === 0,
      `non-admin direct ${operation} affects zero rows`,
    );
  }
  event.status = "published";
  event.title += " updated";
  event = await save(guests.map((g) => g.id));
  const reloaded = await data(
    admin.from("events").select("*").eq("id", event.id).single(),
  );
  check(
    reloaded.title === event.title && reloaded.status === "published",
    "update and reload persisted Published",
  );
  for (const [name, c] of [
    ["anonymous", anon],
    ["non-admin", user],
  ]) {
    check(
      (await data(c.from("events").select("id").eq("id", event.id))).length ===
        1,
      `${name} can read Published`,
    );
    const resolved = await data(
      c.rpc("resolve_invitation", { p_code: code, p_alias: alias }),
    );
    check(
      resolved?.invitation.name === invitation.name,
      `${name} resolves correct published recipient`,
    );
    const privateRows = await c
      .from("event_guests")
      .select("id")
      .eq("event_id", event.id);
    check(
      Boolean(privateRows.error) || privateRows.data.length === 0,
      `${name} cannot enumerate recipient records`,
    );
  }
  const imagePath = randomUUID() + "/" + randomUUID() + ".png";
  fixtureImagePaths.push(imagePath);
  const adminUser = await data(admin.auth.getUser());
  await data(
    admin
      .from("venue_image_uploads")
      .insert({ path: imagePath, created_by: adminUser.user.id }),
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6F1sAAAAASUVORK5CYII=",
    "base64",
  );
  await data(
    admin.storage
      .from("bookclub-venues")
      .upload(imagePath, png, { contentType: "image/png", upsert: false }),
  );
  check(true, "admin uploads fixture image via Storage HTTP");
  for (const [name, actor] of [
    ["nonadmin", user],
    ["anonymous", anon],
  ]) {
    const deniedPath = randomUUID() + "/" + randomUUID() + ".png";
    fixtureImagePaths.push(deniedPath);
    // A valid registered path ensures rejection tests authorization, not malformed metadata.
    await data(
      admin
        .from("venue_image_uploads")
        .insert({ path: deniedPath, created_by: adminUser.user.id }),
    );
    const denied = await actor.storage
      .from("bookclub-venues")
      .upload(deniedPath, png, { contentType: "image/png", upsert: false });
    check(
      Boolean(denied.error),
      name + " Storage upload denied on valid registered path",
    );
  }
  event.status = "draft";
  event.venue_image_path = imagePath;
  event = await save(guests.map((g) => g.id));
  check(
    Boolean(
      (await anon.storage.from("bookclub-venues").download(imagePath)).error,
    ),
    "Draft image hidden via Storage HTTP",
  );
  const draftBlob = await data(
    admin.storage.from("bookclub-venues").download(imagePath),
  );
  check(draftBlob.size === png.length, "admin reads Draft image");
  event.status = "published";
  event = await save(guests.map((g) => g.id));
  const publishedBlob = await data(
    anon.storage.from("bookclub-venues").download(imagePath),
  );
  check(
    publishedBlob.size === png.length,
    "anonymous reads Published image via controlled Storage HTTP",
  );
  const publicEvent = await data(anon.rpc("get_event_v110", { p_code: code }));
  check(
    publicEvent.agenda?.[0]?.time === "08:00" &&
      publicEvent.agenda[0].highlight === true,
    "agenda and highlight persist through public RPC",
  );
  event.code = code + "-renamed";
  event = await save(guests.map((g) => g.id));
  check(event.id === fixtureId, "event code change preserves internal UUID");
  check(
    (await data(anon.rpc("get_event_v110", { p_code: code }))) === null,
    "old event code is not retained after clean rebuild",
  );
  const renamed = await data(
    anon.rpc("resolve_invitation", { p_code: event.code, p_alias: alias }),
  );
  check(
    renamed?.invitation.name === invitation.name,
    "invitation resolves under renamed event code",
  );
  event.status = "draft";
  event = await save(guests.map((g) => g.id));
  check(
    (await data(
      anon.rpc("resolve_invitation", { p_code: event.code, p_alias: alias }),
    )) === null,
    "unpublish revokes public invitation",
  );
  check(
    Boolean(
      (await anon.storage.from("bookclub-venues").download(imagePath)).error,
    ),
    "unpublish revokes future image downloads",
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
  for (const path of fixtureImagePaths) {
    try {
      await data(admin.storage.from("bookclub-venues").remove([path]));
      const [folder, filename] = path.split("/");
      const remaining = await data(
        admin.storage
          .from("bookclub-venues")
          .list(folder, { search: filename, limit: 100 }),
      );
      check(
        !remaining.some((row) => row.name === filename),
        "cleanup verified fixture object absent",
      );
      await data(admin.from("venue_image_uploads").delete().eq("path", path));
      check(
        (
          await data(
            admin.from("venue_image_uploads").select("path").eq("path", path),
          )
        ).length === 0,
        "cleanup verified fixture registry absent",
      );
    } catch {
      results.push("FAIL CLEANUP: run image " + path);
      process.exitCode = 1;
    }
  }
  await Promise.allSettled([
    admin.auth.signOut({ scope: "local" }),
    user.auth.signOut({ scope: "local" }),
  ]);
  results.push("UI: NOT RUN by API runner");
  const report = `\n## Clean v1.1 Auth/Storage live runner ${new Date().toISOString()}\nFixture: ${code}\n\n${results.map((s) => "- " + s).join("\n")}\n`;
  appendFileSync("VERIFICATION.md", report);
  console.log(results.join("\n"));
}
