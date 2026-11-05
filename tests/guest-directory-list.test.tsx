import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { GuestDirectoryList } from "../src/features/guests/GuestDirectoryList";
import type { Guest } from "../src/types/domain";
const guests: Guest[] = [
  { id:"a", salutation:"Thầy", name:"An", description:"Vai trò một, Vai trò hai", kind:"individual", active:true },
  { id:"b", salutation:"Cô", name:"Bình", description:"Vai trò ba", kind:"individual", active:false },
];
it("switches between compact and full without changing selection or list order", async () => {
  const choose = vi.fn(), toggle = vi.fn(), reorder = vi.fn();
  const props = { guests, selectedId:"a", pending:{}, optimistic:{}, reorderEnabled:true, onChoose:choose, onToggle:toggle, onReorder:reorder };
  const { rerender } = render(<GuestDirectoryList {...props} mode="compact" />);
  expect(screen.queryByText("Vai trò một")).toBeNull();
  expect(screen.getByText("Đang chỉnh sửa")).toBeVisible();
  await userEvent.click(screen.getByRole("switch",{ name:"Đang hoạt động: An" }));
  expect(toggle).toHaveBeenCalledWith(guests[0],false); expect(choose).not.toHaveBeenCalled();
  rerender(<GuestDirectoryList {...props} mode="full" />);
  expect(screen.getByText("Vai trò một")).toBeVisible(); expect(screen.getByText("Vai trò hai")).toBeVisible();
  await userEvent.click(screen.getByRole("button",{ name:"Chỉnh sửa khách mời Bình" }));
  expect(choose).toHaveBeenCalledWith(guests[1]);
});
it("disables sorting until capability exists and accepts keyboard activation", async () => {
  const reorder = vi.fn(), props = { guests, pending:{}, optimistic:{}, onChoose:vi.fn(), onToggle:vi.fn(), onReorder:reorder, mode:"compact" as const };
  const { rerender } = render(<GuestDirectoryList {...props} reorderEnabled={false} />);
  expect(screen.getByRole("button",{ name:/Sắp xếp Thầy An/ })).toBeDisabled();
  rerender(<GuestDirectoryList {...props} reorderEnabled />);
  const handle = screen.getByRole("button",{ name:/Sắp xếp Thầy An/ });
  handle.focus(); await userEvent.keyboard("[Space]");
  expect(document.querySelector(".directory-drag-overlay")).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(reorder).not.toHaveBeenCalled();
});
