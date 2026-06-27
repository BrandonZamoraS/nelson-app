import { z } from "zod";

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

export const listPaymentsInputSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const createManualPaymentFormSchema = z.object({
  subscription_id: z.string().uuid(),
  amount_usd: z.coerce.number().positive(),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  external_ref: z.string().trim().optional(),
});

export type CreateManualPaymentFormInput = z.infer<
  typeof createManualPaymentFormSchema
>;

export type CreateManualPaymentInput = {
  subscription_id: string;
  amount_cents: number;
  paid_at: string;
  external_ref?: string;
};

export const updatePaymentStatusInputSchema = z.object({
  payment_id: z.string().uuid(),
  status: z.enum(PAYMENT_STATUSES),
});

export type UpdatePaymentStatusInput = z.infer<
  typeof updatePaymentStatusInputSchema
>;
