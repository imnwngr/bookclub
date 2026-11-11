import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { designBackend, designEvent } from "../tests/e2e/redesign-fixtures.ts";

const base = "http://127.0.0.1:4173/bookclub/";
const browserChannel = process.argv.find((arg) => arg.startsWith("--browser="))?.slice(10) ?? "chrome";
if (!["chrome", "msedge"].includes(browserChannel)) throw new Error("Use --browser=chrome or --browser=msedge.");
const throttlingMethod = process.argv.includes("--applied-throttling")
  ? "devtools"
  : "simulate";
const output = path.resolve(process.argv[2] ?? ".local/ui-redesign/invitation-v2/performance");
await mkdir(output, { recursive: true });
const compression =
  (
    await globalThis.fetch(base, {
      headers: { "Accept-Encoding": "gzip" },
    })
  ).headers.get("content-encoding") ?? "none";
const context = await chromium.launchPersistentContext(
  path.join(output, "chrome-profile"),
  { channel: browserChannel, headless: true, args: ["--remote-debugging-port=0"] },
);
try {
  await designBackend(context, {
    event: { ...designEvent, music_path: "fixture/score.mp3" },
  });
  const bytes = await readFile("tests/fixtures/background-silence.mp3");
  await context.route("**/storage/v1/object/sign/**", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            signedURL:
              "/object/sign/bookclub-music/fixture/score.mp3?token=fixture",
          }),
        })
      : route.fulfill({ contentType: "audio/mpeg", body: bytes }),
  );
  const blockedRequests = [];
  await context.route("**/*", (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      ["127.0.0.1", "bookclub-test.invalid"].includes(requestUrl.hostname) ||
      ["data:", "blob:"].includes(requestUrl.protocol)
    )
      return route.fallback();
    blockedRequests.push(requestUrl.origin + requestUrl.pathname);
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
  const url =
    base + "?__spa=" + encodeURIComponent("/bookclub/design-fixture/minh-an");
  const result = await lighthouse(url, {
    port,
    output: ["html", "json"],
    logLevel: "error",
    onlyCategories: ["performance", "accessibility"],
    formFactor: "mobile",
    throttlingMethod,
    disableStorageReset: true,
  });
  await writeFile(path.join(output, "cover.html"), result.report[0]);
  await writeFile(path.join(output, "cover.json"), result.report[1]);
  if (process.argv.includes("--trace") && result.artifacts.Trace) {
    await writeFile(path.join(output, "trace.json"), JSON.stringify(result.artifacts.Trace));
  }
  const { lhr } = result;
  if (lhr.runtimeError) {
    await writeFile(path.join(output, "summary.json"), JSON.stringify({
      measuredAt: new Date().toISOString(),
      compression,
      throttlingMethod,
      errors: lhr.runtimeError,
      warnings: lhr.runWarnings,
    }, null, 2));
    throw new Error(`Lighthouse ${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
  }
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  const failedRequests = [];
  page.on("requestfailed", (request) =>
    failedRequests.push({ url: new URL(request.url()).origin + new URL(request.url()).pathname, failure: request.failure() }),
  );
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()))
      errors.push(message.text());
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await page.locator(".opening-paper").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Mở điều khiển nhạc" }).click();
  await page.locator(".music-capsule").waitFor({ state: "visible" });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const scrollSample = await page.evaluate(async () => {
    const {
      document,
      innerHeight,
      scrollTo,
      requestAnimationFrame,
      PerformanceObserver,
    } = globalThis;
    const frames = [],
      longTasks = [];
    let cls = 0;
    const tasks = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    });
    const shifts = new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) cls += entry.value;
    });
    tasks.observe({ type: "longtask" });
    shifts.observe({ type: "layout-shift" });
    await new Promise((resolve) => {
      let count = 0,
        last;
      const end = document.documentElement.scrollHeight - innerHeight;
      function frame(time) {
        if (last) frames.push(time - last);
        last = time;
        scrollTo({ top: (end * count) / 180, behavior: "instant" });
        if (++count <= 180) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    tasks.disconnect();
    shifts.disconnect();
    const sorted = frames.toSorted((a, b) => a - b);
    return {
      frames: frames.length,
      medianFrameMs: sorted[Math.floor(sorted.length / 2)],
      p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
      framesOver50ms: frames.filter((ms) => ms > 50).length,
      longTasks: longTasks.length,
      longTaskMs: longTasks.reduce((sum, ms) => sum + ms, 0),
      cls,
      audioInstances: document.querySelectorAll("audio").length,
    };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const report = {
    measuredAt: new Date().toISOString(),
    environment:
      `Local production-mode e2e build; isolated fixtures including MP3; ${browserChannel} headless. Navigation uses Lighthouse mobile, throttlingMethod=${throttlingMethod}. Scroll sample uses 390x844, CPU x4, synthetic rAF scroll with the glass capsule open. Not physical-device FPS or field INP.`,
    browser: { channel: browserChannel, version: context.browser()?.version() },
    compression,
    navigation: {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
      tbtMs: lhr.audits["total-blocking-time"].numericValue,
      version: lhr.lighthouseVersion,
      throttlingMethod: lhr.configSettings.throttlingMethod,
      throttling: lhr.configSettings.throttling,
      errors: lhr.runtimeError ?? null,
      warnings: lhr.runWarnings,
    },
    scrollSample,
    browserErrors: errors,
    blockedRequests,
    failedRequests,
  };
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
}
