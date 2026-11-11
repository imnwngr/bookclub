import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { designBackend, designEvent } from "../tests/e2e/redesign-fixtures.ts";

const label = process.argv[2] ?? "after";
if (!/^[a-z-]+$/.test(label)) throw Error("Use a local report label.");
const output = `.local/ui-redesign/invitation-v2/${label}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
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
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:4173/bookclub/design-fixture/minh-an");
    await page.getByRole("button", { name: "Mở thiệp mời" }).waitFor();
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.screenshot({
      path: `${output}/cover-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await page.locator(".opening-paper").waitFor({ state: "detached" });
    await page.locator("#invitation-program").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.evaluate(() => globalThis.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `${output}/opened-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await writeFile(
    `${output}/browser.json`,
    JSON.stringify({ errors }, null, 2),
  );
  console.log(JSON.stringify({ output, errors }));
} finally {
  await browser.close();
}
