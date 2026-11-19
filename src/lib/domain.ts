import type { ClubEvent, EventType, Invitation } from "../types/domain";
export const reservedCodes = [
  "admin",
  "auth",
  "assets",
  "404",
  "index",
  "login",
  "new",
  "edit",
  "thiep-moi",
  "thiep-chuc",
];
export const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function safeMapUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      /(^|\.)(google\.com|maps\.app\.goo\.gl|goo\.gl)$/.test(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function mapLink(
  event: Pick<
    ClubEvent,
    "latitude" | "longitude" | "maps_url" | "address" | "place_id"
  > &
    Pick<ClubEvent, "location_method">,
) {
  if (event.location_method === "place" && event.place_id)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || "Địa điểm")}&query_place_id=${encodeURIComponent(event.place_id)}`;
  if (event.maps_url && safeMapUrl(event.maps_url))
    return safeMapUrl(event.maps_url)!;
  if (event.place_id)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || "Địa điểm")}&query_place_id=${encodeURIComponent(event.place_id)}`;
  const query =
    event.latitude !== null && event.longitude !== null
      ? `${event.latitude},${event.longitude}`
      : event.address;
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${event.place_id ? `&query_place_id=${encodeURIComponent(event.place_id)}` : ""}`
    : null;
}
export function eventStatus(
  event: Pick<ClubEvent, "starts_at" | "ends_at" | "event_type">,
  now = Date.now(),
) {
  if (event.event_type === "congratulation") return "congratulation";
  if (!event.starts_at || !event.ends_at) return "unscheduled";
  return now < Date.parse(event.starts_at)
    ? "upcoming"
    : now < Date.parse(event.ends_at)
      ? "ongoing"
      : "ended";
}
export const statusLabels = {
  congratulation: "Thiệp chúc",
  unscheduled: "Chưa có lịch",
  upcoming: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  ended: "Đã kết thúc",
};
export function orderEvents(events: ClubEvent[], now = Date.now()) {
  const rank = {
    ongoing: 0,
    upcoming: 1,
    congratulation: 2,
    ended: 3,
    unscheduled: 4,
  };
  return [...events].sort(
    (a, b) =>
      rank[eventStatus(a, now)] - rank[eventStatus(b, now)] ||
      (eventStatus(a, now) === "ended" || a.event_type === "congratulation"
        ? Date.parse(eventListDate(b)) - Date.parse(eventListDate(a))
        : Date.parse(eventListDate(a)) - Date.parse(eventListDate(b))) ||
      a.id.localeCompare(b.id),
  );
}
export function filterEvents(
  events: ClubEvent[],
  month: string,
  year: string,
  search = "",
) {
  return events.filter((e) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(new Date(eventListDate(e)));
    return (
      (!month ||
        Number(parts.find((p) => p.type === "month")!.value) ===
          Number(month)) &&
      (!year || parts.find((p) => p.type === "year")!.value === year) &&
      slug(`${e.title} ${e.code}`).includes(slug(search))
    );
  });
}
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(new Date(date));
export const eventYear = (date: string) =>
  new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(new Date(date));
export const toLocalInput = (value: string | null) =>
  value
    ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16)
    : "";
export const fromLocalInput = (value: string) =>
  value ? new Date(`${value}:00+07:00`).toISOString() : "";
export function availableAlias(name: string, taken: string[]) {
  const base = slug(name).slice(0, 65) || "khach-moi";
  let alias = base;
  let suffix = 2;
  while (taken.includes(alias)) alias = `${base}-${suffix++}`;
  return alias;
}
export const guestAlias = (name: string) =>
  slug(
    name.replace(
      /^(?:(?:thầy|cô|anh|chị|thạc sĩ|ths\.?|ks\.?|đ\/c)\s+)+/giu,
      "",
    ),
  )
    .slice(0, 80)
    .replace(/-+$/, "");
export const eventType = (event: Pick<ClubEvent, "event_type">): EventType =>
  event.event_type === "congratulation" ? "congratulation" : "invitation";
export const typeLabel = (type?: EventType) =>
  type === "congratulation" ? "Thiệp chúc" : "Thiệp mời";
export const cardSegment = (type?: EventType) =>
  type === "congratulation" ? "thiep-chuc" : "thiep-moi";
export const eventPath = (code: string, type?: EventType, alias?: string) =>
  `/${cardSegment(type)}/${encodeURIComponent(code)}${alias ? `/${encodeURIComponent(alias)}` : ""}`;
export const eventListDate = (
  event: Pick<ClubEvent, "event_type" | "starts_at" | "created_at">,
) =>
  event.event_type === "congratulation"
    ? event.created_at
    : event.starts_at || event.created_at;
export function invitationUrl(code: string, alias?: string, type?: EventType) {
  return `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}${eventPath(code, type, alias)}`;
}
export function invitationLines(
  code: string,
  eventId: string,
  invitations: Invitation[],
  type?: EventType,
) {
  const seen = new Set<string>();
  return invitations
    .filter(
      (i) =>
        i.event_id === eventId &&
        i.primary_alias &&
        i.invitation_aliases.some((a) => a.alias === i.primary_alias) &&
        !seen.has(i.guest_id) &&
        Boolean(seen.add(i.guest_id)),
    )
    .map(
      (i) =>
        `${[i.salutation, i.name].filter(Boolean).join(" ")}: ${invitationUrl(code, i.primary_alias, type)}`,
    )
    .join("\n");
}
