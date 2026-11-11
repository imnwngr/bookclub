import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { designBackend, designEvent, designGuests } from "./redesign-fixtures";

async function settled(page: Page) {
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
}
async function capture(page: Page, name: string) {
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  for (const img of await page.locator('img[loading="lazy"]').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveJSProperty("complete", true);
    expect(
      await img.evaluate((element: HTMLImageElement) => element.naturalWidth),
    ).toBeGreaterThan(0);
  }
  await page.evaluate(
    ({ x, y }) => window.scrollTo({ left: x, top: y, behavior: "instant" }),
    scroll,
  );
  await settled(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `Overflow: ${name}`,
  ).toBe(true);
  await page.screenshot({
    path: `.local/ui-redesign/after/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`redesign viewport ${width}: public, invitation and administration`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Explicit viewport matrix uses one Chromium project.",
    );
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    await designBackend(page, { admin: true });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        ["error", "warning"].includes(message.type()) &&
        !message.text().includes("404 (Not Found)")
      )
        errors.push(message.text());
    });
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        response.request().resourceType() !== "document"
      )
        errors.push(
          `HTTP ${response.status()}: ${new URL(response.url()).pathname}`,
        );
    });
    for (const [path, name, heading] of [
      ["", "home", "Hẹn nhau"],
      ["design-fixture", "detail", "Khi những trang sách"],
      ["admin/", "dashboard", "Quản lý sự kiện"],
      ["admin/edit/design-fixture", "editor", "Chỉnh sửa sự kiện"],
      ["admin/guests", "guests", "Danh bạ khách mời"],
      ["admin/roles", "roles", "Quản lý vai trò"],
      ["admin/login", "login", "Quản lý BookClub"],
    ]) {
      await page.goto(`/bookclub/${path}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(heading) }).first(),
      ).toBeVisible();
      await capture(page, `${name}-${width}`);
      expect(
        await page
          .locator("img")
          .evaluateAll((images) =>
            images.every((img) => !img.complete || img.naturalWidth > 0),
          ),
        `Broken image: ${name}`,
      ).toBe(true);
    }
    await page.goto("/bookclub/design-fixture/minh-an");
    await expect(
      page.getByRole("button", { name: "Mở thiệp mời" }),
    ).toBeVisible();
    await capture(page, `cover-${width}`);
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await expect(
      page.getByRole("heading", { name: designGuests[0].name, exact: true }),
    ).toBeFocused();
    await expect(page.locator(".opening-paper")).toHaveCount(0);
    await page.locator("#invitation-program").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await capture(page, `invitation-${width}`);
    expect(errors).toEqual([]);
  });
}
test("redesign accessibility across key routes and open dialogs", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await designBackend(page, { admin: true });
  for (const [path, name] of [
    ["", "home"],
    ["design-fixture", "detail"],
    ["admin/", "dashboard"],
    ["admin/edit/design-fixture", "editor"],
    ["admin/guests", "guests"],
    ["admin/roles", "roles"],
    ["admin/login", "login"],
    ["design-fixture/minh-an", "cover"],
  ]) {
    await page.goto(`/bookclub/${path}`);
    await expect(
      page.locator("main h1, .cover-recipient").first(),
    ).toBeVisible();
    await settled(page);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await info.attach(`axe-${name}`, {
      body: JSON.stringify(scan.violations, null, 2),
      contentType: "application/json",
    });
    expect(scan.violations, name).toEqual([]);
  }
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
  const opened = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(opened.violations, "invitation opened").toEqual([]);
  await page.goto("/bookclub/admin/roles");
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await capture(page, `role-dialog-${info.project.name}`);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Thêm tài khoản" }),
  ).toBeFocused();
});

