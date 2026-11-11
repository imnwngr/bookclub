import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { designBackend, designEvent, designGuests } from "./redesign-fixtures";

const url = "/bookclub/?__spa=%2Fbookclub%2Fdesign-fixture%2Fminh-an";
const output = ".local/ui-redesign/content-scroll-fix/matrix";
async function open(page: Page) {
  await page.goto(url);
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}
async function position(page: Page, name: string, offset: number) {
  await page.locator(`[data-chapter="${name}"]`).evaluate((el, offset) => {
    window.scrollTo({
      top: el.getBoundingClientRect().top + scrollY - innerHeight * offset,
      behavior: "instant",
    });
  }, offset);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function revealPosition(page: Page, selector: string, offset: number) {
  await page.locator(selector).evaluate((el: HTMLElement, offset) => {
    let top = 0;
    for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null)
      top += node.offsetTop;
    window.scrollTo({ top: top - innerHeight + offset, behavior: "instant" });
  }, offset);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  ));
}

async function expectReadingFlow(page: Page) {
  const sheets = await page.locator(".story-sheet").evaluateAll(elements => elements.map(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return { top: rect.top, bottom: rect.bottom, transform: style.transform, position: style.position };
  }));
  for (let i = 0; i < sheets.length; i++) {
    expect(sheets[i].transform).toBe("none");
    expect(sheets[i].position).toBe("relative");
    if (i) expect(sheets[i].top).toBeGreaterThanOrEqual(sheets[i - 1].bottom - 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("invitation data starts while the renderer downloads and reuses the cache", async ({ page }) => {
  await designBackend(page);
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/resolve_invitation")) requests++;
  });
  let release!: () => void;
  const renderer = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/assets/index-*.js", async (route) => {
    await renderer;
    await route.continue();
  });
  try {
    await page.goto(url, { waitUntil: "commit" });
    await expect.poll(() => requests).toBe(1);
    await expect(page.locator(".invitation-cover")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByRole("button", { name: "Mở thiệp mời" })).toBeVisible();
  await expect(page.locator(".cover-recipient strong")).toHaveText(designGuests[0].name);
  expect(requests).toBe(1);
});

test("invitation warmup is optional and skips other routes", async ({ page }) => {
  await designBackend(page);
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/resolve_invitation")) requests++;
  });
  await page.goto("/bookclub/");
  await expect(page.locator(".editorial-hero")).toBeVisible();
  await page.goto("/bookclub/?__spa=%2Fbookclub%2Fadmin%2Flogin");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await page.route("**/assets/preloadInvitation-*.js", (route) => route.abort());
  await page.goto(url);
  await expect(page.locator(".cover-recipient strong")).toHaveText(designGuests[0].name);
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.getByRole("heading", { name: designGuests[0].name, exact: true })).toBeVisible();
  expect(requests).toBe(1);
});

test("cold invitation reserves its layout and loads without home or admin modules", async ({
  page,
}) => {
  await designBackend(page);
  let requests = 0;
  const unnecessaryModules: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/resolve_invitation"))
      requests++;
    if (/\/assets\/(Home|Dashboard|EventForm|AdminShell)-.*\.js/.test(request.url()))
      unnecessaryModules.push(request.url());
  });
  let releaseData!: () => void;
  const dataReady = new Promise<void>((resolve) => {
    releaseData = resolve;
  });
  await page.route("**/rest/v1/rpc/resolve_invitation", async (route) => {
    await dataReady;
    await route.fallback();
  });
  let mainTop: number;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect.poll(() => requests).toBe(1);
    await expect(
      page.getByRole("button", { name: "Mở thiệp mời" }),
    ).toHaveCount(0);
    await expect(page.getByRole("status")).toBeVisible();
    mainTop = (await page.locator("main").boundingBox())!.y;
  } finally {
    releaseData();
  }
  await expect(
    page.getByRole("button", { name: "Mở thiệp mời" }),
  ).toBeVisible();
  await expect(page.locator(".cover-recipient strong")).toHaveText(
    designGuests[0].name,
  );
  expect(requests).toBe(1);
  expect(unnecessaryModules).toEqual([]);
  expect((await page.locator("main").boundingBox())!.y).toBeCloseTo(mainTop, 0);
});

