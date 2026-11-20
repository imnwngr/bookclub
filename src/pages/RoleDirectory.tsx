import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, errorMessage } from "../lib/supabase";
import { ErrorState, Loading } from "../components/Feedback";
import { Confirm } from "../components/Confirm";
import { accountMessages, accountResultMessage } from "../lib/editorAccounts";
interface Account {
  user_id: string;
  email: string;
  role: "admin" | "editor";
  status: string;
}
export default function RoleDirectory() {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [dialog, setDialog] = useState(false),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState<Account | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    success: boolean;
    recovery?: boolean;
  } | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const inFlight = useRef(false);
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = modal.current;
    if (!dialog || !element) return;
    const trigger = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [dialog]);
  const directory = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const r = await db().rpc("role_directory");
      if (r.error) throw r.error;
      return r.data as Account[];
    },
  });
  const role = useQuery({
    queryKey: ["effective-role"],
    queryFn: async () => {
      const r = await db().rpc("effective_role");
      if (r.error) throw r.error;
      return r.data as string | null;
    },
  });
  const recovery = useQuery({
    queryKey: ["editor-add-recovery"],
    enabled: role.data === "admin",
    queryFn: async () => {
      const r = await db().rpc("editor_add_recovery");
      if (r.error) throw r.error;
      return r.data as { email: string; state: string; updated_at: string }[];
    },
  });
  const capabilities = useQuery({
    queryKey: ["editor-add-capabilities"],
    enabled: dialog && role.data === "admin",
    retry: false,
    queryFn: async ({ signal }) => {
      const r = await db().functions.invoke("manage-editors", {
        body: { action: "capabilities", role: "editor" },
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
      if (
        r.error ||
        !r.data?.ok ||
        typeof r.data.invitations_enabled !== "boolean"
      )
        throw Error("Không kiểm tra được trạng thái gửi lời mời.");
      return { invitationsEnabled: r.data.invitations_enabled as boolean };
    },
  });
  function openAdd(value = "") {
    setEmail(value);
    setFeedback(null);
    setRequestId(crypto.randomUUID());
    setDialog(true);
  }
  async function mutate(body: {
    action: string;
    email?: string;
    user_id?: string;
    request_id?: string;
  }) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 35000);
    let failureCode = "outcome_unknown";
    try {
      const r = await db().functions.invoke("manage-editors", {
        body: { ...body, role: "editor" },
        signal: controller.signal,
      });
      if (r.error) {
        let message = accountMessages.outcome_unknown;
        if (r.error.context instanceof Response) {
          const detail = await r.error.context.json().catch(() => null);
          failureCode = detail?.code ?? "outcome_unknown";
          message =
            accountMessages[detail?.code] ??
            "Không thể hoàn tất. Kiểm tra trạng thái tài khoản trước khi thử lại.";
        }
        throw Error(message);
      }
      if (!r.data?.ok) {
        failureCode = r.data?.code ?? "outcome_unknown";
        throw Error(
          accountMessages[r.data?.code] ??
            "Chưa xác nhận được kết quả cập nhật quyền.",
        );
      }
      if (body.action === "add")
        setFeedback({
          text: accountResultMessage(r.data.state, r.data.account_status),
          success: true,
        });
      else {
        toast.success("Đã thu hồi quyền Editor");
        setDialog(false);
      }
      setTarget(null);
    } catch (e) {
      const text = controller.signal.aborted
        ? accountMessages.outcome_unknown
        : errorMessage(e);
      if (body.action === "add")
        setFeedback({
          text,
          success: false,
          recovery:
            controller.signal.aborted ||
            [
              "processing",
              "delivery_unknown",
              "grant_failed",
              "outcome_unknown",
              "request_failed",
            ].includes(failureCode),
        });
      else toast.error(text);
    } finally {
      window.clearTimeout(timer);
      await Promise.allSettled([directory.refetch(), recovery.refetch()]);
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (directory.isPending || role.isPending) return <Loading />;
  if (directory.error || role.error)
    return <ErrorState error={directory.error || role.error} />;
  const admin = role.data === "admin";
  const rows = (directory.data ?? []).filter(
    (r) =>
      r.email?.toLowerCase().includes(search.toLowerCase()) &&
      (!filter || r.role === filter),
  );
  return (
    <section className="admin">
      <div className="section-head">
        <div>
          <p className="section-label">Tài khoản & quyền truy cập</p>
          <h1>Quản lý vai trò</h1>
        </div>
        {admin && <button onClick={() => openAdd()}>Thêm tài khoản</button>}
      </div>
      <div className="role-summary">
        Admin quản lý tài khoản và nội dung. Editor quản lý sự kiện, thiệp và
        danh bạ khách mời.
      </div>
      <div className="toolbar">
        <label>
          Tìm email
          <input
            type="search"
            placeholder="Nhập email tài khoản"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Vai trò
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
          </select>
        </label>
      </div>
      {!admin && <p className="notice">Danh sách chỉ đọc.</p>}
      <div className="role-list">
        {rows.length ? (
          rows.map((r) => (
            <div className="panel role-row" key={r.user_id}>
              <div>
                <strong>{r.email}</strong>
                <p>
                  <span
                    className={`status ${r.role === "admin" ? "published" : ""}`}
                  >
                    {r.role === "admin" ? "Admin · Được bảo vệ" : "Editor"}
                  </span>{" "}
                  ·{" "}
                  {r.status === "invited"
                    ? "Chờ nhận lời mời"
                    : r.status === "confirmed"
                      ? "Đã xác nhận"
                      : "Chưa xác nhận"}
                </p>
              </div>
              {admin && r.role === "editor" && (
                <button className="secondary" onClick={() => setTarget(r)}>
                  Thu hồi Editor
                </button>
              )}
            </div>
          ))
        ) : (
          <p>Không có tài khoản phù hợp.</p>
        )}
      </div>
      {admin && (
        <section aria-label="Yêu cầu cần kiểm tra" className="role-recovery">
          {recovery.error && (
            <p role="alert">
              Không tải được trạng thái khôi phục. Chưa thể xác nhận các yêu cầu
              trước đó.{" "}
              <button
                className="secondary"
                onClick={() => void recovery.refetch()}
              >
                Tải lại trạng thái
              </button>
            </p>
          )}
          {!!recovery.data?.length && (
            <>
              <h2>Yêu cầu cần kiểm tra</h2>
              {recovery.data.map((item) => (
                <div className="panel role-row" key={item.email}>
                  <div>
                    <strong>{item.email}</strong>
                    <p>
                      {item.state === "sending" || item.state === "granting"
                        ? "Đang xử lý hoặc chưa nhận được kết quả"
                        : "Cần khôi phục"}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => openAdd(item.email)}
                  >
                    Kiểm tra và khôi phục
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
      )}
      {dialog && (
        <dialog
          ref={modal}
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setDialog(false);
          }}
          aria-label="Thêm tài khoản Editor"
        >
          <form
            className="panel role-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate({
                action: "add",
                email: email.trim(),
                request_id: requestId,
              });
            }}
          >
            <h2>Thêm tài khoản</h2>
            <p>
              Nhập email để hệ thống kiểm tra và cấp quyền Editor cho tài khoản
              đã có. Khi khôi phục yêu cầu, hệ thống không tự gửi lại email.
            </p>
            <div
              role="status"
              aria-label="Trạng thái gửi lời mời"
              aria-live="polite"
            >
              {capabilities.isFetching ? (
                <p>Đang kiểm tra trạng thái gửi lời mời…</p>
              ) : capabilities.error ? (
                <p>
                  Chưa kiểm tra được khả năng gửi lời mời. Hệ thống sẽ xác nhận
                  khi bạn thêm tài khoản.{" "}
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => void capabilities.refetch()}
                  >
                    Kiểm tra lại trạng thái
                  </button>
                </p>
              ) : capabilities.data?.invitationsEnabled ? (
                <p>Email mới sẽ được mời tham gia để hoàn tất tài khoản.</p>
              ) : (
                <p className="notice">
                  Gửi lời mời qua email đang tắt. Hiện chỉ thêm được tài khoản
                  đã tồn tại.
                </p>
              )}
            </div>
            <label>
              Email
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                disabled={busy}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFeedback(null);
                  setRequestId(crypto.randomUUID());
                }}
              />
            </label>
            <label>
              Vai trò
              <select value="editor" disabled>
                <option value="editor">Editor</option>
              </select>
            </label>
            <div
              role="status"
              aria-label="Kết quả thêm tài khoản"
              aria-live="polite"
            >
              {busy && <p>Đang kiểm tra tài khoản và xử lý quyền…</p>}
              {feedback && (
                <p
                  className={`role-feedback ${feedback.success ? "" : "error"}`}
                >
                  {feedback.text}
                </p>
              )}
            </div>
            <div className="actions">
              <button disabled={busy || feedback?.success === true}>
                {busy
                  ? "Đang xử lý…"
                  : feedback?.success
                    ? "Đã có quyền Editor"
                    : feedback?.recovery
                      ? "Kiểm tra và khôi phục"
                      : feedback
                        ? "Thử lại"
                        : "Thêm Editor"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setDialog(false)}
              >
                {feedback?.success ? "Đóng" : "Hủy"}
              </button>
            </div>
          </form>
        </dialog>
      )}
      {target && (
        <Confirm
          title="Thu hồi quyền Editor?"
          busy={busy}
          onClose={() => setTarget(null)}
          onConfirm={() =>
            void mutate({ action: "revoke", user_id: target.user_id })
          }
        >
          Tài khoản {target.email} sẽ mất quyền quản trị nội dung. Tài khoản
          đăng nhập vẫn được giữ.
        </Confirm>
      )}
    </section>
  );
}
