import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  validateVenueFile,
  discardVenueImage,
} from "../features/events/images";
import { db, errorMessage } from "../lib/supabase";
import { VenueImage } from "./VenueImage";
export function ImageEditor({
  file,
  path,
  onChange,
  disabled,
}: {
  file: File | null;
  path?: string | null;
  onChange: (file: File | null, remove?: boolean) => void;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [cleaning, setCleaning] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const pick = (next?: File) => {
    if (!next || disabled) return;
    try {
      validateVenueFile(next);
      onChange(next);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <fieldset
      tabIndex={0}
      aria-busy={disabled}
      disabled={disabled}
      onPaste={(e) => {
        const image = Array.from(e.clipboardData.files)[0];
        if (image) {
          e.preventDefault();
          pick(image);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files[0]);
      }}
    >
      <legend>Ảnh địa điểm</legend>
      {disabled && <p role="status">Đang lưu dữ liệu và ảnh…</p>}
      <p>
        Chọn file hoặc đặt focus vào vùng này và Ctrl+V ảnh. JPG, PNG, WebP; tối
        đa 5 MB. Ảnh chỉ được upload khi lưu.
      </p>
      <input
        ref={input}
        aria-label="Chọn ảnh địa điểm"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {preview ? (
        <img
          className="venue-image"
          src={preview}
          alt="Xem trước ảnh địa điểm"
        />
      ) : (
        <VenueImage path={path} />
      )}
      <div className="actions">
        {(file || path) && (
          <button
            type="button"
            className="secondary"
            onClick={() => onChange(null, true)}
          >
            Xóa ảnh
          </button>
        )}
        <button
          type="button"
          className="secondary"
          disabled={cleaning}
          onClick={async () => {
            setCleaning(true);
            try {
              const r = await db().rpc("unused_venue_images");
              if (r.error) throw r.error;
              for (const item of r.data)
                if (
                  Date.parse(item.created_at) <
                  Date.now() - 24 * 60 * 60 * 1000
                )
                  await discardVenueImage(item.path);
              toast.success(
                "Đã dọn ảnh tạm của bạn quá 24 giờ, không được sự kiện sử dụng",
              );
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setCleaning(false);
            }
          }}
        >
          {cleaning ? "Đang dọn…" : "Dọn ảnh upload chưa dùng"}
        </button>
      </div>
    </fieldset>
  );
}
