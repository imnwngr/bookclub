import { describe, expect, it } from "vitest";
import {
  availableAlias,
  codeSchema,
  eventSchema,
  eventStatus,
  filterEvents,
  fromLocalInput,
  mapLink,
  orderEvents,
  toLocalInput,
} from "../src/lib/domain";
import type { ClubEvent } from "../src/types/domain";
export const fixture: ClubEvent = {
  id: "e",
  code: "102026",
  title: "Ngày hội sách",
  description: "",
  status: "published",
  starts_at: "2026-10-20T01:00:00Z",
  ends_at: "2026-10-20T03:00:00Z",
  venue_name: "CTUT",
  address: "",
  directions: "",
  latitude: null,
  longitude: null,
  place_id: "",
  maps_url: "",
  created_at: "",
  updated_at: "",
};
describe("time and filtering", () => {
  it("uses half-open boundaries", () => {
    expect(eventStatus(fixture, Date.parse(fixture.starts_at) - 1)).toBe(
      "upcoming",
    );
    expect(eventStatus(fixture, Date.parse(fixture.starts_at))).toBe("ongoing");
    expect(eventStatus(fixture, Date.parse(fixture.ends_at))).toBe("ended");
  });
  it("prioritizes ongoing, upcoming then recently ended", () => {
    const events = [
      fixture,
      {
        ...fixture,
        id: "next",
        starts_at: "2026-11-01Z",
        ends_at: "2026-11-02Z",
      },
      {
        ...fixture,
        id: "now",
        starts_at: "2026-10-21Z",
        ends_at: "2026-10-25Z",
      },
      { ...fixture, id: "older", ends_at: "2026-10-19Z" },
    ];
    expect(
      orderEvents(events, Date.parse("2026-10-22Z")).map((e) => e.id),
    ).toEqual(["now", "next", "e", "older"]);
  });
  it("filters month at Vietnamese midnight and searches without accents", () => {
    const e = { ...fixture, starts_at: "2026-10-31T18:00:00Z" };
    expect(filterEvents([e], "11", "2026", "ngay hoi")).toHaveLength(1);
    expect(filterEvents([e], "10", "2026")).toHaveLength(0);
  });
  it("converts local datetime independently of device timezone", () => {
    expect(fromLocalInput("2026-10-20T08:00")).toBe("2026-10-20T01:00:00.000Z");
    expect(toLocalInput(fixture.starts_at)).toBe("2026-10-20T08:00");
  });
});
describe("validation and URL safety", () => {
  it("rejects reserved and unsafe event codes", () => {
    for (const code of ["admin", "../admin", "A", "a/b", "a--b"])
      expect(codeSchema.safeParse(code).success).toBe(false);
    expect(codeSchema.safeParse("102026").success).toBe(true);
  });
  it("rejects empty title, reversed time, incomplete coordinates and malicious links", () => {
    for (const v of [
      { ...fixture, title: "" },
      { ...fixture, ends_at: fixture.starts_at },
      { ...fixture, latitude: 10 },
      { ...fixture, maps_url: "javascript:alert(1)" },
    ])
      expect(eventSchema.safeParse(v).success).toBe(false);
    expect(eventSchema.safeParse(fixture).success).toBe(true);
  });
  it("generates collision-safe aliases without list positions", () => {
    expect(
      availableAlias("Đỗ Trung Hậu", ["do-trung-hau", "do-trung-hau-2"]),
    ).toBe("do-trung-hau-3");
    expect(availableAlias("", [])).toBe("khach-moi");
  });
  it("builds safe coordinate links", () => {
    expect(mapLink({ ...fixture, latitude: 10, longitude: 105 })).toContain(
      "query=10%2C105",
    );
    expect(mapLink(fixture)).toBeNull();
  });
});
it('preserves interior title line breaks and existing length validation',()=>{
 const title='Ngày hội sách\nGiao lưu tác giả\nBookClub CTUT';expect(eventSchema.parse({...fixture,title}).title).toBe(title);
 expect(eventSchema.safeParse({...fixture,title:'Một dòng'}).success).toBe(true);
 expect(eventSchema.safeParse({...fixture,title:'x'.repeat(241)}).success).toBe(false);
 expect(eventSchema.safeParse({...fixture,title:' \n '} ).success).toBe(false);
});
