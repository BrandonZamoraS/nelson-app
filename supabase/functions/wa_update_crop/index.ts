import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { updateCropRuntime } from "../../../lib/wa/crop-measurement-runtime.ts";
import {
  getCropOwnedByUser,
  insertAuditLog,
  waHandler,
} from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;
    return updateCropRuntime({
      body,
      phone,
      userId: user.id,
      loadCrop: async (ownerId, cropId) => await getCropOwnedByUser(supabase, ownerId, cropId),
      updateCrop: async (ownerId, cropId, patch) => {
        const { data, error } = await supabase
          .from("crops")
          .update(patch)
          .eq("id", cropId)
          .eq("user", ownerId)
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
