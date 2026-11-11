import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { AgendaIcon } from "./AgendaIcon";
import { agendaIcons, canonicalAgendaIcon } from "../lib/agendaIcons";
import type { AgendaItem } from "../types/domain";
import { Switch } from "./Switch";
import { RangePicker } from "./RangePicker";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Row = { id: string; item: AgendaItem };
function Item({
  row,
  index,
  count,
  reduced,
  onChange,
  onDelete,
  onMove,
}: {
  row: Row;
  index: number;
  count: number;
  reduced: boolean;
  onChange: (v: Partial<AgendaItem>) => void;
  onDelete: () => void;
  onMove: (direction: number) => void;
}) {
  const { item } = row;
  const [icons, setIcons] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    transition: { duration: reduced ? 0 : 180, easing: "ease-out" },
  });
  const closeIcons = () => {
    setIcons(false);
    trigger.current?.focus();
  };
  return (
    <div
      ref={setNodeRef}
      data-agenda-id={row.id}
      className={`panel agenda-card ${isDragging ? "is-dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: reduced ? "none" : transition,
      }}
    >
      <div className="agenda-card-head">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="directory-icon directory-grip"
          {...attributes}
          {...listeners}
          aria-label={`Kéo sắp xếp mốc ${index + 1}`}
        >
          <GripVertical size={18} aria-hidden="true" />
        </button>
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
        onRange={(time, end_time) => onChange({ time, end_time })}
        error={
          item.end_time && item.end_time <= item.time
            ? "Giờ kết thúc phải sau giờ bắt đầu."
            : undefined
        }
      />
      <div className="agenda-content-row">
        <div className="agenda-icon-control">
          <button
            ref={trigger}
            type="button"
            className="secondary agenda-icon-button"
            aria-label={`Chọn icon mốc ${index + 1}`}
            aria-expanded={icons}
            onClick={() => setIcons(!icons)}
          >
            <AgendaIcon name={item.icon} />
            <span aria-hidden="true">▾</span>
          </button>
          {icons && (
            <div
              className="icon-popover"
              role="group"
              aria-label={`Icon mốc ${index + 1}`}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  closeIcons();
                }
              }}
            >
              <div className="icon-grid">
                {Object.entries(agendaIcons).map(([name, icon]) => (
                  <button
                    type="button"
                    key={name}
                    aria-pressed={canonicalAgendaIcon(item.icon) === name}
                    aria-label={`Mốc ${index + 1}: ${icon.label}`}
                    title={icon.label}
                    onClick={() => {
                      onChange({ icon: name });
                      closeIcons();
                    }}
                  >
                    <AgendaIcon name={name} />
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
      <div className="agenda-sort-actions">
        <button
          type="button"
          className="secondary"
          disabled={index === 0}
          aria-label={`Đưa mốc ${index + 1} lên`}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={14} aria-hidden="true" />
          Lên
        </button>
        <button
          type="button"
          className="secondary"
          disabled={index === count - 1}
          aria-label={`Đưa mốc ${index + 1} xuống`}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={14} aria-hidden="true" />
          Xuống
        </button>
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
  const [state, setState] = useState<{ source: AgendaItem[]; rows: Row[] }>(
    () => ({
      source: items,
      rows: items.map((item) => ({ id: crypto.randomUUID(), item })),
    }),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reduced = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  let rows = state.rows;
  if (state.source !== items) {
    const used = new Set<string>();
    rows = items.map((item, index) => {
      // React Hook Form clones values; reconcile those copies without remounting focused controls.
      const match =
        state.rows.find(
          (row) =>
            !used.has(row.id) &&
            (row.item === item ||
              JSON.stringify(row.item) === JSON.stringify(item)),
        ) ??
        (items.length === state.rows.length && !used.has(state.rows[index]?.id)
          ? state.rows[index]
          : undefined);
      const id = match?.id ?? crypto.randomUUID();
      used.add(id);
      return { id, item };
    });
    setState({ source: items, rows });
  }
  function publish(next: Row[]) {
    const source = next.map((row) => row.item);
    setState({ source, rows: next });
    onChange(source);
  }
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= rows.length) return;
    publish(arrayMove(rows, from, to));
    setAnnouncement(`Đã chuyển mốc ${from + 1} đến vị trí ${to + 1}.`);
  }
  const dragged = rows.find((row) => row.id === dragId);
  return (
    <fieldset id="editor-agenda">
      <legend>Kịch bản chương trình họp mặt</legend>
      <p className="field-hint">
        Kéo tay nắm hoặc dùng nút Lên / Xuống để sắp xếp. Thiệp hiển thị theo
        giờ; thứ tự này áp dụng cho các mốc cùng giờ.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setDragId(String(active.id))}
        onDragCancel={() => setDragId(null)}
        onDragEnd={({ active, over }) => {
          setDragId(null);
          if (over)
            move(
              rows.findIndex((row) => row.id === active.id),
              rows.findIndex((row) => row.id === over.id),
            );
        }}
      >
        <SortableContext
          items={rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <div>
            {rows.map((row, index) => (
              <Item
                key={row.id}
                row={row}
                index={index}
                count={rows.length}
                reduced={reduced}
                onChange={(patch) =>
                  publish(
                    rows.map((value) =>
                      value.id === row.id
                        ? { ...value, item: { ...value.item, ...patch } }
                        : value,
                    ),
                  )
                }
                onDelete={() => {
                  publish(rows.filter((value) => value.id !== row.id));
                  setAnnouncement(`Đã xóa mốc ${index + 1}.`);
                }}
                onMove={(direction) => move(index, index + direction)}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={reduced ? null : undefined}>
          {dragged && (
            <div className="agenda-drag-preview" aria-hidden="true">
              <strong>
                {dragged.item.time}
                {dragged.item.end_time ? ` – ${dragged.item.end_time}` : ""}
              </strong>
              <p>{dragged.item.description || "Mốc chương trình"}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            publish([
              ...rows,
              {
                id: crypto.randomUUID(),
                item: {
                  time: "08:00",
                  end_time: "08:30",
                  icon: "book",
                  description: "",
                  highlight: false,
                },
              },
            ])
          }
        >
          Thêm mốc thời gian
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            publish(
              [...rows].sort((a, b) => a.item.time.localeCompare(b.item.time)),
            );
            setAnnouncement("Đã sắp xếp chương trình theo giờ.");
          }}
        >
          Sắp xếp theo giờ
        </button>
      </div>
    </fieldset>
  );
}