test("paper and emerald materials survive initial boot and route navigation", async ({ page }) => {
  await designBackend(page);
  await page.goto(url);
  await expect(page.getByRole("button", { name: "Mở thiệp mời" })).toBeVisible();

  async function expectMaterial(selector: string) {
    const background = await page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(background).toContain("data:image/svg+xml");
    expect(background).toContain("linear-gradient");
  }

  await expectMaterial(".site-invitation");
  await expectMaterial(".envelope-stack");
  await expectMaterial(".envelope-paper");
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(page.locator(".opening-paper")).toHaveCount(0);
  await expectMaterial(".invitation-greeting");
  await expectMaterial(".invitation-event");
  await expectMaterial(".invitation-quote-one");
  await expectMaterial(".invitation-program");
  await page.getByRole("link", { name: "Thông tin sự kiện", exact: true }).click();
  await expect(page).toHaveURL(/\/design-fixture$/);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Mở thiệp mời" })).toBeVisible();
  await expectMaterial(".site-invitation");
  await expectMaterial(".envelope-paper");
});

test("invitation data errors still offer retry after route prefetch", async ({
  page,
}) => {
  await designBackend(page);
  let failing = true;
  await page.route("**/rest/v1/rpc/resolve_invitation", (route) =>
    failing
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "Lỗi kết nối mô phỏng." }),
        })
      : route.fallback(),
  );
  await page.goto(url);
  await expect(page.getByText("Lỗi kết nối mô phỏng.")).toBeVisible();
  failing = false;
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".cover-recipient strong")).toHaveText(
    designGuests[0].name,
  );
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.getByRole("heading", { name: designGuests[0].name, exact: true }),
  ).toBeVisible();
});

test("official identity loads on home, cover and closing with the base path", async ({
  page,
}) => {
  await designBackend(page);
  await page.goto("/bookclub/");
  const mark = page.locator(".wordmark .bookclub-logo img");
  await expect(mark).toHaveJSProperty("complete", true);
  expect(
    await mark.evaluate((el: HTMLImageElement) => el.currentSrc),
  ).toContain("/bookclub/logos/logo-bookclub-192.webp");
  await page.goto(url);
  await expect(
    page.locator(".letter-seal .bookclub-logo img"),
  ).toHaveJSProperty("naturalWidth", 192);
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(
    page.locator(".closing-mark .bookclub-logo img"),
  ).toHaveJSProperty("naturalWidth", 192);
  for (const image of await page.locator(".bookclub-logo img").all()) {
    const box = await image.boundingBox();
    expect(box!.width).toBeCloseTo(box!.height, 1);
  }
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mở thiệp mời" }),
  ).toBeVisible();
});

