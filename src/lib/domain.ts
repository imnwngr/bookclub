import { isAgendaIcon } from "./agendaIcons";
import { z } from "zod";
import type { ClubEvent, Invitation } from "../types/domain";
export const reservedCodes = [
  "admin",
  "auth",
  "assets",
  "404",
  "index",
  "login",
  "new",
  "edit",
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
export const codeSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Chỉ dùng chữ thường không dấu, số và dấu gạch nối.",
  )
  .min(1)
  .max(80)
  .refine((v) => !reservedCodes.includes(v), "Mã này được dành cho hệ thống.");
export const aliasSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Alias chỉ gồm chữ thường không dấu, số, dấu gạch nối.",
  )
  .min(1)
  .max(80);
export const eventSchema = z
  .object({
    code: z.union([codeSchema, z.literal("")]),
    title: z.string().trim().min(1, "Vui lòng nhập tên sự kiện.").max(240),
    description: z.string().max(10000),
    starts_at: z.string().min(1, "Chọn giờ bắt đầu."),
    ends_at: z.string().min(1, "Chọn giờ kết thúc."),
    status: z.enum(["draft", "published"]),
    venue_name: z.string().max(240),
    address: z.string().max(1000),
    directions: z.string().max(3000),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    place_id: z.string(),
    location_method: z.enum(["url", "place"]).optional(),
    venue_image_path: z.string().nullable().optional(),
    agenda: z
      .array(
        z
          .object({
            time: z
              .string()
              .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Nhập giờ HH:mm hợp lệ."),
            end_time: z
              .string()
              .regex(
                /^([01]\d|2[0-3]):[0-5]\d$/,
                "Nhập giờ kết thúc HH:mm hợp lệ.",
              )
              .nullable()
              .optional(),
            icon: z
              .string()
              .refine(isAgendaIcon, "Icon không hợp lệ.")
              .nullable()
              .optional(),
            description: z
              .string()
              .trim()
              .min(1, "Nhập nội dung chương trình.")
              .max(1000),
            highlight: z.boolean(),
          })
          .refine((v) => !v.end_time || v.end_time > v.time, {
            path: ["end_time"],
            message: "Giờ kết thúc phải sau giờ bắt đầu.",
          }),
      )
      .max(100)
      .optional(),
    maps_url: z
      .string()
      .refine(
        (v) => !v || safeMapUrl(v) !== null,
        "Dùng liên kết HTTPS Google Maps hợp lệ.",
      ),
  })
  .refine((v) => v.location_method !== "url" || Boolean(v.maps_url), {
    path: ["maps_url"],
    message: "Nhập liên kết Google Maps.",
  })
  .refine(
    (v) =>
      v.location_method !== "place" ||
      /^[A-Za-z0-9_-]{5,255}$/.test(v.place_id),
    { path: ["place_id"], message: "Nhập Google Place ID hợp lệ." },
  )
  .refine((v) => Number.isFinite(Date.parse(v.starts_at)), {
    path: ["starts_at"],
    message: "Thời gian bắt đầu không hợp lệ.",
  })
  .refine((v) => Date.parse(v.ends_at) > Date.parse(v.starts_at), {
    path: ["ends_at"],
    message: "Kết thúc phải sau thời gian bắt đầu.",
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    path: ["longitude"],
    message: "Nhập cả vĩ độ và kinh độ.",
  });
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
  event: Pick<ClubEvent, "starts_at" | "ends_at">,
  now = Date.now(),
) {
  return now < Date.parse(event.starts_at)
    ? "upcoming"
    : now < Date.parse(event.ends_at)
      ? "ongoing"
      : "ended";
}
export const statusLabels = {
  upcoming: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  ended: "Đã kết thúc",
};
export function orderEvents(events: ClubEvent[], now = Date.now()) {
  const rank = { ongoing: 0, upcoming: 1, ended: 2 };
  return [...events].sort(
    (a, b) =>
      rank[eventStatus(a, now)] - rank[eventStatus(b, now)] ||
      (eventStatus(a, now) === "ended"
        ? Date.parse(b.ends_at) - Date.parse(a.ends_at)
        : Date.parse(a.starts_at) - Date.parse(b.starts_at)),
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
    }).formatToParts(new Date(e.starts_at));
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
export const toLocalInput = (value: string) =>
  new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16);
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
export function invitationUrl(code: string, alias?: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}${encodeURIComponent(code)}${alias ? `/${encodeURIComponent(alias)}` : ""}`;
}
export function invitationLines(
  code: string,
  eventId: string,
  invitations: Invitation[],
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
        `${[i.salutation, i.name].filter(Boolean).join(" ")}: ${invitationUrl(code, i.primary_alias)}`,
    )
    .join("\n");
}
