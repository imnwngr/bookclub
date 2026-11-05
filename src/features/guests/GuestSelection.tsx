import type { Guest } from "../../types/domain";
export function GuestSelection({
  guests,
  selected,
  onChange,
}: {
  guests: Guest[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const visible = guests.filter((g) => g.active || selected.includes(g.id));
  return (
    <fieldset>
      <legend>Khách mời của sự kiện</legend>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onChange([
              ...new Set([
                ...selected,
                ...guests.filter((g) => g.active).map((g) => g.id),
              ]),
            ])
          }
        >
          Chọn tất cả
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onChange([])}
        >
          Bỏ chọn tất cả
        </button>
        <span aria-live="polite">Đã chọn {selected.length} khách mời</span>
      </div>
      <div className="guest-selection">
        {visible.map((g) => (
          <label className="check-row" key={g.id}>
            <input
              type="checkbox"
              checked={selected.includes(g.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, g.id]
                    : selected.filter((id) => id !== g.id),
                )
              }
            />
            <span>
              <strong>
                {g.salutation} {g.name}
              </strong>
              <small>{!g.active && " (Ngừng hoạt động)"}</small>
            </span>
          </label>
        ))}
      </div>
      {!visible.length && <p>Danh bạ chưa có khách mời hoạt động.</p>}
    </fieldset>
  );
}
