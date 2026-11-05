import { useState } from "react";
import { DateTime24 } from "./DateTime24";
import { Time24 } from "./Time24";
import { formatDate } from "../lib/domain";
export function RangePicker({
  label,
  start,
  end,
  onStart,
  onEnd,
  dateTime = false,
  error,
}: {
  label: string;
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  dateTime?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const show = (v: string) =>
    dateTime
      ? Number.isFinite(Date.parse(v))
        ? formatDate(v)
        : "Chọn ngày giờ"
      : v || "--:--";
  return (
    <div className="range-picker">
      <button
        type="button"
        className="secondary range-trigger"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(!open)}
      >
        {show(start)} – {show(end)} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          className="range-popover"
          role="group"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        >
          {dateTime ? (
            <>
              <DateTime24 label="Bắt đầu" value={start} onChange={onStart} />
              <DateTime24 label="Kết thúc" value={end} onChange={onEnd} />
            </>
          ) : (
            <>
              <Time24 label="Bắt đầu" value={start} onChange={onStart} />
              <Time24 label="Kết thúc" value={end} onChange={onEnd} />
            </>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => setOpen(false)}
          >
            Xong
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
