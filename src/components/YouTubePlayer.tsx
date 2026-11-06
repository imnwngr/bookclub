import { useEffect, useRef, useState } from "react";
import { youtubeVideoId } from "../lib/youtube";

type Player = { playVideo(): void; pauseVideo(): void; mute(): void; unMute(): void; setVolume(n: number): void; destroy(): void };
type PlayerEvent = { target: Player; data?: number };
type YouTubeWindow = Window & { YT?: { Player: new (element: HTMLElement, options: object) => Player }; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<void> | undefined;
function loadApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const w = window as YouTubeWindow;
    if (w.YT?.Player) { resolve(); return; }
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { apiPromise = undefined; reject(new Error("YouTube API unavailable")); };
    document.head.appendChild(script);
  });
  return apiPromise;
}
export function YouTubePlayer({ url }: { url: string }) {
  const id = youtubeVideoId(url);
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(35);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!id || !container.current) return;
    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    const host = document.createElement("div");
    container.current.appendChild(host);
    loadApi().then(() => {
      if (cancelled) return;
      const w = window as YouTubeWindow;
      player.current = new w.YT!.Player(host, { width: "100%", height: "200", videoId: id, playerVars: { playsinline: 1, origin: window.location.origin }, events: {
        onReady: (e: PlayerEvent) => {
          e.target.setVolume(35);
          observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 1)) {
              observer?.disconnect();
              e.target.playVideo();
            }
          }, { threshold: 1 });
          if (container.current) observer.observe(container.current);
        },
        onStateChange: (e: PlayerEvent) => { setPlaying(e.data === 1); if (e.data === 1) setBlocked(false); },
        onAutoplayBlocked: () => { setPlaying(false); setBlocked(true); },
        onError: () => setFailed(true),
      } });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; observer?.disconnect(); player.current?.destroy(); player.current = null; host.remove(); };
  }, [id]);
  if (!id) return null;
  return <section className="invitation-music" aria-label="Nhạc sự kiện">
    <h2>Nhạc sự kiện</h2>
    <div className="youtube-player" ref={container} />
    {failed ? <p>Không thể tải trình phát. <a href={url} target="_blank" rel="noreferrer">Mở video trên YouTube</a></p> : <div className="youtube-controls">
      <button type="button" onClick={() => player.current?.playVideo()}>{blocked ? "Bật nhạc" : "Phát"}</button>
      <button type="button" onClick={() => player.current?.pauseVideo()} disabled={!playing}>Tạm dừng</button>
      <button type="button" aria-pressed={muted} onClick={() => { if (muted) player.current?.unMute(); else player.current?.mute(); setMuted(!muted); }}>{muted ? "Bật tiếng" : "Tắt tiếng"}</button>
      <label>Âm lượng <input type="range" min="0" max="100" value={volume} onChange={e => { const n = Number(e.target.value); setVolume(n); player.current?.setVolume(n); }} /></label>
    </div>}
  </section>;
}
