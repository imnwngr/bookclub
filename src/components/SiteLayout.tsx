import { Suspense, useEffect, useRef } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Loading } from "./Feedback";
import { BookClubLogo } from "./BookClubLogo";

export function SiteLayout() {
  const location = useLocation();
  const menu = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const previous = useRef(location.pathname);
  const isAdmin =
    location.pathname.startsWith("/admin") &&
    location.pathname !== "/admin/login";
  const isInvitation =
    !location.pathname.startsWith("/admin") &&
    !location.pathname.startsWith("/auth") &&
    location.pathname.split("/").filter(Boolean).length === 2;
  useEffect(() => {
    menu.current?.close();
    if (previous.current !== location.pathname) {
      if (!location.hash) window.scrollTo({ top: 0, behavior: "instant" });
      main.current?.focus({ preventScroll: true });
      previous.current = location.pathname;
    }
  }, [location.pathname, location.hash]);
  return (
    <div
      className={`site ${isAdmin ? "site-admin" : ""} ${isInvitation ? "site-invitation" : ""}`}
    >
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="BookClub CTUT, trang chủ">
          <BookClubLogo className="brand-glyph" decorative />
          <span>
            BookClub<small>CTUT · Cần Thơ</small>
          </span>
        </Link>
        <nav className="desktop-navigation" aria-label="Điều hướng chính">
          <NavLink to="/" end>
            Sự kiện
          </NavLink>
          <NavLink className="admin-link" to="/admin/">
            Quản lý sự kiện <ArrowUpRight size={16} aria-hidden="true" />
          </NavLink>
        </nav>
        <button
          className="mobile-menu secondary icon-button"
          aria-label="Mở menu điều hướng"
          aria-haspopup="dialog"
          onClick={() => menu.current?.showModal()}
        >
          <Menu size={22} />
        </button>
      </header>
      <dialog
        ref={menu}
        className="navigation-dialog"
        aria-label="Điều hướng chính"
      >
        <div className="navigation-dialog-head">
          <strong>BookClub CTUT</strong>
          <button
            className="secondary icon-button"
            aria-label="Đóng menu"
            onClick={() => menu.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <nav>
          <NavLink to="/" end onClick={() => menu.current?.close()}>
            Sự kiện
          </NavLink>
          <NavLink to="/admin/" onClick={() => menu.current?.close()}>
            Quản lý sự kiện
          </NavLink>
        </nav>
        <p>Câu lạc bộ Sinh viên Yêu thích Sách</p>
      </dialog>
      <main ref={main} id="main" tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
        <div className="footer-signature" aria-hidden="true">
          BookClub<span>CTUT</span>
        </div>
        <div className="footer-bottom">
          <p>
            Câu lạc bộ Sinh viên Yêu thích Sách
            <br />
            Trường Đại học Kỹ thuật – Công nghệ Cần Thơ
          </p>
          <Link to="/">Hẹn nhau giữa những trang sách.</Link>
        </div>
      </footer>
    </div>
  );
}
