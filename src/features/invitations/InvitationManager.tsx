import { toast } from "sonner";
import type { Invitation } from "../../types/domain";
import { invitationUrl, invitationLines } from "../../lib/domain";
export function InvitationManager({
  invitations,
  code,
  eventId,
}: {
  invitations: Invitation[];
  code: string;
  eventId: string;
}) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép link thiệp");
    } catch {
      toast.error("Không thể sao chép. Kiểm tra quyền clipboard.");
    }
  };
  const lines = invitationLines(code, eventId, invitations);
  return (
    <section className="invitation-manager">
      <h2>Thiệp mời</h2>
      <button type="button" disabled={!lines} onClick={() => void copy(lines)}>
        Sao chép tất cả
      </button>
      <p>Mỗi khách mời sử dụng một link thiệp chính đã lưu.</p>
      {invitations.map((i) => (
        <article key={i.id} className="panel invitation-row">
          <h3>
            {i.salutation} {i.name}
          </h3>
          <div className="actions">
            <a
              href={invitationUrl(code, i.primary_alias)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem trước thiệp
            </a>
            <button
              type="button"
              className="secondary"
              onClick={() => void copy(invitationUrl(code, i.primary_alias))}
            >
              Sao chép link
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
