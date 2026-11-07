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
    if (path.endsWith("/is_admin") || path.endsWith("/can_edit_content")) body = admin;
    else if (path.endsWith("/agenda_icon_capabilities")) body = ["users", "music", "mic", "film", "award", "sparkles", "book-open", "gift", "trophy", "camera", "heart-handshake"];
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
  await page.getByLabel("Bắt đầu giờ Thời gian sự kiện").fill("08");
  await page.getByLabel("Ngày Kết thúc", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Kết thúc giờ Thời gian sự kiện").fill("10");
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
  await page.route("**/rest/v1/rpc/can_edit_content", (r) =>
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
}, info) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/guests");
  if (info.project.name === "mobile") await page.getByRole("button", {name:"Danh sách khách mời",exact:true}).click();
  await page.getByRole("button", { name: "Chỉnh sửa khách mời Nguyễn Hoàng Viện" }).click();
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
  await page.route("**/rest/v1/rpc/can_edit_content", (r) =>
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
  await expect(page.getByLabel("Bắt đầu giờ Thời gian sự kiện")).toHaveAttribute("inputmode", "numeric");
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
}, info) => {
  await backend(page, true);
  await page.goto("/bookclub/admin/guests");
  if (info.project.name === "mobile") await page.getByRole("button", {name:"Danh sách khách mời",exact:true}).click();
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
    .getByRole("button", { name: "Chỉnh sửa khách mời Nguyễn Hoàng Viện", exact: true })
    .click();
  if (info.project.name !== "mobile") await expect(page.getByText("Đang chỉnh sửa", { exact: true })).toBeVisible();
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
  await page.getByLabel("Bắt đầu giờ Thời gian sự kiện").fill("13");
  await page.getByLabel("Ngày Kết thúc", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Kết thúc giờ Thời gian sự kiện").fill("18");
  await page.getByRole("button", { name: "Xong", exact: true }).click();
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
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByText("Đã lưu sự kiện", { exact: true })).toBeHidden({ timeout: 10000 });
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
  // This legacy event has no quotes; venue details belong only to the schedule card.
  await expect(page.locator(".invitation-content > .invitation-section")).toHaveCount(3);
  expect(await page.locator(".invitation-content > .invitation-section").evaluateAll(sections => sections.map(section => section.id))).toEqual(["invitation-greeting", "invitation-schedule", "invitation-program"]);
  await expect(page.locator("#invitation-venue,.meeting-venue")).toHaveCount(0);
  await expect(page.locator("#invitation-schedule .venue-card")).toHaveCount(1);
  await expect(page.locator("#invitation-schedule .venue-detail")).toContainText("Đi theo bảng hướng dẫn tại sảnh.");
  await expect(page.locator(".invitation-quote-one,.invitation-quote-two")).toHaveCount(0);
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
  await page.getByLabel("Kết thúc phút Khoảng giờ mốc 1").fill("45");
  await page.getByRole("button", { name: "Chọn icon mốc 1" }).click();
  await page.getByRole("button", { name: "Mốc 1: Đón tiếp" }).click();
  const request = page.waitForRequest((r) => r.url().endsWith("/save_event"));
  await page.getByRole("button", { name: "Lưu sự kiện", exact: true }).click();
  const payload = (await request).postDataJSON().p_event;
  expect(payload.agenda[0]).toMatchObject({
    time: "08:00",
    end_time: "08:45",
    icon: "users",
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
    page.getByLabel("Kết thúc phút Khoảng giờ mốc 1"),
  ).toHaveValue("45");
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
  await expect(page.getByLabel("Ngày Bắt đầu", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Thời gian sự kiện" }).click();
  await page.getByLabel("Ngày Bắt đầu", { exact: true }).fill("2099-10-20");
  await page.getByLabel("Ngày Kết thúc", { exact: true }).fill("2099-10-21");
  await page.getByLabel("Bắt đầu giờ Thời gian sự kiện").fill("18");
  await page.getByLabel("Kết thúc giờ Thời gian sự kiện").fill("20");
  await page.getByRole("button", { name: "Xong", exact: true }).click();
  await expect(page.getByLabel("Ngày Bắt đầu", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Thêm mốc thời gian" }).click();
  await expect(
    page.getByRole("group", { name: "Khoảng giờ mốc 1" }).last(),
  ).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Icon mốc 1" })).toHaveCount(0);
  await page.getByLabel("Bắt đầu giờ Khoảng giờ mốc 1").fill("18");
  await page.getByLabel("Bắt đầu phút Khoảng giờ mốc 1").fill("00");
  await page.getByLabel("Kết thúc giờ Khoảng giờ mốc 1").fill("20");
  await page.getByLabel("Kết thúc phút Khoảng giờ mốc 1").fill("00");
  await page.getByLabel("Nội dung mốc 1").fill("Chương trình");
  await page.getByRole("button", { name: "Chọn icon mốc 1" }).click();
  const iconGrid = page.getByRole("group", { name: "Icon mốc 1" });
  await expect(iconGrid.getByRole("button")).toHaveCount(11);
  expect(await iconGrid.innerText()).toBe("");
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
    icon: "users",
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
    page.getByLabel("Bắt đầu giờ Khoảng giờ mốc 1"),
  ).toHaveValue("18");
  await expect(page.getByLabel("Kết thúc giờ Khoảng giờ mốc 1")).toHaveValue("20");
});
test("segmented agenda keyboard, paste and invalid values (mock API)", async ({ page }, info) => {
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 720 });
  await backend(page, true);
  await page.goto("/bookclub/admin/edit/102026");
  await page.getByRole("button", { name: "Thêm mốc thời gian" }).click();
  const a = page.getByLabel("Bắt đầu giờ Khoảng giờ mốc 1");
  const b = page.getByLabel("Bắt đầu phút Khoảng giờ mốc 1");
  const c = page.getByLabel("Kết thúc giờ Khoảng giờ mốc 1");
  const d = page.getByLabel("Kết thúc phút Khoảng giờ mốc 1");
  await a.click(); await page.keyboard.type("16"); await expect(b).toBeFocused();
  await page.keyboard.type("00"); await expect(c).toBeFocused();
  await page.keyboard.type("16"); await expect(d).toBeFocused();
  await page.keyboard.type("15");
  await d.press("ArrowLeft"); await expect(c).toBeFocused();
  await c.press("ArrowRight"); await expect(d).toBeFocused();
  await a.click(); await a.fill("99");
  await expect(page.getByText("Nhập đủ giờ 00–23 và phút 00–59.")).toBeVisible();
  await a.evaluate((el) => {
    const data = new DataTransfer(); data.setData("text/plain", "17:30 - 18:15");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(a).toHaveValue("17"); await expect(b).toHaveValue("30");
  await expect(c).toHaveValue("18"); await expect(d).toHaveValue("15");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("guest directory compact/full, dirty guard, reorder and reload (mock API)", async ({ page }, info) => {
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 720 });
  await backend(page, true);
  let rows = Array.from({ length: 14 }, (_, i) => ({ ...guest, id: `guest-${i}`, name: `Khách ${i}`, description: `Vai trò ${i}, Bộ phận ${i}`, primary_alias: `khach-${i}`, display_order: i + 1 }));
  let denyReorder = false;
  await page.route("**/rest/v1/rpc/guest_order_available", r => r.fulfill({ status: 200, contentType:"application/json", body:"true" }));
  await page.route("**/rest/v1/rpc/reorder_guests", async r => {
    if (denyReorder) { await r.fulfill({status:409,contentType:"application/json",body:JSON.stringify({code:"40001",message:"Guest order changed"})}); return; }
    const body = r.request().postDataJSON(), byId = new Map(rows.map(row => [row.id, row]));
    rows = body.p_order.map((id: string, index: number) => ({ ...byId.get(id)!, display_order: index + 1 }));
    await r.fulfill({ status:200, contentType:"application/json", body:"null" });
  });
  await page.route("**/rest/v1/guests?**", async r => {
    if (r.request().method() === "PATCH") {
      const id = new URL(r.request().url()).searchParams.get("id")?.replace("eq.", "");
      rows = rows.map(g => g.id === id ? { ...g, ...r.request().postDataJSON() } : g);
      const row = rows.find(g => g.id === id)!;
      await r.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(r.request().url().includes("select=") ? { id:row.id, active:row.active } : []) });
    } else await r.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(rows) });
  });
  await page.goto("/bookclub/admin/guests");
  if (info.project.name === "mobile") await page.getByRole("button", { name:"Danh sách khách mời", exact:true }).click();
  if (info.project.name === "desktop") {
    await page.setViewportSize({width:1280,height:600});
    await expect(page.getByText("14 khách mời")).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 380));
    await expect.poll(async () => (await page.locator(".directory-editor").boundingBox())?.y ?? 999).toBeLessThan(30);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.screenshot({path:`test-results/guest-directory-${info.project.name}.png`});
  await expect(page.getByText("Vai trò 0", {exact:true})).toHaveCount(0);
  await page.getByRole("button", {name:"Đầy đủ"}).click(); await expect(page.getByText("Vai trò 0",{exact:true})).toBeVisible();
  await page.getByRole("switch", {name:"Đang hoạt động: Khách 0"}).click();
  await expect(page.getByRole("switch", {name:"Ngừng hoạt động: Khách 0"})).toHaveAttribute("aria-checked","false");
  await page.getByRole("button", {name:"Thu gọn"}).click();
  await page.getByRole("button", {name:"Chỉnh sửa khách mời Khách 0"}).click();
  await page.getByLabel("Họ tên hoặc tên nhóm *").fill("Tên chưa lưu");
  if (info.project.name === "mobile") await page.getByRole("button", { name:"Danh sách khách mời", exact:true }).click();
  await page.getByRole("button", {name:"Chỉnh sửa khách mời Khách 1", exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button",{name:"Tiếp tục chỉnh sửa"}).click();
  await expect(page.getByLabel("Họ tên hoặc tên nhóm *")).toHaveValue("Tên chưa lưu");
  if (info.project.name === "mobile") await page.getByRole("button",{name:"Đóng",exact:true}).click();
  await page.getByRole("button",{name:"Hủy thay đổi"}).click();
  await page.getByLabel("Chức vụ / mô tả").fill("Thông tin đã sửa");
  await page.getByRole("button",{name:"Lưu khách mời"}).click();
  await expect(page.getByText("Đã lưu khách mời",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Đang chỉnh sửa: Khách 0"})).toBeVisible();
  await page.getByLabel("Chức vụ / mô tả").fill("Bản nháp đang chỉnh sửa");
  if (info.project.name === "mobile") await page.getByRole("button",{name:"Danh sách khách mời",exact:true}).click();
  await expect(page.locator("[data-guest-row]").first()).toHaveAttribute("data-guest-row","guest-0");
  const handle = page.getByRole("button",{name:"Sắp xếp Thầy ThS. Khách 0"});
  await handle.focus(); await page.keyboard.press("Space");
  await expect(page.locator(".directory-row.is-placeholder")).toHaveCount(1);
  await expect(page.locator(".directory-drag-overlay")).toBeVisible();
  await expect(page.locator('[data-guest-row="guest-1"]')).toHaveCSS("transition-duration", "0.18s");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("status").filter({hasText:"was moved over droppable area guest-1"})).toBeAttached();
  await page.keyboard.press("Space");
  await expect(page.getByText("Đã lưu thứ tự khách mời")).toBeVisible();
  await expect(page.locator("[data-guest-row]").first()).toHaveAttribute("data-guest-row","guest-1");
  await expect(page.getByRole("button",{name:"Sắp xếp Thầy ThS. Khách 0"})).toBeEnabled();
  await expect(page.locator(".directory-drag-overlay")).toHaveCount(0);
  if (info.project.name === "desktop") {
    const source = await page.locator('[data-guest-row="guest-0"] .directory-grip').boundingBox();
    const target = await page.locator('[data-guest-row="guest-3"]').boundingBox();
    if (!source || !target) throw Error("Missing drag targets");
    await page.mouse.move(source.x+source.width/2, source.y+source.height/2); await page.mouse.down();
    await page.mouse.move(source.x+source.width/2,source.y+source.height/2+10);
    await expect(page.locator(".directory-drag-overlay")).toBeVisible(); await expect(page.locator(".is-placeholder")).toHaveCount(1);
    await page.mouse.move(target.x+target.width/2, target.y+target.height/2, {steps:8});
    await expect(page.getByRole("status").filter({hasText:"was moved over droppable area guest-3"})).toBeAttached();
    await page.mouse.up();
    await expect.poll(() => rows[3].id).toBe("guest-0");
  } else {
    const source = await page.locator('[data-guest-row="guest-0"] .directory-grip').boundingBox();
    const target = await page.locator('[data-guest-row="guest-3"]').boundingBox();
    if (!source || !target) throw Error("Missing touch targets");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[{x:source.x+source.width/2,y:source.y+source.height/2}]});
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await cdp.send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[{x:source.x+source.width/2,y:source.y+source.height/2+25}]});
    await expect(page.locator(".directory-drag-overlay")).toBeVisible();
    await cdp.send("Input.dispatchTouchEvent", {type:"touchMove",touchPoints:[{x:source.x+source.width/2,y:target.y+target.height/2}]});
    await expect(page.getByRole("status").filter({hasText:"was moved over droppable area guest-3"})).toBeAttached();
    await cdp.send("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
    await expect.poll(() => rows.findIndex(g => g.id === "guest-0")).toBeGreaterThan(1);
    await cdp.detach();
  }
  await expect(page.getByLabel("Chức vụ / mô tả")).toHaveValue("Bản nháp đang chỉnh sửa");
  await expect(page.getByRole("switch",{name:"Ngừng hoạt động: Khách 0"})).toHaveAttribute("aria-checked","false");
  denyReorder = true;
  const before = rows.map(g => g.id);
  const failingHandle = page.getByRole("button",{name:"Sắp xếp Thầy ThS. Khách 0"});
  await failingHandle.focus(); await page.keyboard.press("Space"); await expect(page.locator(".is-placeholder")).toHaveCount(1);
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("status").filter({hasText:`was moved over droppable area ${before[before.indexOf("guest-0")-1]}`})).toBeAttached();
  const rejected = page.waitForResponse(r => r.url().endsWith("/reorder_guests") && r.status() === 409);
  await page.keyboard.press("Space");
  await rejected;
  await expect.poll(async () => page.locator("[data-guest-row]").evaluateAll(els => els.map(el => el.getAttribute("data-guest-row")))).toEqual(before);
  denyReorder = false;
  await page.reload();
  if (info.project.name === "mobile") await page.getByRole("button",{name:"Danh sách khách mời",exact:true}).click();
  await expect(page.locator("[data-guest-row]").first()).toHaveAttribute("data-guest-row","guest-1");
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.getByRole("button",{name:"Sắp xếp Thầy ThS. Khách 1",exact:true}).focus(); await page.keyboard.press("Space");
  await expect(page.locator(".directory-drag-overlay")).toHaveCSS("transform","none");
  await expect(page.locator('[data-guest-row="guest-1"]')).toHaveCSS("transition-duration","0s");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
      getComputedStyle(document.querySelector(".invitation-cover .section-label")!).fontSize,
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


