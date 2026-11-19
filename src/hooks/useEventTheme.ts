import { createContext, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { EventTheme } from "../types/domain";
import { normalizeTheme } from "../lib/eventTheme";

export type RouteEventTheme = { locationKey: string; theme: EventTheme };
export const EventThemeContext = createContext<
  (value: RouteEventTheme | null) => void
>(() => {});
export function useEventTheme(value: unknown, enabled: boolean) {
  const { key: locationKey } = useLocation();
  const setTheme = useContext(EventThemeContext);
  const primary = normalizeTheme(value).primary;
  useEffect(() => {
    if (enabled) setTheme({ locationKey, theme: { version: 1, primary } });
    return () => setTheme(null);
  }, [enabled, primary, setTheme, locationKey]);
}
