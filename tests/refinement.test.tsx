import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import {
  GuestDescription,
  descriptionLines,
} from "../src/components/GuestDescription";
import { AgendaEditor } from "../src/components/AgendaEditor";
import { Agenda } from "../src/components/Agenda";
import { eventSchema } from "../src/lib/domain";
import type { AgendaItem } from "../src/types/domain";
it("splits commas and existing newlines without changing the source text", () => {
  const value = "  Vai trò  một, Vai trò hai,\n\n Vai trò ba.  ";
  expect(descriptionLines(value)).toEqual([
    "Vai trò một",
    "Vai trò hai",
    "Vai trò ba.",
  ]);
  render(<GuestDescription value={value} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(value).toContain(",");
});
it("omits an empty description and renders markup as text", () => {
  const { container } = render(<GuestDescription value={" , \n "} />);
  expect(container).toBeEmptyDOMElement();
  render(<GuestDescription value="<script>alert(1)</script>, Vai trò" />);
  expect(screen.getByText("<script>alert(1)</script>")).toBeVisible();
  expect(document.querySelector("script")).toBeNull();
});
it("edits ranges and icon selection, renumbers after removing a milestone", async () => {
  function Harness() {
    const [items, set] = useState<AgendaItem[]>([]);
    return (
      <>
        <AgendaEditor items={items} onChange={set} />
        <Agenda items={items} />
      </>
    );
  }
  render(<Harness />);
  await userEvent.click(
    screen.getByRole("button", { name: "Thêm mốc thời gian" }),
  );
  await userEvent.type(screen.getByLabelText("Nội dung mốc 1"), "Đón khách");
  await userEvent.click(
    screen.getByRole("button", { name: "Khoảng giờ mốc 1" }),
  );
  await userEvent.clear(screen.getByLabelText("Kết thúc"));
  await userEvent.type(screen.getByLabelText("Kết thúc"), "09:00");
  await userEvent.click(screen.getByRole("button", { name: "Xong" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Chọn icon mốc 1" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Mốc 1: Đón tiếp" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Chọn icon mốc 1" }),
  );
  expect(
    screen.getByRole("button", { name: "Mốc 1: Đón tiếp" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("08:00 — 09:00")).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Thêm mốc thời gian" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Xóa mốc 1" }));
  expect(screen.getByRole("heading", { name: "Giờ mốc 1" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Giờ mốc 2" })).toBeNull();
});
it("validates range order, 24h time and icon whitelist while preserving old milestones", () => {
  const base = {
    code: "qa",
    title: "Test",
    description: "",
    starts_at: "2099-01-01T01:00:00Z",
    ends_at: "2099-01-01T02:00:00Z",
    status: "draft",
    venue_name: "",
    address: "",
    directions: "",
    latitude: null,
    longitude: null,
    place_id: "",
    location_method: "url",
    maps_url: "https://maps.app.goo.gl/test",
  };
  const valid = {
    time: "08:00",
    end_time: "08:30",
    icon: "welcome",
    description: "Test",
    highlight: false,
  };
  expect(eventSchema.safeParse({ ...base, agenda: [valid] }).success).toBe(
    true,
  );
  for (const patch of [
    { end_time: "07:00" },
    { end_time: "24:00" },
    { icon: "unknown" },
  ])
    expect(
      eventSchema.safeParse({ ...base, agenda: [{ ...valid, ...patch }] })
        .success,
    ).toBe(false);
  expect(
    eventSchema.safeParse({
      ...base,
      agenda: [{ time: "08:00", description: "Existing", highlight: false }],
    }).success,
  ).toBe(true);
});