test("invitation schedule cards adapt and venue tabs work (mock API)", async ({ page }, info) => {
  await backend(page);
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/bookclub/102026/nguyen-hoang-vien");
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  const schedule = page.locator("#invitation-schedule");
  await expect(schedule.getByRole("heading", { name: "Thông Tin Buổi Họp Mặt" })).toBeVisible();
  const calendar = await schedule.locator(".calendar-card").boundingBox();
  const venue = await schedule.locator(".venue-card").boundingBox();
  expect(calendar).not.toBeNull(); expect(venue).not.toBeNull();
  if (info.project.name === "mobile") expect(venue!.y).toBeGreaterThan(calendar!.y);
  else expect(venue!.x).toBeGreaterThan(calendar!.x);
  await schedule.getByRole("button", { name: "Hình ảnh địa điểm" }).click();
  await expect(schedule.getByText("Chưa có ảnh địa điểm.")).toBeVisible();
  await schedule.getByRole("button", { name: "Bản đồ Google Maps" }).click();
  await expect(schedule.getByRole("link", { name: "Chỉ đường" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await schedule.screenshot({ path: `test-results/schedule-${info.project.name}.png` });
});


test("optional quote one appears only when nonblank (mock API)", async ({page}) => {
 await backend(page);
 let quote = "   ";
 await page.route("**/rest/v1/rpc/resolve_invitation", route => route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({event:{...event,quote_one:quote},invitation})}));
 await page.goto("/bookclub/102026/nguyen-hoang-vien");
 await page.getByRole("button",{name:"Mở thiệp mời"}).click();
 await expect(page.locator(".invitation-quote-one")).toHaveCount(0);
 quote = "Một câu riêng"; await page.reload(); await page.getByRole("button",{name:"Mở thiệp mời"}).click();
 await expect(page.locator(".invitation-quote-one")).toContainText("Một câu riêng");
 await expect(page.locator(".invitation-quote-one")).toContainText("CLB Sinh viên Yêu thích Sách");
});


test("quote sections follow schedule and program without duplicate venue (mock API)", async ({page}, info) => {
 if (info.project.name === "desktop") await page.setViewportSize({width:1440,height:900});
 else await page.setViewportSize({width:320,height:700});
 await backend(page);
 const quoteTwo={type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Lời nhắn cuối"}]}]};
 await page.route("**/rest/v1/rpc/resolve_invitation",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({event:{...event,quote_one:"Lời nhắn đầu",quote_two:quoteTwo,venue_image_path:null,agenda:[{time:"08:00",description:"Đón khách",highlight:false}]},invitation})}));
 await page.goto("/bookclub/102026/nguyen-hoang-vien");await page.getByRole("button",{name:"Mở thiệp mời"}).click();
 const order=await page.locator(".invitation-content").evaluate(el=>Array.from(el.children).map(c=>c.className));
 expect(order.indexOf("invitation-quote-one")).toBeGreaterThan(order.indexOf("invitation-section meeting-schedule"));
 expect(order.indexOf("invitation-quote-two")).toBeGreaterThan(order.indexOf("invitation-section invitation-program"));
 await expect(page.locator(".meeting-venue")).toHaveCount(0);
 await expect(page.locator(".invitation-quote-two")).toContainText("Lời nhắn cuối");
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
 await page.screenshot({path:`test-results/grand-${info.project.name}.png`,fullPage:true});
});


