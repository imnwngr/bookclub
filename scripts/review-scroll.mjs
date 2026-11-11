import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { designBackend, designEvent } from "../tests/e2e/redesign-fixtures.ts";

const output = ".local/ui-redesign/brand-scroll-v3/after";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  const context = await browser.newContext();
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
  await context.route("**/*", (route) =>
    ["127.0.0.1", "bookclub-test.invalid"].includes(
      new URL(route.request().url()).hostname,
    )
      ? route.fallback()
      : route.abort(),
  );
  const page = await context.newPage();
  page.on("pageerror", (error) => results.push({ error: error.message }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:4173/bookclub/");
    await page.getByRole("heading", { name: /Hẹn nhau/ }).waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.screenshot({
      path: `${output}/home-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto(
      "http://127.0.0.1:4173/bookclub/?__spa=%2Fbookclub%2Fdesign-fixture%2Fminh-an",
    );
    await page.getByRole("button", { name: "Mở thiệp mời" }).waitFor();
    await page.screenshot({
      path: `${output}/cover-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await page.locator(".opening-paper").waitFor({ state: "detached" });
    await page.screenshot({ path: `${output}/opened-${width}.png` });
    for (const name of ["event", "schedule", "program", "closing"]) {
      const chapter = page.locator(`[data-chapter="${name}"]`);
      for (const [label, fraction] of [
        ["early", 0.9],
        ["mid", 0.55],
        ["complete", 0.15],
        ["reverse", 0.55],
      ]) {
        await chapter.evaluate(
          (el, fraction) =>
            globalThis.scrollTo({
              top:
                el.getBoundingClientRect().top +
                globalThis.scrollY -
                globalThis.innerHeight * fraction,
              behavior: "instant",
            }),
          fraction,
        );
        await page.waitForTimeout(180);
        await page.screenshot({
          path: `${output}/${name}-${label}-${width}.png`,
        });
        results.push(
          await chapter.evaluate(
            (el, label) => ({
              label,
              name: el.getAttribute("data-chapter"),
              viewport: globalThis.innerWidth,
              scroll: globalThis.scrollY,
              transform: globalThis.getComputedStyle(el.firstElementChild)
                .transform,
              overflow:
                globalThis.document.documentElement.scrollWidth >
                globalThis.innerWidth,
            }),
            label,
          ),
        );
      }
    }
    await page.getByRole("button", { name: "Mở điều khiển nhạc" }).click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${output}/music-${width}.png` });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() =>
      globalThis.scrollTo({ top: 0, behavior: "instant" }),
    );
    await page.screenshot({
      path: `${output}/reduced-full-${width}.png`,
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  await writeFile(`${output}/browser.json`, JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify({
      output,
      errors: results.filter((r) => r.error),
      overflow: results.filter((r) => r.overflow),
    }),
  );
} finally {
  await browser.close();
}
