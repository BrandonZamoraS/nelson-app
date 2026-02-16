import { z } from "zod";

import { SUBSCRIPTION_STATUSES } from "@/lib/types/domain";

export const listSubscriptionsInputSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const patchSubscriptionStatusInputSchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES),
});

export type PatchSubscriptionStatusInput = z.infer<
  typeof patchSubscriptionStatusInputSchema
>;
