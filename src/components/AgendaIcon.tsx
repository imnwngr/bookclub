import { agendaIcons, canonicalAgendaIcon } from "../lib/agendaIcons";
export function AgendaIcon({ name }: { name?: string | null }) {
  const Icon = agendaIcons[canonicalAgendaIcon(name)].Icon;
  return <Icon size={24} strokeWidth={1.6} aria-hidden="true" focusable="false" />;
}
