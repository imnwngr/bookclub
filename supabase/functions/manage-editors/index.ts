// Supabase Edge runtime; this module is never imported by Vite.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (r: Request) => Promise<Response>): void };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const productionOrigin = "https://imnwngr.github.io";
const productionRedirect = productionOrigin + "/hsv/auth/accept";

Deno.serve(async request => {
  const mode = Deno.env.get("BOOKCLUB_ROLE_MODE");
  const localOrigin = Deno.env.get("HSV_LOCAL_ORIGIN");
  const sandbox = mode === "sandbox";
  const origin = sandbox && localOrigin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(localOrigin) ? localOrigin : productionOrigin;
  const cors = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin" };
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  let claimed = false;
  try {
    if (request.headers.get("Origin") && request.headers.get("Origin") !== origin) return reply(403, { code: "origin_denied" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { code: "method_not_allowed" });
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key || !anon) return reply(503, { code: "configuration_missing" });
    const caller = createClient(url, anon, { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const user = await caller.auth.getUser();
    if (user.error || !user.data.user) return reply(401, { code: "session_expired" });
    if (user.data.user.is_anonymous || (user.data.user.banned_until && Date.parse(user.data.user.banned_until) > Date.now())) return reply(403, { code: "account_ineligible" });
    const admin = await caller.rpc("is_admin");
    if (admin.error || admin.data !== true) return reply(403, { code: "admin_required" });
    if (!["fixture", "live", "sandbox"].includes(mode ?? "")) return reply(503, { code: "operation_mode_missing" });
    // Sandbox email is allowed only to the local Auth service and its local mail sink.
    if (sandbox && (!/^http:\/\/(localhost|127\.0\.0\.1|kong|supabase_kong_[a-z0-9_-]+)(:\d+)?$/.test(url) || origin === productionOrigin)) return reply(503, { code: "sandbox_configuration_invalid" });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return reply(400, { code: "invalid_request" }); }
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !["action", "email", "role", "user_id", "request_id"].includes(k)) || body.role !== "editor" || !["add", "grant", "invite", "revoke"].includes(String(body.action))) return reply(400, { code: "invalid_request" });
    const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(25000) }) } });
    const fixture = Deno.env.get("BOOKCLUB_ROLE_FIXTURE_USER_ID");
    if (mode === "fixture" && (!fixture || !uuid.test(fixture))) return reply(503, { code: "fixture_missing" });

    if (body.action === "revoke") {
      if (typeof body.user_id !== "string" || !uuid.test(body.user_id)) return reply(400, { code: "invalid_account" });
      if (mode === "fixture" && body.user_id.toLowerCase() !== fixture?.toLowerCase()) return reply(403, { code: "fixture_only" });
      const result = await service.rpc("set_editor_role", { p_actor: user.data.user.id, p_target: body.user_id, p_grant: false });
      if (result.error) return reply(result.error.code === "42501" ? 403 : 409, { code: "role_refused" });
      return reply(200, { ok: true, state: "revoked" });
    }
    if (typeof body.email !== "string" || body.email.length > 254 || !emailPattern.test(body.email.trim())) return reply(400, { code: "invalid_email" });
    const email = body.email.trim().toLowerCase();
    if (body.action === "invite") return reply(409, { code: "client_upgrade_required" });
    // Older clients grant existing accounts without an operation ID during backend-first rollout.
    // They cannot send invitations; keep their request stable across response loss and retries.
    if (body.action === "grant" && body.request_id === undefined) {
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`hsv-v3-legacy-grant:${user.data.user.id}:${email}`)));
      digest[6] = (digest[6] & 0x0f) | 0x50;
      digest[8] = (digest[8] & 0x3f) | 0x80;
      const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join("");
      body.request_id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    if (typeof body.request_id !== "string" || !uuid.test(body.request_id)) return reply(400, { code: "invalid_request" });
    if (mode === "fixture") {
      const target = await service.auth.admin.getUserById(fixture!);
      if (target.error || target.data.user?.email?.toLowerCase() !== email || target.data.user.is_anonymous || (target.data.user.banned_until && Date.parse(target.data.user.banned_until) > Date.now())) return reply(403, { code: "fixture_only" });
    }
    const allowInvite = body.action === "add" && mode !== "fixture" && Deno.env.get("HSV_INVITATIONS_ENABLED") === "verified";
    const begin = await service.rpc("begin_editor_add", { p_actor: user.data.user.id, p_email: email, p_request_id: body.request_id, p_allow_invite: allowInvite });
    if (begin.error) return reply(begin.error.code === "42501" ? 403 : 503, { code: begin.error.code === "42501" ? "admin_required" : "backend_not_ready" });
    const operation = begin.data;
    if (operation?.state === "already_editor") return reply(200, { ok: true, ...operation });
    if (operation?.state === "processing") return reply(202, { ok: false, state: "processing", code: "processing" });
    if (!["invite", "grant"].includes(operation?.state) || !uuid.test(operation?.lease ?? "")) return reply(409, { code: operation?.state ?? "backend_not_ready", state: operation?.state });
    claimed = true;
    let target: string | null = operation.target ?? null;
    if (operation.state === "invite") {
      if (!allowInvite) return reply(503, { code: "invitation_not_ready" });
      // The SQL ledger was committed before this call. A lost response never triggers another email.
      try {
        const invitation = await service.auth.admin.inviteUserByEmail(email, { redirectTo: sandbox ? origin + "/hsv/auth/accept" : productionRedirect });
        target = invitation.error ? null : invitation.data.user?.id ?? null;
      } catch { target = null; }
    }
    const finish = await service.rpc("finish_editor_add", { p_actor: user.data.user.id, p_email: email, p_lease: operation.lease, p_target: target });
    if (finish.error) return reply(502, { code: "outcome_unknown", state: "recovery_required" });
    if (finish.data?.state !== "granted") return reply(finish.data?.state === "processing" ? 202 : 409, { ok: false, ...finish.data, code: finish.data?.state ?? "outcome_unknown" });
    return reply(200, { ok: true, ...finish.data });
  } catch {
    return reply(502, { code: claimed ? "outcome_unknown" : "request_failed", state: "recovery_required" });
  }
});
