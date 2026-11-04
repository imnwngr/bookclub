import { db } from "../../lib/supabase";
import type {
  ClubEvent,
  EventInput,
  Guest,
  Invitation,
} from "../../types/domain";
import { availableAlias } from "../../lib/domain";
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
  const { data, error } = await db()
    .from("events")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as ClubEvent | null;
}
export async function listGuests() {
  const { data, error } = await db()
    .from("guests")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data as Guest[];
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
  const { error } = await db().from("events").delete().eq("id", id);
  if (error) throw error;
}
export async function addAlias(invitation: Invitation, alias: string) {
  const { error } = await db().from("invitation_aliases").insert({
    event_id: invitation.event_id,
    event_guest_id: invitation.id,
    alias,
  });
  if (error) throw error;
}
export async function removeAlias(id: string) {
  const { error } = await db().from("invitation_aliases").delete().eq("id", id);
  if (error) throw error;
}
export async function saveGuest(guest: Omit<Guest, "id">, id?: string) {
  const payload = {
    ...guest,
    default_aliases: guest.default_aliases.length
      ? guest.default_aliases
      : [availableAlias(guest.name, [])],
  };
  const query = id
    ? db().from("guests").update(payload).eq("id", id)
    : db().from("guests").insert(payload);
  const { error } = await query;
  if (error) throw error;
}
