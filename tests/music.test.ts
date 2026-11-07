import { it, expect, vi, beforeEach } from "vitest";
import {
  validateMusic,
  MUSIC_LIMIT,
  uploadMusic,
  discardMusic,
} from "../src/features/events/music";
const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "20000000-0000-4000-8000-000000000001" } },
      }),
    },
    from: () => ({ insert: mocks.insert, delete: () => ({ eq: mocks.eq }) }),
    rpc: mocks.rpc,
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  }),
}));
const file = (
  name = "song.mp3",
  type = "audio/mpeg",
  bytes = [255, 251, 144, 0],
) =>
  ({
    name,
    type,
    size: bytes.length,
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  }) as File;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockResolvedValue({ error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});
it("validates extension MIME size and audio frame bytes", async () => {
  await expect(validateMusic(file())).resolves.toBeUndefined();
  for (const f of [
    file("x.wav"),
    file("x.mp3", "text/plain"),
    file("x.mp3", "audio/mpeg", [73, 68, 51]),
    { ...file(), size: MUSIC_LIMIT + 1 },
    { ...file(), size: 0 },
  ])
    await expect(validateMusic(f)).rejects.toThrow();
});
it("uploads immutable path only after registration and reports upload failures", async () => {
  const path = await uploadMusic(file("SONG.MP3"));
  expect(path).toMatch(/SONG.mp3$/);
  expect(mocks.upload).toHaveBeenCalledWith(path, expect.anything(), {
    contentType: "audio/mpeg",
    upsert: false,
  });
  mocks.upload.mockResolvedValue({ error: Error("offline") });
  await expect(uploadMusic(file())).rejects.toThrow("offline");
});
it("never deletes a path absent from the unused list", async () => {
  await discardMusic("shared.mp3");
  expect(mocks.remove).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({ data: [{ path: "unused.mp3" }], error: null });
  await discardMusic("unused.mp3");
  expect(mocks.remove).toHaveBeenCalledWith(["unused.mp3"]);
});
