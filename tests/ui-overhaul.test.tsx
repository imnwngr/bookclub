import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import { SegmentedTimeRange } from "../src/components/SegmentedTimeRange";
import { AgendaEditor } from "../src/components/AgendaEditor";
import { AgendaIcon } from "../src/components/AgendaIcon";
import { agendaIcons, canonicalAgendaIcon } from "../src/lib/agendaIcons";
import type { AgendaItem } from "../src/types/domain";

it("shows eleven icon-only choices, selects one and maps legacy values", async () => {
  const user = userEvent.setup();
  function Harness() {
    const [items, set] = useState<AgendaItem[]>([{ time: "16:00", end_time: "16:15", icon: "book", description: "Test", highlight: false }]);
    return <><AgendaEditor items={items} onChange={set} /><AgendaIcon name={items[0].icon} /></>;
  }
  const { container } = render(<Harness />);
  expect(screen.queryByRole("group", { name: "Icon mốc 1" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Chọn icon mốc 1" }));
  const group = screen.getByRole("group", { name: "Icon mốc 1" });
  const buttons = within(group).getAllByRole("button");
  expect(buttons).toHaveLength(11);
  expect(buttons.every((button) => button.textContent === "")).toBe(true);
  expect(within(group).getByRole("button", { name: "Mốc 1: Sách" })).toHaveAttribute("aria-pressed", "true");
  await user.click(within(group).getByRole("button", { name: "Mốc 1: Phim" }));
  expect(screen.queryByRole("group", { name: "Icon mốc 1" })).not.toBeInTheDocument();
  expect(container.querySelectorAll(".lucide-film").length).toBe(2);
  expect(canonicalAgendaIcon("welcome")).toBe("users");
  expect(canonicalAgendaIcon("unknown")).toBe("book-open");
  expect(Object.keys(agendaIcons)).toHaveLength(11);
});

it("advances segments, preserves incomplete input, validates and pastes a range", async () => {
  const user = userEvent.setup();
  function Harness() {
    const [range, setRange] = useState(["08:00", "09:00"]);
    return <><SegmentedTimeRange label="Thử" start={range[0]} end={range[1]} onChange={(a, b) => setRange([a, b])} /><output>{range.join(" – ")}</output><button>Khác</button></>;
  }
  render(<Harness />);
  const startHour = screen.getByLabelText("Bắt đầu giờ Thử");
  const startMinute = screen.getByLabelText("Bắt đầu phút Thử");
  const endHour = screen.getByLabelText("Kết thúc giờ Thử");
  const endMinute = screen.getByLabelText("Kết thúc phút Thử");
  await user.click(startHour); await user.keyboard("16"); expect(startMinute).toHaveFocus();
  await user.keyboard("00"); expect(endHour).toHaveFocus();
  await user.keyboard("16"); expect(endMinute).toHaveFocus();
  await user.keyboard("15"); await user.click(screen.getByRole("button", { name: "Khác" }));
  expect(screen.getByText("16:00 – 16:15")).toBeVisible();
  await user.click(startHour); await user.keyboard("2");
  await user.click(screen.getByRole("button", { name: "Khác" }));
  expect(startHour).toHaveValue("2"); expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByText("16:00 – 16:15")).toBeVisible();
  await user.click(startHour); await user.paste("17:30 - 18:15");
  expect(screen.getByText("17:30 – 18:15")).toBeVisible();
  await user.keyboard("{ArrowRight}"); expect(startMinute).toHaveFocus();
  await user.keyboard("{ArrowLeft}"); expect(startHour).toHaveFocus();
  await user.tab(); expect(startMinute).toHaveFocus();
  await user.tab({ shift: true }); expect(startHour).toHaveFocus();
  await user.click(startMinute); await user.clear(startMinute); await user.keyboard("{Backspace}");
  expect(startHour).toHaveFocus();
});
