import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { getCropOwnedByUser, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx, body }) => {
    const user = ctx.user!;
    const contentType = req.headers.get("content-type") ?? "";
    const supportsFormBody = contentType.includes("application/x-www-form-urlencoded");
    const cropId1 = coercePositiveIntId(body?.crop_id_1);
    const cropId2 = coercePositiveIntId(body?.crop_id_2);

    if (!cropId1.ok || !cropId2.ok) {
      return jsonErr(400, "invalid_crop_ids", "crop_id_1 and crop_id_2 are required");
    }

    const [crop1, crop2] = await Promise.all([
      getCropOwnedByUser(supabase, user.id, cropId1.value),
      getCropOwnedByUser(supabase, user.id, cropId2.value),
    ]);
    if (!crop1 || !crop2) return jsonErr(404, "crop_not_found", "One or both crops were not found");

    const { data, error } = await supabase
      .from("expenses")
      .select("amount,crop_id")
      .in("crop_id", [cropId1.value, cropId2.value]);
    if (error) return jsonErr(500, "db_error", "Failed to load expenses", error);

    const grandTotalSpent = ((data ?? []) as Array<{ amount: unknown }>).reduce(
      (sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0),
      0,
    );

    return jsonOk({
      action: "compare_finished_crops_costs",
      crop_id_1: cropId1.value,
      crop_id_2: cropId2.value,
      grand_total_spent: grandTotalSpent,
      supports_form_body: supportsFormBody,
    });
  })
);
