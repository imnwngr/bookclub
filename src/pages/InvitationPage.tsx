import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
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
import { BookClubLogo } from "../components/BookClubLogo";
import { InvitationChapter } from "../components/InvitationChapter";
import type { ClubEvent, Invitation } from "../types/domain";
import "../styles/materials.css";
import "../styles/chapters.css";

export default function InvitationPage() {
  const { eventCode = "", guestAlias = "" } = useParams();
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
    <article className={`invitation ${opened ? "opened" : "sealed"}`}>
      {!opened ? (
        <div className="invitation-cover">
          <div className="cover-topline">
            <span>BookClub CTUT</span>
            <span>Thư mời</span>
          </div>
          <div className="envelope-stack">
            <div className="envelope-paper">
              <InvitationLogos />
              <p className="invitation-tagline section-label">
                Trân trọng kính mời
              </p>
              <p className="cover-recipient">
                <span>{invitation.salutation}</span>
                <strong>{invitation.name}</strong>
              </p>
              <GuestDescription value={invitation.description} />
              <div className="letter-seal" aria-hidden="true">
                <BookClubLogo decorative />
              </div>
              <button className="open-invitation" onClick={open}>
                <MailOpen size={19} aria-hidden="true" />
                Mở thiệp mời
              </button>
            </div>
            <div className="envelope-flap" aria-hidden="true" />
          </div>
          <p className="cover-postscript">
            Một lời mời, dành riêng cho{" "}
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
                <p className="section-label">Thư mời tham dự</p>
                <p className="greeting-salutation">
                  Kính gửi {invitation.salutation}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {invitation.name}
                </h1>
                <GuestDescription value={invitation.description} />
                <div className="invitation-rule" aria-hidden="true" />
                <a className="section-next" href="#invitation-event">
                  Lời mời từ BookClub <ArrowDown size={18} aria-hidden="true" />
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
                  {invitation.kind === "group"
                    ? "BookClub thân mời các thành viên và cộng tác viên cùng tham gia"
                    : "Câu lạc bộ Sinh viên Yêu thích Sách trân trọng kính mời quý vị đến tham dự"}
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
                <a className="section-next" href="#invitation-schedule">
                  Xem thời gian và địa điểm{" "}
                  <ArrowDown size={18} aria-hidden="true" />
                </a>
              </section>
            </InvitationChapter>
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
            {!!event.quote_one?.trim() && (
              <InvitationChapter name="quote" emerald>
                <section className="invitation-quote-one">
                  <span className="quote-mark" aria-hidden="true">
                    “
                  </span>
                  <blockquote>{event.quote_one}</blockquote>
                  <p>CLB Sinh viên Yêu thích Sách</p>
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
                  <BookClubLogo decorative />
                </div>
                <p className="invitation-signoff">
                  Sự hiện diện của{" "}
                  {invitation.kind === "group" ? "các bạn" : "quý vị"} là niềm
                  vinh hạnh của Câu lạc bộ.
                </p>
                <p>
                  <strong>Ban tổ chức · BookClub CTUT</strong>
                </p>
                <Link className="text-link" to={`/${event.code}`}>
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
