export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" className="switch-track">
        <span />
      </span>
      <span>{label}</span>
    </button>
  );
}
