import { Link, createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
const Home = lazy(() => import("./pages/Home"));
import InvitationPage from "./pages/InvitationPage";
import { client } from "./lib/queryClient";
import { getEvent, resolveInvitation } from "./features/events/api";
const loadEventDetail = () => import("./pages/EventDetail");
const EventDetail = lazy(loadEventDetail);
const Login = lazy(() => import("./pages/Login"));
import { SiteLayout } from "./components/SiteLayout";
import { Loading } from "./components/Feedback";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EventForm = lazy(() => import("./pages/EventForm"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const RoleDirectory = lazy(() => import("./pages/RoleDirectory"));
const GuestDirectory = lazy(() => import("./pages/GuestDirectory"));
import { AdminGuard } from "./features/admin/Auth";
function Layout() {
  return <SiteLayout />;
}
export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      HydrateFallback: Loading,
      errorElement: (
        <div className="state">
          <h1>Không thể mở trang</h1>
          <a href={import.meta.env.BASE_URL}>Về trang chủ</a>
        </div>
      ),
      children: [
        { index: true, element: <Home /> },
        { path: "admin/login", element: <Login /> },
        {
          path: "auth/accept",
          element: (
            <Suspense fallback={<Loading />}>
              <AcceptInvitation />
            </Suspense>
          ),
        },
        {
          path: "auth/callback",
          element: (
            <Suspense fallback={<Loading />}>
              <AcceptInvitation />
            </Suspense>
          ),
        },
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
            {
              path: "admin/roles",
              element: (
                <Suspense fallback={<Loading />}>
                  <RoleDirectory />
                </Suspense>
              ),
            },
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
        ...["thiep-moi", "thiep-chuc"].flatMap((segment) => [
          {
            path: `${segment}/:eventCode/:guestAlias`,
            Component: InvitationPage,
            loader: ({
              params,
            }: {
              params: Record<string, string | undefined>;
            }) => {
              const { eventCode = "", guestAlias = "" } = params;
              void client.prefetchQuery({
                queryKey: ["invitation", eventCode, guestAlias],
                queryFn: () => resolveInvitation(eventCode, guestAlias),
              });
              return null;
            },
          },
          { path: `${segment}/:eventCode`, element: <EventDetail /> },
        ]),
        {
          path: ":eventCode/:guestAlias",
          Component: InvitationPage,
          loader: ({ params }) => {
            const { eventCode = "", guestAlias = "" } = params;
            // Keep data retries and errors in the existing query cache.
            void client.prefetchQuery({
              queryKey: ["invitation", eventCode, guestAlias],
              queryFn: () => resolveInvitation(eventCode, guestAlias),
            });
            return null;
          },
        },
        {
          path: ":eventCode",
          element: <EventDetail />,
          loader: ({ params }) => {
            const { eventCode = "" } = params;
            void loadEventDetail().catch(() => {});
            void client.prefetchQuery({
              queryKey: ["event", eventCode],
              queryFn: () => getEvent(eventCode),
            });
            return null;
          },
        },
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
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);
