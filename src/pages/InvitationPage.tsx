import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { resolveInvitation } from "../features/events/api";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { EventInfo } from "../components/EventInfo";
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
      <p className="section-label">BookClub CTUT · Trân trọng kính mời</p>
      {!opened ? (
        <div className="invitation-cover">
          <p className="serif">
            Một lời mời,
            <br />
            một cuộc gặp gỡ.
          </p>
          <p>
            {invitation.salutation} <strong>{invitation.name}</strong>
          </p>
          <button onClick={() => setOpened(true)}>Mở thiệp mời</button>
        </div>
      ) : (
        <div className="invitation-content">
          <p className="section-label">Thư mời tham dự</p>
          <p>Kính gửi {invitation.salutation}</p>
          <h1>{invitation.name}</h1>
          <p className="recipient-role">{invitation.description}</p>
          <div className="invitation-rule" />
          <p>
            {invitation.kind === "group"
              ? "BookClub thân mời các thành viên và cộng tác viên cùng tham gia"
              : "Câu lạc bộ Sinh viên Yêu thích Sách trân trọng kính mời quý vị đến tham dự"}
          </p>
          <h2>{event.title}</h2>
          {event.description && <p className="prose">{event.description}</p>}
          <EventInfo event={event} />
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
