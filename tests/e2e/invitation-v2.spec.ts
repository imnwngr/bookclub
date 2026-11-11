import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { designBackend, designEvent, designGuests } from "./redesign-fixtures";

const route = "/bookclub/design-fixture/minh-an";
const output = ".local/ui-redesign/invitation-v2/after";
async function fixture(page: Page) {
  await designBackend(page, {
    event: { ...designEvent, music_path: "fixture/score.mp3" },
  });
  const bytes = await readFile("tests/fixtures/background-silence.mp3");
  await page.route("**/storage/v1/object/sign/**", (request) =>
    request.request().method() === "POST"
      ? request.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            signedURL:
              "/object/sign/bookclub-music/fixture/score.mp3?token=fixture",
          }),
        })
      : request.fulfill({ contentType: "audio/mpeg", body: bytes }),
  );
}
async function capture(page: Page, name: string, fullPage = false) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (a) =>
            a.timeline === document.timeline &&
            Number.isFinite(a.effect?.getComputedTiming().endTime as number),
        )
        .map((a) => a.finished.catch(() => {})),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    name,
  ).toBe(true);
  await page.screenshot({
    path: output + "/" + name + ".png",
    fullPage,
    animations: "disabled",
  });
}
async function open(page: Page) {
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.getByRole("heading", { name: designGuests[0].name, exact: true }),
  ).toBeFocused();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
}
for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
  test(
    "invitation 2 material and music viewport " + width,
    async ({ page }, info) => {
      test.skip(
        info.project.name !== "desktop",
        "Width matrix runs once; interaction tests also run in touch mobile project.",
      );
      test.setTimeout(60000);
      await page.setViewportSize({ width, height: 900 });
      await fixture(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          ["error", "warning"].includes(message.type()) &&
          !message
            .text()
            .startsWith(
              "Failed to load resource: the server responded with a status of 404",
            )
        )
          errors.push(message.text());
      });
      page.on("response", (response) => {
        if (
          response.status() >= 400 &&
          response.request().resourceType() !== "document"
        )
          errors.push(
            String(response.status()) + " " + new URL(response.url()).pathname,
          );
      });
      await page.goto(route);
      await expect(
        page.getByRole("button", { name: "Mở thiệp mời" }),
      ).toBeVisible();
      const audio = page.locator("audio");
      await expect(audio).toHaveJSProperty("volume", 0.25);
      await capture(page, "cover-" + width, true);
      await open(page);
      await page.getByRole("button", { name: "Mở điều khiển nhạc" }).click();
      await expect(page.getByRole("slider", { name: "Âm lượng" })).toHaveValue(
        "25",
      );
      await expect(page.locator(".music-capsule")).toHaveText("");
      const box = await page.locator(".music-capsule").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(8);
      expect(box!.x + box!.width).toBeLessThan(width - 44);
      await capture(page, "glass-expanded-25-" + width);
      if (await audio.evaluate((el: HTMLAudioElement) => el.paused))
        await page
          .getByRole("button", { name: "Phát nhạc", exact: true })
          .click();
      await expect(audio).toHaveJSProperty("paused", false);
      await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
      await expect(audio).toHaveJSProperty("paused", true);
      await capture(page, "glass-paused-" + width);
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Mở điều khiển nhạc" }),
      ).toBeFocused();
      await page.locator(".calendar-card").scrollIntoViewIfNeeded();
      await capture(page, "time-place-" + width);
      await page.locator("#invitation-program").scrollIntoViewIfNeeded();
      await capture(page, "agenda-" + width);
      await page
        .locator(".invitation-closing .text-link")
        .scrollIntoViewIfNeeded();
      await capture(page, "closing-" + width);
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await capture(page, "opened-" + width, true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await capture(page, "reduced-" + width);
      expect(errors).toEqual([]);
    },
  );
}
test("invitation 2 keyboard, touch, mute, slider, focus and accessibility", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto(route);
  await expect(
    page.getByRole("button", { name: "Mở thiệp mời" }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Mở điều khiển nhạc" }).tap();
  else await page.getByRole("button", { name: "Mở điều khiển nhạc" }).click();
  await expect(page.locator(".music-action").first()).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(page.locator(".music-action").first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".music-action").nth(1)).toBeFocused();
  await page.keyboard.press("Tab");
  const slider = page.getByRole("slider", { name: "Âm lượng" });
  await expect(slider).toBeFocused();
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  await expect(page.locator("audio")).toHaveJSProperty("volume", 1);
  await slider.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", "0%");
  await expect(page.locator("audio")).toHaveJSProperty("volume", 0);
  await page.getByRole("button", { name: "Bật tiếng", exact: true }).click();
  await expect(slider).toHaveValue("25");
  await page.getByRole("button", { name: "Tắt tiếng", exact: true }).click();
  await expect(page.locator("audio")).toHaveJSProperty("muted", true);
  await expect(
    page.getByRole("button", { name: "Bật tiếng", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await capture(page, "glass-muted-" + info.project.name);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở điều khiển nhạc" }),
  ).toBeFocused();
  await expect(slider).toBeHidden();
  await open(page);
  await expect(page.locator("audio")).toHaveCount(1);
  await expect(page.locator("audio")).toHaveJSProperty("muted", true);
  await page.getByRole("button", { name: "Mở điều khiển nhạc" }).click();
  await page
    .getByRole("heading", { name: designGuests[0].name, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mở điều khiển nhạc" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.locator("#invitation-program").scrollIntoViewIfNeeded();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const media = await page.locator("audio").elementHandle();
  await page
    .getByRole("link", { name: "Thông tin sự kiện", exact: true })
    .click();
  await expect(page.locator("audio, .music-dock")).toHaveCount(0);
  expect(
    await media!.evaluate(
      (el: HTMLAudioElement) => el.paused && !el.getAttribute("src"),
    ),
  ).toBe(true);
});
test("invitation 2 scroll moments, reverse scrolling and live reduced motion", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto(route);
  await open(page);
  const position = async (selector: string, viewportOffset: number) => {
    await page.locator(selector).evaluate(
      (el, offset) =>
        window.scrollTo({
          top: el.getBoundingClientRect().top + scrollY - innerHeight * offset,
          behavior: "instant",
        }),
      viewportOffset,
    );
    await page.waitForTimeout(80);
  };
  await position(".paper-bridge", 0.9);
  const foldStart = await page
    .locator(".paper-bridge-leaf")
    .evaluate((el) => getComputedStyle(el).transform);
  await position(".paper-bridge", 0.3);
  const foldEnd = await page
    .locator(".paper-bridge-leaf")
    .evaluate((el) => getComputedStyle(el).transform);
  expect(foldEnd).not.toBe(foldStart);
  await page.screenshot({
    path: output + "/fold-motion-" + info.project.name + ".png",
  });
  await position(".calendar-card", 0.7);
  await page.screenshot({
    path: output + "/schedule-motion-" + info.project.name + ".png",
  });
  await position(".agenda ol", 0.85);
  const before = await page
    .locator(".agenda ol")
    .evaluate((el) => getComputedStyle(el, "::before").transform);
  await position(".agenda ol", 0.1);
  const after = await page
    .locator(".agenda ol")
    .evaluate((el) => getComputedStyle(el, "::before").transform);
  expect(after).not.toBe(before);
  await page.screenshot({
    path: output + "/timeline-motion-" + info.project.name + ".png",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".invitation-content")).not.toHaveClass(
    /story-native-scroll/,
  );
  await expect(page.locator(".paper-bridge-leaf")).toHaveCSS(
    "transform",
    "none",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(
    page.getByRole("heading", { name: designGuests[0].name, exact: true }),
  ).toBeVisible();
});
test("invitation 2 supports missing motion APIs and absent optional music", async ({
  page,
}) => {
  await designBackend(page, { event: { ...designEvent, music_path: null } });
  await page.addInitScript(() => {
    Object.defineProperty(window, "IntersectionObserver", { value: undefined });
  });
  await page.goto(route);
  await open(page);
  await expect(page.locator("audio, .music-dock")).toHaveCount(0);
  await page.locator(".invitation-closing").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "Thông tin sự kiện", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
