import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { eventPath, typeLabel } from "../lib/domain";
import { themeStyle } from "../lib/eventTheme";
import { useEventTheme } from "../hooks/useEventTheme";
import { ArrowDown, ArrowUpRight, MailOpen } from "lucide-react";
import { resolveInvitation } from "../features/events/api";
import {
  BackgroundAudio,
  type BackgroundAudioHandle,
} from "../components/BackgroundAudio";
import {
  RichDocument,
  InvitationQuoteTwo,
} from "../components/InvitationQuoteTwo";
import { GuestDescription } from "../components/GuestDescription";
import { MeetingSchedule } from "../components/MeetingSchedule";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { Agenda } from "../components/Agenda";
import { InvitationLogos } from "../components/InvitationLogos";
import { useInvitationMotion } from "../hooks/useInvitationMotion";
import { useChapterScroll } from "../hooks/useChapterScroll";
import { HsvLogo } from "../components/HsvLogo";
import { InvitationChapter } from "../components/InvitationChapter";
import type { ClubEvent, Invitation } from "../types/domain";
import "../styles/materials.css";
import "../styles/chapters.css";

export default function InvitationPage() {
  const { eventCode = "", guestAlias = "" } = useParams();
  const location = useLocation();
  const query = useQuery({
    queryKey: ["invitation", eventCode, guestAlias],
    queryFn: () => resolveInvitation(eventCode, guestAlias),
  });
  useEventTheme(query.data?.event.theme, !!query.data);
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
  const canonical = eventPath(
    eventCode,
    query.data.event.event_type,
    guestAlias,
  );
  if (location.pathname.replace(/\/$/, "") !== canonical)
    return (
      <Navigate replace to={canonical + location.search + location.hash} />
    );
  return (
    <InvitationExperience key={`${eventCode}/${guestAlias}`} {...query.data} />
  );
}

