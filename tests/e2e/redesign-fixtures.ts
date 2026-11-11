import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { ClubEvent, Guest } from "../../src/types/domain";

// Fixtures exist only in intercepted browser traffic; none are seeded into Supabase.
export const designEvent: ClubEvent = {
  id: "design-event",
  code: "design-fixture",
  title: "Khi những trang sách\nkết nối chúng ta",
  description:
    "Dữ liệu kiểm thử giao diện BookClub. Đây là nội dung mô phỏng để kiểm tra bố cục, chữ tiếng Việt và trải nghiệm thiệp mời; không phải sự kiện thực tế.",
  starts_at: "2099-10-20T01:00:00Z",
  ends_at: "2099-10-20T03:00:00Z",
  status: "published",
  venue_name: "Địa điểm kiểm thử",
  address: "Địa chỉ mô phỏng phục vụ kiểm thử",
  directions:
    "Nội dung hướng dẫn dùng để kiểm tra cách hiển thị trên điện thoại.",
  maps_url: "https://maps.google.com/?q=Can+Tho",
  place_id: "",
  latitude: null,
  longitude: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  venue_image_path: "fixture/venue.svg",
  quote_one: "Cùng nhau mở một trang sách, cùng nhau bắt đầu một câu chuyện.",
  quote_two: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Lời nhắn mô phỏng để kiểm tra phần kết của thiệp.",
          },
        ],
      },
    ],
  },
  agenda: [
    {
      time: "08:00",
      end_time: "08:30",
      icon: "users",
      description: "Đón tiếp khách mời",
      highlight: false,
    },
    {
      time: "08:30",
      end_time: "09:15",
      icon: "book-open",
      description: "Chia sẻ những trang sách yêu thích",
      highlight: true,
    },
    {
      time: "09:15",
      end_time: "10:00",
      icon: "heart-handshake",
      description: "Gặp gỡ và trao đổi",
      highlight: false,
    },
  ],
};
export const designGuests: Guest[] = [
  {
    id: "design-guest",
    salutation: "Thầy",
    name: "Nguyễn Minh An",
    description: "Khách mời mô phỏng, Dữ liệu dùng trong kiểm thử",
    kind: "individual",
    primary_alias: "minh-an",
    active: true,
    display_order: 0,
  },
  {
    id: "design-group",
    salutation: "Các bạn",
    name: "Thành viên và cộng tác viên",
    description: "Nhóm khách mời dùng trong kiểm thử",
    kind: "group",
    primary_alias: "thanh-vien",
    active: true,
    display_order: 1,
  },
  {
    id: "design-inactive",
    salutation: "Bạn",
    name: "Khách mời ngừng hoạt động",
    description: "Dữ liệu kiểm thử",
    kind: "individual",
    primary_alias: "inactive",
    active: false,
    display_order: 2,
  },
];
export async function designBackend(
  page: Page,
  {
    admin = false,
    event = designEvent,
    empty = false,
    error = false,
  }: {
    admin?: boolean;
    event?: ClubEvent;
    empty?: boolean;
    error?: boolean;
  } = {},
) {
  if (admin)
    await page.addInitScript(() =>
      localStorage.setItem(
        "sb-bookclub-test-auth-token",
        JSON.stringify({
          access_token:
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6NDA3MDkwODgwMH0.test",
          refresh_token: "fixture",
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
  let current = { ...event };
  const writes: { path: string; body: unknown }[] = [];
  await page.route("https://bookclub-test.invalid/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    let body: unknown = [];
    if (path.includes("/storage/") && path.endsWith("venue.svg"))
      return route.fulfill({
        contentType: "image/svg+xml",
        body: await readFile("tests/fixtures/venue.svg"),
      });
    if (
      path.endsWith("/is_admin") ||
      path.endsWith("/can_edit_content") ||
      path.endsWith("/guest_order_available")
    )
      body = admin;
    else if (path.endsWith("/effective_role")) body = admin ? "admin" : null;
    else if (path.endsWith("/role_directory"))
      body = [
        {
          user_id: "admin",
          email: "admin@test.invalid",
          role: "admin",
          status: "confirmed",
        },
        {
          user_id: "editor",
          email: "editor@test.invalid",
          role: "editor",
          status: "invited",
        },
      ];
    else if (path.endsWith("/user"))
      body = { id: "admin", aud: "authenticated", role: "authenticated" };
    else if (path.endsWith("/events"))
      body = empty
        ? []
        : [
            current,
            ...(admin && url.searchParams.get("status") !== "eq.published"
              ? [
                  {
                    ...current,
                    id: "draft",
                    code: "draft-fixture",
                    title: "Bản nháp kiểm thử",
                    status: "draft",
                  },
                ]
              : []),
          ];
    else if (path.endsWith("/get_event_v110")) body = empty ? null : current;
    else if (path.endsWith("/guests")) body = designGuests;
    else if (path.endsWith("/guest_order_capabilities")) body = true;
    else if (path.endsWith("/agenda_icon_capabilities"))
      body = [
        "users",
        "music",
        "mic",
        "film",
        "award",
        "sparkles",
        "book-open",
        "gift",
        "trophy",
        "camera",
        "heart-handshake",
      ];
    else if (path.endsWith("/event_guests"))
      body = designGuests
        .slice(0, 2)
        .map((g) => ({
          ...g,
          id: `inv-${g.id}`,
          guest_id: g.id,
          event_id: current.id,
          invitation_aliases: [{ id: `alias-${g.id}`, alias: g.primary_alias }],
        }));
    else if (path.endsWith("/resolve_invitation")) {
      const alias = request.postDataJSON().p_alias;
      const guest = designGuests.find((g) => g.primary_alias === alias);
      body =
        guest && !empty
          ? {
              event: current,
              invitation: {
                ...guest,
                id: `inv-${guest.id}`,
                guest_id: guest.id,
                event_id: current.id,
                invitation_aliases: [],
              },
            }
          : null;
    } else if (path.endsWith("/save_event")) {
      const input = request.postDataJSON();
      writes.push({ path, body: input });
      current = { ...current, ...input.p_event };
      body = current;
    } else if (request.method() !== "GET")
      writes.push({ path, body: request.postData() });
    return route.fulfill({
      status: error ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        error ? { message: "Dịch vụ kiểm thử tạm thời gián đoạn." } : body,
      ),
    });
  });
  return { writes };
}
