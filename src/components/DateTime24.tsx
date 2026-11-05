import { fromLocalInput, toLocalInput } from "../lib/domain";
export function DateTime24({
  value,
  onChange,
  label,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  error?: string;
}) {
  const valid = Number.isFinite(Date.parse(value));
  const local = valid ? toLocalInput(value) : value;
  const [date = "", time = "00:00"] = local.split("T");
  const [hour = "00", minute = "00"] = time.split(":");
  const update = (d: string, h: string, m: string) =>
    onChange(d ? fromLocalInput(`${d}T${h}:${m}`) : `T${h}:${m}`);
  return (
    <fieldset className="datetime24">
      <legend>{label}</legend>
      <label>
        Ngày {label}
        <input
          type="date"
          aria-label={`Ngày ${label}`}
          value={date}
          onChange={(e) => update(e.target.value, hour, minute)}
        />
      </label>
      <div className="filters">
        <label>
          Giờ {label}
          <select
            aria-label={`Giờ ${label}`}
            value={hour}
            onChange={(e) => update(date, e.target.value, minute)}
          >
            {Array.from({ length: 24 }, (_, i) =>
              String(i).padStart(2, "0"),
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Phút {label}
          <select
            aria-label={`Phút ${label}`}
            value={minute}
            onChange={(e) => update(date, hour, e.target.value)}
          >
            {Array.from({ length: 60 }, (_, i) =>
              String(i).padStart(2, "0"),
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