test("redesign long and minimal invitation, toolbar keyboard and drawer focus", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await designBackend(page, {
    admin: true,
    event: {
      ...designEvent,
      title:
        "Buổi gặp mặt cùng những người yêu thích sách và văn hóa đọc tại trường đại học",
      description: designEvent.description.repeat(12),
    },
  });
  await page.goto("/bookclub/design-fixture/minh-an");
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
  await page.locator(".invitation-closing").scrollIntoViewIfNeeded();
  await page.locator("#invitation-greeting").scrollIntoViewIfNeeded();
  await capture(page, `long-invitation-${info.project.name}`);
  await page.goto("/bookclub/admin/edit/design-fixture");
  const toolbar = page.getByRole("toolbar").first();
  await toolbar.getByRole("button", { name: "Đậm", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    toolbar.getByRole("button", { name: "Nghiêng", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    toolbar.getByRole("button", { name: "Đậm", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Thời gian sự kiện", exact: true })
    .click();
  await capture(page, `range-popover-${info.project.name}`);
  await page.goto("/bookclub/admin/");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Điều hướng", exact: true }).click();
    await capture(page, "admin-drawer-mobile");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Điều hướng", exact: true }),
    ).toBeFocused();
  }
  await designBackend(page, {
    event: {
      ...designEvent,
      agenda: [],
      quote_one: null,
      quote_two: null,
      venue_image_path: null,
      music_path: null,
      description: "",
      description_rich: null,
    },
  });
  await page.goto("/bookclub/design-fixture/thanh-vien");
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
  await expect(
    page.locator(
      ".agenda, .invitation-quote-one, .invitation-quote-two, .music-dock, .venue-media img",
    ),
  ).toHaveCount(0);
  await capture(page, `minimal-invitation-${info.project.name}`);
  await designBackend(page, { empty: true });
  await page.goto("/bookclub/design-fixture/missing");
  await expect(
    page.getByRole("heading", { name: "Chưa có nội dung" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await capture(page, `invitation-not-found-${info.project.name}`);
});
test("redesign menu, range focus, agenda identities and reduced motion", async ({
  page,
}, info) => {
  await designBackend(page, { admin: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bookclub/");
  await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
  await expect(
    page.getByRole("dialog", { name: "Điều hướng chính" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở menu điều hướng" }),
  ).toBeFocused();
  await page.goto("/bookclub/admin/edit/design-fixture");
  await page
    .getByRole("button", { name: "Thời gian sự kiện", exact: true })
    .click();
  await page.getByLabel("Ngày Bắt đầu", { exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Thời gian sự kiện", exact: true }),
  ).toBeFocused();
  const first = await page
    .locator("[data-agenda-id]")
    .first()
    .getAttribute("data-agenda-id");
  await page.getByRole("button", { name: "Đưa mốc 1 xuống" }).click();
  await expect(page.locator("[data-agenda-id]").nth(1)).toHaveAttribute(
    "data-agenda-id",
    first!,
  );
  await expect(page.getByLabel("Nội dung mốc 2", { exact: true })).toHaveValue(
    designEvent.agenda![0].description,
  );
  await page
    .getByRole("button", { name: "Chọn icon mốc 2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mốc 2: Phát biểu", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Chọn icon mốc 2", exact: true }),
  ).toBeFocused();
  await capture(page, `agenda-edit-${info.project.name}`);
  await page.goto("/bookclub/design-fixture/thanh-vien");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: designGuests[1].name }),
  ).toBeFocused();
  await expect(page.locator(".invitation-content")).toHaveCSS(
    "animation-name",
    "none",
  );
  await capture(page, `group-reduced-${info.project.name}`);
});
test("redesign loading, error and empty states", async ({ page }, info) => {
  test.setTimeout(45000);
  await designBackend(page, { empty: true });
  await page.goto("/bookclub/");
  await expect(page.getByText("Chưa có nội dung")).toBeVisible();
  await capture(page, `empty-${info.project.name}`);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/rest/v1/events?**", async (route) => {
    await waiting;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Dịch vụ kiểm thử gián đoạn" }),
    });
  });
  await page.reload();
  await expect(page.getByText("Đang tải dữ liệu…")).toBeVisible();
  await capture(page, `loading-${info.project.name}`);
  release();
  await expect(
    page.getByRole("heading", { name: "Không thể tải dữ liệu" }),
  ).toBeVisible({ timeout: 20000 });
  await capture(page, `error-${info.project.name}`);
});
