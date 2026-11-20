import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

process.loadEnvFile(".env.local");
const api = new URL(process.env.VITE_SUPABASE_URL).origin;
assert.equal(api, "https://trdofhdspbkwgernwybp.supabase.co");
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const allowedOrigin = "https://imnwngr.github.io";
const checks = [];

// Only HTTP preflights and an anonymous, read-only capability action are sent.
// This cannot verify authenticated Admin operations or email delivery.
for (const scenario of [
  { name: "preflight", method: "OPTIONS", origin: allowedOrigin, status: 204 },
  {
    name: "foreign-origin",
    method: "OPTIONS",
    origin: "https://example.invalid",
    status: 403,
  },
  {
    name: "origin-with-path",
    method: "OPTIONS",
    origin: allowedOrigin + "/hsv/",
    status: 403,
  },
  {
    name: "anonymous-capability",
    method: "POST",
    origin: allowedOrigin,
    status: 401,
  },
  {
    name: "unsupported-method",
    method: "GET",
    origin: allowedOrigin,
    status: 405,
  },
]) {
  const response = await globalThis.fetch(
    api + "/functions/v1/manage-editors",
    {
      method: scenario.method,
      headers: {
        apikey: key,
        Origin: scenario.origin,
        "Content-Type": "application/json",
      },
      ...(scenario.method === "POST"
        ? { body: JSON.stringify({ action: "capabilities", role: "editor" }) }
        : {}),
      signal: globalThis.AbortSignal.timeout(15000),
    },
  );
  assert.equal(response.status, scenario.status, scenario.name);
  const cors = response.headers.get("access-control-allow-origin");
  assert.equal(cors, allowedOrigin, scenario.name + " CORS");
  const body = await response.json().catch(() => null);
  checks.push({
    case: scenario.name,
    status: response.status,
    allowedOrigin: cors,
    code: body?.code ?? null,
  });
}
const result = {
  checkedAt: new Date().toISOString(),
  scope:
    "Production read-only Edge HTTP; no session, account creation, role changes or email",
  checks,
};
mkdirSync(".local/hsv-v3", { recursive: true });
writeFileSync(
  ".local/hsv-v3/edge-production-smoke.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
