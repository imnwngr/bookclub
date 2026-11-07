import { useEffect, useRef, useState } from "react";
import { musicUrl } from "../features/events/music";
export function BackgroundAudio({ path }: { path: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false),
    [muted, setMuted] = useState(false),
    [volume, setVolume] = useState(35),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const el = audio.current!;
    el.volume = 0.35;
    el.loop = true;
    const load = async () => {
      try {
        const url = await musicUrl(path);
        if (!active) return;
        el.src = url;
        await el.play();
      } catch (err) {
        if (active) {
          if (err instanceof DOMException && err.name === "NotAllowedError")
            setBlocked(true);
          else setError("Không thể tải hoặc phát MP3.");
        }
      }
    };
    void load();
    const refresh = window.setInterval(
      () => {
        void musicUrl(path)
          .then((url) => {
            if (active) {
              const time = el.currentTime;
              const resume = !el.paused;
              el.src = url;
              el.currentTime = time;
              if (resume) void el.play().catch(() => setBlocked(true));
            }
          })
          .catch(() => {
            if (active) setError("Không thể tải nhạc.");
          });
      },
      50 * 60 * 1000,
    );
    return () => {
      active = false;
      clearInterval(refresh);
      el.pause();
      el.removeAttribute("src");
    };
  }, [path]);
  async function play() {
    try {
      await audio.current?.play();
      setBlocked(false);
      setError("");
    } catch {
      setBlocked(true);
    }
  }
  return (
    <aside className="background-audio" aria-label="Nhạc nền">
      <audio
        ref={audio}
        loop
        onPlaying={() => {
          setPlaying(true);
          setBlocked(false);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError("Không thể tải MP3.");
        }}
      />
      <button
        type="button"
        onClick={() => (playing ? audio.current?.pause() : void play())}
      >
        {playing ? "Tạm dừng" : blocked ? "Bật nhạc" : "Phát nhạc"}
      </button>
      <button
        type="button"
        aria-pressed={muted}
        onClick={() => {
          const value = !muted;
          audio.current!.muted = value;
          setMuted(value);
        }}
      >
        {muted ? "Bật tiếng" : "Tắt tiếng"}
      </button>
      <label>
        Âm lượng
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => {
            const value = Number(e.target.value);
            audio.current!.volume = value / 100;
            setVolume(value);
          }}
        />
      </label>
      {error && <small role="alert">{error}</small>}
    </aside>
  );
}