test("quote editor formats, saves and reloads independently (mock API)", async ({page}) => {
 await backend(page,true);
 await page.goto("/bookclub/admin/edit/102026");
 const editor=page.getByRole("textbox",{name:"Quote 2 — Nội dung"});
 await expect(editor).toBeVisible();
 await page.getByRole("toolbar",{name:"Định dạng Quote 2 — Nội dung"}).getByRole("button",{name:"Đậm",exact:true}).click();
 await editor.fill("Nội dung quote riêng");
 await page.getByLabel("Quote 1 — Nội dung").fill("Lời mời riêng");
 await page.getByRole("button",{name:"Lưu sự kiện"}).click();
 await expect(page.getByText("Đã lưu sự kiện")).toBeVisible();
 await page.reload();
 await expect(page.getByRole("textbox",{name:"Quote 2 — Nội dung"})).toContainText("Nội dung quote riêng");
 await expect(page.getByLabel("Quote 1 — Nội dung")).toHaveValue("Lời mời riêng");
 await expect(page.getByRole("textbox",{name:"Mô tả",exact:true})).toHaveText(event.description);
 await page.getByRole("textbox",{name:"Quote 2 — Nội dung"}).fill("");
 await page.getByLabel("Quote 1 — Nội dung").fill("");
 await page.getByRole("button",{name:"Lưu sự kiện"}).click();
 await expect(page.getByText("Đã lưu sự kiện")).toBeVisible();
 await page.reload();
 await expect(page.getByRole("textbox",{name:"Quote 2 — Nội dung"})).toHaveText("");
 await expect(page.getByLabel("Quote 1 — Nội dung")).toHaveValue("");
});


