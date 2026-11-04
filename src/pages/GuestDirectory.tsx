import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listGuests, saveGuest } from "../features/events/api";
import type { Guest } from "../types/domain";
import { aliasSchema } from "../lib/domain";
import { errorMessage } from "../lib/supabase";
import { ErrorState, Loading } from "../components/Feedback";
const blank: Omit<Guest, "id"> = {
  salutation: "",
  name: "",
  description: "",
  kind: "individual",
  active: true,
  default_aliases: [],
};
export default function GuestDirectory() {
  const query = useQuery({ queryKey: ["guests"], queryFn: listGuests });
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Guest | Omit<Guest, "id">>(blank);
  const [aliases, setAliases] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (values: Partial<Guest>) =>
    setEditing((v) => ({ ...v, ...values }));
  return (
    <section className="admin">
      <Link to="/admin/">Về quản trị sự kiện</Link>
      <h1>Danh bạ khách mời</h1>
      <p>Cập nhật danh bạ không thay đổi nội dung đã lưu trên thiệp hiện có.</p>
      <div className="directory-layout">
        <div>
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorState error={query.error} />
          ) : (
            query.data?.map((g) => (
              <article className="panel" key={g.id}>
                <h2>
                  {g.salutation} {g.name}
                </h2>
                <p>{g.description}</p>
                <p>{g.active ? "Đang hoạt động" : "Ngừng hoạt động"}</p>
                <button
                  className="secondary"
                  onClick={() => {
                    setEditing(g);
                    setAliases(g.default_aliases.join(", "));
                  }}
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
            const a = aliases
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            if (a.some((v) => !aliasSchema.safeParse(v).success)) {
              toast.error(
                "Alias chỉ gồm chữ thường không dấu, số và dấu gạch nối.",
              );
              return;
            }
            setBusy(true);
            try {
              await saveGuest(
                {
                  ...editing,
                  name: editing.name.trim(),
                  default_aliases: [...new Set(a)],
                },
                "id" in editing ? editing.id : undefined,
              );
              await cache.invalidateQueries({ queryKey: ["guests"] });
              toast.success("Đã lưu khách mời");
              setEditing(blank);
              setAliases("");
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>{"id" in editing ? "Chỉnh sửa khách mời" : "Thêm khách mời"}</h2>
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
              required
              value={editing.name}
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
            Alias gợi ý (phân cách bằng dấu phẩy)
            <input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => update({ active: e.target.checked })}
            />
            Đang hoạt động
          </label>
          <div className="actions">
            <button disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu khách mời"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setEditing(blank);
                setAliases("");
              }}
            >
              Nhập khách mới
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
