import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, SquarePen } from "lucide-react";
import { GuestDescription } from "../../components/GuestDescription";
import { Switch } from "../../components/Switch";
import type { Guest } from "../../types/domain";

type RowProps = { guest: Guest; mode: "compact" | "full"; selected: boolean; pending: boolean; active: boolean; enabled: boolean; reducedMotion: boolean; onChoose: (guest: Guest) => void; onToggle: (guest: Guest, active: boolean) => void };
function SortableGuest({ guest, mode, selected, pending, active, enabled, reducedMotion, onChoose, onToggle }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: guest.id, disabled: !enabled, transition: { duration: 180, easing: "ease" } });
  return <article ref={setNodeRef} data-guest-row={guest.id} className={`directory-row ${selected ? "is-selected" : ""} ${isDragging ? "is-placeholder" : ""}`}
    style={{ transform: CSS.Transform.toString(transform), transition: reducedMotion ? "none" : transition }}>
    <button ref={setActivatorNodeRef} type="button" className="directory-icon directory-grip" disabled={!enabled} {...attributes} {...listeners}
      aria-label={`Sắp xếp ${guest.salutation} ${guest.name}`} title={enabled ? "Kéo để sắp xếp" : "Cần cập nhật database để sắp xếp"}>
      <GripVertical size={20} aria-hidden="true" />
    </button>
    <div className="directory-row-info"><strong>{[guest.salutation, guest.name].filter(Boolean).join(" ")}</strong>{selected && <span className="directory-selected">Đang chỉnh sửa</span>}{mode === "full" && <GuestDescription value={guest.description} />}</div>
    <Switch compact checked={active} disabled={pending} label={`${pending ? "Đang lưu" : active ? "Đang hoạt động" : "Ngừng hoạt động"}: ${guest.name}`} onChange={value => onToggle(guest,value)} />
    <button type="button" className="directory-icon" aria-label={`Chỉnh sửa khách mời ${guest.name}`} title={`Chỉnh sửa ${guest.name}`} onClick={() => onChoose(guest)}><SquarePen size={19} aria-hidden="true" /></button>
  </article>;
}

export function GuestDirectoryList({ guests, mode, selectedId, pending, optimistic, reorderEnabled, onChoose, onToggle, onReorder }: {
  guests: Guest[]; mode: "compact" | "full"; selectedId?: string; pending: Record<string, boolean>; optimistic: Record<string, boolean>;
  reorderEnabled: boolean; onChoose: (guest: Guest) => void; onToggle: (guest: Guest, active: boolean) => void; onReorder: (guests: Guest[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number>();
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches); update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const activeGuest = guests.find(g => g.id === dragId);
  const finish = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    if (!reorderEnabled || !over || active.id === over.id) return;
    const from = guests.findIndex(g => g.id === active.id), to = guests.findIndex(g => g.id === over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(guests, from, to));
  };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll onDragStart={({ active }) => { setDragId(String(active.id)); setDragWidth(active.rect.current.initial?.width); }} onDragCancel={() => setDragId(null)} onDragEnd={finish}>
    <SortableContext items={guests.map(g => g.id)} strategy={verticalListSortingStrategy}>
      <div className="directory-rows">{guests.map(g => <SortableGuest key={g.id} guest={g} mode={mode} selected={selectedId === g.id} pending={!!pending[g.id]} active={optimistic[g.id] ?? g.active} enabled={reorderEnabled} reducedMotion={reducedMotion} onChoose={onChoose} onToggle={onToggle} />)}</div>
    </SortableContext>
    {createPortal(<DragOverlay zIndex={150} dropAnimation={reducedMotion ? null : undefined}>
      {activeGuest && <div className="directory-row directory-drag-overlay" style={{ width: dragWidth }} aria-hidden="true">
        <span className="directory-icon"><GripVertical size={20} /></span>
        <div className="directory-row-info"><strong>{[activeGuest.salutation,activeGuest.name].filter(Boolean).join(" ")}</strong>{mode === "full" && <GuestDescription value={activeGuest.description} />}</div>
        <span className={`switch-track ${optimistic[activeGuest.id] ?? activeGuest.active ? "overlay-on" : ""}`}><span /></span>
        <span className="directory-icon"><SquarePen size={19} /></span>
      </div>}
    </DragOverlay>, document.body)}
  </DndContext>;
}
