import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), limit: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ limit: mocks.limit }) }),
  }),
}));
import { saveEvent } from "../src/features/events/api";
it("does not silently drop ranges/icons when the production upgrade is not applied", async () => {
  mocks.limit.mockResolvedValue({ error: { code: "42703" } });
  await expect(
    saveEvent(
      {
        agenda: [
          {
            time: "08:00",
            end_time: "09:00",
            icon: "book",
            description: "Test",
            highlight: false,
          },
        ],
      } as Parameters<typeof saveEvent>[0],
      [],
    ),
  ).rejects.toThrow("Database chưa hỗ trợ");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
