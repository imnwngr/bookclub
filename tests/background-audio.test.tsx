import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackgroundAudio } from "../src/components/BackgroundAudio";
vi.mock("../src/features/events/music", () => ({
  musicUrl: async () => "/fixture.mp3",
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("uses real audio state, loop, blocked autoplay and accessible controls", async () => {
  const play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const { container } = render(<BackgroundAudio path="fixture.mp3" />);
  const audio = container.querySelector("audio")!;
  await screen.findByRole("button", { name: "Bật nhạc" });
  expect(audio.loop).toBe(true);
  expect(audio.volume).toBe(0.35);
  play.mockImplementation(async () => {
    fireEvent.playing(audio);
  });
  fireEvent.click(screen.getByRole("button", { name: "Bật nhạc" }));
  await screen.findByRole("button", { name: "Tạm dừng" });
  fireEvent.change(screen.getByRole("slider"), { target: { value: "62" } });
  expect(audio.volume).toBe(0.62);
  fireEvent.click(screen.getByRole("button", { name: "Tắt tiếng" }));
  expect(audio.muted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Bật tiếng" }));
  expect(audio.muted).toBe(false);
  fireEvent.pause(audio);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Phát nhạc" })).toBeTruthy(),
  );
});
it("accepts allowed autoplay only after playing event", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
    async function (this: HTMLMediaElement) {
      fireEvent.playing(this);
    },
  );
  render(<BackgroundAudio path="allowed.mp3" />);
  await screen.findByRole("button", { name: "Tạm dừng" });
});
