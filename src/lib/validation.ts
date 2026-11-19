import { z } from "zod";
import { validQuoteDocument } from "./quoteDocument";
import { isAgendaIcon } from "./agendaIcons";
import { reservedCodes, safeMapUrl } from "./domain";
import { themeSchema } from "./eventTheme";
export const codeSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Chỉ dùng chữ thường không dấu, số và dấu gạch nối.",
  )
  .min(1)
  .max(80)
  .refine((v) => !reservedCodes.includes(v), "Mã này được dành cho hệ thống.");
export const aliasSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Alias chỉ gồm chữ thường không dấu, số, dấu gạch nối.",
  )
  .min(1)
  .max(80);
export const eventSchema = z
  .object({
    event_type: z.enum(["invitation", "congratulation"]).optional(),
    theme: themeSchema.optional(),
    code: z.union([codeSchema, z.literal("")]),
    title: z.string().trim().min(1, "Vui lòng nhập tên sự kiện.").max(240),
    description: z.string().max(10000),
    description_rich: z
      .unknown()
      .optional()
      .refine((v) => validQuoteDocument(v), "Mô tả quá dài hoặc không hợp lệ."),
    music_path: z.string().max(500).nullable().optional(),
    quote_one: z.string().max(5000).optional(),
    quote_two: z
      .unknown()
      .optional()
      .refine(
        (v) => validQuoteDocument(v),
        "Quote 2 quá dài hoặc không hợp lệ.",
      ),
    starts_at: z.string().nullable(),
    ends_at: z.string().nullable(),
    status: z.enum(["draft", "published"]),
    venue_name: z.string().max(240),
    address: z.string().max(1000),
    directions: z.string().max(3000),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    place_id: z.string(),
    location_method: z.enum(["url", "place"]).optional(),
    venue_image_path: z.string().nullable().optional(),
    agenda: z
      .array(
        z
          .object({
            time: z
              .string()
              .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Nhập giờ HH:mm hợp lệ."),
            end_time: z
              .string()
              .regex(
                /^([01]\d|2[0-3]):[0-5]\d$/,
                "Nhập giờ kết thúc HH:mm hợp lệ.",
              )
              .nullable()
              .optional(),
            icon: z
              .string()
              .refine(isAgendaIcon, "Icon không hợp lệ.")
              .nullable()
              .optional(),
            description: z
              .string()
              .trim()
              .min(1, "Nhập nội dung chương trình.")
              .max(1000),
            highlight: z.boolean(),
          })
          .refine((v) => !v.end_time || v.end_time > v.time, {
            path: ["end_time"],
            message: "Giờ kết thúc phải sau giờ bắt đầu.",
          }),
      )
      .max(100)
      .optional(),
    maps_url: z
      .string()
      .refine(
        (v) => !v || safeMapUrl(v) !== null,
        "Dùng liên kết HTTPS Google Maps hợp lệ.",
      ),
  })
  .refine(
    (v) =>
      v.event_type === "congratulation" ||
      v.location_method !== "url" ||
      Boolean(v.maps_url),
    {
      path: ["maps_url"],
      message: "Nhập liên kết Google Maps.",
    },
  )
  .refine(
    (v) =>
      v.event_type === "congratulation" ||
      v.location_method !== "place" ||
      /^[A-Za-z0-9_-]{5,255}$/.test(v.place_id),
    { path: ["place_id"], message: "Nhập Google Place ID hợp lệ." },
  )
  .refine(
    (v) =>
      v.event_type === "congratulation" ||
      (!!v.starts_at && Number.isFinite(Date.parse(v.starts_at))),
    {
      path: ["starts_at"],
      message: "Thời gian bắt đầu không hợp lệ.",
    },
  )
  .refine(
    (v) =>
      v.event_type === "congratulation" ||
      (!!v.ends_at &&
        !!v.starts_at &&
        Date.parse(v.ends_at) > Date.parse(v.starts_at)),
    {
      path: ["ends_at"],
      message: "Kết thúc phải sau thời gian bắt đầu.",
    },
  )
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    path: ["longitude"],
    message: "Nhập cả vĩ độ và kinh độ.",
  });
