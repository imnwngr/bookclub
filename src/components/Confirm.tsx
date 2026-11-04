import { useEffect, useRef } from "react";
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">{title}</h2>
      <p>{children}</p>
      <div className="actions">
        <button
          autoFocus
          disabled={busy}
          className="secondary"
          onClick={onClose}
        >
          Hủy
        </button>
        <button disabled={busy} className="danger" onClick={onConfirm}>
          {busy ? "Đang xử lý…" : "Xác nhận"}
        </button>
      </div>
    </dialog>
  );
}
