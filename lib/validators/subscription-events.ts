import { z } from "zod";

import {
  SUBSCRIPTION_EVENT_SOURCES,
  SUBSCRIPTION_EVENT_TYPES,
} from "@/lib/domain/subscription-events";
import { SUBSCRIPTION_STATUSES } from "@/lib/types/domain";
import { normalizePhoneNumber } from "@/lib/utils/phone";

const isoTimestampSchema = z.string().datetime({ offset: true });
const uuidSchema = z.string().uuid();

const rawSubscriptionEventInputSchema = z.object({
  idempotency_key: z.string().trim().min(3),
  event_type: z.enum(SUBSCRIPTION_EVENT_TYPES),
  source: z.enum(SUBSCRIPTION_EVENT_SOURCES),
  subscription_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  amount_cents: z.coerce.number().int().positive().optional(),
  currency: z.literal("USD").default("USD"),
  occurred_at: isoTimestampSchema,
  paid_at: isoTimestampSchema.nullable().optional(),
  whatsapp: z.string().trim().optional(),
  full_name: z.string().trim().min(3).optional(),
  plan: z.string().trim().min(2).optional(),
  target_status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const subscriptionEventInputSchema = rawSubscriptionEventInputSchema
  .superRefine((data, ctx) => {
    if (
      ["payment_succeeded", "payment_failed", "payment_refunded"].includes(data.event_type)
    ) {
      if (data.amount_cents == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount_cents"],
          message: "Monto requerido.",
        });
      }
    }

    if (data.event_type === "payment_succeeded" && !data.paid_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paid_at"],
        message: "paid_at requerido para pagos exitosos.",
      });
    }

    if (data.event_type === "manual_status_change" && !data.target_status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target_status"],
        message: "Estado objetivo requerido.",
      });
    }
  })
  .transform((data, ctx) => {
    if (!data.whatsapp) {
      return data;
    }

    const normalized = normalizePhoneNumber(data.whatsapp);
    if (!normalized.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsapp"],
        message: normalized.message,
      });
      return z.NEVER;
    }

    return {
      ...data,
      whatsapp: normalized.value,
    };
  });

export type SubscriptionEventInput = z.infer<typeof subscriptionEventInputSchema>;
