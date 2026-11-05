import { AgendaIcon } from "./AgendaIcon";
import type { AgendaItem } from "../types/domain";
export function Agenda({ items }: { items?: AgendaItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="agenda">
      <h2>Nội Dung & Tiến Trình Buổi Lễ</h2>
      <ol>
        {[...items]
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((item, i) => (
            <li key={i} className={item.highlight ? "agenda-highlight" : ""}>
              <span className="agenda-marker">
                <AgendaIcon name={item.icon} />
              </span>
              <time>
                {item.time}
                {item.end_time ? ` — ${item.end_time}` : ""}
              </time>
              <div>
                {item.highlight && <strong>Nội dung trọng tâm · </strong>}
                {item.description}
              </div>
            </li>
          ))}
      </ol>
    </section>
  );
}
