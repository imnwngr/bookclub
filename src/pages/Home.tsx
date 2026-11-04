import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listEvents } from "../features/events/api";
import {
  eventStatus,
  eventYear,
  filterEvents,
  formatDate,
  orderEvents,
  statusLabels,
} from "../lib/domain";
import { useClock } from "../hooks/useClock";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { EventFilters } from "../components/EventFilters";
export default function Home() {
  const query = useQuery({
    queryKey: ["events", "public"],
    queryFn: () => listEvents(),
  });
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [limit, setLimit] = useState(10);
  const now = useClock();
  const events = query.data ?? [];
  const filtered = orderEvents(filterEvents(events, month, year), now);
  const years = [...new Set(events.map((e) => eventYear(e.starts_at)))]
    .sort()
    .reverse();
  return (
    <>
      <section className="intro">
        <p className="section-label">
          Câu lạc bộ Sinh viên Yêu thích Sách · CTUT
        </p>
        <h1>
          Hẹn nhau
          <br />
          <em>giữa những trang sách.</em>
        </h1>
        <p>
          Lịch sự kiện, những cuộc gặp gỡ và hoạt động của BookClub tại Trường
          Đại học Kỹ thuật – Công nghệ Cần Thơ.
        </p>
      </section>
      <section className="listing" aria-labelledby="events-title">
        <div className="section-head">
          <div>
            <p className="section-label">Cùng BookClub</p>
            <h2 id="events-title">Sự kiện & gặp gỡ</h2>
          </div>
          <EventFilters
            month={month}
            year={year}
            setMonth={(v) => {
              setMonth(v);
              setLimit(10);
            }}
            setYear={(v) => {
              setYear(v);
              setLimit(10);
            }}
            years={years}
          />
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : !filtered.length ? (
          <Empty>
            Chưa có sự kiện trong thời gian này. Bạn có thể chọn tháng hoặc năm
            khác.
          </Empty>
        ) : (
          <>
            <div className="event-list">
              {filtered.slice(0, limit).map((e, i) => (
                <article
                  key={e.id}
                  className={`event-row ${eventStatus(e, now) !== "ended" && i === 0 ? "featured" : ""}`}
                >
                  <div className="date-block">
                    <strong>
                      {new Intl.DateTimeFormat("vi", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        day: "2-digit",
                      }).format(new Date(e.starts_at))}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat("vi", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(e.starts_at))}
                    </span>
                  </div>
                  <div>
                    <span className={`status ${eventStatus(e, now)}`}>
                      {statusLabels[eventStatus(e, now)]}
                    </span>
                    <h3>
                      <Link to={`/${e.code}`}>{e.title}</Link>
                    </h3>
                    <p>{formatDate(e.starts_at)}</p>
                    <p>
                      {e.venue_name ||
                        e.address ||
                        "Địa điểm sẽ được thông báo"}
                    </p>
                  </div>
                  <Link className="text-link" to={`/${e.code}`}>
                    Xem chi tiết<span className="sr-only"> {e.title}</span>
                  </Link>
                </article>
              ))}
            </div>
            {filtered.length > limit && (
              <button
                className="secondary load-more"
                onClick={() => setLimit((v) => v + 10)}
              >
                Xem thêm sự kiện
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}
