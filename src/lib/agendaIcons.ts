import { Users, Music, Mic, Film, Award, Sparkles, BookOpen, Gift, Trophy, Camera, HeartHandshake } from "lucide-react";

export const agendaIcons = {
  users: { label: "Đón tiếp", Icon: Users },
  music: { label: "Âm nhạc", Icon: Music },
  mic: { label: "Phát biểu", Icon: Mic },
  film: { label: "Phim", Icon: Film },
  award: { label: "Tuyên dương", Icon: Award },
  sparkles: { label: "Điểm nhấn", Icon: Sparkles },
  "book-open": { label: "Sách", Icon: BookOpen },
  gift: { label: "Trao quà", Icon: Gift },
  trophy: { label: "Trao giải", Icon: Trophy },
  camera: { label: "Chụp ảnh", Icon: Camera },
  "heart-handshake": { label: "Giao lưu", Icon: HeartHandshake },
} as const;
export type AgendaIconName = keyof typeof agendaIcons;
export const legacyAgendaIcons: Record<string, AgendaIconName> = {
  welcome: "users", speech: "mic", book: "book-open", chat: "heart-handshake",
  summary: "award", finish: "trophy",
};
export function canonicalAgendaIcon(name?: string | null): AgendaIconName {
  if (name && Object.hasOwn(agendaIcons, name)) return name as AgendaIconName;
  return (name && legacyAgendaIcons[name]) || "book-open";
}
export function isAgendaIcon(name: string) {
  return Object.hasOwn(agendaIcons, name) || Object.hasOwn(legacyAgendaIcons, name);
}
export const iconValuesRequiringMigration = new Set([
  "users", "mic", "film", "award", "sparkles", "book-open", "trophy", "heart-handshake",
]);
