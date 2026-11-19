import { createContext, useContext, useEffect } from "react";
import type { EventTheme } from "../types/domain";
import { normalizeTheme } from "../lib/eventTheme";

export const EventThemeContext = createContext<
  (value: EventTheme | null) => void
>(() => {});
export function useEventTheme(value: unknown, enabled: boolean) {
  const setTheme = useContext(EventThemeContext);
  const primary = normalizeTheme(value).primary;
  useEffect(() => {
    if (enabled) setTheme({ version: 1, primary });
    return () => setTheme(null);
  }, [enabled, primary, setTheme]);
}
