import { GuestDescription } from "../components/GuestDescription";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listGuests, saveGuest, setGuestActive } from "../features/events/api";
import type { Guest } from "../types/domain";
import { aliasSchema, guestAlias } from "../lib/domain";
import { errorMessage } from "../lib/supabase";
import { ErrorState, Loading } from "../components/Feedback";
import { Switch } from "../components/Switch";
const blank: Omit<Guest, "id"> = {
  salutation: "",
  name: "",
  description: "",
  kind: "individual",
  active: true,
  primary_alias: "",
};
export default function GuestDirectory() {
  const query = useQuery({ queryKey: ["guests"], queryFn: listGuests }),
    cache = useQueryClient();
  const [editing, setEditing] = useState<Guest | Omit<Guest, "id">>(blank);
  const [busy, setBusy] = useState(false);
  const locked = useRef(new Set<string>());
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const update = (value: Partial<Guest>) =>
    setEditing((v) => ({ ...v, ...value }));
  const toggle = async (g: Guest, value: boolean) => {
    if (locked.current.has(g.id)) return;
    locked.current.add(g.id);
    setPending((v) => ({ ...v, [g.id]: true }));
    setOptimistic((v) => ({ ...v, [g.id]: value }));
    try {
      await setGuestActive(g.id, value);
      cache.setQueryData<Guest[]>(["guests"], (rows) =>
        rows?.map((r) => (r.id === g.id ? { ...r, active: value } : r)),
      );
      setEditing((v) =>
        "id" in v && v.id === g.id ? { ...v, active: value } : v,
      );
      toast.success("Đã lưu trạng thái khách mời");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      locked.current.delete(g.id);
      setPending((v) => ({ ...v, [g.id]: false }));
      setOptimistic((v) => {
        const next = { ...v };
        delete next[g.id];
        return next;
      });
    }
  };
  return (
    <section className="admin">
      <Link to="/admin/">Về quản trị sự kiện</Link>
      <h1>Danh bạ khách mời</h1>
      <p>
        Cập nhật danh bạ không thay đổi snapshot hay alias của thiệp lịch sử.
      </p>
      <div className="directory-layout">
        <div>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorState error={query.error} />
          ) : (
            query.data?.map((g) => (
              <article
                className={`panel ${"id" in editing && editing.id === g.id ? "guest-editing" : ""}`}
                key={g.id}
              >
                {"id" in editing && editing.id === g.id && (
                  <strong>Đang chỉnh sửa</strong>
                )}
                <h2>
                  {g.salutation} {g.name}
                </h2>
                <GuestDescription value={g.description} />
                <Switch
                  checked={optimistic[g.id] ?? g.active}
                  disabled={pending[g.id]}
                  label={
                    pending[g.id]
                      ? "Đang lưu…"
                      : (optimistic[g.id] ?? g.active)
                        ? "Đang hoạt động"
                        : "Ngừng hoạt động"
                  }
                  onChange={(value) => void toggle(g, value)}
                />
                <button
                  type="button"
                  className="secondary"
                  disabled={pending[g.id]}
                  onClick={() =>
                    setEditing({
                      ...g,
                      primary_alias: g.primary_alias ?? guestAlias(g.name),
                    })
                  }
                >
                  Chỉnh sửa khách mời
                </button>
              </article>
            ))
          )}
        </div>
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const primary = editing.primary_alias || guestAlias(editing.name);
            if (!aliasSchema.safeParse(primary).success) {
              toast.error("Alias chính không hợp lệ.");
              return;
            }
            setBusy(true);
            try {
              await saveGuest(
                {
                  ...editing,
                  name: editing.name.trim(),
                  primary_alias: primary,
                },
                "id" in editing ? editing.id : undefined,
              );
              await cache.invalidateQueries({ queryKey: ["guests"] });
              toast.success("Đã lưu khách mời");
              setEditing(blank);
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>
            {"id" in editing
              ? `Đang chỉnh sửa: ${editing.name}`
              : "Khách mời mới"}
          </h2>
          <label>
            Danh xưng
            <input
              value={editing.salutation}
              maxLength={80}
              onChange={(e) => update({ salutation: e.target.value })}
            />
          </label>
          <label>
            Họ tên hoặc tên nhóm *
            <input
              value={editing.name}
              required
              maxLength={240}
              onChange={(e) => update({ name: e.target.value })}
            />
          </label>
          <label>
            Chức vụ / mô tả
            <textarea
              value={editing.description}
              maxLength={3000}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <label>
            Loại
            <select
              value={editing.kind}
              onChange={(e) =>
                update({ kind: e.target.value as Guest["kind"] })
              }
            >
              <option value="individual">Cá nhân</option>
              <option value="group">Nhóm</option>
            </select>
          </label>
          <label>
            Alias chính
            <input
              value={editing.primary_alias ?? ""}
              onChange={(e) => update({ primary_alias: e.target.value })}
              placeholder={guestAlias(editing.name)}
            />
            <small>
              Để trống để tạo từ họ tên khi lưu. Alias thiệp cũ không thay đổi.
            </small>
          </label>
          <div className="actions">
            <button disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu khách mời"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(blank)}
            >
              Khách mời mới
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
