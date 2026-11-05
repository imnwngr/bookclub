import type { ClubEvent } from "../types/domain";
import { formatDate, mapLink } from "../lib/domain";
import { VenueImage } from "./VenueImage";
export function EventInfo({ event }: { event: ClubEvent }) {
  const url = mapLink(event);
  return (
    <section>
      <h2>Thông Tin Buổi Họp Mặt</h2>
      <VenueImage path={event.venue_image_path} />
      <dl className="event-info">
        <div>
          <dt>Thời gian bắt đầu</dt>
          <dd>{formatDate(event.starts_at)}</dd>
        </div>
        <div>
          <dt>Kết thúc</dt>
          <dd>{formatDate(event.ends_at)}</dd>
        </div>
        <div>
          <dt>Địa điểm</dt>
          <dd>
            {event.venue_name || "Sẽ được thông báo"}
            {event.address && <span>{event.address}</span>}
            {event.directions && <small>{event.directions}</small>}
          </dd>
        </div>
        {url && (
          <div>
            <dt>Bản đồ</dt>
            <dd>
              <a target="_blank" rel="noopener noreferrer" href={url}>
                Xem vị trí trên Google Maps
              </a>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
