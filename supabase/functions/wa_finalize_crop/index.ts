import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    const cropId = body?.crop_id ?? body?.id;
    if (cropId === undefined || cropId === null || cropId === "") {
      return jsonErr(400, "missing_crop_id", "crop_id is required");
    }

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

    const { data, error } = await supabase
      .from("crops")
      .update({ end_date: endDate })
      .eq("id", cropId)
      .eq("user", user.id)
      .select("id, created_at, description, size, start_date, end_date")
      .single();
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "finalize",
        result: "error",
        detail: { phone, crop_id: cropId, end_date: endDate, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to finalize crop", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "crop",
      entity_id: String(cropId),
      action: "finalize",
      result: "ok",
      detail: { phone, crop_id: cropId, end_date: endDate },
    });

    return jsonOk({ crop: data });
  })
);

