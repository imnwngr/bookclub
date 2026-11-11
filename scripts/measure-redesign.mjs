import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { designBackend } from "../tests/e2e/redesign-fixtures.ts";

// Run against the isolated build:e2e server; measurements contain fixture data only.
const base = "http://127.0.0.1:4173/bookclub/";
const label = process.argv[2] ?? "latest";
if (!/^[a-z-]+$/.test(label))
  throw new Error("Use a simple local report label.");
const output = path.resolve(".local/ui-redesign/performance", label);
const compression =
  (
    await globalThis.fetch(base, { headers: { "Accept-Encoding": "gzip" } })
  ).headers.get("content-encoding") ?? "none";
await mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(
  path.join(output, "chrome-profile"),
  {
    channel: "chrome",
    headless: true,
    args: ["--remote-debugging-port=0"],
  },
);
try {
  await designBackend(context);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      ["127.0.0.1", "bookclub-test.invalid"].includes(url.hostname) ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.fallback();
    return route.abort();
  });
  const port = Number(
    (
      await readFile(
        path.join(output, "chrome-profile/DevToolsActivePort"),
        "utf8",
      )
    ).split("\n")[0],
  );
  const results = [];
  for (const [name, route] of [
    ["home", ""],
    ["detail", "design-fixture"],
    ["invitation-cover", "design-fixture/minh-an"],
  ]) {
    const url = route
      ? `${base}?__spa=${encodeURIComponent(`/bookclub/${route}`)}`
      : base;
    const result = await lighthouse(url, {
      port,
      output: ["html", "json"],
      logLevel: "error",
      onlyCategories: ["performance", "accessibility"],
      formFactor: "mobile",
      disableStorageReset: true,
    });
    await writeFile(path.join(output, `${name}.html`), result.report[0]);
    await writeFile(path.join(output, `${name}.json`), result.report[1]);
    const { lhr } = result;
    const summary = {
      name,
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
      tbtMs: lhr.audits["total-blocking-time"].numericValue,
      speedIndexMs: lhr.audits["speed-index"].numericValue,
      errors: lhr.runtimeError ?? null,
      warnings: lhr.runWarnings,
      conditions: {
        compression,
        version: lhr.lighthouseVersion,
        formFactor: lhr.configSettings.formFactor,
        throttling: lhr.configSettings.throttling,
        throttlingMethod: lhr.configSettings.throttlingMethod,
      },
    };
    results.push(summary);
    console.log(JSON.stringify(summary));
  }
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        environment:
          "Local production-mode Vite e2e build, intercepted fixtures, Chromium, Lighthouse simulated mobile. Not field INP or production network results.",
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
}
