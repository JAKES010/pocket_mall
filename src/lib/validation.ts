import { z } from "zod";
import { ApiError } from "@/lib/api";

export const emailSchema = z.string().trim().toLowerCase().email().max(120);
export const passwordSchema = z.string().min(8).max(200);
export const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+0-9 ()-]+$/, "Enter a valid phone number.");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  display_name: z.string().trim().min(2).max(60),
  phone: phoneSchema.optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const cartItemSchema = z.object({
  menu_item_id: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const quoteSchema = z.object({
  vendor_id: z.string().min(1),
  fulfilment: z.enum(["pickup", "delivery"]),
  zone_id: z.string().min(1).nullable().optional(),
  delivery_address: z.string().trim().max(300).optional(),
  contact_phone: phoneSchema,
  items: z.array(cartItemSchema).min(1).max(30),
});

export const placeOrderSchema = z.object({
  quote_id: z.string().min(1),
  idempotency_key: z.string().min(8).max(100),
  confirm: z.literal(true),
});

export const topUpSchema = z.object({
  amount_kobo: z.number().int().min(10_000).max(5_000_000),
  idempotency_key: z.string().min(8).max(100),
});

export const transitionSchema = z.object({
  action: z.enum([
    "accept",
    "reject",
    "cancel",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
  ]),
  reason: z.string().trim().max(300).optional(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const assistantSchema = z.object({
  mode: z.enum(["discovery", "vendor_order"]),
  message: z.string().trim().min(2).max(500),
  vendor_id: z.string().min(1).optional(),
  zone_id: z.string().min(1).nullable().optional(),
  cart: z.array(cartItemSchema).max(30).optional(),
  conversation_id: z.string().min(1).optional(),
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const vendorCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(3).max(60).regex(slugRegex, "Use lowercase letters, numbers and hyphens."),
  description: z.string().trim().max(500).default(""),
  address: z.string().trim().min(3).max(200),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Use international format without +, e.g. 2348012345678."),
  opening_hours: z.string().trim().min(3).max(120),
  emoji: z.string().trim().min(1).max(8).default("🍲"),
  zones: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(60),
        fee_kobo: z.number().int().min(0).max(500_000),
      }),
    )
    .max(10)
    .default([]),
});

export const vendorUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  address: z.string().trim().min(3).max(200).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/)
    .optional(),
  opening_hours: z.string().trim().min(3).max(120).optional(),
  accepting_orders: z.boolean().optional(),
  publish: z.boolean().optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
});

export const menuItemCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).default(""),
  tags: z.string().trim().max(200).default(""),
  price_kobo: z.number().int().min(0).max(10_000_000),
  available: z.boolean().default(true),
  image_url: z.string().trim().max(300).optional(),
});

export const menuItemUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(400).optional(),
  tags: z.string().trim().max(200).optional(),
  price_kobo: z.number().int().min(0).max(10_000_000).optional(),
  available: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export const zoneCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  fee_kobo: z.number().int().min(0).max(500_000),
});

export const zoneUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  fee_kobo: z.number().int().min(0).max(500_000).optional(),
  active: z.boolean().optional(),
});

export function parseWith<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(
      422,
      "INVALID_INPUT",
      result.error.issues[0]?.message ?? "Invalid input.",
      result.error.issues,
    );
  }
  return result.data;
}
