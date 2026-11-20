import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

// Restores only the affected public schema. Auth is represented by FK IDs, never credentials.
const root = path.resolve(process.argv[2] || "C:/dev/temp/hsv-v3-production");
const read = (name) =>
  JSON.parse(readFileSync(path.join(root, name + ".json"), "utf8"));
assert.equal(read("project_ref"), "trdofhdspbkwgernwybp");
const tables = read("tables"),
  functions = read("functions");
assert.equal(tables.length, 9);
assert.equal(functions.length, 26);
assert.ok(
  tables.every((t) => t.columns.every((c) => !c.identity && !c.generated)),
);
const allowedTables = [
  "admin_users",
  "editor_users",
  "events",
  "event_agenda_items",
  "guests",
  "event_guests",
  "invitation_aliases",
  "music_uploads",
  "venue_image_uploads",
];
assert.deepEqual(tables.map((t) => t.name).sort(), [...allowedTables].sort());
const quoteId = (value) => '"' + value.replaceAll('"', '""') + '"';
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
const records = Object.fromEntries(
  tables.map((t) => [t.name, read("tables/" + t.name)]),
);
const hashes = {};
for (const name of readdirSync(root).filter(
  (n) => n.endsWith(".json") && n !== "snapshot-manifest.json",
)) {
  hashes[name] = createHash("sha256")
    .update(readFileSync(path.join(root, name)))
    .digest("hex");
}
for (const table of tables)
  hashes["tables/" + table.name + ".json"] = createHash("sha256")
    .update(readFileSync(path.join(root, "tables", table.name + ".json")))
    .digest("hex");
const manifestFile = path.join(root, "snapshot-manifest.json");
if (existsSync(manifestFile))
  assert.deepEqual(
    JSON.parse(readFileSync(manifestFile, "utf8")),
    hashes,
    "Snapshot files changed since manifest creation",
  );
else writeFileSync(manifestFile, JSON.stringify(hashes, null, 2));
const output = path.join(
  root,
  "restore-" + new Date().toISOString().replace(/[:.]/g, "-"),
);
mkdirSync(output);
const data = path.join(output, "pgdata");
const bin = path.resolve(".local/postgresql-tools/pgsql/bin");
const exe = (name) =>
  path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
const password = randomBytes(32).toString("hex");
const passwordFile = path.join(output, "local-password");
writeFileSync(passwordFile, password);
const env = {
  ...process.env,
  PGPASSWORD: password,
  PGOPTIONS: "-c timezone=UTC",
};
const psql = [
  "-X",
  "-q",
  "-A",
  "-t",
  "-v",
  "ON_ERROR_STOP=1",
  "-h",
  "127.0.0.1",
  "-p",
  "55441",
  "-U",
  "postgres",
  "-d",
  "postgres",
];
let stage = "init",
  started = false;
const run = (name, args, input) => {
  try {
    return execFileSync(exe(name), args, {
      input,
      env,
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
      ...(name === "pg_ctl" ? { stdio: "ignore" } : {}),
    });
  } catch (error) {
    writeFileSync(
      path.join(output, stage + "-error.txt"),
      JSON.stringify({ stage, status: error.status, signal: error.signal }),
    );
    throw Error("Local verification failed at " + stage, { cause: error });
  }
};
const sql = (query) => run("psql", psql, query);
const query = (text) => JSON.parse(sql(text).trim());
const functionHashes = () =>
  query(
    "select jsonb_object_agg(p.proname,md5(replace(pg_get_functiondef(p.oid),chr(13),''))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';",
  );