test("inner content reveals with scroll while chapters never overlap", async ({
  page,
}, info) => {
  // Keep the first event heading below the initial viewport on both projects.
  await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1280, height: 650 });
  await designBackend(page);
  await open(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, selector] of [
    ["event", ".invitation-event h2"],
    ["schedule", ".meeting-schedule h2"],
    ["program", ".agenda h2"],
    ["closing", ".invitation-closing .invitation-signoff"],
  ]) {
    const content = page.locator(selector);
    const opacity = () => content.evaluate(el => Number(getComputedStyle(el).opacity));
    await revealPosition(page, selector, 30);
    const early = await opacity();
    await revealPosition(page, selector, 85);
    const middle = await opacity();
    await revealPosition(page, selector, 220);
    const complete = await opacity();
    expect(early).toBeLessThan(middle - 0.1);
    expect(middle).toBeLessThan(complete - 0.05);
    expect(complete).toBeGreaterThanOrEqual(0.99);
    await expectReadingFlow(page);
    await revealPosition(page, selector, 85);
    expect(await opacity()).toBeCloseTo(middle, 2);
    await page.screenshot({
      path: `${output}/${name}-${info.project.name}.png`,
    });
  }
  await revealPosition(page, ".agenda li:first-child", 120);
  const opacities = await page.locator(".agenda li").evaluateAll(items =>
    items.map(el => Number(getComputedStyle(el).opacity)),
  );
  expect(opacities[0]).toBeGreaterThan(opacities[1] + 0.1);
  expect(opacities[1]).toBeGreaterThanOrEqual(opacities[2]);
  await revealPosition(page, ".agenda h2", 340);
  expect(await page.locator(".agenda h2").evaluate(el => {
    const box = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(box.x + box.width / 2, box.bottom - 4));
  })).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".invitation-content")).not.toHaveClass(
    /story-content-scroll/,
  );
  for (const sheet of await page.locator(".story-sheet").all()) {
    await expect(sheet).toHaveCSS("transform", "none");
    await expect(sheet).toHaveCSS("position", "relative");
  }
  for (const selector of [".agenda h2", ".agenda li:first-child", ".invitation-event h2"]) {
    await expect(page.locator(selector)).toHaveCSS("opacity", "1");
    await expect(page.locator(selector)).toHaveCSS("transform", "none");
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".invitation-content")).toHaveClass(/story-content-scroll/);
  await page
    .getByRole("link", { name: "Thông tin sự kiện", exact: true })
    .click();
  await expect(page.locator(".story-chapter")).toHaveCount(0);
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Mở thiệp mời" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("native touch reveals inner content and survives viewport changes", async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await designBackend(page);
  await open(page);
  await revealPosition(page, ".meeting-schedule h2", 30);

  const content = page.locator(".meeting-schedule h2");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  async function swipe(from: number, to: number) {
    const touch = (y: number) => ({
      x: 190,
      y,
      radiusX: 6,
      radiusY: 6,
      force: 1,
      id: 1,
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [touch(from)],
    });
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [touch(from + ((to - from) * step) / 12)],
      });
      await page.waitForTimeout(24);
    }
    // Hold before release so momentum does not obscure the reverse gesture.
    await page.waitForTimeout(120);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }

  try {
    const startY = await page.evaluate(() => scrollY);
    const before = await content.evaluate((el) => getComputedStyle(el).opacity);
    await swipe(650, 350);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(startY + 150);
    await expect(content).toHaveCSS("opacity", "1");
    expect(Number(before)).toBeLessThan(0.9);
    await expectReadingFlow(page);
    await page.screenshot({
      path: `${output}/native-touch-forward-${info.project.name}.png`,
    });

    const forwardY = await page.evaluate(() => scrollY);
    await swipe(350, 610);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeLessThan(forwardY - 100);
    await expect(content).not.toHaveCSS("opacity", "1");
    await expectReadingFlow(page);
    await page.screenshot({
      path: `${output}/native-touch-reverse-${info.project.name}.png`,
    });

    for (const viewport of [
      { width: 844, height: 390 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await position(page, "schedule", 0.5);
      await expectReadingFlow(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(page.locator("#invitation-schedule")).toBeInViewport();
    }
    expect(errors).toEqual([]);
  } finally {
    await cdp.detach();
  }
});

for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
  test(`chapters stay separate and readable at ${width}px`, async ({ page }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Width matrix once; touch also runs the interaction tests.",
    );
    await page.setViewportSize({ width, height: 900 });
    await designBackend(page);
    await open(page);
    await expect(
      page.getByRole("heading", { name: designGuests[0].name, exact: true }),
    ).toHaveText(designGuests[0].name);
    for (const name of ["event", "schedule", "program", "closing"]) {
      await position(page, name, 0.5);
      await expectReadingFlow(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: `${output}/${name}-${width}.png` });
    }
    await page.locator(".invitation-closing .text-link").focus();
    await expect(
      page.locator(".invitation-closing .text-link"),
    ).toBeInViewport();
  });
}

test("long content, empty options, keyboard anchors and missing ResizeObserver", async ({
  page,
}) => {
  await designBackend(page, {
    event: {
      ...designEvent,
      description:
        "Đoạn nội dung dài được kiểm thử để bảo toàn toàn bộ văn bản. ".repeat(
          70,
        ),
      quote_one: null,
      quote_two: null,
      agenda: [],
    },
  });
  await open(page);
  await page.getByRole("link", { name: "Lời mời từ BookClub" }).click();
  await expect(page.locator("#invitation-event")).toBeFocused();
  await page.getByRole("link", { name: "Xem thời gian và địa điểm" }).focus();
  await expect(
    page.getByRole("link", { name: "Xem thời gian và địa điểm" }),
  ).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#invitation-schedule")).toBeFocused();
  await expect(
    page.locator("[data-chapter=program], [data-chapter=quote]"),
  ).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.addInitScript(() => {
    Object.defineProperty(window, "ResizeObserver", { value: undefined });
  });
  await open(page);
  await expect(page.locator(".invitation-content")).not.toHaveClass(
    /story-content-scroll/,
  );
  await page.locator(".invitation-closing").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "Thông tin sự kiện", exact: true }),
  ).toBeInViewport();
});

