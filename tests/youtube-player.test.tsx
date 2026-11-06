import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { YouTubePlayer } from "../src/components/YouTubePlayer";

it("handles blocked autoplay and controls volume and playback", async () => {
  const player = { playVideo: vi.fn(), pauseVideo: vi.fn(), mute: vi.fn(), unMute: vi.fn(), setVolume: vi.fn(), destroy: vi.fn() };
  let handlers: Record<string, (event: { target: typeof player; data?: number }) => void> = {};
  const win = window as unknown as { YT: unknown };
  win.YT = { Player: class { constructor(_element: HTMLElement, options: {events: typeof handlers}) { handlers = options.events; return player; } } };
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private readonly callback: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void) {}
    observe() { this.callback([{ isIntersecting: true, intersectionRatio: 1 }]); }
    disconnect() {}
  });
  try {
    render(<YouTubePlayer url="https://youtu.be/dQw4w9WgXcQ" />);
    await waitFor(() => expect(handlers.onReady).toBeDefined());
    handlers.onReady({ target: player });
    expect(player.setVolume).toHaveBeenCalledWith(35);
    expect(player.playVideo).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Tắt tiếng" }));
    expect(player.mute).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByRole("slider", { name: "Âm lượng" }), { target: { value: "60" } });
    expect(player.setVolume).toHaveBeenCalledWith(60);
    handlers.onAutoplayBlocked({ target: player });
    await waitFor(() => expect(screen.getByRole("button", { name: "Bật nhạc" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Bật nhạc" }));
    expect(player.playVideo).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Bật nhạc" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạm dừng" })).toBeDisabled();
  } finally { vi.unstubAllGlobals(); }
});
