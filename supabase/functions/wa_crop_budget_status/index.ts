import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { getCropOwnedByUser, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx, body }) => {
    const user = ctx.user!;
    const contentType = req.headers.get("content-type") ?? "";
    const supportsFormBody = contentType.includes("application/x-www-form-urlencoded");
    const cropIdRaw = body?.crop_id;
    const parsedCropId = coercePositiveIntId(cropIdRaw);

    if (!parsedCropId.ok) {
      return jsonErr(400, "invalid_crop_id", "crop_id is required");
    }

    const crop = await getCropOwnedByUser(supabase, user.id, parsedCropId.value);
    if (!crop) return jsonErr(404, "crop_not_found", "Crop not found");
    if (crop.budget == null || crop.budget <= 0) {
      return jsonErr(400, "missing_budget", "Crop budget is required");
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("amount")
      .eq("crop_id", parsedCropId.value);
    if (error) return jsonErr(500, "db_error", "Failed to load expenses", error);

    const spentAmount = ((data ?? []) as Array<{ amount: unknown }>).reduce(
      (sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0),
      0,
    );
    const remainingAmount = crop.budget - spentAmount;

    return jsonOk({
      budget_status: {
        crop_id: parsedCropId.value,
        budget: crop.budget,
        spent_amount: spentAmount,
        remaining_amount: remainingAmount,
        over_budget: remainingAmount < 0,
        supports_form_body: supportsFormBody,
      },
      expense_summary: { spent_amount: spentAmount },
    });
  })
);
