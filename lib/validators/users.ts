import { z } from "zod";

import { SUBSCRIPTION_STATUSES } from "@/lib/types/domain";
import { normalizePhoneNumber } from "@/lib/utils/phone";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa formato YYYY-MM-DD.");

const amountCentsSchema = z.coerce.number().int().positive("Monto invalido.");
const dollarAmountPattern = /^\d+(?:[.,]\d{1,2})?$/;

export type DollarAmountToCentsResult =
  | { ok: true; value: number }
  | { ok: false };

export function parseDollarAmountToCents(
  input: string,
): DollarAmountToCentsResult {
  const trimmed = input.trim();
  if (!dollarAmountPattern.test(trimmed)) {
    return { ok: false };
  }

  const [dollars, cents = ""] = trimmed.replace(",", ".").split(".");
  const value = Number.parseInt(dollars, 10) * 100 +
    Number.parseInt(cents.padEnd(2, "0") || "0", 10);

  return value > 0 ? { ok: true, value } : { ok: false };
}

const dollarAmountCentsSchema = z.string().transform((value, ctx) => {
  const parsed = parseDollarAmountToCents(value);
  if (!parsed.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Monto invalido.",
    });
    return z.NEVER;
  }

  return parsed.value;
});

const baseUserInputFields = {
  full_name: z.string().trim().min(3, "Nombre demasiado corto."),
  whatsapp: z.string().trim(),
  whatsapp_country: z.string().trim().length(2).optional(),
  plan: z.string().trim().min(2, "Plan requerido."),
  amount_cents: amountCentsSchema,
  start_date: isoDateSchema,
  source: z.string().trim().min(2, "Origen requerido.").default("manual"),
};

const baseUserFormInputFields = {
  ...baseUserInputFields,
  amount_cents: dollarAmountCentsSchema,
};

function normalizeWhatsapp<T extends { whatsapp: string; whatsapp_country?: string }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  const normalized = normalizePhoneNumber(data.whatsapp, data.whatsapp_country);

  if (!normalized.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["whatsapp"],
      message: normalized.message,
    });
    return z.NEVER;
  }

  const rest = { ...data };
  delete rest.whatsapp_country;

  return {
    ...rest,
    whatsapp: normalized.value,
  };
}

export const createUserInputSchema = z
  .object({
    ...baseUserInputFields,
    status: z.enum(SUBSCRIPTION_STATUSES).default("activa"),
    next_billing_date: isoDateSchema.nullable().optional(),
  })
  .transform((data, ctx) => normalizeWhatsapp(data, ctx));

export const createUserFormInputSchema = z
  .object({
    ...baseUserFormInputFields,
    status: z.enum(SUBSCRIPTION_STATUSES).default("activa"),
    next_billing_date: isoDateSchema.nullable().optional(),
  })
  .transform((data, ctx) => normalizeWhatsapp(data, ctx));

export const updateUserInputSchema = z
  .object({
    ...baseUserInputFields,
    status: z.enum(SUBSCRIPTION_STATUSES),
    next_billing_date: isoDateSchema.nullable(),
  })
  .transform((data, ctx) => normalizeWhatsapp(data, ctx));

export const updateUserFormInputSchema = z
  .object({
    ...baseUserFormInputFields,
    status: z.enum(SUBSCRIPTION_STATUSES),
    next_billing_date: isoDateSchema.nullable(),
  })
  .transform((data, ctx) => normalizeWhatsapp(data, ctx));

export const listUsersInputSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
