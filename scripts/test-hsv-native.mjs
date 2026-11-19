import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  createWriteStream,
} from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";
const { fetch } = globalThis;

// This harness creates only a disposable local stack. It never accepts cloud credentials or URLs.
const root = path.resolve(".local/hsv-v3/native");
const stack = path.join(root, "stack");
const project = "hsv-v3-native";
const origin = "http://127.0.0.1:4175";
const api = "http://127.0.0.1:54321";
const mail = "http://127.0.0.1:54324";
const cli = (...args) =>
  execFileSync(
    "npx",
    ["--yes", "supabase@3.2.0", ...args, "--workdir", stack],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
const sql = (source) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      `supabase_db_${project}`,
      "psql",
      "-X",
      "-A",
      "-t",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      "postgres",
    ],
    { input: source, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
const read = (file) => readFileSync(file, "utf8");
mkdirSync(root, { recursive: true });

if (process.argv[2] === "prepare") {
  mkdirSync(path.join(stack, "supabase/functions/manage-editors"), {
    recursive: true,
  });
  writeFileSync(
    path.join(stack, "supabase/config.toml"),
    `project_id = "${project}"
[api]
enabled = true
port = 54321
schemas = ["public"]
extra_search_path = ["public", "extensions"]
[db]
port = 54322
shadow_port = 54320
major_version = 17
[db.seed]
enabled = false
[studio]
enabled = false
[local_smtp]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326
[storage]
enabled = false
[auth]
enabled = true
site_url = "${origin}/hsv/"
additional_redirect_urls = ["${origin}/hsv/auth/accept", "${origin}/hsv/auth/callback"]
enable_signup = true
[auth.email]
enable_signup = true
enable_confirmations = true
max_frequency = "1s"
[edge_runtime]
enabled = true
policy = "per_worker"
[analytics]
enabled = false
[functions.manage-editors]
verify_jwt = true
`,
  );
  copyFileSync(
    "supabase/functions/manage-editors/index.ts",
    path.join(stack, "supabase/functions/manage-editors/index.ts"),
  );
  writeFileSync(
    path.join(root, "edge.env"),
    `BOOKCLUB_ROLE_MODE=sandbox\nHSV_LOCAL_ORIGIN=${origin}\nHSV_INVITATIONS_ENABLED=verified\n`,
  );
  console.log(
    "Prepared disposable Supabase stack; no production configuration copied.",
  );
} else if (process.argv[2] === "diagnostics") {
  const lines = read(path.join(root, "stack.log"))
    .split(/\r?\n/)
    .filter(
      (line) =>
        /error|failed|invalid|unsupported|no longer|not found/i.test(line) &&
        !/token|secret|password|key|authorization/i.test(line),
    );
  for (const line of lines.slice(-12))
    console.log(line.replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]"));
} else if (process.argv[2] === "test") {
  const children = [];
  let browser;
  const checks = [];
  const passed = (name) => {
    checks.push(name);
    console.log(`PASS ${name}`);
  };
  const start = (command, args, name, env = {}) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const log = createWriteStream(path.join(root, `${name}.log`));
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    children.push(child);
    return child;
  };
  const waitFor = async (probe, label) => {
    for (let i = 0; i < 60; i++) {
      try {
        if (await probe()) return;
      } catch {
        /* Local service may still be starting. */
      }
      await delay(1000);
    }
    throw Error(`Timed out: ${label}`);
  };
  try {
    const status = JSON.parse(cli("status", "-o", "json"));
    assert.equal(
      status.API_URL,
      api,
      "Only the dedicated loopback stack is allowed",
    );
    assert.ok(
      status.ANON_KEY && status.SERVICE_ROLE_KEY,
      "Local stack must provide legacy JWT keys for Edge verification",
    );
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const service = createClient(api, status.SERVICE_ROLE_KEY, options);
    const publicClient = createClient(api, status.ANON_KEY, options);
    const roles = read("supabase/migrations/202611080001_editor_roles.sql");
    const roleSchema = roles.slice(
      roles.indexOf("create table public.editor_users"),
      roles.indexOf("-- Preserve current function bodies"),
    );
    assert.ok(
      roleSchema.includes("create function public.set_editor_role"),
      "Historical role source missing",
    );
    sql(`create table public.admin_users(user_id uuid primary key references auth.users(id));
      alter table public.admin_users enable row level security;
      revoke all on public.admin_users from public,anon,authenticated;
      create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_users where user_id=(select auth.uid()))$$;
      revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated;
      ${roleSchema}
      create function public.hsv_v3_capabilities() returns jsonb language sql immutable set search_path='' as $$select '{"version":3}'::jsonb$$;
      ${read("supabase/migrations/202611200002_editor_add_operations.sql")}
      notify pgrst,'reload schema';`);
    const password = randomUUID() + "Aa1!";
    const create = async (email) => {
      const result = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      assert.ok(
        !result.error && result.data.user,
        "Could not create isolated Auth fixture",
      );
      return result.data.user;
    };
    const admin = await create("admin@fixture.invalid");
    const existing = await create("existing@fixture.invalid");
    sql(`insert into public.admin_users values('${admin.id}');`);
    const session = await publicClient.auth.signInWithPassword({
      email: admin.email,
      password,
    });
    assert.ok(
      !session.error && session.data.session,
      "Native Admin sign-in failed",
    );
    const token = session.data.session.access_token;
    const request = async (body, jwt = token, requestOrigin = origin) => {
      const response = await fetch(api + "/functions/v1/manage-editors", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          apikey: status.ANON_KEY,
          Origin: requestOrigin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const add = (email, request_id = randomUUID()) => ({
      action: "add",
      role: "editor",
      email,
      request_id,
    });
    start(
      "npx",
      [
        "--yes",
        "supabase@3.2.0",
        "functions",
        "serve",
        "manage-editors",
        "--workdir",
        stack,
        "--env-file",
        path.join(root, "edge.env"),
      ],
      "edge",
    );
    await waitFor(
      async () =>
        (
          await fetch(api + "/functions/v1/manage-editors", {
            method: "OPTIONS",
            headers: { Origin: origin },
          })
        ).status === 204,
      "Edge runtime",
    );
    const grant = await request(add(existing.email));
    assert.ok(
      grant.status === 200 && grant.body.state === "granted",
      "Native existing-account grant failed",
    );
    passed("Auth JWT + server Admin verification + existing-account grant");

    // The local mail sink captures SMTP. No relay or production provider is configured.
    const mailpit = (await fetch(mail + "/api/v1/messages")).ok;
    const messages = async (address) => {
      if (mailpit) {
        const data = await (await fetch(mail + "/api/v1/messages")).json();
        return (data.messages ?? []).filter((m) =>
          m.To?.some((to) => to.Address === address),
        );
      }
      const response = await fetch(
        mail + "/api/v1/mailbox/" + address.split("@")[0],
      );
      return response.ok ? response.json() : [];
    };
    const invitationUrl = async (address) => {
      await waitFor(
        async () => (await messages(address)).length > 0,
        "SMTP capture",
      );
      const rows = await messages(address);
      assert.equal(
        rows.length,
        1,
        "Only one invitation email should be captured",
      );
      const data = await (
        await fetch(
          mail +
            (mailpit
              ? `/api/v1/message/${rows[0].ID}`
              : `/api/v1/mailbox/${address.split("@")[0]}/${rows[0].id}`),
        )
      ).json();
      const html = data.HTML ?? data.body?.html ?? "";
      const link = html
        .match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1]
        ?.replaceAll("&amp;", "&");
      assert.ok(link, "Invitation email must contain Auth verification link");
      const url = new URL(link);
      assert.equal(
        url.origin,
        api,
        "Verification link must stay in the local stack",
      );
      assert.equal(
        url.searchParams.get("redirect_to"),
        origin + "/hsv/auth/accept",
      );
      return link;
    };
    start(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        "--port",
        "4175",
        "--strictPort",
        "--mode",
        "native-qa",
      ],
      "app",
      {
        VITE_SUPABASE_URL: api,
        VITE_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
        VITE_GOOGLE_MAPS_API_KEY: "",
      },
    );
    await waitFor(async () => (await fetch(origin + "/hsv/")).ok, "frontend");
    browser = await chromium.launch();
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(origin + "/hsv/admin/login");
    await page.getByLabel("Email", { exact: true }).fill(admin.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/$/);
    await page.goto(origin + "/hsv/admin/roles");
    await page
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Email", { exact: true })
      .fill("invited@fixture.invalid");
    await page
      .getByRole("button", { name: "Thêm Editor", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("status")).toContainText(
      "Đã cấp quyền Editor, đang chờ",
      { timeout: 30000 },
    );
    await page.screenshot({
      path: path.join(root, "native-invitation-pending.png"),
    });
    const link = await invitationUrl("invited@fixture.invalid");
    passed(
      "Browser Admin add -> deployed local Edge -> Auth invite -> SQL grant -> SMTP sink",
    );
    const recipientContext = await browser.newContext();
    const recipient = await recipientContext.newPage();
    await recipient.goto(link);
    await expect(
      recipient.getByRole("heading", { name: "Hoàn tất tài khoản" }),
    ).toBeVisible();
    await recipient.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
    await recipient
      .getByRole("button", { name: "Lưu mật khẩu và tiếp tục" })
      .click();
    await expect(recipient).toHaveURL(/\/admin\/$/);
    await recipient.goto(origin + "/hsv/admin/roles");
    await expect(
      recipient.getByText("Danh sách chỉ đọc.", { exact: true }),
    ).toBeVisible();
    await expect(
      recipient.getByRole("button", { name: "Thêm tài khoản", exact: true }),
    ).toHaveCount(0);
    await recipient.screenshot({
      path: path.join(root, "native-accepted-editor.png"),
    });
    const editor = createClient(api, status.ANON_KEY, options);
    const editorLogin = await editor.auth.signInWithPassword({
      email: "invited@fixture.invalid",
      password,
    });
    assert.ok(
      !editorLogin.error && editorLogin.data.session,
      "Accepted user must sign in with new password",
    );
    assert.equal((await editor.rpc("effective_role")).data, "editor");
    passed(
      "Email accept at /hsv/auth/accept, password, Editor access and fresh sign-in",
    );
    const reusedContext = await browser.newContext();
    const reused = await reusedContext.newPage();
    await reused.goto(link);
    await expect(
      reused.getByRole("heading", {
        name: "Lời mời chưa hợp lệ hoặc đã hết hạn",
      }),
    ).toBeVisible();
    passed("Used invitation link fails safely without an existing session");

    assert.equal(
      (
        await request(
          add("denied@fixture.invalid"),
          editorLogin.data.session.access_token,
        )
      ).status,
      403,
    );
    assert.equal(
      (await request(add("denied@fixture.invalid"), status.ANON_KEY)).status,
      401,
    );
    assert.equal(
      (
        await request(
          add("denied@fixture.invalid"),
          token,
          "https://example.invalid",
        )
      ).status,
      403,
    );
    assert.ok(
      (
        await editor.rpc("begin_editor_add", {
          p_actor: admin.id,
          p_email: "denied@fixture.invalid",
          p_request_id: randomUUID(),
          p_allow_invite: true,
        })
      ).error,
    );
    assert.ok(
      (await editor.from("editor_add_operations").select("email")).error,
    );
    passed(
      "Editor/anonymous/CORS refusals and service-only RPC/ledger permissions",
    );
    const concurrent = add("concurrent@fixture.invalid");
    const simultaneous = await Promise.all([
      request(concurrent),
      request(concurrent),
    ]);
    assert.ok(
      simultaneous.some((r) => r.body.ok),
      "One concurrent invitation must complete",
    );
    await invitationUrl(concurrent.email);
    const retry = await request(concurrent);
    assert.equal(retry.body.state, "already_editor");
    assert.equal((await messages(concurrent.email)).length, 1);
    passed(
      "Concurrent requests and lost-response retry send only one SMTP message",
    );

    sql(`create function public.native_reject_fixture_grant() returns trigger language plpgsql as $$begin if exists(select 1 from auth.users where id=new.user_id and email='partial@fixture.invalid') then raise exception 'Isolated failure injection'; end if;return new;end$$;
      create trigger native_reject_fixture_grant before insert on public.editor_users for each row execute function public.native_reject_fixture_grant();`);
    const partial = add("partial@fixture.invalid");
    assert.equal((await request(partial)).body.state, "grant_failed");
    await invitationUrl(partial.email);
    sql(
      "drop trigger native_reject_fixture_grant on public.editor_users; drop function public.native_reject_fixture_grant();",
    );
    assert.equal((await request(partial)).body.state, "granted");
    assert.equal((await messages(partial.email)).length, 1);
    passed(
      "Actual invitation + failed database grant + recovery without a second email",
    );
    const expired = add("expired@fixture.invalid");
    assert.ok((await request(expired)).body.ok);
    const expiredLink = await invitationUrl(expired.email);
    sql(
      "update auth.users set confirmation_sent_at=now()-interval '2 days' where email='expired@fixture.invalid';",
    );
    const expiredContext = await browser.newContext();
    const expiredPage = await expiredContext.newPage();
    await expiredPage.goto(expiredLink);
    await expect(
      expiredPage.getByRole("heading", {
        name: "Lời mời chưa hợp lệ hoặc đã hết hạn",
      }),
    ).toBeVisible();
    passed("Expired native invitation link reports recovery guidance");
    writeFileSync(
      path.join(root, "result.json"),
      JSON.stringify(
        {
          scope:
            "Disposable local Supabase in CI; synthetic account schema, native Auth/Edge/PostgREST/SMTP and browser; no production access",
          productionChanged: false,
          externalEmails: 0,
          passed: checks,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    writeFileSync(
      path.join(root, "result.json"),
      JSON.stringify(
        { passed: checks, complete: false, productionChanged: false },
        null,
        2,
      ),
    );
    // Never print Auth objects, invite URLs, SQL output or child-process logs.
    console.error(
      error instanceof assert.AssertionError
        ? `Native assertion failed: ${error.message.split("\n")[0]}`
        : `Native check failed (${error?.name ?? "Error"}) at ${error?.stack?.match(/test-hsv-native\.mjs:\d+:\d+/)?.[0] ?? "service startup"}; passed ${checks.length} checks. Inspect the isolated run without publishing credentials.`,
    );
    process.exitCode = 1;
  } finally {
    await browser?.close();
    for (const child of children) child.kill("SIGTERM");
  }
} else {
  throw Error("Use prepare or test; there is no production mode.");
}
