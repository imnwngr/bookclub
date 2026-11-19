// @vitest-environment node
import { readFileSync } from "node:fs";
import ts from "typescript";
import { beforeEach, expect, it, vi } from "vitest";
let handler: (r: Request) => Promise<Response>;
let isAdmin = true,
  authenticated = true;
const env: Record<string, string> = {};
const rpc = vi.fn(),
  invite = vi.fn(),
  getUser = vi.fn();
const target = "20000000-0000-4000-8000-000000000077",
  lease = "30000000-0000-4000-8000-000000000001";
const request = (body: object, origin?: string) =>
  new Request("https://example.invalid", {
    method: "POST",
    headers: {
      Authorization: "Bearer fixture",
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
const add = {
  action: "add",
  role: "editor",
  email: "new@fixture.invalid",
  request_id: lease,
};
beforeEach(() => {
  isAdmin = authenticated = true;
  Object.keys(env).forEach((k) => delete env[k]);
  Object.assign(env, {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "public",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    BOOKCLUB_ROLE_MODE: "live",
    HSV_INVITATIONS_ENABLED: "verified",
  });
  rpc
    .mockReset()
    .mockImplementation(async (name) => ({
      data:
        name === "begin_editor_add"
          ? { state: "invite", lease, target: null }
          : { state: "granted", account_status: "invited" },
      error: null,
    }));
  invite
    .mockReset()
    .mockResolvedValue({ data: { user: { id: target } }, error: null });
  getUser
    .mockReset()
    .mockResolvedValue({
      data: { user: { id: target, email: add.email } },
      error: null,
    });
  const caller = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: "admin" } : null },
        error: null,
      }),
    },
    rpc: async () => ({ data: isAdmin, error: null }),
  };
  const service = {
    auth: { admin: { inviteUserByEmail: invite, getUserById: getUser } },
    rpc,
  };
  const source = readFileSync(
    "supabase/functions/manage-editors/index.ts",
    "utf8",
  ).replace(/^import .*?;\r?\n/m, "");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText;
  new Function("createClient", "Deno", js)(
    (_url: string, key: string) => (key === "service" ? service : caller),
    {
      env: { get: (key: string) => env[key] },
      serve: (h: typeof handler) => {
        handler = h;
      },
    },
  );
});
it("rejects anonymous, non-Admin, invalid payload, Admin assignment and bad email before service effects", async () => {
  authenticated = false;
  expect((await handler(request(add))).status).toBe(401);
  authenticated = true;
  isAdmin = false;
  expect((await handler(request(add))).status).toBe(403);
  isAdmin = true;
  for (const body of [
    { ...add, role: "admin" },
    { ...add, email: "bad" },
    { ...add, extra: true },
    { ...add, request_id: "bad" },
  ])
    expect((await handler(request(body))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
  expect(invite).not.toHaveBeenCalled();
});
it("claims in SQL before sending, uses /hsv/ callback, and reports pending invitation only after grant", async () => {
  const r = await handler(request(add));
  expect(r.status).toBe(200);
  expect(rpc.mock.calls[0][0]).toBe("begin_editor_add");
  expect(invite).toHaveBeenCalledWith(add.email, {
    redirectTo: "https://imnwngr.github.io/hsv/auth/accept",
  });
  expect(rpc).toHaveBeenLastCalledWith("finish_editor_add", {
    p_actor: "admin",
    p_email: add.email,
    p_lease: lease,
    p_target: target,
  });
  expect(await r.json()).toMatchObject({
    ok: true,
    state: "granted",
    account_status: "invited",
  });
});
it("existing and already-Editor accounts never send an invitation", async () => {
  for (const state of ["grant", "already_editor"]) {
    rpc.mockImplementation(async (name) => ({
      data:
        name === "begin_editor_add"
          ? { state, lease, target, account_status: "confirmed" }
          : { state: "granted", account_status: "confirmed" },
      error: null,
    }));
    expect((await handler(request(add))).status).toBe(200);
  }
  expect(invite).not.toHaveBeenCalled();
});
it("double-click, unknown delivery and retries cannot send when ledger refuses a claim", async () => {
  for (const state of [
    "processing",
    "delivery_unknown",
    "invitation_not_ready",
    "admin_protected",
    "account_ineligible",
  ]) {
    rpc.mockResolvedValue({ data: { state }, error: null });
    expect((await handler(request(add))).status).toBe(
      state === "processing" ? 202 : 409,
    );
  }
  expect(invite).not.toHaveBeenCalled();
});
it("lost Auth response is recorded as unknown, partial grant failure never reports success", async () => {
  invite.mockRejectedValue(new Error("timeout"));
  rpc.mockImplementation(async (name) => ({
    data:
      name === "begin_editor_add"
        ? { state: "invite", lease }
        : { state: "delivery_unknown" },
    error: null,
  }));
  const unknown = await handler(request(add));
  expect(unknown.status).toBe(409);
  expect(await unknown.json()).toMatchObject({
    ok: false,
    state: "delivery_unknown",
  });
  expect(rpc).toHaveBeenLastCalledWith(
    "finish_editor_add",
    expect.objectContaining({ p_target: null }),
  );
  invite.mockResolvedValue({ data: { user: { id: target } }, error: null });
  rpc.mockImplementation(async (name) => ({
    data:
      name === "begin_editor_add"
        ? { state: "invite", lease }
        : { state: "grant_failed" },
    error: null,
  }));
  expect((await handler(request(add))).status).toBe(409);
});
it("network failure after a claim returns unknown outcome instead of retrying email", async () => {
  rpc.mockImplementation(async (name) => {
    if (name === "finish_editor_add") throw Error("lost");
    return { data: { state: "invite", lease }, error: null };
  });
  expect(await (await handler(request(add))).json()).toMatchObject({
    code: "outcome_unknown",
  });
  expect(invite).toHaveBeenCalledTimes(1);
});
it("fails closed for missing mode, fixture, unverified email and sandbox pointed at production", async () => {
  delete env.BOOKCLUB_ROLE_MODE;
  expect((await handler(request(add))).status).toBe(503);
  env.BOOKCLUB_ROLE_MODE = "fixture";
  expect((await handler(request(add))).status).toBe(503);
  env.BOOKCLUB_ROLE_FIXTURE_USER_ID = target;
  rpc.mockResolvedValue({
    data: { state: "grant", lease, target },
    error: null,
  });
  await handler(request(add));
  expect(rpc).toHaveBeenCalledWith(
    "begin_editor_add",
    expect.objectContaining({ p_allow_invite: false }),
  );
  expect(invite).not.toHaveBeenCalled();
  env.BOOKCLUB_ROLE_MODE = "sandbox";
  expect((await handler(request(add))).status).toBe(503);
  env.BOOKCLUB_ROLE_MODE = "live";
  delete env.HSV_INVITATIONS_ENABLED;
  await handler(request(add));
  expect(rpc).toHaveBeenLastCalledWith("finish_editor_add", expect.anything());
  expect(rpc).toHaveBeenCalledWith(
    "begin_editor_add",
    expect.objectContaining({ p_allow_invite: false }),
  );
});
it("protects fixture targets, legacy invite and origin; CORS never includes base path", async () => {
  env.BOOKCLUB_ROLE_MODE = "fixture";
  env.BOOKCLUB_ROLE_FIXTURE_USER_ID = target;
  expect(
    (await handler(request({ ...add, email: "different@fixture.invalid" })))
      .status,
  ).toBe(403);
  expect((await handler(request({ ...add, action: "invite" }))).status).toBe(
    409,
  );
  expect(
    (await handler(request(add, "https://untrusted.invalid"))).status,
  ).toBe(403);
  const preflight = await handler(
    new Request("https://example.invalid", { method: "OPTIONS" }),
  );
  expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(
    "https://imnwngr.github.io",
  );
  expect(invite).not.toHaveBeenCalled();
});
it("revoke checks UUID and server permission, leaving Admin targets to the SQL guard", async () => {
  rpc.mockResolvedValue({ error: { code: "42501" } });
  expect(
    (
      await handler(
        request({ action: "revoke", role: "editor", user_id: target }),
      )
    ).status,
  ).toBe(403);
  expect(rpc).toHaveBeenCalledWith("set_editor_role", {
    p_actor: "admin",
    p_target: target,
    p_grant: false,
  });
});
