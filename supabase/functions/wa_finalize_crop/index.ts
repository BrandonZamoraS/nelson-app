import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { coerceOptionalFiniteNumber } from "../../../lib/utils/coerce-number.ts";
import { getCropOwnedByUser, insertAuditLog, isISODate, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

function utcToday(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;
    const cropIdRaw = body?.crop_id ?? body?.id;
    if (cropIdRaw === undefined || cropIdRaw === null || cropIdRaw === "") {
      return jsonErr(400, "missing_crop_id", "crop_id is required");
    }
    const parsedCropId = coercePositiveIntId(cropIdRaw);
    if (!parsedCropId.ok) {
      return jsonErr(400, "invalid_crop_id", "crop_id must be a positive integer", { crop_id: cropIdRaw });
    }
    const cropId = parsedCropId.value;

    const existing = await getCropOwnedByUser(supabase, user.id, cropId);
    if (!existing) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "finalize",
        result: "error",
        detail: { phone, crop_id: cropId, error: "not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }

    const endDate = body?.end_date ?? utcToday();
    if (endDate !== null && !isISODate(endDate)) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "finalize",
        result: "error",
        detail: { phone, crop_id: cropId, end_date: endDate, error: "invalid_end_date" },
      });
      return jsonErr(400, "invalid_end_date", "end_date must be YYYY-MM-DD", { end_date: endDate });
    }

    const hasGrossProfit = body && typeof body === "object" && (
      Object.prototype.hasOwnProperty.call(body, "gross_profit") ||
      Object.prototype.hasOwnProperty.call(body, "ganancia_bruta")
    );
    const grossProfitRaw = body?.gross_profit ?? body?.ganancia_bruta;
    if (!hasGrossProfit) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "finalize",
        result: "error",
        detail: { phone, crop_id: cropId, end_date: endDate, error: "missing_gross_profit" },
      });
      return jsonErr(400, "missing_gross_profit", "gross_profit is required");
    }

    const parsedGrossProfit = coerceOptionalFiniteNumber(grossProfitRaw);
    if (!parsedGrossProfit.ok || parsedGrossProfit.value === null || parsedGrossProfit.value < 0) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "finalize",
        result: "error",
        detail: { phone, crop_id: cropId, end_date: endDate, gross_profit: grossProfitRaw, error: "invalid_gross_profit" },
      });
      return jsonErr(400, "invalid_gross_profit", "gross_profit must be a number >= 0", {
        gross_profit: grossProfitRaw,
      });
    }
    const grossProfit = parsedGrossProfit.value;

    const patch: Record<string, unknown> = { end_date: endDate, gross_profit: grossProfit };

    const { data, error } = await supabase
      .from("crops")
      .update(patch)
      .eq("id", cropId)
      .eq("user", user.id)
      .select("id, created_at, description, size, budget, gross_profit, start_date, end_date")
      .single();
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "finalize",
        result: "error",
        detail: { phone, crop_id: cropId, patch, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to finalize crop", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "crop",
      entity_id: String(cropId),
      action: "finalize",
      result: "ok",
      detail: { phone, crop_id: cropId, patch },
    });

    return jsonOk({ crop: data });
  })
);