function InvitationExperience({
  event,
  invitation,
}: {
  event: ClubEvent;
  invitation: Invitation;
}) {
  const [opened, setOpened] = useState(false);
  const congratulation = event.event_type === "congratulation";
  const greeting = congratulation
    ? "Trân trọng chúc mừng"
    : "Trân trọng kính mời";
  const [opening, setOpening] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const audio = useRef<BackgroundAudioHandle>(null);
  const story = useRef<HTMLDivElement>(null);
  useInvitationMotion(story, opened);
  useChapterScroll(story, opened);
  useEffect(() => {
    if (!opened) return;
    story.current?.scrollIntoView({ block: "start", behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setOpening(false), 1000);
    return () => window.clearTimeout(timer);
  }, [opened]);
  function open() {
    audio.current?.resumeFromGesture();
    setOpening(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setOpened(true);
  }
  return (
    <article
      className={`invitation ${opened ? "opened" : "sealed"}`}
      style={themeStyle(event.theme)}
    >
      {!opened ? (
        <div className="invitation-cover">
          <div className="cover-topline">
            <span>Sự kiện Hội Sinh viên CTUT</span>
            <span>{typeLabel(event.event_type)}</span>
          </div>
          <div className="envelope-stack">
            <div className="envelope-paper">
              <InvitationLogos />
              <p className="invitation-tagline section-label">{greeting}</p>
              <p className="cover-recipient">
                <span>{invitation.salutation}</span>
                <strong>{invitation.name}</strong>
              </p>
              <GuestDescription value={invitation.description} />
              <div className="letter-seal" aria-hidden="true">
                <HsvLogo decorative />
              </div>
              <button className="open-invitation" onClick={open}>
                <MailOpen size={19} aria-hidden="true" />
                {congratulation ? "Mở thiệp chúc" : "Mở thiệp mời"}
              </button>
            </div>
            <div className="envelope-flap" aria-hidden="true" />
          </div>
          <p className="cover-postscript">
            {congratulation
              ? "Một lời chúc, dành riêng cho "
              : "Một lời mời, dành riêng cho "}
            {invitation.kind === "group" ? "các bạn" : "quý vị"}.
          </p>
        </div>
      ) : (
        <>
          <div className="invitation-reading-progress" aria-hidden="true" />
          {opening && (
            <div className="opening-paper" aria-hidden="true">
              <div />
              <div />
            </div>
          )}
          <div ref={story} className="invitation-content invitation-sections">
            <InvitationChapter name="greeting">
              <section
                className="invitation-section invitation-greeting"
                id="invitation-greeting"
                tabIndex={-1}
              >
                <InvitationLogos />
                <p className="section-label">
                  {congratulation ? "Trân trọng chúc mừng" : "Thư mời tham dự"}
                </p>
                <p className="greeting-salutation">
                  Kính gửi {invitation.salutation}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {invitation.name}
                </h1>
                <GuestDescription value={invitation.description} />
                <div className="invitation-rule" aria-hidden="true" />
                <a className="section-next" href="#invitation-event">
                  {congratulation
                    ? "Lời chúc dành cho bạn"
                    : "Lời mời từ Ban tổ chức"}{" "}
                  <ArrowDown size={18} aria-hidden="true" />
                </a>
              </section>
            </InvitationChapter>
            <InvitationChapter name="event">
              <section
                className="invitation-section invitation-event"
                id="invitation-event"
                tabIndex={-1}
              >
                <p className="greeting-message">
                  {greeting}{" "}
                  {invitation.kind === "group" ? "các bạn" : "quý vị"}
                  {congratulation ? " nhân dịp" : " đến tham dự"}
                </p>
                <h2 className="event-title">{event.title}</h2>
                {event.description_rich ? (
                  <div className="prose">
                    <RichDocument value={event.description_rich} />
                  </div>
                ) : (
                  event.description && (
                    <p className="prose">{event.description}</p>
                  )
                )}
                {!congratulation && (
                  <a className="section-next" href="#invitation-schedule">
                    Xem thời gian và địa điểm{" "}
                    <ArrowDown size={18} aria-hidden="true" />
                  </a>
                )}
              </section>
            </InvitationChapter>
            {!congratulation && (
              <InvitationChapter name="schedule">
                <div className="paper-bridge" aria-hidden="true">
                  <div className="paper-bridge-leaf" />
                  <svg viewBox="0 0 400 64" fill="none">
                    <path
                      pathLength="1"
                      d="M16 32h138c25 0 26-20 46-20s21 20 46 20h138M200 12v40m-12-20 12 12 12-12"
                    />
                  </svg>
                </div>
                <MeetingSchedule event={event} />
              </InvitationChapter>
            )}
            {!!event.quote_one?.trim() && (
              <InvitationChapter name="quote" emerald>
                <section className="invitation-quote-one">
                  <span className="quote-mark" aria-hidden="true">
                    “
                  </span>
                  <blockquote>{event.quote_one}</blockquote>
                </section>
              </InvitationChapter>
            )}
            {!!event.agenda?.length && (
              <InvitationChapter name="program">
                <section
                  className="invitation-section invitation-program"
                  id="invitation-program"
                  tabIndex={-1}
                >
                  <p className="section-label">
                    Cùng nhau trong từng khoảnh khắc
                  </p>
                  <Agenda items={event.agenda} />
                </section>
              </InvitationChapter>
            )}
            <InvitationChapter name="closing">
              <InvitationQuoteTwo value={event.quote_two} />
              <section className="invitation-closing">
                <div className="closing-mark" aria-hidden="true">
                  <HsvLogo decorative />
                </div>
                <p className="invitation-signoff">
                  {congratulation ? "Kính chúc " : "Sự hiện diện của "}
                  {invitation.kind === "group" ? "các bạn" : "quý vị"}
                  {congratulation
                    ? " nhiều niềm vui và thành công."
                    : " là niềm vinh hạnh của Ban tổ chức."}
                </p>
                <p>
                  <strong>Trân trọng</strong>
                </p>
                <Link
                  className="text-link"
                  to={eventPath(event.code, event.event_type)}
                >
                  Thông tin sự kiện{" "}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </section>
            </InvitationChapter>
          </div>
        </>
      )}
      {event.music_path && (
        <BackgroundAudio
          key={event.music_path}
          ref={audio}
          path={event.music_path}
        />
      )}
    </article>
  );
}
