import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createCropRuntime } from "../../../lib/wa/crop-measurement-runtime.ts";
import { insertAuditLog, waHandler } from "../_shared/wa.ts";

// measurement_unit must be one of: kg, lb, quintal, cajuela

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;
    return createCropRuntime({
      body,
      phone,
      userId: user.id,
      insertCrop: async (payload) => {
        const { data, error } = await supabase
          .from("crops")
          .insert(payload)
          .select("id, created_at, description, size, budget, measurement_unit, start_date, end_date")
          .single();

        return { data, error };
      },
      audit: async (entry) => {
        await insertAuditLog(supabase, entry);
      },
    });
  })
);
