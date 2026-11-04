import { errorMessage } from "../lib/supabase";
export function Loading() {
  return (
    <div className="state" role="status">
      <span className="loading-line" />
      Đang tải dữ liệu…
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="state error" role="alert">
      <h2>Không thể tải dữ liệu</h2>
      <p>{errorMessage(error)}</p>
      {retry && <button onClick={retry}>Thử lại</button>}
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="state">
      <h2>Chưa có nội dung</h2>
      <p>{children}</p>
    </div>
  );
}
