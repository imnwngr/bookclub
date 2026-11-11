import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  BackgroundAudio,
  type BackgroundAudioHandle,
} from "../src/components/BackgroundAudio";
const signing = vi.hoisted(() => vi.fn(async (path: string) => "/" + path));
vi.mock("../src/features/events/music", () => ({ musicUrl: signing }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  signing.mockReset();
  signing.mockImplementation(async (path) => "/" + path);
});
function media() {
  const paused = new WeakMap<HTMLMediaElement, boolean>();
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(
    function (this: HTMLMediaElement) {
      return paused.get(this) ?? true;
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (
    this: HTMLMediaElement,
  ) {
    paused.set(this, true);
    this.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  return vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementation(function (this: HTMLMediaElement) {
      paused.set(this, false);
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    });
}
function expand() {
  fireEvent.click(screen.getByRole("button", { name: "Mở điều khiển nhạc" }));
}
it("autoplays at 25%, reports actual playback, and pauses/resumes one audio", async () => {
  const play = media();
  const { container, rerender } = render(
    <BackgroundAudio path="allowed.mp3" />,
  );
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  expand();
  const pause = await screen.findByRole("button", { name: "Tạm dừng" });
  expect(pause).toHaveAttribute("aria-pressed", "true");
  const el = container.querySelector("audio")!;
  expect(el.volume).toBe(0.25);
  expect(el.loop).toBe(true);
  expect(el.hidden).toBe(true);
  fireEvent.click(pause);
  expect(el.paused).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Phát nhạc" }));
  await waitFor(() => expect(el.paused).toBe(false));
  act(() => el.pause());
  expect(screen.getByRole("status")).toHaveTextContent(
    "Âm thanh đang tạm dừng.",
  );
  expect(screen.getByRole("button", { name: "Phát nhạc" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  rerender(<BackgroundAudio path="allowed.mp3" />);
  expect(play).toHaveBeenCalledTimes(2);
  expect(signing).toHaveBeenCalledOnce();
  expect(container.querySelectorAll("audio")).toHaveLength(1);
});
it("handles blocked autoplay, retries through the opening gesture, and respects an intentional pause", async () => {
  const play = media().mockRejectedValueOnce(
    new DOMException("blocked", "NotAllowedError"),
  );
  const ref = createRef<BackgroundAudioHandle>();
  render(<BackgroundAudio ref={ref} path="blocked.mp3" />);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Trình duyệt đang chặn",
    ),
  );
  fireEvent.pointerUp(document);
  fireEvent.keyDown(document, { key: "Enter" });
  expect(play).toHaveBeenCalledOnce();
  await act(async () => ref.current!.resumeFromGesture());
  expand();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));
  await act(async () => ref.current!.resumeFromGesture());
  expect(play).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "Phát nhạc" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
it("retains a manual Play fallback when autoplay and opening are both blocked", async () => {
  const play = media()
    .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
    .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
  const ref = createRef<BackgroundAudioHandle>();
  render(<BackgroundAudio ref={ref} path="fallback.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  await act(async () => ref.current!.resumeFromGesture());
  expand();
  fireEvent.click(screen.getByRole("button", { name: "Phát nhạc" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeEnabled(),
  );
  expect(play).toHaveBeenCalledTimes(3);
});
it("changes volume and mute without signing again or restarting playback", async () => {
  const play = media();
  const { container } = render(<BackgroundAudio path="volume.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  expand();
  const slider = screen.getByRole("slider", { name: "Âm lượng" });
  const el = container.querySelector("audio")!;
  expect(slider).toHaveValue("25");
  fireEvent.change(slider, { target: { value: "72" } });
  expect(el.volume).toBe(0.72);
  fireEvent.click(screen.getByRole("button", { name: "Tắt tiếng" }));
  expect(el.muted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Bật tiếng" }));
  expect(el.muted).toBe(false);
  expect(el.volume).toBe(0.72);
  fireEvent.change(slider, { target: { value: "0" } });
  expect(el.volume).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "Bật tiếng" }));
  expect(el.volume).toBe(0.25);
  expect(el.muted).toBe(false);
  expect(signing).toHaveBeenCalledOnce();
  expect(play).toHaveBeenCalledOnce();
});
it("closes the capsule with Escape/outside and removes hidden controls from interaction", async () => {
  media();
  const { container } = render(<BackgroundAudio path="focus.mp3" />);
  await waitFor(() => expect(signing).toHaveBeenCalled());
  expand();
  const slider = screen.getByRole("slider");
  slider.focus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(
    screen.getByRole("button", { name: "Mở điều khiển nhạc" }),
  ).toHaveFocus();
  expect(screen.queryByRole("slider")).toBeNull();
  expect(container.querySelector(".music-capsule")).toHaveAttribute("inert");
  expand();
  fireEvent.pointerDown(document.body);
  expect(
    screen.getByRole("button", { name: "Mở điều khiển nhạc" }),
  ).toHaveAttribute("aria-expanded", "false");
});
it("ignores late play promises after the source changes and releases media on unmount", async () => {
  let finish!: () => void;
  const play = media().mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const { container, rerender, unmount } = render(
    <BackgroundAudio path="first.mp3" />,
  );
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  rerender(<BackgroundAudio path="second.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
  const el = container.querySelector("audio")!;
  expect(el.paused).toBe(false);
  await act(async () => finish());
  expect(el.paused).toBe(false);
  expect(container.querySelectorAll("audio")).toHaveLength(1);
  unmount();
  expect(el.paused).toBe(true);
  expect(el).not.toHaveAttribute("src");
  expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
});
it("does not play a signed URL that arrives after unmount, including StrictMode remount", async () => {
  const play = media();
  let resolve!: (url: string) => void;
  signing.mockImplementationOnce(
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  const first = render(<BackgroundAudio path="late.mp3" />);
  first.unmount();
  await act(async () => resolve("/late.mp3"));
  expect(play).not.toHaveBeenCalled();
  const second = render(
    <StrictMode>
      <BackgroundAudio path="strict.mp3" />
    </StrictMode>,
  );
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  expect(second.container.querySelectorAll("audio")).toHaveLength(1);
  second.unmount();
});
it("reports signing failures through accessible status and supports icon-only retry", async () => {
  const play = media();
  signing.mockRejectedValueOnce(new Error("signing unavailable"));
  render(<BackgroundAudio path="retry.mp3" />);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chưa tải được âm thanh",
    ),
  );
  expand();
  const retry = screen.getByRole("button", { name: "Tải lại nhạc" });
  expect(retry.textContent).toBe("");
  fireEvent.click(retry);
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeEnabled();
});
it("refreshes signed URLs while preserving position, volume, mute and pause intent", async () => {
  const play = media();
  const interval = vi.spyOn(window, "setInterval");
  const { container } = render(<BackgroundAudio path="refresh.mp3" />);
  await waitFor(() => expect(play).toHaveBeenCalledOnce());
  expand();
  const el = container.querySelector("audio")!;
  el.currentTime = 42;
  fireEvent.change(screen.getByRole("slider"), { target: { value: "65" } });
  fireEvent.click(screen.getByRole("button", { name: "Tắt tiếng" }));
  const refresh = interval.mock.calls.find(
    ([, delay]) => delay === 50 * 60 * 1000,
  )![0] as () => void;
  await act(async () => refresh());
  expect(signing).toHaveBeenCalledTimes(2);
  expect(play).toHaveBeenCalledTimes(2);
  expect(el.currentTime).toBe(42);
  expect(el.volume).toBe(0.65);
  expect(el.muted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));
  await act(async () => refresh());
  expect(play).toHaveBeenCalledTimes(2);
  expect(el.paused).toBe(true);
});
