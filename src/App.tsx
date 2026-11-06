import { Outlet, Link, createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import InvitationPage from "./pages/InvitationPage";
import Login from "./pages/Login";
import { Loading } from "./components/Feedback";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EventForm = lazy(() => import("./pages/EventForm"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const RoleDirectory = lazy(() => import("./pages/RoleDirectory"));
const GuestDirectory = lazy(() => import("./pages/GuestDirectory"));
import { AdminGuard } from "./features/admin/Auth";
function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <Link className="wordmark" to="/">
          BookClub<span>CTUT · Cần Thơ</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <Link to="/">Sự kiện</Link>
          <Link className="admin-link" to="/admin/">
            Quản lý sự kiện
          </Link>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <strong>BookClub CTUT</strong>
        <p>
          Câu lạc bộ Sinh viên Yêu thích Sách
          <br />
          Trường Đại học Kỹ thuật – Công nghệ Cần Thơ
        </p>
      </footer>
    </>
  );
}
export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      errorElement: (
        <div className="state">
          <h1>Không thể mở trang</h1>
          <a href="/bookclub/">Về trang chủ</a>
        </div>
      ),
      children: [
        { index: true, element: <Home /> },
        { path: "admin/login", element: <Login /> },
        { path: "auth/accept", element: <Suspense fallback={<Loading />}><AcceptInvitation /></Suspense> },
        {
          element: <AdminGuard />,
          children: [
            {
              path: "admin",
              element: (
                <Suspense fallback={<Loading />}>
                  <Dashboard />
                </Suspense>
              ),
            },
            {
              path: "admin/new",
              element: (
                <Suspense fallback={<Loading />}>
                  <EventForm />
                </Suspense>
              ),
            },
            {
              path: "admin/edit/:eventCode",
              element: (
                <Suspense fallback={<Loading />}>
                  <EventForm />
                </Suspense>
              ),
            },
            { path: "admin/roles", element: <Suspense fallback={<Loading />}><RoleDirectory /></Suspense> },
            {
              path: "admin/guests",
              element: (
                <Suspense fallback={<Loading />}>
                  <GuestDirectory />
                </Suspense>
              ),
            },
          ],
        },
        { path: ":eventCode/:guestAlias", element: <InvitationPage /> },
        { path: ":eventCode", element: <EventDetail /> },
        {
          path: "*",
          element: (
            <div className="state">
              <h1>Không tìm thấy trang</h1>
              <Link to="/">Về trang chủ</Link>
            </div>
          ),
        },
      ],
    },
  ],
  { basename: "/bookclub" },
);