test("pasted Vietnamese quote formatting survives save and reload (mock API)", async ({ page }) => {
 await backend(page, true);
 await page.goto("/bookclub/admin/edit/102026");
 const editor = page.getByRole("textbox", {name: "Quote 2 — Nội dung"});
 await editor.click();
 await editor.evaluate(element => {
  const clipboard = new DataTransfer();
  clipboard.setData("text/html", '<h2><span style="color: rgb(55, 127, 124)"><em>Đọc sách mở ra chân trời mới</em></span></h2><p>Hẹn gặp bạn tại câu lạc bộ.</p>');
  clipboard.setData("text/plain", "Đọc sách mở ra chân trời mới\nHẹn gặp bạn tại câu lạc bộ.");
  element.dispatchEvent(new ClipboardEvent("paste", {clipboardData: clipboard, bubbles: true, cancelable: true}));
 });
 await expect(editor.locator("h2 em")).toHaveText("Đọc sách mở ra chân trời mới");
 await page.getByRole("button", {name: "Lưu sự kiện"}).click();
 await expect(page.getByText("Đã lưu sự kiện")).toBeVisible();
 await page.reload();
 await expect(editor.locator("h2 em")).toHaveText("Đọc sách mở ra chân trời mới");
 await expect(editor.locator("h2 span")).toHaveCSS("color", "rgb(55, 127, 124)");
});

