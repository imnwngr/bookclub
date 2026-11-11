import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type CSSProperties,
} from "react";
import {
  LoaderCircle,
  Music2,
  Pause,
  Play,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { musicUrl } from "../features/events/music";
import "../styles/music.css";

export interface BackgroundAudioHandle {
  resumeFromGesture: () => void;
}

export function BackgroundAudio({
  path,
  ref,
}: {
  path: string;
  ref?: Ref<BackgroundAudioHandle>;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const dock = useRef<HTMLElement>(null);
  const orb = useRef<HTMLButtonElement>(null);
  const controls = useRef({
    resume: () => {},
    toggle: () => {},
    retry: () => {},
  });
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState("");
  const [volume, setVolume] = useState(0.25);
  const [muted, setMuted] = useState(false);

  useImperativeHandle(
    ref,
    () => ({ resumeFromGesture: () => controls.current.resume() }),
    [],
  );
  useEffect(() => {
    const el = audio.current!;
    let active = true;
    let wantsPlayback = true;
    let playAttempt = 0;
    let requestingPlayback = false;
    let sourceRequest = 0;
    el.volume = 0.25;
    el.muted = false;
    setVolume(0.25);
    setMuted(false);
    setReady(false);
    setPlaying(false);
    setBusy(false);
    setFailed(false);
    setMessage("Đang tải âm thanh.");

    async function play() {
      if (!active || !el.getAttribute("src")) return;
      const attempt = ++playAttempt;
      requestingPlayback = true;
      setBusy(true);
      try {
        await el.play();
        if (!active) return;
        if (attempt !== playAttempt) {
          if (!wantsPlayback) el.pause();
          return;
        }
        setPlaying(!el.paused);
        setMessage(
          el.paused ? "Âm thanh đang tạm dừng." : "Âm thanh đang phát.",
        );
      } catch (error) {
        if (!active || attempt !== playAttempt) return;
        setPlaying(false);
        setMessage(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Trình duyệt đang chặn tự phát. Mở thiệp hoặc chọn Phát nhạc để nghe."
            : "Chưa phát được âm thanh. Chọn Phát nhạc để thử lại.",
        );
      } finally {
        if (active && attempt === playAttempt) {
          requestingPlayback = false;
          setBusy(false);
        }
      }
    }
    async function load(refresh = false) {
      const request = ++sourceRequest;
      setFailed(false);
      try {
        const url = await musicUrl(path);
        if (!active || request !== sourceRequest) return;
        const position = refresh ? el.currentTime : 0;
        el.src = url;
        if (position) el.currentTime = position;
        setReady(true);
        if (wantsPlayback) await play();
      } catch {
        if (!active || request !== sourceRequest) return;
        setFailed(true);
        setMessage("Chưa tải được âm thanh. Chọn Tải lại nhạc để thử lại.");
      }
    }
    controls.current = {
      resume: () => {
        // Called synchronously by the invitation button, within its trusted gesture.
        if (wantsPlayback && el.paused) void play();
      },
      toggle: () => {
        if (!el.paused || requestingPlayback) {
          wantsPlayback = false;
          requestingPlayback = false;
          ++playAttempt;
          el.pause();
          setBusy(false);
          setPlaying(false);
          setMessage("Âm thanh đang tạm dừng.");
        } else {
          wantsPlayback = true;
          void play();
        }
      },
      retry: () => void load(true),
    };
    const onPlaying = () => {
      if (!active) return;
      if (!wantsPlayback) {
        el.pause();
        return;
      }
      setPlaying(true);
      setMessage("Âm thanh đang phát.");
    };
    const onPause = () => {
      if (!active) return;
      setPlaying(false);
      setMessage("Âm thanh đang tạm dừng.");
    };
    const onVolume = () => {
      if (!active) return;
      setVolume(el.volume);
      setMuted(el.muted);
    };
    const onError = () => {
      if (!active) return;
      setPlaying(false);
      setFailed(true);
      setMessage("Tệp âm thanh hiện không phát được. Chọn Tải lại nhạc.");
    };
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("volumechange", onVolume);
    el.addEventListener("error", onError);
    void load();
    const refresh = window.setInterval(() => void load(true), 50 * 60 * 1000);
    return () => {
      active = false;
      wantsPlayback = false;
      ++playAttempt;
      ++sourceRequest;
      controls.current = {
        resume: () => {},
        toggle: () => {},
        retry: () => {},
      };
      window.clearInterval(refresh);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("volumechange", onVolume);
      el.removeEventListener("error", onError);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [path]);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!dock.current?.contains(event.target as Node)) {
        const focusedInside = dock.current?.contains(document.activeElement);
        setExpanded(false);
        if (focusedInside) orb.current?.focus({ preventScroll: true });
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setExpanded(false);
      orb.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  const percent = Math.round(volume * 100);
  const silent = muted || volume === 0;
  return (
    <aside
      ref={dock}
      className={
        "music-dock" +
        (playing ? " is-playing" : "") +
        (silent ? " is-muted" : "")
      }
      data-expanded={expanded}
      data-state={
        failed ? "error" : playing ? "playing" : ready ? "paused" : "loading"
      }
      aria-label="Âm thanh thiệp mời"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setExpanded(false);
      }}
    >
      <audio ref={audio} loop preload="none" hidden aria-hidden="true" />
      <button
        ref={orb}
        type="button"
        className="music-orb material-glass"
        aria-label={expanded ? "Đóng điều khiển nhạc" : "Mở điều khiển nhạc"}
        aria-controls={panelId}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <Music2 size={22} aria-hidden="true" />
        <span className="music-orb-state" aria-hidden="true">
          {failed ? (
            <RotateCw />
          ) : playing && !silent ? (
            <span className="music-meter">
              <i />
              <i />
              <i />
            </span>
          ) : (
            <span className="music-rest" />
          )}
        </span>
      </button>
      <div
        id={panelId}
        className="music-capsule material-glass"
        role="group"
        aria-label="Điều khiển âm thanh"
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <button
          className="music-action"
          type="button"
          disabled={!failed && !ready}
          aria-label={
            failed ? "Tải lại nhạc" : playing || busy ? "Tạm dừng" : "Phát nhạc"
          }
          aria-pressed={failed ? undefined : playing}
          onClick={() =>
            failed ? controls.current.retry() : controls.current.toggle()
          }
        >
          {failed ? (
            <RotateCw />
          ) : busy || !ready ? (
            <LoaderCircle className="music-loading" />
          ) : playing ? (
            <Pause />
          ) : (
            <Play />
          )}
        </button>
        <button
          className="music-action"
          type="button"
          aria-label={silent ? "Bật tiếng" : "Tắt tiếng"}
          aria-pressed={silent}
          onClick={() => {
            const el = audio.current!;
            if (el.volume === 0) {
              el.volume = 0.25;
              setVolume(0.25);
            }
            el.muted = !silent;
            setMuted(el.muted);
          }}
        >
          {silent ? <VolumeX /> : <Volume2 />}
        </button>
        <input
          type="range"
          className="music-volume"
          aria-label="Âm lượng"
          aria-valuetext={percent + "%"}
          min="0"
          max="100"
          step="1"
          value={percent}
          style={{ "--volume": percent + "%" } as CSSProperties}
          onChange={(event) => {
            const value = Number(event.target.value) / 100;
            audio.current!.volume = value;
            setVolume(value);
          }}
        />
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {message}
      </span>
    </aside>
  );
}
