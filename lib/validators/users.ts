import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js";

import { SUBSCRIPTION_STATUSES } from "@/lib/types/domain";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa formato YYYY-MM-DD.");

// Custom phone number validator that parses and formats international numbers
const phoneNumberSchema = z
  .string()
  .trim()
  .min(8, "Número de teléfono demasiado corto.")
  .transform((val, ctx) => {
    try {
      // Try to parse the phone number
      const phoneNumber = parsePhoneNumber(val);
      
      if (!phoneNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número de teléfono inválido.",
        });
        return z.NEVER;
      }

      // Check if the number is valid
      if (!phoneNumber.isValid()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número de teléfono inválido para el país detectado.",
        });
        return z.NEVER;
      }

      // Return the number in E.164 format (e.g., +5493514558821)
      return phoneNumber.format("E.164");
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Formato de número de teléfono inválido. Use formato internacional (ej: +54 9 351 455 8821).",
      });
      return z.NEVER;
    }
  });

export const createUserInputSchema = z.object({
  full_name: z.string().trim().min(3, "Nombre demasiado corto."),
  whatsapp: phoneNumberSchema,
  plan: z.string().trim().min(2, "Plan requerido."),
  amount_cents: z.coerce.number().int().positive("Monto invalido."),
  status: z.enum(SUBSCRIPTION_STATUSES).default("activa"),
  start_date: isoDateSchema,
  next_billing_date: isoDateSchema.nullable().optional(),
  source: z.string().trim().min(2, "Origen requerido.").default("manual"),
});

export const updateUserInputSchema = z.object({
  full_name: z.string().trim().min(3, "Nombre demasiado corto."),
  whatsapp: phoneNumberSchema,
  plan: z.string().trim().min(2, "Plan requerido."),
  amount_cents: z.coerce.number().int().positive("Monto invalido."),
  status: z.enum(SUBSCRIPTION_STATUSES),
  start_date: isoDateSchema,
  next_billing_date: isoDateSchema.nullable(),
  source: z.string().trim().min(2, "Origen requerido."),
});

export const listUsersInputSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
