import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, errorMessage, configured } from "../lib/supabase";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <section className="login panel">
      <p className="section-label">Dành cho ban quản trị</p>
      <h1>Quản lý BookClub</h1>
      <p>Đăng nhập bằng tài khoản đã được cấp quyền.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { error } = await db().auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
            navigate("/admin/", { replace: true });
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {!configured && (
          <p role="alert">
            Chưa cấu hình dịch vụ đăng nhập. Vui lòng liên hệ ban quản trị.
          </p>
        )}
        <button disabled={busy || !configured}>
          {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
    </section>
  );
}