const verifyRows = (v3) => {
  for (const table of tables) {
    const value =
      v3 && table.name === "events"
        ? "to_jsonb(t)-'event_type'-'theme'"
        : "to_jsonb(t)";
    const actual = query(
      `select coalesce(jsonb_agg(${value} order by (${value})::text),'[]'::jsonb) from public.${quoteId(table.name)} t;`,
    );
    assert.deepEqual(
      actual,
      records[table.name],
      "Data differs for " + table.name,
    );
  }
};
try {
  run("initdb", [
    "-D",
    data,
    "-U",
    "postgres",
    "--auth=scram-sha-256",
    "--pwfile=" + passwordFile,
    "--encoding=UTF8",
    "--no-locale",
  ]);
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    path.join(output, "postgres.log"),
    "-o",
    "-h 127.0.0.1 -p 55441 -c log_min_error_statement=panic -c log_error_verbosity=terse",
    "-w",
    "start",
  ]);
  started = true;
  stage = "restore-schema";
  let setup = `set check_function_bodies=off; set standard_conforming_strings=on;
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,invited_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table storage.objects(id uuid primary key,bucket_id text,name text);
    insert into auth.users(id) select jsonb_array_elements_text(${quote(JSON.stringify(read("auth_reference_ids")))}::jsonb)::uuid;\n`;
  for (const table of tables) {
    setup +=
      `create table public.${quoteId(table.name)} (` +
      table.columns
        .map(
          (c) =>
            `${quoteId(c.name)} ${c.type}${c.default ? " default " + c.default : ""}${c.not_null ? " not null" : ""}`,
        )
        .join(",") +
      ");\n";
  }
  for (const f of functions) setup += f.definition + ";\n";
  // Rows load before triggers so restoration preserves timestamps and snapshots exactly.
  for (const table of tables)
    setup += `insert into public.${quoteId(table.name)} select * from jsonb_populate_recordset(null::public.${quoteId(table.name)},${quote(JSON.stringify(records[table.name]))}::jsonb);\n`;
  const constraints = read("constraints");
  for (const c of [
    ...constraints.filter((c) => c.type !== "f"),
    ...constraints.filter((c) => c.type === "f"),
  ])
    setup += `alter table public.${quoteId(c.table)} add constraint ${quoteId(c.name)} ${c.definition};\n`;
  for (const index of read("indexes") || []) setup += index.definition + ";\n";
  for (const trigger of read("triggers") || []) {
    assert.equal(trigger.enabled, "O", "Nondefault trigger state needs review");
    setup += trigger.definition + ";\n";
  }
  for (const policy of read("policies") || []) {
    setup += `create policy ${quoteId(policy.policyname)} on public.${quoteId(policy.tablename)} as ${policy.permissive} for ${policy.cmd} to ${policy.roles.map((r) => (r === "public" ? "PUBLIC" : quoteId(r))).join(",")}`;
    if (policy.qual) setup += ` using (${policy.qual})`;
    if (policy.with_check) setup += ` with check (${policy.with_check})`;
    setup += ";\n";
  }
  for (const table of tables) {
    setup += `revoke all on public.${quoteId(table.name)} from public,anon,authenticated,service_role;\n`;
    for (const g of table.grants)
      setup += `grant ${g.privilege} on public.${quoteId(table.name)} to ${g.role === "PUBLIC" ? "PUBLIC" : quoteId(g.role)}${g.grantable ? " with grant option" : ""};\n`;
    if (table.rls)
      setup += `alter table public.${quoteId(table.name)} enable row level security;\n`;
    if (table.force_rls)
      setup += `alter table public.${quoteId(table.name)} force row level security;\n`;
  }
  for (const f of functions) {
    setup += `revoke all on function public.${f.signature} from public,anon,authenticated,service_role;\n`;
    for (const g of f.grants)
      setup += `grant ${g.privilege} on function public.${f.signature} to ${g.role === "PUBLIC" ? "PUBLIC" : quoteId(g.role)}${g.grantable ? " with grant option" : ""};\n`;
  }
  writeFileSync(path.join(output, "restore.sql"), setup);
  sql(setup);
  stage = "restore-invariants";
  verifyRows(false);
  const fingerprints = Object.fromEntries(
    tables.map((t) => [
      t.name,
      sql(
        `select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text) from public.${quoteId(t.name)} t;`,
      ).trim(),
    ]),
  );
  const before = functionHashes();
  for (const f of functions)
    assert.equal(
      before[f.name],
      createHash("md5").update(f.definition.replaceAll("\r", "")).digest("hex"),
      "Function drift: " + f.name,
    );
  const unchangedFunctions = functions.filter(
    (f) => !["save_event", "set_editor_role"].includes(f.name),
  );
  stage = "migration-events";
  sql(
    readFileSync(
      "supabase/migrations/202611200001_event_types_theme.sql",
      "utf8",
    ),
  );
  stage = "migration-accounts";
  sql(
    readFileSync(
      "supabase/migrations/202611200002_editor_add_operations.sql",
      "utf8",
    ),
  );
  stage = "postflight";
  verifyRows(true);
  const after = functionHashes();
  for (const f of unchangedFunctions)
    assert.equal(
      after[f.name],
      before[f.name],
      "Unrelated function changed: " + f.name,
    );
  const capabilities = query("select hsv_v3_capabilities();");
  assert.equal(capabilities.editor_add_operations, true);
  assert.equal(
    sql(
      "select count(*) from events where event_type<>'invitation' or not valid_event_theme(theme);",
    ).trim(),
    "0",
  );
  const denied = query(
    "select jsonb_build_object('anon_save',has_function_privilege('anon','save_event(jsonb,uuid[],uuid,timestamptz)','execute'),'authenticated_add',has_function_privilege('authenticated','begin_editor_add(uuid,text,uuid,boolean)','execute'),'authenticated_finish',has_function_privilege('authenticated','finish_editor_add(uuid,text,uuid,uuid)','execute'),'authenticated_ledger',has_table_privilege('authenticated','editor_add_operations','select'),'ledger_rls',(select relrowsecurity from pg_class where oid='editor_add_operations'::regclass));",
  );
  assert.deepEqual(denied, {
    anon_save: false,
    authenticated_add: false,
    authenticated_finish: false,
    authenticated_ledger: false,
    ledger_rls: true,
  });
  stage = "transactional-resolver-checks";
  const admin = records.admin_users[0].user_id;
  sql(`begin; set local role authenticated; select set_config('request.jwt.claim.sub',${quote(admin)},true);
    do $$ declare result jsonb; begin
      result:=public.save_event('{"code":"hsv-local-restore-check","title":"Kiểm thử phục hồi local","event_type":"congratulation","status":"draft","theme":{"version":1,"primary":"#873c42"}}'::jsonb,array[]::uuid[]);
      if result->>'event_type'<>'congratulation' or result->>'starts_at' is not null or result->>'ends_at' is not null then raise exception 'Congratulation null contract failed'; end if;
      begin
        perform public.save_event('{"code":"hsv-local-invalid-invite","title":"Kiểm thử local","event_type":"invitation","status":"draft"}'::jsonb,array[]::uuid[]);
        raise exception 'Invitation validation was not enforced';
      exception when check_violation then null; end;
    end $$;
    set local role anon; select set_config('request.jwt.claim.sub','',true);
    do $$ begin
      if public.get_event_v110('hsv-local-restore-check') is not null then raise exception 'Draft exposed'; end if;
    end $$; rollback;`);
  verifyRows(true);
  const result = {
    scope:
      "Exact captured public schema and rows, local PostgreSQL only; Auth FK stubs, no Auth/Storage service restore",
    project: read("project_ref"),
    capturedAt: read("captured_at"),
    restoredTables: tables.length,
    unchangedRows: Object.fromEntries(
      tables.map((t) => [t.name, records[t.name].length]),
    ),
    fingerprints,
    unchangedFunctions: unchangedFunctions.length,
    migrations: "Both original v3 files PASS",
    dataPreserved: true,
    permissions: denied,
    nullCongratulationAndInvitationValidation: true,
    draftResolverProtected: true,
    productionChanged: false,
    storageBytesBackedUp: false,
    authCredentialsBackedUp: false,
  };
  writeFileSync(
    path.join(output, "result.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify({ output, ...result }));
} catch (error) {
  console.error(
    JSON.stringify({
      stage,
      result: "FAIL",
      diagnosticDirectory: output,
      reason: error.message.startsWith("Local verification failed")
        ? error.message
        : "Invariant failed; inspect protected diagnostics",
    }),
  );
  writeFileSync(
    path.join(output, "verification-error.txt"),
    JSON.stringify({ stage, name: error.name, code: error.code }),
  );
  process.exitCode = 1;
} finally {
  if (started) {
    stage = "shutdown";
    run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
  }
}
