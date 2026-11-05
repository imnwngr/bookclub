import type { ClubEvent } from "../types/domain";
import { formatDate, mapLink } from "../lib/domain";
export function MeetingSchedule({ event }: { event: ClubEvent }) {
  const date = new Date(event.starts_at);
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).formatToParts(date);
  const part = (t: string) => parts.find((p) => p.type === t)?.value;
  const url = mapLink(event);
  return (
    <section
      className="invitation-section meeting-schedule"
      id="invitation-schedule"
      tabIndex={-1}
    >
      <p className="section-label">Lịch hẹn của chúng ta</p>
      <h2>Thời Gian &amp; Địa Điểm Tổ Chức</h2>
      <div className="meeting-layout">
        <div
          className="meeting-calendar"
          aria-label={formatDate(event.starts_at)}
        >
          <span>{part("weekday")}</span>
          <strong>{part("day")}</strong>
          <span>
            {part("month")} · {part("year")}
          </span>
        </div>
        <div className="meeting-details">
          <p>
            <strong>Bắt đầu</strong>
            <br />
            {formatDate(event.starts_at)}
          </p>
          <p>
            <strong>Kết thúc</strong>
            <br />
            {formatDate(event.ends_at)}
          </p>
          <h3>{event.venue_name || "Địa điểm sẽ được thông báo"}</h3>
          {event.address && <p>{event.address}</p>}
          {url && (
            <a
              className="text-link"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Mở Google Maps
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
