export function descriptionLines(value?: string) {
  return (value ?? "")
    .split(/[,\r\n]+/)
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean);
}
export function GuestDescription({ value }: { value?: string }) {
  const lines = descriptionLines(value);
  return lines.length ? (
    <span className="guest-description" role="list">
      {lines.map((line, i) => (
        <span role="listitem" key={i}>
          {line}
        </span>
      ))}
    </span>
  ) : null;
}
