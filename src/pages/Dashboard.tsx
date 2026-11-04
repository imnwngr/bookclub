import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listEvents, deleteEvent } from "../features/events/api";
import {
  eventYear,
  filterEvents,
  formatDate,
  invitationUrl,
} from "../lib/domain";
import { db, errorMessage } from "../lib/supabase";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { EventFilters } from "../components/EventFilters";
import { Confirm } from "../components/Confirm";
import type { ClubEvent } from "../types/domain";
export default function Dashboard() {
  const query = useQuery({
    queryKey: ["events", "admin"],
    queryFn: () => listEvents(true),
  });
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState<ClubEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const events = query.data ?? [];
  const filtered = filterEvents(events, month, year, search).filter(
    (e) => !status || e.status === status,
  );
  return (
    <section className="admin">
      <div className="section-head">
        <div>
          <p className="section-label">Không gian quản trị</p>
          <h1>Quản lý sự kiện</h1>
        </div>
        <div className="actions">
          <Link className="button" to="/admin/new">
            Thêm sự kiện
          </Link>
          <Link className="button secondary" to="/admin/guests">
            Danh bạ khách mời
          </Link>
          <button
            className="secondary"
            onClick={async () => {
              const { error } = await db().auth.signOut();
              if (error) toast.error(errorMessage(error));
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
      <div className="toolbar">
        <label>
          Tìm sự kiện
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên hoặc mã sự kiện"
          />
        </label>
        <EventFilters
          month={month}
          year={year}
          setMonth={setMonth}
          setYear={setYear}
          years={[...new Set(events.map((e) => eventYear(e.starts_at)))]
            .sort()
            .reverse()}
        />
        <label>
          Công bố
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã công bố</option>
          </select>
        </label>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !filtered.length ? (
        <Empty>Không có sự kiện phù hợp.</Empty>
      ) : (
        <div className="admin-list">
          {filtered.map((event) => (
            <article className="panel" key={event.id}>
              <span className="status">
                {event.status === "published" ? "Đã công bố" : "Bản nháp"}
              </span>
              <h2>{event.title}</h2>
              <p>
                {event.code} · {formatDate(event.starts_at)}
              </p>
              <div className="actions">
                <Link
                  className="button secondary"
                  to={`/admin/edit/${event.code}`}
                >
                  Chỉnh sửa & thiệp mời
                </Link>
                <button
                  className="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(invitationUrl(event.code))
                      .then(
                        () => toast.success("Đã sao chép liên kết"),
                        () => toast.error("Không thể truy cập clipboard"),
                      )
                  }
                >
                  Sao chép link
                </button>
                <button
                  className="danger-text"
                  onClick={() => setDeleting(event)}
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {deleting && (
        <Confirm
          title="Xóa sự kiện?"
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await deleteEvent(deleting.id);
              await cache.invalidateQueries();
              toast.success("Đã xóa sự kiện");
              setDeleting(null);
            } catch (error) {
              toast.error(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          Sự kiện “{deleting.title}” và thiệp liên quan sẽ bị xóa. Danh bạ khách
          mời được giữ lại.
        </Confirm>
      )}
    </section>
  );
}
