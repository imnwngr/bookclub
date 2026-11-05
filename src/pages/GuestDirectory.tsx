import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listGuests, saveGuest, setGuestActive, guestOrderAvailable, reorderGuests } from "../features/events/api";
import type { Guest } from "../types/domain";
import { aliasSchema, guestAlias } from "../lib/domain";
import { errorMessage } from "../lib/supabase";
import { ErrorState, Loading } from "../components/Feedback";
import { GuestDirectoryList } from "../features/guests/GuestDirectoryList";

const blank: Omit<Guest, "id"> = { salutation: "", name: "", description: "", kind: "individual", active: true, primary_alias: "" };
type Editor = Guest | Omit<Guest, "id">;
const fields = (v: Editor) => JSON.stringify([v.salutation, v.name, v.description, v.kind, v.primary_alias || ""]);

function UnsavedDialog({ onSave, onDiscard, onClose, busy }: { onSave: () => void; onDiscard: () => void; onClose: () => void; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="guest-unsaved-title">
    <h2 id="guest-unsaved-title">Thay đổi chưa được lưu</h2>
    <p>Lưu thay đổi trước khi chuyển khách mời?</p>
    <div className="actions"><button type="button" disabled={busy} onClick={onSave}>Lưu và tiếp tục</button><button type="button" className="secondary" disabled={busy} onClick={onDiscard}>Bỏ thay đổi</button><button type="button" className="secondary" disabled={busy} onClick={onClose}>Tiếp tục chỉnh sửa</button></div>
  </dialog>;
}
export default function GuestDirectory() {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["guests"], queryFn: listGuests });
  const capability = useQuery({ queryKey: ["guest-order-available"], queryFn: guestOrderAvailable, retry: false });
  const [editing, setEditing] = useState<Editor>(blank), [baseline, setBaseline] = useState<Editor>(blank);
  const [busy, setBusy] = useState(false), [reordering, setReordering] = useState(false);
  const [mode, setMode] = useState<"full" | "compact">("compact");
  const [drawer, setDrawer] = useState(false), [next, setNext] = useState<Guest | "new" | null>(null);
  const locked = useRef(new Set<string>());
  const [pending, setPending] = useState<Record<string, boolean>>({}), [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const dirty = fields(editing) !== fields(baseline);
  const update = (value: Partial<Guest>) => setEditing(v => ({ ...v, ...value }));
  const choose = (target: Guest | "new") => {
    if (dirty && (target === "new" || !("id" in editing) || editing.id !== target.id)) { setNext(target); return; }
    if (target !== "new" && "id" in editing && editing.id === target.id) { setDrawer(false); return; }
    const value = target === "new" ? blank : { ...target, primary_alias: target.primary_alias ?? guestAlias(target.name) };
    setEditing(value); setBaseline(value); setDrawer(false);
  };
  const save = async () => {
    const primary = editing.primary_alias || guestAlias(editing.name);
    if (!editing.name.trim()) { toast.error("Vui lòng nhập tên khách mời."); return false; }
    if (!aliasSchema.safeParse(primary).success) { toast.error("Alias chính không hợp lệ."); return false; }
    const value = { ...editing, name: editing.name.trim(), primary_alias: primary };
    const { salutation, name, description, kind, active, primary_alias } = value;
    setBusy(true);
    try {
      await saveGuest({ salutation, name, description, kind, active, primary_alias }, "id" in value ? value.id : undefined);
      if ("id" in value) {
        cache.setQueryData<Guest[]>(["guests"], rows => rows?.map(r => r.id === value.id ? { ...r, salutation, name, description, kind, primary_alias } : r));
        setEditing(value); setBaseline(value);
      } else { await cache.invalidateQueries({ queryKey: ["guests"] }); setEditing(blank); setBaseline(blank); }
      toast.success("Đã lưu khách mời"); return true;
    } catch (e) { toast.error(errorMessage(e)); return false; }
    finally { setBusy(false); }
  };
  const toggle = async (g: Guest, value: boolean) => {
    if (locked.current.has(g.id)) return;
    locked.current.add(g.id); setPending(v => ({ ...v, [g.id]: true })); setOptimistic(v => ({ ...v, [g.id]: value }));
    try {
      await setGuestActive(g.id, value);
      cache.setQueryData<Guest[]>(["guests"], rows => rows?.map(r => r.id === g.id ? { ...r, active: value } : r));
      setEditing(v => "id" in v && v.id === g.id ? { ...v, active: value } : v);
      setBaseline(v => "id" in v && v.id === g.id ? { ...v, active: value } : v);
      toast.success("Đã lưu trạng thái khách mời");
    } catch (e) { toast.error(errorMessage(e)); }
    finally { locked.current.delete(g.id); setPending(v => ({ ...v, [g.id]: false })); setOptimistic(v => { const result = { ...v }; delete result[g.id]; return result; }); }
  };
  const reorder = async (ordered: Guest[]) => {
    if (!capability.data || reordering || !query.data) return;
    const previous = query.data;
    setReordering(true); cache.setQueryData(["guests"], ordered);
    try {
      await reorderGuests(previous.map(g => g.id), ordered.map(g => g.id));
      await cache.invalidateQueries({ queryKey: ["guests"] });
      toast.success("Đã lưu thứ tự khách mời");
    } catch (e) {
      cache.setQueryData(["guests"], previous); toast.error(errorMessage(e));
      await cache.invalidateQueries({ queryKey: ["guests"] });
    } finally { setReordering(false); }
  };
  useEffect(() => {
    if (!drawer) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [drawer]);
  return <section className="admin guest-directory">
    <Link to="/admin/">Về quản trị sự kiện</Link><h1>Danh bạ khách mời</h1>
    <button type="button" className="secondary directory-open" onClick={() => setDrawer(true)}>Danh sách khách mời</button>
    <div className="directory-layout">
      {drawer && <button type="button" className="directory-backdrop" aria-label="Đóng danh sách khách mời" onClick={() => setDrawer(false)} />}
      <aside className={`directory-sidebar ${drawer ? "is-open" : ""}`} aria-label="Danh sách khách mời">
        <div className="directory-list-head"><div><h2>Danh sách khách mời</h2><span>{query.data?.length ?? 0} khách mời</span></div><button type="button" className="secondary directory-close" onClick={() => setDrawer(false)}>Đóng</button></div>
        <div className="directory-mode" role="group" aria-label="Chế độ danh sách"><button type="button" aria-pressed={mode === "full"} onClick={() => setMode("full")}>Đầy đủ</button><button type="button" aria-pressed={mode === "compact"} onClick={() => setMode("compact")}>Thu gọn</button></div>
        {!capability.isPending && !capability.data && <p className="directory-note">Sắp xếp chưa khả dụng. Kiểm tra kết nối và bản cập nhật database.</p>}
        {query.isPending ? <Loading /> : query.error ? <ErrorState error={query.error} /> : <GuestDirectoryList guests={query.data ?? []} mode={mode} selectedId={"id" in editing ? editing.id : undefined} pending={pending} optimistic={optimistic} reorderEnabled={!!capability.data && !reordering} onChoose={choose} onToggle={toggle} onReorder={reorder} />}
      </aside>
      <form className="panel directory-editor" onSubmit={e => { e.preventDefault(); void save(); }}>
        <h2>{"id" in editing ? `Đang chỉnh sửa: ${baseline.name}` : "Khách mời mới"}</h2>
        {"id" in editing && <p className="directory-editor-status">{editing.active ? "Đang hoạt động" : "Ngừng hoạt động"}</p>}
        <label>Danh xưng<input value={editing.salutation} maxLength={80} onChange={e => update({ salutation: e.target.value })} /></label>
        <label>Họ tên hoặc tên nhóm *<input value={editing.name} required maxLength={240} onChange={e => update({ name: e.target.value })} /></label>
        <label>Chức vụ / mô tả<textarea value={editing.description} maxLength={3000} onChange={e => update({ description: e.target.value })} /></label>
        <label>Loại<select value={editing.kind} onChange={e => update({ kind: e.target.value as Guest["kind"] })}><option value="individual">Cá nhân</option><option value="group">Nhóm</option></select></label>
        <label>Alias chính<input value={editing.primary_alias ?? ""} onChange={e => update({ primary_alias: e.target.value })} placeholder={guestAlias(editing.name)} /><small>Để trống để tạo từ họ tên khi lưu. Alias thiệp cũ không thay đổi.</small></label>
        <div className="actions"><button disabled={busy}>{busy ? "Đang lưu…" : "Lưu khách mời"}</button><button type="button" className="secondary" disabled={busy || !dirty} onClick={() => setEditing(baseline)}>Hủy thay đổi</button><button type="button" className="secondary" disabled={busy} onClick={() => choose("new")}>Khách mời mới</button></div>
      </form>
    </div>
    {next && <UnsavedDialog busy={busy} onClose={() => setNext(null)} onDiscard={() => { const target = next; setNext(null); const value = target === "new" ? blank : target; setEditing(value); setBaseline(value); setDrawer(false); }} onSave={() => { void (async () => { if (await save()) { const value = next === "new" ? blank : next; setEditing(value); setBaseline(value); setNext(null); setDrawer(false); } })(); }} />}
  </section>;
}
