export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  compact = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      disabled={disabled}
      className={`switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" className="switch-track">
        <span />
      </span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
