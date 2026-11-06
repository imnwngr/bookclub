import { db } from "../../lib/supabase";
import type {
  ClubEvent,
  EventInput,
  Guest,
  Invitation,
} from "../../types/domain";
import { guestAlias } from "../../lib/domain";
import { discardVenueImage } from "./images";
import { iconValuesRequiringMigration } from "../../lib/agendaIcons";
export async function listEvents(admin = false) {
  const events: ClubEvent[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = db()
      .from("events")
      .select("*")
      .order("starts_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (!admin) query = query.eq("status", "published");
    const { data, error } = await query;
    if (error) throw error;
    events.push(...(data as ClubEvent[]));
    if (data.length < 500) return events;
  }
}
export async function getEvent(code: string) {
  const { data, error } = await db().rpc("get_event_v110", { p_code: code });
  if (error) throw error;
  return data as ClubEvent | null;
}
export async function listGuests() {
  let { data, error } = await db()
    .from("guests").select("*").order("display_order").order("id");
  if (error?.code === "42703" || error?.code === "PGRST204") ({ data, error } = await db()
    .from("guests")
    .select("*")
    .order("created_at").order("id"));
  if (error) throw error;
  return data as Guest[];
}
export async function reorderGuests(expected: string[], order: string[]) {
  const { error } = await db().rpc("reorder_guests", { p_expected: expected, p_order: order });
  if (error) throw error;
}
export async function guestOrderAvailable() {
  const { data, error } = await db().rpc("guest_order_available");
  return !error && data === true;
}
export async function listInvitations(eventId: string) {
  const { data, error } = await db()
    .from("event_guests")
    .select(
      "*,invitation_aliases!invitation_aliases_event_guest_id_event_id_fkey(id,alias)",
    )
    .eq("event_id", eventId)
    .order("created_at");
  if (error) throw error;
  return data as Invitation[];
}
export async function resolveInvitation(code: string, alias: string) {
  const { data, error } = await db().rpc("resolve_invitation", {
    p_code: code,
    p_alias: alias,
  });
  if (error) throw error;
  return data as { event: ClubEvent; invitation: Invitation } | null;
}
export async function saveEvent(
  event: EventInput,
  guestIds: string[],
  existing?: ClubEvent,
) {
  if (event.description_rich || existing?.description_rich || event.youtube_url || existing?.youtube_url) {
    const capability = await db().from("events").select("description_rich,youtube_url").limit(0);
    if (capability.error) throw Error("Database chưa hỗ trợ mô tả định dạng và nhạc YouTube. Chưa lưu sự kiện.");
  }
  if (event.quote_one?.trim() || existing?.quote_one?.trim() || event.quote_two || existing?.quote_two) {
    const capability = await db().from("events").select("quote_one,quote_two").limit(0);
    if (capability.error) throw Error("Database chưa hỗ trợ quote. Chưa lưu sự kiện; cần áp dụng migration đã được duyệt.");
  }
  const newIcons = (event.agenda ?? []).map((item) => item.icon).filter((icon): icon is string => !!icon && iconValuesRequiringMigration.has(icon));
  if (newIcons.length) {
    const capability = await db().rpc("agenda_icon_capabilities");
    if (capability.error || !Array.isArray(capability.data) || newIcons.some((icon) => !capability.data.includes(icon)))
      throw Error("Database chưa hỗ trợ icon mới. Chưa lưu sự kiện; cần áp dụng migration icon đã được phê duyệt.");
  }
  if (event.agenda?.some((item) => item.end_time || item.icon)) {
    const capability = await db()
      .from("event_agenda_items")
      .select("end_time,icon")
      .limit(0);
    if (capability.error)
      throw Error(
        "Database chưa hỗ trợ khoảng giờ và icon chương trình. Chưa lưu thay đổi; cần áp dụng bản SQL nâng cấp đã được review.",
      );
  }
  const { data, error } = await db().rpc("save_event", {
    p_event: event,
    p_guest_ids: guestIds,
    p_id: existing?.id ?? null,
    p_expected_updated_at: existing?.updated_at ?? null,
  });
  if (error) throw error;
  return data as ClubEvent;
}
export async function deleteEvent(id: string) {
  const before = await db()
    .from("events")
    .select("venue_image_path")
    .eq("id", id)
    .maybeSingle();
  if (before.error) throw before.error;
  const { error } = await db().from("events").delete().eq("id", id);
  if (error) throw error;
  if (before.data?.venue_image_path) {
    try {
      await discardVenueImage(before.data.venue_image_path);
    } catch {
      throw Error(
        "Sự kiện đã xóa; ảnh chưa dùng vẫn có trong danh sách dọn ảnh tạm.",
      );
    }
  }
}
export async function saveGuest(guest: Omit<Guest, "id">, id?: string) {
  const payload: Partial<Omit<Guest, "id">> = {
    ...guest,
    primary_alias: guest.primary_alias || guestAlias(guest.name),
  };
  delete payload.display_order;
  // Active is saved by its independent switch; a directory edit must not overwrite a newer toggle.
  if (id) delete payload.active;
  const query = id
    ? db().from("guests").update(payload).eq("id", id)
    : db().from("guests").insert(payload);
  const { error } = await query;
  if (error) throw error;
}
export async function setGuestActive(id: string, active: boolean) {
  const { data, error } = await db()
    .from("guests")
    .update({ active })
    .eq("id", id)
    .select("id,active")
    .single();
  if (error) throw error;
  if (data?.id !== id || data.active !== active)
    throw Error("Trạng thái chưa được lưu. Vui lòng tải lại danh bạ.");
}
