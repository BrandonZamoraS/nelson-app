import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { buildCropBudgetStatusRuntime } from "../../../lib/wa/crop-measurement-runtime.ts";
import { getCropOwnedByUser, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx, body }) => {
    const user = ctx.user!;
    return buildCropBudgetStatusRuntime({
      body,
      contentType: req.headers.get("content-type") ?? "",
      userId: user.id,
      loadCrop: async (ownerId, cropId) => await getCropOwnedByUser(supabase, ownerId, cropId),
      listExpensesByCropId: async (cropId) => {
        const { data, error } = await supabase
          .from("expenses")
          .select("amount")
          .eq("crop_id", cropId);
        if (error) {
          throw error;
        }
        return (data ?? []) as Array<{ amount: unknown }>;
      },
    });
  })
);
