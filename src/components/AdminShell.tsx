import { useRef } from "react";
import "../styles/admin.css";
import "../styles/controls.css";
import {
  CalendarDays,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { db, errorMessage } from "../lib/supabase";

export function AdminShell() {
  const drawer = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const current = pathname.includes("/guests")
    ? "Danh bạ khách mời"
    : pathname.includes("/roles")
      ? "Quản lý vai trò"
      : pathname.includes("/new")
        ? "Thêm sự kiện"
        : pathname.includes("/edit/")
          ? "Chỉnh sửa sự kiện"
          : "Sự kiện";
  function navigation() {
    return (
      <nav className="admin-navigation" aria-label="Quản trị">
        <NavLink to="/admin/" end onClick={() => drawer.current?.close()}>
          <CalendarDays size={19} aria-hidden="true" />
          Sự kiện
        </NavLink>
        <NavLink to="/admin/guests" onClick={() => drawer.current?.close()}>
          <Users size={19} aria-hidden="true" />
          Danh bạ khách mời
        </NavLink>
        <NavLink to="/admin/roles" onClick={() => drawer.current?.close()}>
          <Shield size={19} aria-hidden="true" />
          Quản lý vai trò
        </NavLink>
        <button
          className="admin-logout"
          onClick={async () => {
            try {
              const result = await db().auth.signOut();
              if (result.error) throw result.error;
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
        >
          <LogOut size={19} aria-hidden="true" />
          Đăng xuất
        </button>
      </nav>
    );
  }
  return (
    <>
      <Toaster richColors position="top-right" closeButton />
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <p className="section-label">Không gian quản trị</p>
          {navigation()}
          <div className="sidebar-foot">
            <span>Sự kiện Hội Sinh viên CTUT</span>
            <Link to="/">
              Xem trang công khai <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </aside>
        <div className="admin-workspace">
          <div className="admin-breadcrumb">
            <button
              className="secondary admin-drawer-trigger"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <Menu size={18} aria-hidden="true" />
              Điều hướng
            </button>
            <span>
              Quản trị <span aria-hidden="true">/</span>{" "}
              <strong>{current}</strong>
            </span>
          </div>
          <Outlet />
        </div>
        <dialog
          className="admin-drawer"
          ref={drawer}
          aria-label="Điều hướng quản trị"
        >
          <div className="navigation-dialog-head">
            <strong>Sự kiện Hội Sinh viên CTUT</strong>
            <button
              className="secondary icon-button"
              aria-label="Đóng điều hướng"
              onClick={() => drawer.current?.close()}
            >
              <X size={20} />
            </button>
          </div>
          {navigation()}
        </dialog>
      </div>
    </>
  );
}
