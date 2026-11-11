import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { designBackend } from "../tests/e2e/redesign-fixtures.ts";

const output = ".local/ui-redesign/inspection";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await designBackend(context, { admin: true });
  await context.route("**/*", (route) =>
    ["127.0.0.1", "bookclub-test.invalid"].includes(
      new URL(route.request().url()).hostname,
    )
      ? route.fallback()
      : route.abort(),
  );
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/bookclub/design-fixture/minh-an");
  await page.getByRole("button", { name: "Mở thiệp mời" }).waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({ path: `${output}/cover-viewport.png` });
  const frames = page.evaluate(
    () =>
      new Promise((resolve) => {
        const intervals = [];
        const start = globalThis.performance.now();
        let previous = start;
        function frame(now) {
          intervals.push(now - previous);
          previous = now;
          if (now - start < 2400) globalThis.requestAnimationFrame(frame);
          else
            resolve({
              frames: intervals.length,
              meanFrameMs:
                intervals.reduce((sum, value) => sum + value, 0) /
                intervals.length,
              framesOver32ms: intervals.filter((value) => value > 32).length,
              maxFrameMs: Math.max(...intervals),
            });
        }
        globalThis.requestAnimationFrame(frame);
      }),
  );
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await page.locator(".opening-paper").waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  await page.screenshot({
    path: `${output}/opening-in-progress.png`,
    animations: "allow",
  });
  await page.locator(".opening-paper").waitFor({ state: "detached" });
  await page.screenshot({ path: `${output}/greeting-viewport.png` });
  const result = await frames;
  await page.locator("#invitation-program").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/program-viewport.png` });
  await page.locator("#invitation-greeting").scrollIntoViewIfNeeded();
  await page.goto("http://127.0.0.1:4173/bookclub/admin/edit/design-fixture");
  await page.getByRole("heading", { name: "Chỉnh sửa sự kiện" }).waitFor();
  await page
    .locator(".rich-quote")
    .first()
    .screenshot({ path: `${output}/rich-editor-desktop.png` });
  await page
    .locator("#editor-agenda")
    .screenshot({ path: `${output}/agenda-desktop.png` });
  await page.setViewportSize({ width: 320, height: 800 });
  await page
    .locator(".rich-quote")
    .first()
    .screenshot({ path: `${output}/rich-editor-mobile.png` });
  await page
    .locator("#editor-agenda")
    .screenshot({ path: `${output}/agenda-mobile.png` });
  await context.close();
  await writeFile(
    `${output}/motion.json`,
    JSON.stringify(
      {
        conditions:
          "Headless desktop Chromium, local fixture build, screenshot capture during opening; not a physical mobile benchmark or field INP.",
        ...result,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
