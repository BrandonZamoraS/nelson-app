import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { getCropOwnedByUser, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx, body }) => {
    const user = ctx.user!;
    const contentType = req.headers.get("content-type") ?? "";
    const supportsFormBody = contentType.includes("application/x-www-form-urlencoded");
    const cropId = coercePositiveIntId(body?.crop_id);
    const reportType = body?.report_type === "total" ? "total" : "partial";

    if (!cropId.ok) return jsonErr(400, "invalid_crop_id", "crop_id is required");

    const crop = await getCropOwnedByUser(supabase, user.id, cropId.value);
    if (!crop) return jsonErr(404, "crop_not_found", "Crop not found");

    const { data, error } = await supabase
      .from("expenses")
      .select("amount,expense_type")
      .eq("crop_id", cropId.value);
    if (error) return jsonErr(500, "db_error", "Failed to load expenses", error);

    const totalExpenses = ((data ?? []) as Array<{ amount: unknown }>).reduce(
      (sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0),
      0,
    );
    const grossProfit = crop.gross_profit ?? 0;
    const netProfit = grossProfit - totalExpenses;

    return jsonOk({
      action: "crop_report_data",
      report_type: reportType,
      crop: { id: crop.id, budget: crop.budget, gross_profit: grossProfit },
      expense_type: "all",
      total_expenses: totalExpenses,
      gross_profit: grossProfit,
      net_profit: netProfit,
      supports_form_body: supportsFormBody,
    });
  })
);
