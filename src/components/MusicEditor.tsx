import { useEffect, useState } from "react";
import {
  musicUrl,
  validateMusic,
  discardMusic,
} from "../features/events/music";
import { db, errorMessage } from "../lib/supabase";
export function MusicEditor({
  path,
  file,
  onChange,
}: {
  path?: string | null;
  file: File | null;
  onChange: (file: File | null, remove?: boolean) => void;
}) {
  const [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [unused, setUnused] = useState<{ path: string }[]>([]);
  useEffect(() => {
    let active = true;
    let object = "";
    if (file) {
      object = URL.createObjectURL(file);
      setPreview(object);
    } else if (path) {
      void musicUrl(path)
        .then((url) => {
          if (active) setPreview(url);
        })
        .catch(() => {
          if (active) setError("Không thể nghe thử nhạc.");
        });
    } else setPreview("");
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [path, file]);
  return (
    <fieldset>
      <legend>Nhạc nền MP3</legend>
      <p>{file?.name ?? path?.split("/").at(-1) ?? "Chưa có nhạc"}</p>
      <label>
        Chọn hoặc thay MP3 (tối đa 20 MB)
        <input
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={async (e) => {
            const selected = e.target.files?.[0];
            e.target.value = "";
            if (!selected) return;
            try {
              await validateMusic(selected);
              setError("");
              onChange(selected);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        />
      </label>
      <p role="status">{file ? "Sẵn sàng upload khi lưu sự kiện." : ""}</p>
      {preview && <audio controls src={preview} preload="metadata" />}
      {(file || path) && (
        <button type="button" onClick={() => onChange(null, true)}>
          Xóa nhạc
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        onClick={async () => {
          const r = await db().rpc("unused_music");
          if (r.error) setError(errorMessage(r.error));
          else setUnused(r.data);
        }}
      >
        Kiểm tra nhạc tạm
      </button>
      {unused.map((r) => (
        <p key={r.path}>
          {r.path.split("/").at(-1)}{" "}
          <button
            type="button"
            onClick={async () => {
              try {
                await discardMusic(r.path);
                setUnused((rows) => rows.filter((x) => x.path !== r.path));
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            Dọn file chưa dùng
          </button>
        </p>
      ))}
    </fieldset>
  );
}
