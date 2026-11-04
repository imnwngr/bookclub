import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Invitation } from "../../types/domain";
import { addAlias, removeAlias } from "../events/api";
import { aliasSchema, invitationUrl } from "../../lib/domain";
import { errorMessage } from "../../lib/supabase";
import { Confirm } from "../../components/Confirm";
export function InvitationManager({
  invitations,
  code,
}: {
  invitations: Invitation[];
  code: string;
}) {
  return (
    <section className="invitation-manager">
      <h2>Thiệp mời & alias</h2>
      <p>
        Thông tin người nhận đã được lưu riêng cho sự kiện. Alias là đường dẫn
        công khai khi sự kiện được công bố.
      </p>
      {!invitations.length && (
        <p>Chọn khách mời và lưu sự kiện để tạo thiệp.</p>
      )}
      {invitations.map((i) => (
        <AliasRow key={i.id} invitation={i} code={code} />
      ))}
    </section>
  );
}
function AliasRow({
  invitation,
  code,
}: {
  invitation: Invitation;
  code: string;
}) {
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const cache = useQueryClient();
  const aliases = invitation.invitation_aliases;
  const main = invitation.primary_alias;
  return (
    <article className="panel">
      <h3>
        {invitation.salutation} {invitation.name}
      </h3>
      {main && (
        <div className="actions">
          <a
            href={invitationUrl(code, main)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Xem trước thiệp
          </a>
          <button
            className="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(invitationUrl(code, main))
                .then(
                  () => toast.success("Đã sao chép link thiệp"),
                  () => toast.error("Không thể sao chép"),
                )
            }
          >
            Sao chép link chính
          </button>
        </div>
      )}
      <ul className="alias-list">
        {aliases.map((a) => (
          <li key={a.id}>
            <code>
              {a.alias}
              {a.alias === main ? " (chính)" : ""}
            </code>
            <button
              type="button"
              className="danger-text"
              disabled={a.alias === main || busy}
              aria-label={`Xóa alias ${a.alias}`}
              onClick={() => setRemoving(a.id)}
            >
              Xóa alias
            </button>
          </li>
        ))}
      </ul>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = aliasSchema.safeParse(alias);
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            return;
          }
          setBusy(true);
          try {
            await addAlias(invitation, alias);
            setAlias("");
            await cache.invalidateQueries({ queryKey: ["invitations"] });
            toast.success("Đã thêm alias");
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Alias mới cho {invitation.name}
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={80}
            required
          />
        </label>
        <button disabled={busy}>Thêm alias</button>
      </form>
      {removing && (
        <Confirm
          title="Xóa alias?"
          busy={busy}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await removeAlias(removing);
              await cache.invalidateQueries({ queryKey: ["invitations"] });
              setRemoving(null);
              toast.success("Đã xóa alias");
            } catch (err) {
              toast.error(errorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          Các liên kết dùng alias này sẽ ngừng hoạt động. Alias chính được giữ
          lại để bảo toàn link thiệp.
        </Confirm>
      )}
    </article>
  );
}
