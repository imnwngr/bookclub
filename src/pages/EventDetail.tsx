import { RichDocument } from "../components/InvitationQuoteTwo";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getEvent } from "../features/events/api";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { EventInfo } from "../components/EventInfo";
import { eventStatus, statusLabels } from "../lib/domain";
import { useClock } from "../hooks/useClock";
import { Agenda } from "../components/Agenda";
import { Reveal } from "../components/Reveal";
import { ArrowLeft } from "lucide-react";
export default function EventDetail() {
  const { eventCode = "" } = useParams();
  const now = useClock();
  const query = useQuery({
    queryKey: ["event", eventCode],
    queryFn: () => getEvent(eventCode),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const event = query.data;
  if (!event || event.status !== "published")
    return (
      <Empty>
        Sự kiện không tồn tại hoặc chưa được công bố.{" "}
        <Link to="/">Về trang chủ</Link>
      </Empty>
    );
  return (
    <article className="detail">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} aria-hidden="true" />
        Tất cả sự kiện
      </Link>
      <header className="detail-hero">
        <p className={`status ${eventStatus(event, now)}`}>
          {statusLabels[eventStatus(event, now)]}
        </p>
        <h1 className="event-title">{event.title}</h1>
        <span className="detail-code">BookClub CTUT / {event.code}</span>
      </header>
      <div className="detail-body">
        <Reveal className="detail-story">
          <p className="section-label">Về sự kiện</p>
          {event.description_rich ? (
            <div className="prose">
              <RichDocument value={event.description_rich} />
            </div>
          ) : (
            event.description && <p className="prose">{event.description}</p>
          )}
        </Reveal>
        <Reveal>
          <EventInfo event={event} />
        </Reveal>
      </div>
      <Reveal>
        <Agenda items={event.agenda} />
      </Reveal>
      <p className="footnote">
        Thời gian hiển thị theo múi giờ Việt Nam (UTC+7).
      </p>
    </article>
  );
}