test("formatted description survive save and reload (mock API)", async ({ page }) => {
 await backend(page, true);
 await page.goto("/bookclub/admin/edit/102026");
 const editor = page.getByRole("textbox", {name: "Mô tả", exact: true});
 await editor.click();
 await editor.press("ControlOrMeta+A");
 await editor.evaluate(element => {
  const clipboard = new DataTransfer();
  clipboard.setData("text/html", '<h2><span style="color: rgb(55, 127, 124)"><em>Chào mừng đến với câu lạc bộ</em></span></h2>');
  clipboard.setData("text/plain", "Chào mừng đến với câu lạc bộ");
  element.dispatchEvent(new ClipboardEvent("paste", {clipboardData: clipboard, bubbles: true, cancelable: true}));
 });
 const request = page.waitForRequest(r => r.url().endsWith("/save_event"));
 await page.getByRole("button", {name: "Lưu sự kiện"}).click();
 const payload = (await request).postDataJSON().p_event;
 expect(JSON.stringify(payload.description_rich)).toContain("#377f7c");
 await expect(page.getByText("Đã lưu sự kiện")).toBeVisible();
 await page.reload();
 await expect(page.getByRole("textbox", {name: "Mô tả", exact: true})).toContainText("Chào mừng đến với câu lạc bộ");
 await expect(page.getByRole("textbox", {name: "Mô tả", exact: true}).locator("h2 em")).toHaveText("Chào mừng đến với câu lạc bộ");
 await expect(page.getByRole("textbox", {name: "Mô tả", exact: true}).locator("h2 span")).toHaveCSS("color", "rgb(55, 127, 124)");
});

