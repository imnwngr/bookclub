import { RichDocument } from "../components/InvitationQuoteTwo";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getEvent } from "../features/events/api";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { EventInfo } from "../components/EventInfo";
import { eventStatus, statusLabels } from "../lib/domain";
import { useClock } from "../hooks/useClock";
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
      <Link to="/">Tất cả sự kiện</Link>
      <p className={`status ${eventStatus(event, now)}`}>
        {statusLabels[eventStatus(event, now)]}
      </p>
      <h1>{event.title}</h1>
      {event.description_rich ? <div className="prose"><RichDocument value={event.description_rich} /></div> : event.description && <p className="prose">{event.description}</p>}
      <EventInfo event={event} />
      <p className="footnote">
        Thời gian hiển thị theo múi giờ Việt Nam (UTC+7).
      </p>
    </article>
  );
}
