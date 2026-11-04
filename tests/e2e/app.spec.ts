import { test, expect, type Page } from "@playwright/test";
const event = {
  id: "event-1",
  code: "102026",
  title: "Sự kiện kiểm thử trình duyệt",
  description: "Nội dung chỉ xuất hiện trong bộ kiểm thử.",
  starts_at: "2099-10-20T01:00:00Z",
  ends_at: "2099-10-20T03:00:00Z",
  status: "published",
  venue_name: "CTUT",
  address: "Cần Thơ",
  directions: "",
  latitude: null,
  longitude: null,
  place_id: "",
  maps_url: "",
  created_at: "2026-10-01Z",
  updated_at: "2026-10-01T00:00:00Z",
};
const guest = {
  id: "guest-1",
  salutation: "Thầy ThS.",
  name: "Nguyễn Hoàng Viện",
  description: "Chức vụ trong dữ liệu kiểm thử",
  kind: "individual",
  active: true,
  default_aliases: ["nhvien", "1", "nguyen-hoang-vien"],
};
const invitation = {
  id: "inv-1",
  event_id: event.id,
  guest_id: guest.id,
  ...guest,
  primary_alias: "nhvien",
  invitation_aliases: [
    { id: "a-1", alias: "nhvien" },
    { id: "a-2", alias: "1" },
  ],
};
async function backend(page: Page, admin = false) {
  if (admin)
    await page.addInitScript(() =>
      localStorage.setItem(
        "sb-bookclub-test-auth-token",
        JSON.stringify({
          access_token:
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6NDA3MDkwODgwMH0.test",
          refresh_token: "test",
          expires_at: 4070908800,
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "admin",
            aud: "authenticated",
            role: "authenticated",
            email: "admin@test.invalid",
          },
        }),
      ),
    );
  await page.route("https://bookclub-test.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown = [];
    if (path.endsWith("/is_admin")) body = admin;
    else if (path.endsWith("/user"))
      body = { id: "admin", aud: "authenticated", role: "authenticated" };
    else if (path.endsWith("/events"))
      body = url.searchParams.has("code")
        ? url.searchParams.get("code") === "eq.102026"
          ? event
          : null
        : [event];
    else if (path.endsWith("/guests")) body = [guest];
    else if (path.endsWith("/event_guests")) body = [invitation];
    else if (path.endsWith("/resolve_invitation")) {
      const args = route.request().postDataJSON();
      body =
        args.p_code === "102026" &&
        ["nhvien", "1", "nguyen-hoang-vien"].includes(args.p_alias)
          ? { event, invitation }
          : null;
    } else if (path.endsWith("/save_event"))
      body = { ...event, ...route.request().postDataJSON().p_event };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
test("public list, filters, details, navigation, refresh and responsive layout (mock API)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await backend(page);
  await page.goto("/bookclub/");
  await expect(page.getByRole("heading", { name: event.title })).toBeVisible();
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByLabel("Tháng", { exact: true }).selectOption("11");
  await expect(page.getByText("Chưa có nội dung")).toBeVisible();
  await page.getByLabel("Tháng", { exact: true }).selectOption("10");
  await page.getByRole("link", { name: "Xem chi tiết" }).click();
  await expect(page.getByRole("heading", { name: event.title })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: event.title })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("aliases resolve same recipient and open accessible invitation (mock API)", async ({
  page,
}) => {
  await backend(page);
  for (const alias of ["nhvien", "1", "nguyen-hoang-vien"]) {
    await page.goto(`/bookclub/102026/${alias}`);
    await page.getByRole("button", { name: "Mở thiệp mời" }).click();
    await expect(
      page.getByRole("heading", { name: guest.name, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Mở thiệp mời" }),
    ).toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  expect(
    await page
      .locator(".invitation-content")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/invitation-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("protected direct routes redirect guests to login (mock API)", async ({
  page,
}) => {
  await backend(page);
  for (const route of [
    "/bookclub/admin/",
    "/bookclub/admin/new",
    "/bookclub/admin/edit/102026",
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("button", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/admin\/login/);
    await page.reload();
    await expect(page.getByLabel("Mật khẩu")).toBeVisible();
  }
});
test("unknown event and invitation show not-found (mock API)", async ({
  page,
}) => {
  await backend(page);
  for (const route of ["/bookclub/missing", "/bookclub/102026/missing"]) {
    await page.goto(route);
    await expect(page.getByText("Chưa có nội dung")).toBeVisible();
  }
});
test("admin creation validation and save, selection, deletion confirmation (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/new");
  await expect(
    page.getByRole("heading", { name: "Thêm sự kiện", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/form-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Thêm sự kiện", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lưu sự kiện" }).click();
  await expect(page.getByText("Vui lòng nhập tên sự kiện.")).toBeVisible();
  await page.getByLabel("Tên sự kiện *").fill("Sự kiện mới");
  await page.getByLabel("Mã sự kiện *").fill("su-kien-moi");
  await page.getByLabel("Bắt đầu *").fill("2099-10-20T08:00");
  await page.getByLabel("Kết thúc *").fill("2099-10-20T10:00");
  await page.getByRole("button", { name: "Chọn tất cả", exact: true }).click();
  await expect(page.getByText("Đã chọn 1 khách mời")).toBeVisible();
  const request = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện" }).click();
  const payload = (await request).postDataJSON();
  expect(payload.p_guest_ids).toEqual(["guest-1"]);
  expect(payload.p_event.latitude).toBeNull();
  expect(payload.p_event.longitude).toBeNull();
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeVisible();
  await page.goto("/bookclub/admin/");
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Xóa", exact: true }).click();
  const deletion = page.waitForRequest(
    (r) => r.method() === "DELETE" && r.url().includes("/events"),
  );
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await deletion;
  await expect(page.getByText("Đã xóa sự kiện", { exact: true })).toBeVisible();
});
test("editing, alias conflict and unsaved navigation (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/edit/102026");
  await expect(page.getByLabel("Tên sự kiện *")).toHaveValue(event.title);
  await page.getByLabel("Tên sự kiện *").fill("Đã chỉnh sửa");
  await page.getByRole("link", { name: "Về danh sách quản trị" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  const save = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện" }).click();
  expect((await save).postDataJSON().p_event.title).toBe("Đã chỉnh sửa");
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeVisible();
  await page.route("**/rest/v1/invitation_aliases", (r) =>
    r.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ code: "23505", message: "duplicate" }),
    }),
  );
  await page.getByLabel(`Alias mới cho ${guest.name}`).fill("nhvien");
  await page.getByRole("button", { name: "Thêm alias", exact: true }).click();
  await expect(
    page.getByText(
      "Mã sự kiện hoặc alias đã được sử dụng. Vui lòng chọn giá trị khác.",
      { exact: true },
    ),
  ).toBeVisible();
});
test("new-tab deep link preserves query/hash through HTTP 404 fallback (mock API)", async ({
  page,
  context,
}) => {
  await backend(page);
  await page.goto("/bookclub/");
  const tab = await context.newPage();
  await backend(tab);
  let saw404 = false;
  tab.on("response", (r) => {
    if (r.status() === 404 && r.url().includes("/102026/nhvien")) saw404 = true;
  });
  await tab.goto("/bookclub/102026/nhvien?source=tab#invitation");
  await tab.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    tab.getByRole("heading", { name: guest.name, exact: true }),
  ).toBeVisible();
  await expect(tab).toHaveURL(/\/102026\/nhvien\?source=tab#invitation$/);
  expect(saw404).toBe(true);
  await tab.close();
});
test("ordinary user denied admin, loading and API error states are explicit (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.route("**/rest/v1/rpc/is_admin", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "false" }),
  );
  await page.goto("/bookclub/admin/");
  await expect(
    page.getByRole("heading", { name: "Tài khoản chưa có quyền quản trị" }),
  ).toBeVisible();
  await page.route("**/rest/v1/events?**", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await r.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "Dịch vụ tạm gián đoạn" }),
    });
  });
  await page.goto("/bookclub/");
  await expect(page.getByRole("status")).toHaveText("Đang tải dữ liệu…");
  await expect(
    page.getByRole("heading", { name: "Không thể tải dữ liệu" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});
test("guest directory edits and alias add/remove send correct payloads (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/guests");
  await page.getByRole("button", { name: "Chỉnh sửa khách mời" }).click();
  await page.getByLabel("Họ tên hoặc tên nhóm *").fill("Tên được cập nhật");
  const update = page.waitForRequest(
    (r) => r.method() === "PATCH" && r.url().includes("/guests"),
  );
  await page.getByRole("button", { name: "Lưu khách mời" }).click();
  expect((await update).postDataJSON().name).toBe("Tên được cập nhật");
  await expect(
    page.getByText("Đã lưu khách mời", { exact: true }),
  ).toBeVisible();
  await page.goto("/bookclub/admin/edit/102026");
  await page.getByLabel(`Alias mới cho ${guest.name}`).fill("khach-moi");
  const add = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().includes("/invitation_aliases"),
  );
  await page.getByRole("button", { name: "Thêm alias", exact: true }).click();
  expect((await add).postDataJSON().alias).toBe("khach-moi");
  await expect(page.getByText("Đã thêm alias", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xóa alias nhvien", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Xóa alias 1", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByText("Đã xóa alias", { exact: true })).toBeVisible();
});
test("login and logout require authentication (mock API)", async ({ page }) => {
  await backend(page);
  await page.route("**/rest/v1/rpc/is_admin", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "true" }),
  );
  await page.route("**/auth/v1/token?**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token:
          "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6NDA3MDkwODgwMH0.test",
        refresh_token: "test",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "admin",
          aud: "authenticated",
          role: "authenticated",
          email: "admin@test.invalid",
        },
      }),
    }),
  );
  await page.goto("/bookclub/admin/login");
  await page.getByLabel("Email").fill("admin@test.invalid");
  await page.getByLabel("Mật khẩu").fill("test-only-password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quản lý sự kiện", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.goto("/bookclub/admin/new");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
test("group invitation wording and keyboard opening (mock API)", async ({
  page,
}) => {
  await backend(page);
  await page.route("**/rest/v1/rpc/resolve_invitation", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        event,
        invitation: {
          ...invitation,
          name: "Thành viên CLB Sách CTUT",
          salutation: "",
          kind: "group",
        },
      }),
    }),
  );
  await page.goto("/bookclub/102026/thanh-vien");
  const open = page.getByRole("button", { name: "Mở thiệp mời" });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Thành viên CLB Sách CTUT" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "BookClub thân mời các thành viên và cộng tác viên cùng tham gia",
    ),
  ).toBeVisible();
});
test("expired session with rejected refresh returns to login (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.addInitScript(() => {
    const key = "sb-bookclub-test-auth-token";
    const session = JSON.parse(localStorage.getItem(key)!);
    session.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(session));
  });
  await page.route("**/auth/v1/token?**", (r) =>
    r.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token",
      }),
    }),
  );
  await page.goto("/bookclub/admin/");
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/admin\/login/);
});
