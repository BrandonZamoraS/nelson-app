import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { buildCompareFinishedCropsCostsRuntime } from "../../../lib/wa/crop-measurement-runtime.ts";
import { getCropOwnedByUser, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx, body }) => {
    const user = ctx.user!;
    return buildCompareFinishedCropsCostsRuntime({
      body,
      contentType: req.headers.get("content-type") ?? "",
      userId: user.id,
      loadCrop: async (ownerId, cropId) => await getCropOwnedByUser(supabase, ownerId, cropId),
      listExpensesForCropIds: async (cropIds) => {
        const { data, error } = await supabase
          .from("expenses")
          .select("amount,crop_id")
          .in("crop_id", cropIds);
        if (error) {
          throw error;
        }
        return (data ?? []) as Array<{ amount: unknown; crop_id: unknown }>;
      },
    });
  })
);
