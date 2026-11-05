import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi, afterEach } from "vitest";
afterEach(() => vi.unstubAllEnvs());
import { useState } from "react";
import { Switch } from "../src/components/Switch";
import { formatDate } from "../src/lib/domain";
import { guestAlias, invitationLines, mapLink } from "../src/lib/domain";
import type { Invitation } from "../src/types/domain";
import { Agenda } from "../src/components/Agenda";
it("uses a labelled keyboard accessible switch", async () => {
  function Harness() {
    const [value, setValue] = useState(false);
    return <Switch checked={value} onChange={setValue} label="Công khai" />;
  }
  render(<Harness />);
  const control = screen.getByRole("switch");
  expect(control).toHaveAttribute("aria-checked", "false");
  await userEvent.click(control);
  expect(control).toHaveAttribute("aria-checked", "true");
});
it("formats Vietnamese time with a 24-hour cycle", () => {
  const value = formatDate("2026-11-04T16:45:00Z");
  expect(value).toContain("23:45");
  expect(value).not.toMatch(/AM|PM/);
});
it("creates canonical slugs from Vietnamese names without salutations", () => {
  expect(guestAlias("Thầy ThS. Nguyễn Hoàng Viện")).toBe("nguyen-hoang-vien");
  expect(guestAlias("Đ/c Nguyễn Quang Vinh")).toBe("nguyen-quang-vinh");
  expect(guestAlias("Thành viên CLB Sách CTUT")).toBe(
    "thanh-vien-clb-sach-ctut",
  );
});
it("copies one effective primary link per guest in current event and order", () => {
  vi.stubEnv("BASE_URL", "/bookclub/");
  const a: Invitation = {
    id: "a",
    event_id: "e",
    guest_id: "g",
    salutation: "Thầy ThS.",
    name: "Nguyễn Hoàng Viện",
    description: "",
    kind: "individual",
    primary_alias: "nguyen-hoang-vien",
    invitation_aliases: [{ id: "x", alias: "nguyen-hoang-vien" }],
  };
  const value = invitationLines("new-code", "e", [
    a,
    a,
    { ...a, id: "other", event_id: "other" },
  ]);
  expect(value.split("\n")).toHaveLength(1);
  expect(value).toContain("Thầy ThS. Nguyễn Hoàng Viện:");
  expect(value).toContain("/bookclub/new-code/nguyen-hoang-vien");
});
it("uses selected Place ID despite a preserved older Maps URL", () => {
  expect(
    mapLink({
      latitude: null,
      longitude: null,
      maps_url: "https://google.com/maps",
      address: "",
      place_id: "ChIJ12345",
      location_method: "place",
    }),
  ).toContain("query_place_id=ChIJ12345");
});
it("sorts agenda by 24h time and marks key content without an empty section", () => {
  const { unmount } = render(
    <Agenda
      items={[
        { time: "13:00", description: "Sau", highlight: true },
        { time: "08:00", description: "Trước", highlight: false },
      ]}
    />,
  );
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("08:00");
  expect(screen.getByText("Nội dung trọng tâm ·")).toBeVisible();
  unmount();
  render(<Agenda items={[]} />);
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
});
