import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listEvents } from "../features/events/api";
import {
  eventStatus,
  eventPath,
  eventListDate,
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
  const years = [...new Set(events.map((e) => eventYear(eventListDate(e))))]
    .sort()
    .reverse();
  return (
    <>
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="section-label">Sự kiện Hội Sinh viên CTUT</p>
          <h1>
            Cùng nhau
            <br />
            <span>tạo nên</span>
            <br />
            dấu ấn.
          </h1>
          <p className="hero-description">
            Nền tảng sự kiện của Hội Sinh viên Trường Đại học Kỹ thuật – Công
            nghệ Cần Thơ. Theo dõi hoạt động và lưu giữ những khoảnh khắc đáng
            nhớ.
          </p>
          <a className="button hero-cta" href="#events-title">
            Xem sự kiện <ArrowDown size={18} aria-hidden="true" />
          </a>
        </div>
        <PaperArt />
        <div className="hero-colophon">
          <span>Kết nối sinh viên. Cùng nhau trưởng thành.</span>
          <a href="#events-title" aria-label="Cuộn đến danh sách sự kiện">
            <ArrowDown size={18} />
          </a>
        </div>
      </section>
      <section className="listing" aria-labelledby="events-title">
        <div className="section-head">
          <div>
            <p className="section-label">Hoạt động & dấu ấn</p>
            <h2 id="events-title" tabIndex={-1}>
              Sự kiện
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
        <p className="field-hint">
          Bộ lọc dùng ngày diễn ra với Thiệp mời, ngày tạo với Thiệp chúc.
        </p>
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
                  <div
                    className={`date-block${e.event_type === "congratulation" ? " congratulation-mark" : ""}`}
                  >
                    {e.event_type === "congratulation" ? (
                      <>
                        <strong>Chúc</strong>
                        <span>mừng</span>
                      </>
                    ) : (
                      <>
                        <strong>
                          {new Intl.DateTimeFormat("vi", {
                            timeZone: "Asia/Ho_Chi_Minh",
                            day: "2-digit",
                          }).format(new Date(eventListDate(e)))}
                        </strong>
                        <span>
                          {new Intl.DateTimeFormat("vi", {
                            timeZone: "Asia/Ho_Chi_Minh",
                            month: "long",
                            year: "numeric",
                          }).format(new Date(eventListDate(e)))}
                        </span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className={`status ${eventStatus(e, now)}`}>
                      {statusLabels[eventStatus(e, now)]}
                    </span>
                    <h3 className="event-title">
                      <Link to={eventPath(e.code, e.event_type)}>
                        {e.title}
                      </Link>
                    </h3>
                    <p>
                      {e.event_type === "congratulation" ? "Ngày tạo: " : ""}
                      {formatDate(eventListDate(e))}
                    </p>
                    {e.event_type !== "congratulation" && (
                      <p>
                        {e.venue_name ||
                          e.address ||
                          "Địa điểm sẽ được thông báo"}
                      </p>
                    )}
                  </div>
                  <Link
                    className="text-link"
                    to={eventPath(e.code, e.event_type)}
                  >
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
