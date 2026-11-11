import { client } from "./lib/queryClient";
import { resolveInvitation } from "./features/events/api";

// Warm the existing cache while React's renderer downloads. Other URLs use the router.
const base = import.meta.env.BASE_URL;
const path = window.location.pathname;
const parts = path.startsWith(base)
  ? path.slice(base.length).replace(/\/$/, "").split("/")
  : [];
if (
  parts.length === 2 &&
  parts.every((part) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)) &&
  parts[0] !== "admin" &&
  parts[0] !== "auth"
) {
  const [eventCode, guestAlias] = parts;
  void client.prefetchQuery({
    queryKey: ["invitation", eventCode, guestAlias],
    queryFn: () => resolveInvitation(eventCode, guestAlias),
  });
}
