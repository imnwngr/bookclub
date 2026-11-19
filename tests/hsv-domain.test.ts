import { expect, it, vi } from "vitest";
import { eventSchema, codeSchema } from "../src/lib/validation";
import {
  contrast,
  DEFAULT_THEME,
  normalizeTheme,
  themePresets,
  themeStyle,
} from "../src/lib/eventTheme";
import {
  eventStatus,
  filterEvents,
  invitationLines,
  invitationUrl,
  orderEvents,
} from "../src/lib/domain";
import type { ClubEvent, Invitation } from "../src/types/domain";
const congratulation: ClubEvent = {
  id: "congrats",
  code: "chuc-mung",
  title: "Thiệp chúc",
  description: "",
  starts_at: null,
  ends_at: null,
  event_type: "congratulation",
  status: "published",
  venue_name: "",
  address: "",
  directions: "",
  place_id: "",
  maps_url: "",
  location_method: "url",
  latitude: null,
  longitude: null,
  created_at: "2026-11-19T18:00:00Z",
  updated_at: "2026-11-19T18:00:00Z",
};
it("accepts no date/location for congratulations but preserves invitation validation and rejects invalid themes/types", () => {
  expect(eventSchema.safeParse(congratulation).success).toBe(true);
  expect(
    eventSchema.safeParse({ ...congratulation, event_type: "invitation" })
      .success,
  ).toBe(false);
  expect(
    eventSchema.safeParse({ ...congratulation, event_type: "invalid" }).success,
  ).toBe(false);
  for (const theme of [
    { version: 1, primary: "red" },
    { version: 1, primary: "#123456", css: "display:none" },
    { version: 2, primary: "#123456" },
  ])
    expect(eventSchema.safeParse({ ...congratulation, theme }).success).toBe(
      false,
    );
  for (const code of ["admin", "auth", "thiep-moi", "thiep-chuc"])
    expect(codeSchema.safeParse(code).success).toBe(false);
});
it("keeps chosen timestamps on type changes without making them required", () => {
  const preserved = {
    ...congratulation,
    starts_at: "2099-01-01T01:00:00Z",
    ends_at: "2099-01-01T02:00:00Z",
    maps_url: "https://maps.google.com/?q=CTUT",
  };
  expect(eventSchema.parse(preserved).starts_at).toBe(preserved.starts_at);
  expect(
    eventSchema.safeParse({
      ...preserved,
      event_type: "invitation",
      ends_at: preserved.starts_at,
    }).success,
  ).toBe(false);
});
it("filters congratulations by labelled creation date in Vietnam and never classifies them as ended", () => {
  expect(eventStatus(congratulation)).toBe("congratulation");
  expect(filterEvents([congratulation], "11", "2026")).toHaveLength(1);
  expect(filterEvents([congratulation], "10", "2026")).toHaveLength(0);
  expect(
    orderEvents([
      { ...congratulation, id: "older", created_at: "2025-01-01" },
      congratulation,
    ])[0].id,
  ).toBe("congrats");
});
it("uses type-specific canonical primary links and isolates generated properties without mutating defaults", () => {
  vi.stubEnv("BASE_URL", "/hsv/");
  expect(invitationUrl("chuc-mung", "khach", "congratulation")).toContain(
    "/hsv/thiep-chuc/chuc-mung/khach",
  );
  const invitations = [
    {
      event_id: "congrats",
      guest_id: "guest",
      name: "Snapshot BookClub",
      salutation: "Bạn",
      primary_alias: "khach",
      invitation_aliases: [{ alias: "khach" }],
    },
  ] as Invitation[];
  expect(
    invitationLines("chuc-mung", "congrats", invitations, "congratulation"),
  ).toContain("Bạn Snapshot BookClub: ");
  expect(
    invitationLines(
      "chuc-mung",
      "congrats",
      [{ ...invitations[0], primary_alias: "wrong" }],
      "congratulation",
    ),
  ).toBe("");
  const before = themeStyle(undefined);
  themeStyle({ version: 1, primary: "#000000" });
  expect(themeStyle(undefined)).toEqual(before);
  expect(normalizeTheme({ css: "color:red" })).toEqual(DEFAULT_THEME);
});
it("derives readable text/buttons for presets and extreme colors without raw CSS", () => {
  for (const primary of [
    ...themePresets.map((t) => t.primary),
    "#ffffff",
    "#000000",
    "#ffff00",
    "#00ff00",
    "#ff00ff",
    "#00ffff",
  ]) {
    const style = themeStyle({ version: 1, primary }) as Record<string, string>;
    expect(contrast(style["--brand"], "#ffffff")).toBeGreaterThanOrEqual(7);
    expect(contrast(style["--ink"], style["--paper"])).toBeGreaterThanOrEqual(
      7,
    );
    expect(contrast(style["--muted"], style["--paper"])).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(style["--sage"], style["--forest"])).toBeGreaterThanOrEqual(
      4.5,
    );
  }
});
