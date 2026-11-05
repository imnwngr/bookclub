export function Time24({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (v: string) => void;
}) {
  const [hour = "00", minute = "00"] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value.split(":")
    : ["00", "00"];
  return (
    <div>
      <label>
        {label}
        <input
          value={value}
          placeholder="08:00"
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <div className="filters">
        <label>
          Chọn giờ
          <select
            aria-label={`Chọn giờ ${label}`}
            value={hour}
            onChange={(e) => onChange(`${e.target.value}:${minute}`)}
          >
            {Array.from({ length: 24 }, (_, i) =>
              String(i).padStart(2, "0"),
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Chọn phút
          <select
            aria-label={`Chọn phút ${label}`}
            value={minute}
            onChange={(e) => onChange(`${hour}:${e.target.value}`)}
          >
            {Array.from({ length: 60 }, (_, i) =>
              String(i).padStart(2, "0"),
            ).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
