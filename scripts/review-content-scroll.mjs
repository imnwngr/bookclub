import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { designBackend, designEvent } from "../tests/e2e/redesign-fixtures.ts";

const output = ".local/ui-redesign/content-scroll-fix";
const origin = process.env.REVIEW_ORIGIN || "http://127.0.0.1:5190";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { errors: [], blockedRequests: [], samples: [], layouts: [] };
try {
  const context = await browser.newContext();
  await designBackend(context, { event: designEvent });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "bookclub-test.invalid"].includes(url.hostname)) return route.fallback();
    report.blockedRequests.push(url.hostname);
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(error.message));
  for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/bookclub/?__spa=%2Fbookclub%2Fdesign-fixture%2Fminh-an`);
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await page.locator(".opening-paper").waitFor({ state: "detached" });
    await page.evaluate(() => globalThis.document.fonts.ready);
    for (const selector of [".invitation-event h2", ".meeting-schedule h2", ".agenda h2", ".agenda li:first-child", ".invitation-closing .invitation-signoff"]) {
      const target = page.locator(selector);
      for (const offset of [20, 80, 180, 80]) {
        await target.evaluate((el, offset) => {
          let top = 0;
          for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
          globalThis.scrollTo({ top: top - globalThis.innerHeight + offset, behavior: "instant" });
        }, offset);
        await page.waitForTimeout(100);
        report.samples.push(await target.evaluate((el, data) => ({
          ...data,
          opacity: globalThis.getComputedStyle(el).opacity,
          transform: globalThis.getComputedStyle(el).transform,
          scroll: globalThis.scrollY,
        }), { width, selector, offset }));
      }
    }
    for (const [name, selector] of [["event", ".invitation-event"], ["schedule", ".meeting-schedule"], ["program", ".invitation-program"], ["closing", ".invitation-closing"]]) {
      await page.locator(selector).evaluate((el) => globalThis.scrollTo({ top: el.getBoundingClientRect().top + globalThis.scrollY - 80, behavior: "instant" }));
      await page.waitForTimeout(100);
      await page.screenshot({ path: `${output}/${name}-${width}.png` });
      report.layouts.push(await page.evaluate(({ width, name }) => {
        const sheets = [...globalThis.document.querySelectorAll(".story-sheet")];
        const bounds = sheets.map(el => el.getBoundingClientRect());
        return {
          width, name,
          overflow: globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
          overlap: bounds.some((rect, i) => i > 0 && rect.top < bounds[i - 1].bottom - 1),
          sheetTransforms: sheets.map(el => globalThis.getComputedStyle(el).transform),
        };
      }, { width, name }));
    }
    if ([390, 1440].includes(width)) {
      for (const [name, offset] of [["enter", 30], ["half", 100], ["read", 280]]) {
        await page.locator(".agenda li:first-child").evaluate((el, offset) => {
          let top = 0;
          for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
          globalThis.scrollTo({ top: top - globalThis.innerHeight + offset, behavior: "instant" });
        }, offset);
        await page.waitForTimeout(100);
        await page.screenshot({ path: `${output}/agenda-${name}-${width}.png` });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.screenshot({ path: `${output}/reduced-${width}.png`, fullPage: true });
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
  }
  await writeFile(`${output}/browser.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, errors: report.errors, blockedRequests: [...new Set(report.blockedRequests)], layoutFailures: report.layouts.filter(r => r.overflow || r.overlap), samples: report.samples.slice(0, 8) }));
} finally {
  await browser.close();
}
