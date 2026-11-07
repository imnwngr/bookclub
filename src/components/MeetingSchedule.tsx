import { useState } from "react";
import { Clock, Copy, Image, Map, MapPin, Navigation } from "lucide-react";
import type { ClubEvent } from "../types/domain";
import { formatDate, mapLink } from "../lib/domain";
import { VenueImage } from "./VenueImage";
const dateParts = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  return ["year", "month", "day"].map(k => Number(parts.find(p => p.type === k)?.value));
};
const time = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
export function MeetingSchedule({ event }: { event: ClubEvent }) {
  const [tab, setTab] = useState<"image" | "map">(event.venue_image_path ? "image" : "map");
  const [copy, setCopy] = useState("");
  const [sy, sm, sd] = dateParts(event.starts_at), [ey, em, ed] = dateParts(event.ends_at);
  const start = Date.UTC(sy, sm - 1, sd), end = Date.UTC(ey, em - 1, ed);
  const months: [number, number][] = [];
  for (let n = sy * 12 + sm - 1; n <= ey * 12 + em - 1; n++) months.push([Math.floor(n / 12), n % 12]);
  const url = mapLink(event);
  return <section className="invitation-section meeting-schedule" id="invitation-schedule" tabIndex={-1}>
    <p className="section-label">THỜI GIAN &amp; ĐỊA ĐIỂM TỔ CHỨC</p><h2>Thông Tin Buổi Họp Mặt</h2><div className="meeting-rule" />
    <div className="meeting-redesign">
      <div className="calendar-card"><header><span>{sy}</span><span><Clock size={16} /> {time(event.starts_at)}</span><h3>Tháng {sm} / {sy}</h3><p>{formatDate(event.starts_at)}</p></header>
        <div className="calendar-months">{months.map(([year, month]) => { const first = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); return <div key={year * 12 + month}><h4>Tháng {month + 1} / {year}</h4><div className="calendar-grid">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => <b key={d}>{d}</b>)}{Array.from({length: first}, (_, i) => <span key={'empty' + i} />)}{Array.from({length: count}, (_, i) => { const day = Date.UTC(year, month, i + 1); return <span key={i} className={day === start ? 'calendar-start' : day === end ? 'calendar-end' : day > start && day < end ? 'calendar-between' : ''}>{i + 1}</span>; })}</div></div>; })}</div><footer>{time(event.starts_at)} – {time(event.ends_at)} · <span className="event-title">{event.title}</span></footer></div>
      <div className="venue-card"><div className="venue-tabs"><button type="button" aria-pressed={tab === 'image'} onClick={() => setTab('image')}><Image size={18} /> Hình ảnh địa điểm</button><button type="button" aria-pressed={tab === 'map'} onClick={() => setTab('map')}><Map size={18} /> Bản đồ Google Maps</button></div>
        {tab === 'image' ? <div className="venue-media">{event.venue_image_path ? <VenueImage path={event.venue_image_path} /> : <p>Chưa có ảnh địa điểm.</p>}<strong>{event.venue_name}</strong></div> : <div className="venue-map"><Map size={28} /><p>Xem vị trí trên Google Maps</p>{url && <a href={url} target="_blank" rel="noopener noreferrer">Mở Google Maps</a>}</div>}
        <div className="venue-detail"><h3><MapPin size={20} /> {event.venue_name || 'Địa điểm sẽ được thông báo'}</h3>{event.address && <p>{event.address}</p>}{event.directions && <p>{event.directions}</p>}<div className="venue-actions"><button type="button" disabled={!event.address} onClick={() => { if (!navigator.clipboard?.writeText) { setCopy('Không thể sao chép địa chỉ.'); return; } void navigator.clipboard.writeText(event.address).then(() => setCopy('Đã sao chép địa chỉ.')).catch(() => setCopy('Không thể sao chép địa chỉ.')); }}><Copy size={18} /> Sao chép địa chỉ</button>{url && <a href={url} target="_blank" rel="noopener noreferrer"><Navigation size={18} /> Chỉ đường</a>}</div><p role="status">{copy}</p></div>
      </div>
    </div>
  </section>;
}
