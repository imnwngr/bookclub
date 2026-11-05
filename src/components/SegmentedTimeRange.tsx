import { useRef, useState } from "react";

const validTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function SegmentedTimeRange({ start, end, onChange, label }: {
  start: string; end: string; onChange: (start: string, end: string) => void; label: string;
}) {
  const parts = (a: string, b: string) => [...(a || ":").split(":"), ...(b || ":").split(":")];
  const [draft, setDraft] = useState(() => parts(start, end));
  const [touched, setTouched] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const display = touched ? draft : parts(start, end);
  const startTime = `${display[0]}:${display[1]}`;
  const endTime = `${display[2]}:${display[3]}`;
  const invalid = touched && (!validTime(startTime) || !validTime(endTime));
  const focus = (index: number) => { refs.current[index]?.focus(); refs.current[index]?.select(); };
  const update = (values: string[]) => {
    setDraft(values);
    setTouched(true);
  };
  return <div className="segmented-time-wrap">
    <div className="segmented-time" role="group" aria-label={label} data-time-invalid={invalid || undefined}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        if (!touched) return;
        if (validTime(startTime) && validTime(endTime)) { onChange(startTime, endTime); setTouched(false); }
      }}
      onPaste={(event) => {
        const match = event.clipboardData.getData("text").trim().match(/^(\d{2}):(\d{2})\s*[-–—]\s*(\d{2}):(\d{2})$/);
        if (!match) return;
        event.preventDefault();
        const values = match.slice(1);
        update(values);
        if (validTime(`${values[0]}:${values[1]}`) && validTime(`${values[2]}:${values[3]}`)) onChange(`${values[0]}:${values[1]}`, `${values[2]}:${values[3]}`);
      }}>
      {display.map((value, index) => <span className="time-segment" key={index}>
        {index === 1 || index === 3 ? <span aria-hidden="true">:</span> : index === 2 ? <span aria-hidden="true">–</span> : null}
        <input ref={(node) => { refs.current[index] = node; }} type="text" inputMode="numeric" autoComplete="off" maxLength={2}
          aria-label={`${index < 2 ? "Bắt đầu" : "Kết thúc"} ${index % 2 ? "phút" : "giờ"} ${label}`}
          aria-invalid={invalid} placeholder="--" value={value ?? ""} onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, 2);
            const values = [...display]; values[index] = next; update(values);
            if (next.length === 2 && Number(next) <= (index % 2 ? 59 : 23) && index < 3) focus(index + 1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); focus(index - 1); }
            if (event.key === "ArrowRight" && index < 3) { event.preventDefault(); focus(index + 1); }
            if (event.key === "Backspace" && !value && index > 0) { event.preventDefault(); focus(index - 1); }
          }} />
      </span>)}
    </div>
    {invalid && <p role="alert" className="field-error">Nhập đủ giờ 00–23 và phút 00–59.</p>}
  </div>;
}
