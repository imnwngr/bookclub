import { YouTubePlayer } from "../components/YouTubePlayer";
import { RichDocument } from "../components/InvitationQuoteTwo";
import { InvitationQuoteTwo } from "../components/InvitationQuoteTwo";
import { Heart } from "lucide-react";
import { GuestDescription } from "../components/GuestDescription";
import { MeetingSchedule } from "../components/MeetingSchedule";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { resolveInvitation } from "../features/events/api";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { Agenda } from "../components/Agenda";
import { InvitationLogos } from "../components/InvitationLogos";
export default function InvitationPage() {
  const { eventCode = "", guestAlias = "" } = useParams();
  const [opened, setOpened] = useState(false);
  const query = useQuery({
    queryKey: ["invitation", eventCode, guestAlias],
    queryFn: () => resolveInvitation(eventCode, guestAlias),
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  if (!query.data)
    return (
      <Empty>
        Thiệp không tồn tại hoặc sự kiện chưa được công bố.{" "}
        <Link to="/">Về trang chủ</Link>
      </Empty>
    );
  const { event, invitation } = query.data;
  return (
    <article className={`invitation ${opened ? "opened" : ""}`}>
      {!opened ? (
        <div className="invitation-cover">
          <InvitationLogos />
          <p className="section-label">BookClub CTUT · Trân trọng kính mời</p>
          <p className="cover-recipient">
            <span>{invitation.salutation}</span>{" "}
            <strong>{invitation.name}</strong>
          </p>
          <GuestDescription value={invitation.description} />
          <button onClick={() => setOpened(true)}>Mở thiệp mời</button>
        </div>
      ) : (
        <div className="invitation-content invitation-sections">
          <section
            className="invitation-section invitation-greeting"
            id="invitation-greeting"
            tabIndex={-1}
          >
            <InvitationLogos />
            <p className="section-label">Thư mời tham dự</p>
            <p>Kính gửi {invitation.salutation}</p>
            <h1>{invitation.name}</h1>
            <GuestDescription value={invitation.description} />
            <div className="invitation-rule" />
            <p>
              {invitation.kind === "group"
                ? "BookClub thân mời các thành viên và cộng tác viên cùng tham gia"
                : "Câu lạc bộ Sinh viên Yêu thích Sách trân trọng kính mời quý vị đến tham dự"}
            </p>
            <h2>{event.title}</h2>
            {event.description_rich ? <div className="prose"><RichDocument value={event.description_rich} /></div> : event.description && <p className="prose">{event.description}</p>}
            <a className="section-next" href="#invitation-schedule">
              Xem thời gian và địa điểm ↓
            </a>
          </section>
          {event.youtube_url && <YouTubePlayer url={event.youtube_url} />}
          <MeetingSchedule event={event} />
          {!!event.quote_one?.trim() && <section className="invitation-quote-one"><Heart aria-hidden="true" size={24} /><blockquote>{event.quote_one}</blockquote><p>CLB Sinh viên Yêu thích Sách</p></section>}
          {!!event.agenda?.length && (
            <section
              className="invitation-section invitation-program"
              id="invitation-program"
              tabIndex={-1}
            >
              <Agenda items={event.agenda} />
            </section>
          )}
          <InvitationQuoteTwo value={event.quote_two} />
          <p className="invitation-signoff">
            Sự hiện diện của{" "}
            {invitation.kind === "group" ? "các bạn" : "quý vị"} là niềm vinh
            hạnh của Câu lạc bộ.
          </p>
          <p>
            <strong>Ban tổ chức · BookClub CTUT</strong>
          </p>
        </div>
      )}
    </article>
  );
}
