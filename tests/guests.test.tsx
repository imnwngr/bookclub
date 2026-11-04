import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { GuestSelection } from "../src/features/guests/GuestSelection";
const guests = [
  {
    id: "a",
    salutation: "Thầy",
    name: "A",
    description: "A",
    kind: "individual" as const,
    active: true,
    default_aliases: [],
  },
  {
    id: "b",
    salutation: "Cô",
    name: "B",
    description: "B",
    kind: "individual" as const,
    active: true,
    default_aliases: [],
  },
  {
    id: "c",
    salutation: "",
    name: "C",
    description: "C",
    kind: "group" as const,
    active: false,
    default_aliases: [],
  },
];
function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <GuestSelection
      guests={guests}
      selected={selected}
      onChange={setSelected}
    />
  );
}
it("selects individually, all active and clears all without changing directory", async () => {
  render(<Harness />);
  const user = userEvent.setup();
  expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  await user.click(screen.getAllByRole("checkbox")[0]);
  expect(screen.getByText("Đã chọn 1 khách mời")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Chọn tất cả" }));
  expect(screen.getByText("Đã chọn 2 khách mời")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Bỏ chọn tất cả" }));
  expect(screen.getByText("Đã chọn 0 khách mời")).toBeInTheDocument();
  expect(guests).toHaveLength(3);
});
