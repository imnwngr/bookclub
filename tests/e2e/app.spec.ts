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
  primary_alias: "nguyen-hoang-vien",
};
const invitation = {
  id: "inv-1",
  event_id: event.id,
  guest_id: guest.id,
  ...guest,
  primary_alias: "nguyen-hoang-vien",
  invitation_aliases: [{ id: "a-1", alias: "nguyen-hoang-vien" }],
};
async function backend(page: Page, admin = false) {
  let currentEvent = { ...event };
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
    else if (path.endsWith("/get_event_v110"))
      body =
        currentEvent.code === route.request().postDataJSON().p_code
          ? { ...currentEvent, agenda: [], venue_image_path: null }
          : null;
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
        args.p_code === "102026" && ["nguyen-hoang-vien"].includes(args.p_alias)
          ? { event, invitation }
          : null;
    } else if (path.endsWith("/save_event")) {
      currentEvent = {
        ...currentEvent,
        ...route.request().postDataJSON().p_event,
      };
      body = currentEvent;
    }
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
  for (const alias of ["nguyen-hoang-vien"]) {
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
  await page.getByLabel("Tên sự kiện *").fill(" ");
  await page.getByRole("button", { name: "Lưu sự kiện" }).click();
  await expect(page.getByText("Vui lòng nhập tên sự kiện.")).toBeVisible();
  await page.getByLabel("Tên sự kiện *").fill("Sự kiện mới");
  await page.getByLabel("Mã sự kiện", { exact: true }).fill("su-kien-moi");
  await page.getByRole("button", { name: "Thời gian sự kiện" }).click();
  await page.getByLabel("Ngày Bắt đầu", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Giờ Bắt đầu", { exact: true }).selectOption("08");
  await page.getByLabel("Ngày Kết thúc", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Giờ Kết thúc", { exact: true }).selectOption("10");
  await page
    .getByLabel("Google Maps URL *", { exact: true })
    .fill("https://maps.app.goo.gl/example");
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
test("editing, code conflict and unsaved navigation (mock API)", async ({
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
  await page.route("**/rest/v1/rpc/save_event", (r) =>
    r.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ code: "23505", message: "duplicate" }),
    }),
  );
  await page.getByLabel("Mã sự kiện", { exact: true }).fill("duplicate-code");
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
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
    if (r.status() === 404 && r.url().includes("/102026/nguyen-hoang-vien"))
      saw404 = true;
  });
  await tab.goto("/bookclub/102026/nguyen-hoang-vien?source=tab#invitation");
  await tab.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    tab.getByRole("heading", { name: guest.name, exact: true }),
  ).toBeVisible();
  await expect(tab).toHaveURL(
    /\/102026\/nguyen-hoang-vien\?source=tab#invitation$/,
  );
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
test("guest directory edits and primary invitation only (mock API)", async ({
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
  expect((await update).postDataJSON()).not.toHaveProperty("active");
  await expect(
    page.getByText("Đã lưu khách mời", { exact: true }),
  ).toBeVisible();
  await page.goto("/bookclub/admin/edit/102026");
  await expect(
    page.getByRole("button", { name: /Thêm alias|Xóa alias/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sao chép link" }),
  ).toBeVisible();
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
test("v1.1 dirty undo covers fields, switch, guest selection and agenda (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/edit/102026");
  const save = page.getByRole("button", { name: "Lưu sự kiện", exact: true });
  await expect(page.getByLabel("Tên sự kiện *")).toHaveValue(event.title);
  await expect(save).toHaveCount(0);
  await page.getByLabel("Tên sự kiện *").fill("Đổi tên");
  await expect(save).toBeVisible();
  await page.getByLabel("Tên sự kiện *").fill(event.title);
  await expect(save).toHaveCount(0);
  await page.getByRole("switch").first().click();
  await expect(save).toBeVisible();
  await page.getByRole("switch").first().click();
  await expect(save).toHaveCount(0);
  await page
    .getByRole("button", { name: "Bỏ chọn tất cả", exact: true })
    .click();
  await expect(save).toBeVisible();
  await page.getByRole("button", { name: "Chọn tất cả", exact: true }).click();
  await expect(save).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thêm mốc thời gian", exact: true })
    .click();
  await page.getByLabel("Nội dung mốc 1").fill("Chương trình");
  await expect(save).toBeVisible();
  await page.getByRole("button", { name: "Xóa mốc 1", exact: true }).click();
  await expect(save).toHaveCount(0);
  await page.getByRole("button", { name: "Thời gian sự kiện" }).click();
  expect(
    await page
      .getByLabel("Giờ Bắt đầu", { exact: true })
      .locator("option")
      .allTextContents(),
  ).toHaveLength(24);
  await expect(page.getByLabel("Vĩ độ", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Kinh độ", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("v1.1 directory autosave rollback and selected state (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/guests");
  const toggle = page.getByRole("switch");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.route("**/rest/v1/guests?**", async (r) => {
    if (r.request().method() === "PATCH")
      await r.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ code: "42501", message: "denied" }),
      });
    else await r.fallback();
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByText(
      "Bạn không có quyền thực hiện hoặc phiên đăng nhập đã hết hạn.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chỉnh sửa khách mời", exact: true })
    .click();
  await expect(page.getByText("Đang chỉnh sửa", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Alias chính")).toHaveValue("nguyen-hoang-vien");
  await expect(
    page.getByText("Alias gợi ý (phân cách bằng dấu phẩy)"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Khách mời mới", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Khách mời mới", exact: true }),
  ).toBeVisible();
});
test("v1.1 four logos and snapshot description display on mobile (mock API)", async ({
  page,
}) => {
  await backend(page);
  await page.goto("/bookclub/102026/nguyen-hoang-vien");
  await expect(page.locator(".invitation-logos img")).toHaveCount(4);
  for (const img of await page.locator(".invitation-logos img").all())
    expect(
      await img.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0),
    ).toBe(true);
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.getByText(guest.description, { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".invitation-content").evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  await page.screenshot({
    path: `test-results/v110-invitation-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("v1.1 image file and paste previews stay local until save and cancel cleanly (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  let uploads = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/storage/v1/")) uploads++;
  });
  await page.goto("/bookclub/admin/edit/102026");
  await page
    .getByLabel("Chọn ảnh địa điểm")
    .setInputFiles("public/logos/logo-doan.png");
  await expect(page.getByAltText("Xem trước ảnh địa điểm")).toBeVisible();
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Hủy thay đổi", exact: true }).click();
  await expect(page.getByAltText("Xem trước ảnh địa điểm")).toHaveCount(0);
  await page
    .getByRole("group", { name: "Ảnh địa điểm", exact: true })
    .evaluate(async (el) => {
      const blob = await (await fetch("/bookclub/logos/logo-hoi.png")).blob();
      const files = new DataTransfer();
      files.items.add(new File([blob], "pasted.png", { type: "image/png" }));
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: files,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  await expect(page.getByAltText("Xem trước ảnh địa điểm")).toBeVisible();
  await page.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await expect(page.getByAltText("Xem trước ảnh địa điểm")).toHaveCount(0);
  expect(uploads).toBe(0);
});
test("v1.1 copy all uses persisted primary alias and reports clipboard failure (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/edit/102026");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copyResult: string }).copyResult = text;
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Sao chép tất cả", exact: true })
    .click();
  const copied = await page.evaluate(
    () => (window as unknown as { copyResult: string }).copyResult,
  );
  expect(copied.split("\n")).toHaveLength(1);
  expect(copied).toContain("Thầy ThS. Nguyễn Hoàng Viện:");
  expect(copied).toContain("/bookclub/102026/nguyen-hoang-vien");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("test permission denied");
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Sao chép tất cả", exact: true })
    .click();
  await expect(
    page.getByText("Không thể sao chép. Kiểm tra quyền clipboard.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("v1.1 auto code, Place ID and editable code use correct save payloads (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/new");
  await page.getByLabel("Tên sự kiện *").fill("Họp Mặt & Chào Đón");
  await page.getByRole("button", { name: "Thời gian sự kiện" }).click();
  await page.getByLabel("Ngày Bắt đầu", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Giờ Bắt đầu", { exact: true }).selectOption("13");
  await page.getByLabel("Ngày Kết thúc", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Giờ Kết thúc", { exact: true }).selectOption("18");
  await page
    .getByRole("radio", { name: "Google Place ID", exact: true })
    .check();
  await page.getByLabel("Google Place ID *", { exact: true }).fill("ChIJ12345");
  const first = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  const payload = (await first).postDataJSON().p_event;
  expect(payload.code).toBe("hop-mat-chao-don");
  expect(payload.starts_at).toBe("2099-10-20T06:00:00.000Z");
  expect(payload.location_method).toBe("place");
  await expect(page).toHaveURL(/admin\/edit\/hop-mat-chao-don$/);
  await page.getByLabel("Mã sự kiện", { exact: true }).fill("ma-moi");
  const second = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  expect((await second).postDataJSON().p_id).toBe(event.id);
  await expect(page).toHaveURL(/admin\/edit\/ma-moi$/);
});
test("v1.1 agenda timeline and highlighted content render from RPC (mock API)", async ({
  page,
}) => {
  await backend(page);
  await page.route("**/rest/v1/rpc/resolve_invitation", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        event: {
          ...event,
          agenda: [
            { time: "18:30", description: "Tổng kết", highlight: true },
            { time: "08:00", description: "Đón khách", highlight: false },
          ],
        },
        invitation,
      }),
    }),
  );
  await page.goto("/bookclub/102026/nguyen-hoang-vien");
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.getByRole("heading", { name: "Nội Dung & Tiến Trình Buổi Lễ" }),
  ).toBeVisible();
  await expect(page.locator(".agenda li").first()).toContainText("08:00");
  await expect(page.locator(".agenda-highlight")).toContainText("Tổng kết");
});
test("refinement cover descriptions, scroll sections, keyboard and long mobile content (mock API)", async ({
  page,
}) => {
  await backend(page);
  await page.route("**/rest/v1/rpc/resolve_invitation", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        event: {
          ...event,
          directions: "Đi theo bảng hướng dẫn tại sảnh.",
          agenda: [
            {
              time: "08:00",
              end_time: "08:30",
              icon: "welcome",
              description: "Đón tiếp",
              highlight: false,
            },
            {
              time: "08:30",
              end_time: "09:00",
              icon: "speech",
              description: "Phát biểu",
              highlight: true,
            },
          ],
        },
        invitation: {
          ...invitation,
          description: "Vai trò thứ nhất, Vai trò thứ hai,\nVai trò thứ ba",
        },
      }),
    }),
  );
  await page.goto("/bookclub/102026/nguyen-hoang-vien");
  await expect(
    page.locator(".invitation-cover .guest-description > span"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Mở thiệp mời" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.locator(".invitation-greeting .guest-description > span"),
  ).toHaveCount(3);
  await expect(page.locator(".invitation-section")).toHaveCount(4);
  await page.locator("#invitation-program").scrollIntoViewIfNeeded();
  await expect(page.locator(".agenda li").first()).toContainText(
    "08:00 — 08:30",
  );
  expect(await page.locator(".agenda li svg").count()).toBe(2);
  await page.keyboard.press("Home");
  await page.locator("#invitation-greeting").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: guest.name, exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollSnapType,
    ),
  ).toBe("none");
});
test("refinement venue cards and range/icon editor persist the save payload and reload (mock API)", async ({
  page,
}) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/edit/102026");
  await expect(
    page.getByText("Đổi mã vẫn bảo toàn link cũ sau khi lưu."),
  ).toHaveCount(0);
  await expect(page.locator(".location-choice.selected")).toContainText(
    "Google Maps URL",
  );
  await page.getByRole("radio", { name: /Google Place ID/ }).check();
  await page.getByLabel("Google Place ID *", { exact: true }).fill("ChIJ12345");
  await page.getByRole("button", { name: "Thêm mốc thời gian" }).click();
  await page.getByLabel("Nội dung mốc 1", { exact: true }).fill("Đón tiếp");
  await page.getByRole("button", { name: "Khoảng giờ mốc 1" }).click();
  await page.getByLabel("Kết thúc", { exact: true }).fill("08:45");
  await page.getByRole("button", { name: "Xong", exact: true }).click();
  await page.getByRole("button", { name: "Chọn icon mốc 1" }).click();
  await page.getByRole("button", { name: "Mốc 1: Đón tiếp" }).click();
  const request = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  const payload = (await request).postDataJSON().p_event;
  expect(payload.agenda[0]).toMatchObject({
    time: "08:00",
    end_time: "08:45",
    icon: "welcome",
  });
  expect(payload).not.toHaveProperty("invitation_edits");
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeVisible();
  await page.route("**/rest/v1/rpc/get_event_v110", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...event, ...payload }),
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Khoảng giờ mốc 1" }),
  ).toContainText("08:45");
  await page.getByRole("button", { name: "Chọn icon mốc 1" }).click();
  await expect(
    page.getByRole("button", { name: "Mốc 1: Đón tiếp" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("refinement long sections remain scrollable in both directions, empty sections are omitted (mock API)", async ({
  page,
}) => {
  await backend(page);
  await page.route("**/rest/v1/rpc/resolve_invitation", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        event: {
          ...event,
          agenda: Array.from({ length: 20 }, (_, i) => ({
            time: "08:00",
            end_time: "09:00",
            icon: "book",
            description:
              `Nội dung ${i + 1}: ` + "Chia sẻ sách và trao đổi. ".repeat(10),
            highlight: i === 3,
          })),
        },
        invitation: {
          ...invitation,
          description: "Chức vụ dài ".repeat(60) + ", Vai trò thứ hai",
        },
      }),
    }),
  );
  await page.goto("/bookclub/102026/nguyen-hoang-vien");
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await page.locator(".agenda li").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".agenda li").last()).toBeInViewport();
  await page.locator("#invitation-greeting").scrollIntoViewIfNeeded();
  await expect(page.locator("#invitation-greeting")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.route("**/rest/v1/rpc/resolve_invitation", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        event: { ...event, agenda: [], venue_image_path: null, directions: "" },
        invitation,
      }),
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".invitation-section")).toHaveCount(2);
  await expect(
    page.locator("#invitation-program,#invitation-venue"),
  ).toHaveCount(0);
});
test("compact editor ranges, guest rows, icon picker and multi-day persistence (mock API)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await backend(page, true);
  await page.goto("/bookclub/admin/edit/102026");
  await expect(page.getByText(guest.description, { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Kiểm tra giờ HH:mm và nội dung của từng mốc chương trình."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Thời gian sự kiện" }),
  ).toHaveCount(1);
  await expect(page.getByLabel("Ngày Bắt đầu", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Thời gian sự kiện" }).click();
  await page.getByLabel("Ngày Bắt đầu", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Giờ Bắt đầu", { exact: true }).selectOption("18");
  await page.getByLabel("Ngày Kết thúc", { exact: true }).fill("2099-10-21");
  await page.getByLabel("Giờ Kết thúc", { exact: true }).selectOption("20");
  await page.getByRole("button", { name: "Xong", exact: true }).click();
  await expect(page.getByLabel("Ngày Bắt đầu", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Thêm mốc thời gian" }).click();
  await expect(
    page.getByRole("button", { name: "Khoảng giờ mốc 1" }),
  ).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Icon mốc 1" })).toHaveCount(0);
  await page.getByRole("button", { name: "Khoảng giờ mốc 1" }).click();
  await page.getByLabel("Bắt đầu", { exact: true }).fill("18:00");
  await page.getByLabel("Kết thúc", { exact: true }).fill("20:00");
  await page.getByRole("button", { name: "Xong", exact: true }).click();
  await page.getByLabel("Nội dung mốc 1").fill("Chương trình");
  await page.getByRole("button", { name: "Chọn icon mốc 1" }).click();
  await page.getByRole("button", { name: "Mốc 1: Đón tiếp" }).click();
  await expect(
    page
      .locator(".agenda-card-head")
      .getByRole("switch", { name: "Nội dung trọng tâm" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".agenda-card-head")
      .getByRole("button", { name: "Xóa mốc 1" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xem trước thiệp" }),
  ).toHaveAttribute("href", /102026\/nguyen-hoang-vien$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const save = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  const payload = (await save).postDataJSON().p_event;
  expect(payload.starts_at).toBe("2099-10-20T11:00:00.000Z");
  expect(payload.ends_at).toBe("2099-10-21T13:00:00.000Z");
  expect(payload.agenda[0]).toMatchObject({
    time: "18:00",
    end_time: "20:00",
    icon: "welcome",
  });
  await page.route("**/rest/v1/rpc/get_event_v110", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...event, ...payload }),
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Khoảng giờ mốc 1" }),
  ).toContainText("18:00 – 20:00");
});
test("compact invitation name dominates tagline while roles remain before and after opening (mock API)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await backend(page);
  await page.goto("/bookclub/102026/nguyen-hoang-vien");
  await expect(
    page.locator(".invitation-cover .guest-description"),
  ).toContainText(guest.description);
  const sizes = await page.evaluate(() => ({
    name: parseFloat(
      getComputedStyle(document.querySelector(".cover-recipient strong")!)
        .fontSize,
    ),
    tagline: parseFloat(
      getComputedStyle(document.querySelector(".invitation-tagline")!).fontSize,
    ),
  }));
  expect(sizes.name).toBeGreaterThan(sizes.tagline);
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.locator(".invitation-greeting .guest-description"),
  ).toContainText(guest.description);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
