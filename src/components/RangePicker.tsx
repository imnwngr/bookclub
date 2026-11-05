import { useState } from "react";
import { formatDate, fromLocalInput, toLocalInput } from "../lib/domain";
import { SegmentedTimeRange } from "./SegmentedTimeRange";

export function RangePicker({ label, start, end, onStart, onEnd, onRange, dateTime = false, error }: {
  label: string; start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void;
  onRange?: (start: string, end: string) => void; dateTime?: boolean; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const local = (value: string) => Number.isFinite(Date.parse(value)) ? toLocalInput(value) : "";
  const startLocal = dateTime ? local(start) : "";
  const endLocal = dateTime ? local(end) : "";
  const startDate = startLocal.slice(0, 10), endDate = endLocal.slice(0, 10);
  const startTime = dateTime ? startLocal.slice(11, 16) || "00:00" : start;
  const endTime = dateTime ? endLocal.slice(11, 16) || "00:00" : end;
  const setTimes = (a: string, b: string) => {
    const nextStart = dateTime && startDate ? fromLocalInput(`${startDate}T${a}`) : a;
    const nextEnd = dateTime && endDate ? fromLocalInput(`${endDate}T${b}`) : b;
    if (onRange) { if (nextStart !== start || nextEnd !== end) onRange(nextStart, nextEnd); }
    else { if (nextStart !== start) onStart(nextStart); if (nextEnd !== end) onEnd(nextEnd); }
  };
  return <div className="range-picker">
    {dateTime && <button type="button" className="secondary range-trigger" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
      {startLocal ? formatDate(start) : "Chọn ngày giờ"} – {endLocal ? formatDate(end) : "Chọn ngày giờ"} <span aria-hidden="true">▾</span>
    </button>}
    <div className={dateTime ? "range-popover" : undefined} hidden={dateTime && !open} role="group" aria-label={label}>
      {dateTime && <div className="range-dates">
        <label>Ngày bắt đầu<input type="date" aria-label="Ngày Bắt đầu" value={startDate} onChange={e => onStart(e.target.value ? fromLocalInput(`${e.target.value}T${startTime || "00:00"}`) : "")} /></label>
        <label>Ngày kết thúc<input type="date" aria-label="Ngày Kết thúc" value={endDate} onChange={e => onEnd(e.target.value ? fromLocalInput(`${e.target.value}T${endTime || "00:00"}`) : "")} /></label>
      </div>}
      <SegmentedTimeRange start={startTime} end={endTime} label={label} onChange={setTimes} />
      {dateTime && <button type="button" className="secondary" onClick={() => setOpen(false)}>Xong</button>}
    </div>
    {error && <p role="alert" className="field-error">{error}</p>}
  </div>;
}
