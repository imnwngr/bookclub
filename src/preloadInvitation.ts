import { client } from "./lib/queryClient";
import { resolveInvitation } from "./features/events/api";

// Warm the existing cache while React's renderer downloads. Other URLs use the router.
const base = import.meta.env.BASE_URL;
const path = window.location.pathname;
let parts = path.startsWith(base)
  ? path.slice(base.length).replace(/\/$/, "").split("/")
  : [];
if (parts.length === 3 && ["thiep-moi", "thiep-chuc"].includes(parts[0]))
  parts = parts.slice(1);
if (
  parts.length === 2 &&
  parts.every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)) &&
  parts[0] !== "admin" &&
  parts[0] !== "auth" &&
  parts[0] !== "thiep-moi" &&
  parts[0] !== "thiep-chuc"
) {
  const [eventCode, guestAlias] = parts;
  void client.prefetchQuery({
    queryKey: ["invitation", eventCode, guestAlias],
    queryFn: () => resolveInvitation(eventCode, guestAlias),
  });
}
