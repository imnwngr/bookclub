import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BackgroundAudio } from "../src/components/BackgroundAudio";
vi.mock("../src/features/events/music", () => ({
  musicUrl: async (path: string) => "/" + path,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function media() {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  return vi.spyOn(HTMLMediaElement.prototype, "play");
}
it("keeps autoplay, loop and 35% volume without controls or layout", async () => {
  const play = media().mockResolvedValue();
  const { container } = render(<BackgroundAudio path="allowed.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  const el = container.querySelector("audio")!;
  expect(el.hidden).toBe(true);
  expect(el.controls).toBe(false);
  expect(el.loop).toBe(true);
  expect(el.volume).toBe(0.35);
  expect(el.muted).toBe(false);
  expect(
    container.querySelector('aside,button,input,[role="alert"]'),
  ).toBeNull();
});
it("retries blocked autoplay on a natural interaction and removes listeners after success", async () => {
  const play = media()
    .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
    .mockResolvedValue();
  const { container } = render(<BackgroundAudio path="blocked.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  await Promise.resolve();
  fireEvent.touchEnd(document);
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  fireEvent.pointerUp(document);
  fireEvent.keyDown(document, { key: "Enter" });
  expect(play).toHaveBeenCalledTimes(2);
  expect(container.querySelector("button")).toBeNull();
});
it("uses one audio and cleans playback and gesture listeners when switching events or unmounting", async () => {
  const play = media().mockRejectedValue(
    new DOMException("blocked", "NotAllowedError"),
  );
  const { container, rerender, unmount } = render(
    <BackgroundAudio path="first.mp3" />,
  );
  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  rerender(<BackgroundAudio path="second.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  expect(container.querySelectorAll("audio")).toHaveLength(1);
  unmount();
  const count = play.mock.calls.length;
  fireEvent.touchEnd(document);
  expect(play).toHaveBeenCalledTimes(count);
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
});
