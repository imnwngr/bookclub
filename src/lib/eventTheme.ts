import type { CSSProperties } from "react";
import { z } from "zod";
import type { EventTheme } from "../types/domain";

export const DEFAULT_THEME: EventTheme = { version: 1, primary: "#174b78" };
export const themeSchema = z
  .object({
    version: z.literal(1),
    primary: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Dùng mã màu gồm # và 6 ký tự hex."),
  })
  .strict();
export const themePresets = [
  { name: "Xanh Hội", primary: "#174b78" },
  { name: "Lá xanh", primary: "#173f36" },
  { name: "Đỏ son", primary: "#873c42" },
  { name: "Tím mực", primary: "#614478" },
  { name: "Hổ phách", primary: "#9b6727" },
];
export function normalizeTheme(value: unknown): EventTheme {
  const parsed = themeSchema.safeParse(value);
  return parsed.success
    ? { version: 1, primary: parsed.data.primary.toLowerCase() }
    : { ...DEFAULT_THEME };
}
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function mixColor(color: string, other: string, amount: number) {
  const a = rgb(color),
    b = rgb(other);
  return (
    "#" +
    a
      .map((v, i) =>
        Math.round(v * (1 - amount) + b[i] * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function contrast(a: string, b: string) {
  const luminance = (c: string) =>
    rgb(c)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function themeStyle(value: unknown): CSSProperties {
  const { primary } = normalizeTheme(value);
  let brand = primary;
  // Keep white controls and dark lettering readable even for near-white selections.
  for (let i = 0; contrast(brand, "#ffffff") < 7 && i < 40; i++)
    brand = mixColor(brand, "#000000", 0.08);
  return {
    "--event-primary": primary,
    "--brand": brand,
    "--brand-hover": mixColor(brand, "#000000", 0.14),
    "--forest": mixColor(brand, "#000000", 0.35),
    "--ink": mixColor(brand, "#000000", 0.6),
    "--muted": mixColor(brand, "#ffffff", 0.12),
    "--paper": mixColor(primary, "#fffdf8", 0.96),
    "--surface": "#fffdf8",
    "--surface-muted": mixColor(primary, "#fffdf8", 0.9),
    "--selected": mixColor(primary, "#ffffff", 0.9),
    "--sage": mixColor(primary, "#ffffff", 0.85),
    "--material-night": mixColor(brand, "#000000", 0.65),
    "--material-emerald-light": brand,
    "--material-emerald-shade": mixColor(brand, "#000000", 0.5),
    "--material-emerald":
      "var(--material-linen), radial-gradient(ellipse at 14% 4%, #ffffff12, transparent 62%), linear-gradient(125deg, var(--material-emerald-light) -55%, var(--brand) 26%, var(--material-emerald-shade))",
    "--material-paper":
      "var(--material-paper-fiber), radial-gradient(ellipse at 16% 0%, #ffffffb3, transparent 70%), linear-gradient(105deg, var(--paper), var(--surface) 30%, var(--paper) 99%, var(--material-paper-edge))",
  } as CSSProperties;
}
