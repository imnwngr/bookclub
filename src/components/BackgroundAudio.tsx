import { useEffect, useRef } from "react";
import { musicUrl } from "../features/events/music";

export function BackgroundAudio({ path }: { path: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = audio.current!;
    let active = true;
    let pending = false;
    let retry = false;
    el.volume = 0.35;
    el.loop = true;
    el.muted = false;
    const events = ["pointerup", "touchend", "keydown"] as const;
    const removeListeners = () => {
      for (const event of events) document.removeEventListener(event, interact);
    };
    const attempt = async () => {
      if (!active || pending || !el.getAttribute("src")) return;
      pending = true;
      try {
        await el.play();
        if (!active) el.pause();
        else {
          retry = false;
          removeListeners();
        }
      } catch {
        if (active) {
          retry = true;
          for (const event of events)
            document.addEventListener(event, interact, { passive: true });
        }
      } finally {
        pending = false;
      }
    };
    // Call play synchronously inside the gesture handler for WebKit activation.
    function interact() {
      if (retry) void attempt();
    }
    const load = async () => {
      try {
        const url = await musicUrl(path);
        if (!active) return;
        el.src = url;
        await attempt();
      } catch {
        /* Signing failures remain silent; refresh can recover later. */
      }
    };
    void load();
    const refresh = window.setInterval(
      () => {
        void musicUrl(path)
          .then((url) => {
            if (!active) return;
            const time = el.currentTime;
            const resume = !el.paused || retry;
            el.src = url;
            el.currentTime = time;
            if (resume) void attempt();
          })
          .catch(() => {});
      },
      50 * 60 * 1000,
    );
    return () => {
      active = false;
      removeListeners();
      clearInterval(refresh);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [path]);
  return <audio ref={audio} loop hidden aria-hidden="true" />;
}
