import { useEffect, useState } from "react";
import { db } from "../lib/supabase";
export function VenueImage({ path }: { path?: string | null }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setUrl("");
    setError(false);
    if (path)
      void db()
        .storage.from("bookclub-venues")
        .download(path)
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !data) {
            setError(true);
            return;
          }
          objectUrl = URL.createObjectURL(data);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  if (!path) return null;
  if (error) return <p role="status">Ảnh địa điểm hiện không tải được.</p>;
  if (!url) return <p role="status">Đang tải ảnh địa điểm…</p>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Xem ảnh địa điểm lớn"
    >
      <img
        className="venue-image"
        src={url}
        alt="Hình ảnh địa điểm buổi gặp mặt"
      />
    </a>
  );
}
