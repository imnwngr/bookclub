import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), limit: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ limit: mocks.limit }) }),
  }),
}));
import { saveEvent } from "../src/features/events/api";
beforeEach(() => {
  mocks.rpc
    .mockReset()
    .mockResolvedValue({ data: { version: 3 }, error: null });
});
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
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("hsv_v3_capabilities");
});
it("blocks new icon values before sending save_event until the capability exists", async () => {
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(async (name) =>
    name === "hsv_v3_capabilities"
      ? { data: { version: 3 }, error: null }
      : { data: null, error: { code: "PGRST202" } },
  );
  const event = {
    agenda: [
      {
        time: "08:00",
        end_time: "09:00",
        icon: "film",
        description: "Test",
        highlight: false,
      },
    ],
  } as Parameters<typeof saveEvent>[0];
  await expect(saveEvent(event, [])).rejects.toThrow(
    "Database chưa hỗ trợ icon mới",
  );
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc).toHaveBeenCalledWith("agenda_icon_capabilities");
});
it("sends new icons only after capability confirms them and keeps legacy values usable", async () => {
  mocks.rpc.mockReset();
  mocks.limit.mockResolvedValue({ error: null });
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "hsv_v3_capabilities"
      ? { data: { version: 3 }, error: null }
      : name === "agenda_icon_capabilities"
        ? { data: ["film"], error: null }
        : { data: { id: "event-test" }, error: null },
  );
  const agenda = [
    {
      time: "08:00",
      end_time: "09:00",
      icon: "film",
      description: "Test",
      highlight: false,
    },
  ];
  await saveEvent({ agenda } as Parameters<typeof saveEvent>[0], []);
  expect(mocks.rpc.mock.calls.map((call) => call[0])).toEqual([
    "hsv_v3_capabilities",
    "agenda_icon_capabilities",
    "save_event",
  ]);
  mocks.rpc.mockClear();
  await saveEvent(
    { agenda: [{ ...agenda[0], icon: "welcome" }] } as Parameters<
      typeof saveEvent
    >[0],
    [],
  );
  expect(mocks.rpc.mock.calls.map((call) => call[0])).toEqual([
    "hsv_v3_capabilities",
    "save_event",
  ]);
});

it("blocks quote changes when migration is missing, including clearing a saved quote", async () => {
  mocks.limit.mockResolvedValue({ error: { code: "42703" } });
  await expect(
    saveEvent({ quote_one: "Lời mời" } as Parameters<typeof saveEvent>[0], []),
  ).rejects.toThrow("Database chưa hỗ trợ quote");
  await expect(
    saveEvent({ quote_one: "" } as Parameters<typeof saveEvent>[0], [], {
      quote_one: "Cũ",
    } as Parameters<typeof saveEvent>[2]),
  ).rejects.toThrow("Database chưa hỗ trợ quote");
  expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
    "hsv_v3_capabilities",
    "hsv_v3_capabilities",
  ]);
});

it("blocks saving v3 data when the backend has not been deployed", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  await expect(
    saveEvent(
      { event_type: "congratulation" } as Parameters<typeof saveEvent>[0],
      [],
    ),
  ).rejects.toThrow("Database chưa hỗ trợ phiên bản 3.0.0");
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("hsv_v3_capabilities");
});
