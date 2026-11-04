export function EventFilters({
  month,
  year,
  setMonth,
  setYear,
  years,
}: {
  month: string;
  year: string;
  setMonth: (s: string) => void;
  setYear: (s: string) => void;
  years: string[];
}) {
  return (
    <div className="filters">
      <label>
        Tháng
        <select
          aria-label="Tháng"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">Tất cả tháng</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              Tháng {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label>
        Năm
        <select
          aria-label="Năm"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">Tất cả năm</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
