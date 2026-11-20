export type Publication = "draft" | "published";
export type EventType = "invitation" | "congratulation";
export interface EventTheme {
  version: 1;
  primary: string;
}
export interface AgendaItem {
  time: string;
  end_time?: string | null;
  icon?: string | null;
  description: string;
  highlight: boolean;
}
export interface ClubEvent {
  event_type?: EventType;
  theme?: EventTheme;
  id: string;
  code: string;
  title: string;
  description: string;
  description_rich?: unknown;
  music_path?: string | null;
  quote_one?: string;
  quote_two?: unknown;
  starts_at: string | null;
  ends_at: string | null;
  status: Publication;
  venue_name: string;
  address: string;
  directions: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string;
  maps_url: string;
  created_at: string;
  updated_at: string;
  location_method?: "url" | "place";
  venue_image_path?: string | null;
  agenda?: AgendaItem[];
}
export interface Guest {
  id: string;
  salutation: string;
  name: string;
  description: string;
  kind: "individual" | "group";
  active: boolean;
  display_order?: number;

  primary_alias?: string;
}
export interface Invitation {
  id: string;
  event_id: string;
  guest_id: string;
  salutation: string;
  name: string;
  description: string;
  kind: "individual" | "group";
  primary_alias: string;
  invitation_aliases: { alias: string; id: string }[];
}
export type EventInput = Omit<ClubEvent, "id" | "created_at" | "updated_at">;
