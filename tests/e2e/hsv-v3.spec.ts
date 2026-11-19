import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { designBackend, designEvent, designGuests } from "./redesign-fixtures";
import type { ClubEvent } from "../../src/types/domain";
const celebration: ClubEvent = {
  ...designEvent,
  code: "chuc-mung-fixture",
  title: "Chúc mừng thành tích\nDữ liệu kiểm thử",
  description: "Nội dung mô phỏng cho bản 3.0.0, không phải sự kiện thực tế.",
  event_type: "congratulation",
  starts_at: null,
  ends_at: null,
  venue_name: "",
  address: "",
  maps_url: "",
  place_id: "",
  venue_image_path: null,
  theme: { version: 1, primary: "#873c42" },
};
async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    name,
  ).toBe(true);
  await page.screenshot({
    path: `.local/hsv-v3/screenshots/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
test("v3 editor creates date-free congratulations, preserves hidden data, resets theme and guards dirty navigation (mock API)", async ({
  page,
}) => {
  const { writes } = await designBackend(page, { admin: true });
  await page.goto("/hsv/admin/new");
  await page
    .getByLabel("Tên sự kiện *", { exact: true })
    .fill("Thiệp chúc kiểm thử");
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  await expect(page.getByText("Thời gian bắt đầu không hợp lệ.")).toBeVisible();
  await page.getByRole("radio", { name: "Thiệp chúc" }).check();
  await expect(page.locator("#editor-time")).toHaveCount(0);
  await expect(page.locator("#editor-venue")).toHaveCount(0);
  await page.getByRole("button", { name: "Đỏ son", exact: true }).click();
  expect(writes.filter((w) => w.path.endsWith("save_event"))).toHaveLength(0);
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeVisible();
  const payload = writes.find((w) => w.path.endsWith("save_event"))?.body as {
    p_event: ClubEvent;
  };
  expect(payload.p_event).toMatchObject({
    event_type: "congratulation",
    starts_at: null,
    ends_at: null,
    maps_url: "",
    theme: { version: 1, primary: "#873c42" },
  });
  await page.reload();
  await expect(page.getByRole("radio", { name: "Thiệp chúc" })).toBeChecked();
  await expect(page.getByLabel("Màu tùy chỉnh")).toHaveValue("#873c42");
  await expect(page.locator(".invitation-url").first()).toContainText(
    "/hsv/thiep-chuc/",
  );
  await page.getByRole("button", { name: "Khôi phục màu mặc định" }).click();
  await expect(page.getByLabel("Màu tùy chỉnh")).toHaveValue("#174b78");
  await page.getByRole("link", { name: "Về danh sách quản trị" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Rời trang khi chưa lưu?",
  );
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Hủy thay đổi", exact: true }).click();
  await expect(page.getByLabel("Màu tùy chỉnh")).toHaveValue("#873c42");
});
test("v3 type switch keeps invitation schedule and snapshot in saved payload (mock API)", async ({
  page,
}) => {
  const { writes } = await designBackend(page, { admin: true });
  await page.goto("/hsv/admin/edit/design-fixture");
  await page.getByRole("radio", { name: "Thiệp chúc" }).check();
  await expect(
    page.getByRole("status").filter({ hasText: "Thời gian và địa điểm" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeVisible();
  const saved = (
    writes.find((w) => w.path.endsWith("save_event"))?.body as {
      p_event: ClubEvent;
    }
  ).p_event;
  expect(saved).toMatchObject({
    event_type: "congratulation",
    starts_at: designEvent.starts_at,
    ends_at: designEvent.ends_at,
    maps_url: designEvent.maps_url,
    venue_image_path: designEvent.venue_image_path,
  });
  await page.reload();
  await page.getByRole("radio", { name: "Thiệp mời" }).check();
  await expect(page.locator("#editor-time")).toBeVisible();
  await expect(
    page.getByLabel("Google Maps URL *", { exact: true }),
  ).toHaveValue(designEvent.maps_url);
});
test("v3 wrong type canonicalizes only after resolver, legacy path refreshes, primary copy-all follows saved type (mock API)", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await designBackend(page, { admin: true, event: celebration });
  await page.goto("/hsv/thiep-moi/chuc-mung-fixture/minh-an?view=1#main");
  await expect(page).toHaveURL(
    /\/hsv\/thiep-chuc\/chuc-mung-fixture\/minh-an\?view=1#main$/,
  );
  await expect(
    page.getByRole("button", { name: "Mở thiệp chúc" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mở thiệp chúc" }),
  ).toBeVisible();
  await page.goto("/hsv/chuc-mung-fixture/minh-an");
  await expect(page).toHaveURL(/\/thiep-chuc\/chuc-mung-fixture\/minh-an$/);
  await page.goto("/hsv/admin/edit/chuc-mung-fixture");
  await page
    .getByRole("button", { name: "Sao chép tất cả", exact: true })
    .click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.split("\n")).toHaveLength(2);
  expect(copied).toContain("/hsv/thiep-chuc/chuc-mung-fixture/minh-an");
  expect(copied).toContain("Thầy Nguyễn Minh An");
});
for (const width of [320, 390, 430, 768, 1024, 1440, 1920])
  test(`v3 viewport ${width}: congratulations cover, open content and theme editor`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Explicit width matrix runs once in Chromium.",
    );
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await designBackend(page, { admin: true, event: celebration });
    await page.goto("/hsv/");
    await expect(
      page.getByRole("heading", { name: /Cùng nhau/ }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const fits = await page
      .locator(".congratulation-mark strong")
      .evaluate((element) => {
        const text = document.createRange();
        text.selectNodeContents(element);
        return (
          text.getBoundingClientRect().right <=
          element.parentElement!.getBoundingClientRect().right
        );
      });
    expect(fits).toBe(true);
    await capture(page, `home-${width}`);
    await page.goto("/hsv/thiep-chuc/chuc-mung-fixture/minh-an");
    await expect(
      page.getByText("Trân trọng chúc mừng", { exact: true }),
    ).toBeVisible();
    await capture(page, `congratulation-cover-${width}`);
    await page.getByRole("button", { name: "Mở thiệp chúc" }).click();
    await expect(
      page.getByRole("heading", { name: designGuests[0].name, exact: true }),
    ).toBeFocused();
    await expect(
      page.locator(
        ".meeting-schedule,.calendar-card,.venue-card,.venue-image,#invitation-schedule",
      ),
    ).toHaveCount(0);
    await expect(page.locator(".opening-paper")).toHaveCount(0);
    await expect(page.locator(".invitation-program")).toBeAttached();
    await expect(page.locator(".invitation-quote-one")).toBeAttached();
    await capture(page, `congratulation-open-reduced-${width}`);
    await page.goto("/hsv/admin/edit/chuc-mung-fixture");
    await page.locator("#editor-appearance").scrollIntoViewIfNeeded();
    await capture(page, `editor-type-theme-${width}`);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
  });
for (const primary of ["#174b78", "#173f36", "#873c42"])
  test(`v3 theme ${primary} has material texture, readable contrast and no route leak`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Visual color matrix runs once.",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await designBackend(page, {
      event: {
        ...designEvent,
        event_type: "invitation",
        theme: { version: 1, primary },
      },
    });
    await page.goto("/hsv/thiep-moi/design-fixture/minh-an");
    await expect(
      page.getByRole("button", { name: "Mở thiệp mời" }),
    ).toBeVisible();
    expect(
      await page
        .locator(".envelope-stack")
        .evaluate((e) => getComputedStyle(e).backgroundImage),
    ).toContain("svg");
    await capture(page, `invitation-cover-${primary.slice(1)}`);
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await page.locator(".invitation-event").scrollIntoViewIfNeeded();
    await capture(page, `invitation-open-${primary.slice(1)}`);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    await page
      .getByRole("link", { name: "Thông tin sự kiện", exact: true })
      .click();
    await expect(page.locator(".detail")).toHaveCSS("--event-primary", primary);
    await page
      .getByRole("link", { name: "Tất cả sự kiện", exact: true })
      .click();
    expect(
      await page
        .locator(".site")
        .evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--event-primary"),
        ),
    ).toBe("");
  });
test("v3 add Editor dialog handles default, loading, partial error, retry and pending success (mock API, no email)", async ({
  page,
}, info) => {
  await designBackend(page, { admin: true });
  await page.setViewportSize({
    width: info.project.name === "mobile" ? 390 : 1024,
    height: 900,
  });
  let calls = 0;
  let release!: () => void;
  let pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let success = false;
  await page.route("**/functions/v1/manage-editors", async (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      action: "add",
      email: "qa@fixture.invalid",
      role: "editor",
    });
    expect(body.request_id).toMatch(/^[0-9a-f-]{36}$/);
    await pending;
    await route.fulfill({
      status: success ? 200 : 409,
      contentType: "application/json",
      body: JSON.stringify(
        success
          ? { ok: true, state: "granted", account_status: "invited" }
          : { code: "grant_failed", state: "grant_failed" },
      ),
    });
  });
  await page.goto("/hsv/admin/roles");
  const trigger = page.getByRole("button", {
    name: "Thêm tài khoản",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Thao tác", { exact: true })).toHaveCount(0);
  await capture(page, `account-default-${info.project.name}`);
  await dialog.getByLabel("Email", { exact: true }).fill("qa@fixture.invalid");
  await dialog
    .getByRole("button", { name: "Thêm Editor", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Đang xử lý…", exact: true }),
  ).toBeDisabled();
  await capture(page, `account-loading-${info.project.name}`);
  expect(calls).toBe(1);
  release();
  await expect(dialog.getByText(/Chưa cấp được quyền Editor/)).toBeVisible();
  await capture(page, `account-error-${info.project.name}`);
  success = true;
  pending = Promise.resolve();
  await dialog
    .getByRole("button", { name: "Kiểm tra và khôi phục", exact: true })
    .click();
  await expect(dialog.getByText(/đang chờ người nhận hoàn tất/)).toBeVisible();
  await capture(page, `account-pending-${info.project.name}`);
  expect(calls).toBe(2);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test("v3 expired and used Auth links show recovery even with an existing session", async ({
  page,
}) => {
  await designBackend(page, { admin: true });
  for (const route of ["accept", "callback"]) {
    await page.goto(
      `/hsv/auth/${route}#error=access_denied&error_code=otp_expired`,
    );
    await expect(
      page.getByRole("heading", {
        name: "Lời mời chưa hợp lệ hoặc đã hết hạn",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Mật khẩu mới")).toHaveCount(0);
  }
});
