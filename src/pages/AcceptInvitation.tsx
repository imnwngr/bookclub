import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/admin/Auth";
import { authRedirectFailed, db, errorMessage } from "../lib/supabase";
import { Loading } from "../components/Feedback";

export default function AcceptInvitation() {
  const { session, pending } = useAuth(),
    navigate = useNavigate();
  const [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const inFlight = useRef(false);
  if (pending) return <Loading />;
  if (authRedirectFailed || !session)
    return (
      <section className="state">
        <h1>Lời mời chưa hợp lệ hoặc đã hết hạn</h1>
        <p>
          Liên kết có thể đã được dùng hoặc hết hạn. Nếu đã hoàn tất tài khoản,
          hãy đăng nhập. Nếu chưa, liên hệ Admin để kiểm tra và khôi phục quyền;
          không cần tạo thêm tài khoản.
        </p>
        <Link to="/admin/login">Đăng nhập</Link>
      </section>
    );
  return (
    <form
      className="panel accept-invitation"
      onSubmit={async (e) => {
        e.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        setError("");
        try {
          const result = await db().auth.updateUser({ password });
          if (result.error) throw result.error;
          setPassword("");
          navigate("/admin/", { replace: true });
        } catch (reason) {
          setError(errorMessage(reason));
        } finally {
          inFlight.current = false;
          setBusy(false);
        }
      }}
    >
      <h1>Hoàn tất tài khoản</h1>
      <p>
        Đặt mật khẩu để đăng nhập quản lý sự kiện. Quyền Editor do Admin cấp
        được kiểm tra lại khi bạn tiếp tục.
      </p>
      <label>
        Mật khẩu mới
        <input
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="password-hint"
        />
      </label>
      <small id="password-hint">Ít nhất 10 ký tự.</small>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>
        {busy ? "Đang lưu…" : "Lưu mật khẩu và tiếp tục"}
      </button>
    </form>
  );
}
