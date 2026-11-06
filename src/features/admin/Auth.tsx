import { Shield, CalendarDays, Users, LogOut } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Outlet, NavLink, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, supabase } from "../../lib/supabase";
import { ErrorState, Loading } from "../../components/Feedback";
const AuthContext = createContext<{
  session: Session | null;
  pending: boolean;
}>({ session: null, pending: true });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState(true);
  const cache = useQueryClient();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!supabase) {
      setPending(false);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextUser = next?.user.id ?? null;
      const changed =
        previousUser.current !== undefined && previousUser.current !== nextUser;
      previousUser.current = nextUser;
      setSession(next);
      setPending(false);
      if (changed)
        queueMicrotask(() => {
          void cache.resetQueries();
        });
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPending(false);
    });
    return () => subscription.unsubscribe();
  }, [cache]);
  return <AuthContext value={{ session, pending }}>{children}</AuthContext>;
}
export const useAuth = () => useContext(AuthContext);
export function AdminGuard() {
  const { session, pending } = useAuth();
  const location = useLocation();
  const check = useQuery({
    queryKey: ["admin", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db().rpc("can_edit_content");
      if (error) throw error;
      return data === true;
    },
  });
  if (pending || (session && check.isPending)) return <Loading />;
  if (!session)
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  if (check.error)
    return (
      <ErrorState error={check.error} retry={() => void check.refetch()} />
    );
  if (!check.data)
    return (
      <div className="state">
        <h1>Tài khoản chưa có quyền quản trị</h1>
        <p>Liên hệ người quản lý để được cấp quyền.</p>
        <button onClick={() => void db().auth.signOut()}>Đăng xuất</button>
      </div>
    );
  return <><nav className="admin-navigation" aria-label="Quản trị"><NavLink to="/admin/" end><CalendarDays size={18}/> Sự kiện</NavLink><NavLink to="/admin/guests"><Users size={18}/> Danh bạ khách mời</NavLink><NavLink to="/admin/roles"><Shield size={18}/> Quản lý vai trò</NavLink><button onClick={async()=>{const r=await db().auth.signOut();if(r.error)window.alert(r.error.message)}}><LogOut size={18}/> Đăng xuất</button></nav><Outlet /></>;
}
