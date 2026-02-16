import { z } from "zod";

export const auditFilterInputSchema = z.object({
  action: z.string().trim().optional(),
  entity_type: z.string().trim().optional(),
  entity_id: z.string().trim().optional(),
  result: z.enum(["ok", "error"]).optional(),
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type AuditFilterInput = z.infer<typeof auditFilterInputSchema>;