test("fallback reveals stay scroll-linked, focusable and removable", async ({ page }) => {
  await designBackend(page);
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((...args: string[]) => args.some(arg => arg.includes("animation-timeline"))
      ? false
      : args.length === 1 ? supports(args[0]) : supports(args[0], args[1])) as typeof CSS.supports;
  });
  await open(page);
  const root = page.locator(".invitation-content");
  const first = page.locator(".agenda li:first-child");
  const opacity = () => first.evaluate(el => Number(getComputedStyle(el).opacity));
  await expect(root).toHaveClass(/story-content-scroll/);
  await expect(root).not.toHaveClass(/story-content-native/);
  await revealPosition(page, ".agenda li:first-child", 25);
  const early = await opacity();
  await revealPosition(page, ".agenda li:first-child", 100);
  const middle = await opacity();
  expect(middle).toBeGreaterThan(early + 0.15);
  await revealPosition(page, ".agenda li:first-child", 220);
  await expect(first).toHaveCSS("opacity", "1");
  await revealPosition(page, ".agenda li:first-child", 100);
  expect(await opacity()).toBeCloseTo(middle, 2);
  await expectReadingFlow(page);
  await page.keyboard.press("Tab");
  await page.locator(".invitation-closing .text-link").focus();
  await expect(page.locator(".invitation-closing .text-link")).toHaveCSS("opacity", "1");
  await expect(page.locator(".invitation-closing .text-link")).toHaveCSS("transform", "none");
  await expect(page.locator(".invitation-closing .text-link")).toBeInViewport();
  // Let the browser finish keyboard focus scrolling before comparing fixed scroll positions.
  await page.evaluate(() => new Promise<void>(resolve => {
    let last = scrollY, stable = 0;
    const settle = () => {
      stable = scrollY === last ? stable + 1 : 0;
      last = scrollY;
      if (stable >= 4) resolve();
      else requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(first).toHaveCSS("opacity", "1");
  await expect(root).not.toHaveClass(/story-content-scroll/);
  await expect(first).not.toHaveAttribute("style", /opacity|transform/);
  await expect(first).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(root).toHaveClass(/story-content-scroll/);
  await revealPosition(page, ".agenda li:first-child", 25);
  await expect.poll(opacity).toBeCloseTo(early, 2);
  await page.getByRole("link", { name: "Thông tin sự kiện", exact: true }).click();
  await expect(page.locator(".story-chapter")).toHaveCount(0);
  await page.goBack();
  await page.getByRole("button", { name: "Mở thiệp mời" }).click();
  await expect(root).toHaveClass(/story-content-scroll/);
});

test("long agenda never collides with following content and each item stays readable", async ({ page }) => {
  await designBackend(page, {
    event: {
      ...designEvent,
      agenda: designEvent.agenda!.map(item => ({
        ...item,
        description: `${item.description}. ${"Văn bản kiểm thử nội dung chương trình dài. ".repeat(35)}`,
      })),
    },
  });
  await open(page);
  for (const item of await page.locator(".agenda li").all()) {
    await item.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().bottom + scrollY - innerHeight + 80, behavior: "instant" }));
    await expect(item).toHaveCSS("opacity", "1");
    await expectReadingFlow(page);
    expect(await item.evaluate(el => {
      const content = el.querySelector("div")!;
      const rect = content.getBoundingClientRect();
      return content.contains(document.elementFromPoint(rect.x + 10, rect.bottom - 10));
    })).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".agenda h2")).toHaveCSS("opacity", "1");
  await page.locator(".invitation-closing .text-link").focus();
  await expect(page.locator(".invitation-closing .text-link")).toBeInViewport();
});
