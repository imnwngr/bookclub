import { AgendaIcon, agendaIcons } from "./AgendaIcon";
import type { AgendaItem } from "../types/domain";
import { Switch } from "./Switch";
import { RangePicker } from "./RangePicker";
import { useState } from "react";
function Item({
  item,
  index,
  onChange,
  onDelete,
}: {
  item: AgendaItem;
  index: number;
  onChange: (v: Partial<AgendaItem>) => void;
  onDelete: () => void;
}) {
  const [icons, setIcons] = useState(false);
  return (
    <div className="panel agenda-card">
      <div className="agenda-card-head">
        <h3>Giờ mốc {index + 1}</h3>
        <Switch
          label="Nội dung trọng tâm"
          checked={item.highlight}
          onChange={(highlight) => onChange({ highlight })}
        />
        <button
          type="button"
          className="danger-text agenda-delete"
          aria-label={`Xóa mốc ${index + 1}`}
          onClick={onDelete}
        >
          ×
        </button>
      </div>
      <RangePicker
        label={`Khoảng giờ mốc ${index + 1}`}
        start={item.time}
        end={item.end_time ?? ""}
        onStart={(time) => onChange({ time })}
        onEnd={(end_time) => onChange({ end_time })}
      />
      <div className="agenda-content-row">
        <div className="agenda-icon-control">
          <button
            type="button"
            className="secondary agenda-icon-button"
            aria-label={`Chọn icon mốc ${index + 1}`}
            aria-expanded={icons}
            onClick={() => setIcons(!icons)}
          >
            <AgendaIcon name={item.icon} /> ▾
          </button>
          {icons && (
            <div
              className="icon-popover"
              role="group"
              aria-label={`Icon mốc ${index + 1}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIcons(false);
              }}
            >
              <div className="icon-grid">
                {Object.entries(agendaIcons).map(([name, icon]) => (
                  <button
                    type="button"
                    key={name}
                    aria-pressed={(item.icon ?? "book") === name}
                    aria-label={`Mốc ${index + 1}: ${icon.label}`}
                    onClick={() => {
                      onChange({ icon: name });
                      setIcons(false);
                    }}
                  >
                    <AgendaIcon name={name} />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <textarea
          aria-label={`Nội dung mốc ${index + 1}`}
          placeholder={`Nội dung mốc ${index + 1}`}
          value={item.description}
          maxLength={1000}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}
export function AgendaEditor({
  items,
  onChange,
}: {
  items: AgendaItem[];
  onChange: (v: AgendaItem[]) => void;
}) {
  return (
    <fieldset>
      <legend>Kịch bản chương trình họp mặt</legend>
      {items.map((item, i) => (
        <Item
          key={i}
          item={item}
          index={i}
          onChange={(v) =>
            onChange(items.map((x, n) => (n === i ? { ...x, ...v } : x)))
          }
          onDelete={() => onChange(items.filter((_, n) => n !== i))}
        />
      ))}
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onChange([
              ...items,
              {
                time: "08:00",
                end_time: "08:30",
                icon: "book",
                description: "",
                highlight: false,
              },
            ])
          }
        >
          Thêm mốc thời gian
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onChange([...items].sort((a, b) => a.time.localeCompare(b.time)))
          }
        >
          Sắp xếp theo giờ
        </button>
      </div>
    </fieldset>
  );
}