test("tablet layout and reduced motion preserve readable quotes (mock API)",async ({page}, info)=>{
 await page.setViewportSize({width:768,height:900});
 await page.emulateMedia({reducedMotion:'reduce'});
 await backend(page);
 await page.route('**/rest/v1/rpc/resolve_invitation',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({event:{...event,quote_one:'Quote kiểm thử',quote_two:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Nội dung cuối',marks:[{type:'bold'}]}]}]}},invitation})}));
 await page.goto('/bookclub/102026/nguyen-hoang-vien');
 await page.getByRole('button',{name:'Mở thiệp mời'}).focus(); await page.keyboard.press('Enter');
 await expect(page.locator('.invitation-quote-one')).toBeVisible();
 await expect(page.locator('.invitation-quote-two strong')).toHaveText('Nội dung cuối');
 expect(await page.locator('.invitation-quote-one').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`test-results/tablet-quote-${info.project.name}.png`,fullPage:true,animations:'disabled'});
});


test('quote visibility matrix, legacy data and safe rich text (mock API)', async ({page}) => {
 await backend(page);
 let values: Record<string,unknown> = {};
 await page.route('**/rest/v1/rpc/resolve_invitation',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({event:{...event,...values},invitation})}));
 const doc=(text:string)=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text,marks:[{type:'bold'}]}]}]});
 const cases=[{data:{},one:0,two:0},{data:{quote_one:'  ',quote_two:doc('  ')},one:0,two:0},{data:{quote_one:'Đầu'},one:1,two:0},{data:{quote_two:doc('Cuối')},one:0,two:1},{data:{quote_one:'Đầu',quote_two:doc('<img src=x onerror=alert(1)>')},one:1,two:1}];
 for(const c of cases){values=c.data;await page.goto('/bookclub/102026/nguyen-hoang-vien');await page.getByRole('button',{name:'Mở thiệp mời'}).click();await expect(page.locator('.invitation-quote-one')).toHaveCount(c.one);await expect(page.locator('.invitation-quote-two')).toHaveCount(c.two);await expect(page.locator('.invitation-quote-two img')).toHaveCount(0);}
});


