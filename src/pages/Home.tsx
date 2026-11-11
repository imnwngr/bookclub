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
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { PaperArt } from "../components/PaperArt";
import { Reveal } from "../components/Reveal";
export default function Home() {
  const query = useQuery({
    queryKey: ["events", "public"],
    queryFn: () => listEvents(),
  });
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [limit, setLimit] = useState(10);
  const now = useClock();
  const events = (query.data ?? []).filter(
    (event) => event.status === "published",
  );
  const filtered = orderEvents(filterEvents(events, month, year), now);
  const years = [...new Set(events.map((e) => eventYear(e.starts_at)))]
    .sort()
    .reverse();
  return (
    <>
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="section-label">Câu lạc bộ Sinh viên Yêu thích Sách</p>
          <h1>
            Hẹn nhau
            <br />
            <span>giữa những</span>
            <br />
            trang sách.
          </h1>
          <p className="hero-description">
            Những cuộc gặp gỡ, câu chuyện và hoạt động của BookClub tại CTUT.
          </p>
          <a className="button hero-cta" href="#events-title">
            Xem lịch sự kiện <ArrowDown size={18} aria-hidden="true" />
          </a>
        </div>
        <PaperArt />
        <div className="hero-colophon">
          <span>Đọc sách. Gặp gỡ. Sẻ chia.</span>
          <a href="#events-title" aria-label="Cuộn đến danh sách sự kiện">
            <ArrowDown size={18} />
          </a>
        </div>
      </section>
      <section className="listing" aria-labelledby="events-title">
        <div className="section-head">
          <div>
            <p className="section-label">Lịch hẹn BookClub</p>
            <h2 id="events-title" tabIndex={-1}>
              Sự kiện & gặp gỡ
            </h2>
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
        {!query.isPending && !query.error && (
          <p className="result-count" role="status">
            {filtered.length} sự kiện
            {month || year ? " phù hợp với bộ lọc" : " được công bố"}
          </p>
        )}
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
            <Reveal className="event-list" key={`${month}-${year}`}>
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
                    <h3 className="event-title">
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
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </Reveal>
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
