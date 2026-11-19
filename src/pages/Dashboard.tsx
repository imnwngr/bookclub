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
  eventListDate,
  orderEvents,
  typeLabel,
} from "../lib/domain";
import { errorMessage } from "../lib/supabase";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { EventFilters } from "../components/EventFilters";
import { Confirm } from "../components/Confirm";
import type { ClubEvent } from "../types/domain";
import { Plus, ArrowUpRight, CalendarDays } from "lucide-react";
import { useClock } from "../hooks/useClock";
export default function Dashboard() {
  const now = useClock();
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
  const filtered = orderEvents(
    filterEvents(events, month, year, search),
    now,
  ).filter((e) => !status || e.status === status);
  return (
    <section className="admin">
      <div className="section-head">
        <div>
          <p className="section-label">Sự kiện Hội Sinh viên CTUT</p>
          <h1>Quản lý sự kiện</h1>
        </div>
        <div className="actions">
          <Link className="button" to="/admin/new">
            <Plus size={18} aria-hidden="true" /> Thêm sự kiện
          </Link>
        </div>
      </div>
      {query.data && !query.error && (
        <dl className="dashboard-overview">
          <div>
            <dt>Tổng sự kiện</dt>
            <dd>{events.length}</dd>
          </div>
          <div>
            <dt>Đã công bố</dt>
            <dd>{events.filter((e) => e.status === "published").length}</dd>
          </div>
          <div>
            <dt>Bản nháp</dt>
            <dd>{events.filter((e) => e.status === "draft").length}</dd>
          </div>
          <div>
            <dt>Sắp diễn ra</dt>
            <dd>
              {
                events.filter(
                  (e) =>
                    e.status === "published" &&
                    e.event_type !== "congratulation" &&
                    !!e.starts_at &&
                    Date.parse(e.starts_at) > now,
                ).length
              }
            </dd>
          </div>
        </dl>
      )}
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
          years={[...new Set(events.map((e) => eventYear(eventListDate(e))))]
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
      <p className="field-hint">
        Lọc theo ngày diễn ra của Thiệp mời và ngày tạo của Thiệp chúc.
      </p>
      {!query.isPending && !query.error && (
        <p className="result-count" role="status">
          {filtered.length} sự kiện trong danh sách
        </p>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : !filtered.length ? (
        <Empty>Không có sự kiện phù hợp.</Empty>
      ) : (
        <div className="admin-list">
          {filtered.map((event) => (
            <article className="panel admin-event" key={event.id}>
              <div className="admin-event-heading">
                <span className={`status ${event.status}`}>
                  {event.status === "published" ? "Đã công bố" : "Bản nháp"}
                </span>
                <span className="event-code">{event.code}</span>
                <span>{typeLabel(event.event_type)}</span>
              </div>
              <h2 className="event-title">{event.title}</h2>
              <p>
                <CalendarDays size={16} aria-hidden="true" />
                {event.event_type === "congratulation" ? "Ngày tạo: " : ""}
                {formatDate(eventListDate(event))}
              </p>
              <div className="actions">
                <Link
                  className="button secondary"
                  to={`/admin/edit/${event.code}`}
                >
                  Chỉnh sửa & thiệp{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <button
                  className="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(
                        invitationUrl(event.code, undefined, event.event_type),
                      )
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
          Sự kiện “<span className="event-title">{deleting.title}</span>” và
          thiệp liên quan sẽ bị xóa. Danh bạ khách mời được giữ lại.
        </Confirm>
      )}
    </section>
  );
}