for(const role of ['admin','editor'])test('role directory '+role+' controls and navigation (mock API)',async({page},info)=>{
 await backend(page,true);if(info.project.name==='mobile')await page.setViewportSize({width:320,height:700});
 await page.route('**/rest/v1/rpc/effective_role',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(role)}));
 await page.route('**/rest/v1/rpc/role_directory',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{user_id:'admin-fixture',email:'admin@example.invalid',role:'admin',status:'confirmed'},{user_id:'editor-fixture',email:'editor@example.invalid',role:'editor',status:'invited'}])}));
 await page.goto('/bookclub/admin/roles');await expect(page.getByRole('heading',{name:'Quản lý vai trò'})).toBeVisible();
 await expect(page.getByText('admin@example.invalid',{exact:true})).toBeVisible();
 const nav=page.getByRole('navigation',{name:'Quản trị'});await expect(nav.getByRole('link')).toHaveText(['Sự kiện','Danh bạ khách mời','Quản lý vai trò']);
 if(role==='admin'){await expect(page.getByRole('button',{name:'Thu hồi Editor'})).toHaveCount(1);await page.getByRole('button',{name:'Thêm tài khoản'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByLabel('Vai trò').locator('option')).toHaveText(['Editor']);await page.getByRole('button',{name:'Hủy',exact:true}).click();}
 else {await expect(page.getByRole('button',{name:'Thêm tài khoản'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Thu hồi Editor'})).toHaveCount(0);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});


test('role revoke confirms, shows server error and refreshes on success (mock API)',async({page})=>{
 await backend(page,true);let revoked=false,denied=true;
 await page.route('**/rest/v1/rpc/effective_role',r=>r.fulfill({status:200,contentType:'application/json',body:'"admin"'}));
 await page.route('**/rest/v1/rpc/role_directory',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(revoked?[]:[{user_id:'20000000-0000-4000-8000-000000000002',email:'editor@example.invalid',role:'editor',status:'confirmed'}])}));
 await page.route('**/functions/v1/manage-editors',r=>{const body=r.request().postDataJSON();expect(body).toEqual({action:'revoke',user_id:'20000000-0000-4000-8000-000000000002',role:'editor'});if(!denied)revoked=true;return r.fulfill({status:denied?403:200,contentType:'application/json',body:JSON.stringify(denied?{error:'Role operation refused'}:{ok:true})})});
 await page.goto('/bookclub/admin/roles');await page.getByRole('button',{name:'Thu hồi Editor'}).click();await expect(page.getByRole('dialog')).toContainText('editor@example.invalid');
 await page.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByText('Role operation refused')).toBeVisible();await expect(page.getByRole('dialog')).toBeVisible();
 denied=false;await page.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('Không có tài khoản phù hợp.')).toBeVisible();
});


test('role directory loading, empty and denied states (mock API)',async({page})=>{
 await backend(page,true);await page.route('**/rest/v1/rpc/effective_role',r=>r.fulfill({status:200,contentType:'application/json',body:'"editor"'}));
 let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/rest/v1/rpc/role_directory',async r=>{await wait;await r.fulfill({status:200,contentType:'application/json',body:'[]'})});
 await page.goto('/bookclub/admin/roles');await expect(page.getByText('Đang tải dữ liệu…')).toBeVisible();release();await expect(page.getByText('Không có tài khoản phù hợp.')).toBeVisible();
 await page.route('**/rest/v1/rpc/role_directory',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Content access required'})}));
 await page.reload();await expect(page.getByRole('heading',{name:'Không thể tải dữ liệu'})).toBeVisible();
});
test('MP3 floating controls handle blocked autoplay on desktop and mobile (mock audio)',async({page})=>{
 await backend(page);
 await page.route('**/rest/v1/rpc/resolve_invitation',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({event:{...event,music_path:'fixture/track/song.mp3'},invitation})}));
 await page.route('**/storage/v1/object/sign/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/bookclub-music/fixture/track/song.mp3?token=fixture'})}));
 await page.addInitScript(()=>{let blocked=true;HTMLMediaElement.prototype.play=function(){if(blocked){blocked=false;return Promise.reject(new DOMException('blocked','NotAllowedError'))}this.dispatchEvent(new Event('playing'));return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'))};});
 await page.goto('/bookclub/102026/nguyen-hoang-vien');await page.getByRole('button',{name:'Mở thiệp mời'}).click();
 const panel=page.getByRole('complementary',{name:'Nhạc nền'});await expect(panel.getByRole('button',{name:'Bật nhạc'})).toBeVisible();
 await expect(panel.locator('audio')).toHaveJSProperty('loop',true);await expect(panel.locator('audio')).toHaveJSProperty('volume',.35);
 await panel.getByRole('button',{name:'Bật nhạc'}).click();await expect(panel.getByRole('button',{name:'Tạm dừng'})).toBeVisible();
 await panel.getByRole('slider').fill('70');await expect(panel.locator('audio')).toHaveJSProperty('volume',.7);
 await panel.getByRole('button',{name:'Tắt tiếng'}).click();await expect(panel.locator('audio')).toHaveJSProperty('muted',true);
 await panel.getByRole('button',{name:'Tạm dừng'}).click();await expect(panel.getByRole('button',{name:'Phát nhạc'})).toBeVisible();
 expect(await panel.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('MP3 editor uploads replaces removes and rejects invalid files (mock Storage)',async({page})=>{
 await backend(page,true);
 const uploads:string[]=[];const removed:string[]=[];
 await page.route('**/storage/v1/**',async route=>{
  const request=route.request();const url=new URL(request.url());
  if(url.pathname.includes('/object/sign/'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/bookclub-music/fixture.mp3?token=test'})});
  if(request.method()==='POST'&&url.pathname.includes('/object/bookclub-music/')){uploads.push(decodeURIComponent(url.pathname.split('/object/bookclub-music/')[1]));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({Key:uploads.at(-1)})});}
  if(request.method()==='DELETE'){removed.push(...request.postDataJSON().prefixes);return route.fulfill({status:200,contentType:'application/json',body:'[]'});}
  return route.fulfill({status:200,body:''});
 });
 await page.route('**/rest/v1/rpc/unused_music',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(uploads.map(path=>({path})))}));
 await page.goto('/bookclub/admin/edit/102026');
 const chooser=page.getByLabel('Chọn hoặc thay MP3 (tối đa 20 MB)');
 await chooser.setInputFiles({name:'bad.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('not audio')});
 await expect(page.getByRole('alert')).toContainText('không phải MP3');expect(uploads).toHaveLength(0);
 for(const name of ['first.mp3','replacement.mp3']){
  await chooser.setInputFiles({name,mimeType:'audio/mpeg',buffer:Buffer.from([255,251,144,0])});
  await expect(page.getByRole('status').filter({hasText:'Sẵn sàng upload'})).toBeVisible();
  await page.getByRole('button',{name:'Lưu sự kiện'}).click();
  await expect(page.getByText('Đã lưu sự kiện')).toBeVisible();
  await page.reload();await expect(page.getByText(name,{exact:true})).toBeVisible();
 }
 expect(uploads).toHaveLength(2);expect(uploads[0]).not.toBe(uploads[1]);expect(removed).toContain(uploads[0]);
 await page.getByRole('button',{name:'Xóa nhạc',exact:true}).click();await page.getByRole('button',{name:'Lưu sự kiện'}).click();
 await expect(page.getByText('Đã lưu sự kiện')).toBeVisible();await page.reload();await expect(page.getByText('Chưa có nhạc',{exact:true})).toBeVisible();expect(removed).toContain(uploads[1]);
});
test('MP3 decodes and plays real audio bytes without a media mock',async({page})=>{
 const {readFileSync}=await import('node:fs');const bytes=readFileSync('tests/fixtures/background-silence.mp3');
 await backend(page);
 await page.route('**/rest/v1/rpc/resolve_invitation',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({event:{...event,music_path:'fixture/track/tone.mp3'},invitation})}));
 await page.route('**/storage/v1/object/sign/**',route=>route.request().method()==='POST'?route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/bookclub-music/fixture/track/tone.mp3?token=fixture'})}):route.fulfill({status:200,contentType:'audio/mpeg',body:bytes}));
 await page.goto('/bookclub/102026/nguyen-hoang-vien');await page.getByRole('button',{name:'Mở thiệp mời'}).click();
 const panel=page.getByRole('complementary',{name:'Nhạc nền'});const audio=panel.locator('audio');
 await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.readyState)).toBeGreaterThanOrEqual(2);
 await expect(audio).toHaveJSProperty('loop',true);await expect(audio).toHaveJSProperty('volume',.35);
 const play=panel.getByRole('button',{name:/^(Phát nhạc|Bật nhạc)$/});if(await play.isVisible())await play.click();
 await expect(panel.getByRole('button',{name:'Tạm dừng'})).toBeVisible();await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(0);
 await panel.getByRole('button',{name:'Tạm dừng'}).click();await expect(audio).toHaveJSProperty('paused',true);await expect(audio).toHaveJSProperty('error',null);
});
