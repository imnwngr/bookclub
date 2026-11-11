import type { Guest } from "../../types/domain";
import { useState } from "react";
export function GuestSelection({
  guests,
  selected,
  onChange,
}: {
  guests: Guest[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const available = guests.filter((g) => g.active || selected.includes(g.id));
  const visible = available.filter((g) =>
    `${g.salutation} ${g.name}`
      .toLocaleLowerCase("vi")
      .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <fieldset id="editor-guests">
      <legend>Khách mời của sự kiện</legend>
      <label>
        Tìm khách mời
        <input
          type="search"
          placeholder="Tên khách mời hoặc nhóm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
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
      {!visible.length && (
        <p>
          {search
            ? "Không có khách mời phù hợp với từ khóa."
            : "Danh bạ chưa có khách mời hoạt động."}
        </p>
      )}
    </fieldset>
  );
}
