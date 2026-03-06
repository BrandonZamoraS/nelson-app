import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { getCropOwnedByUser, insertAuditLog, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

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
        action: "delete",
        result: "error",
        detail: { phone, crop_id: cropId, error: "not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }

    const { error } = await supabase.from("crops").delete().eq("id", cropId).eq("user", user.id);
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "delete",
        result: "error",
        detail: { phone, crop_id: cropId, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to delete crop", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "crop",
      entity_id: String(cropId),
      action: "delete",
      result: "ok",
      detail: { phone, crop_id: cropId },
    });

    return jsonOk({ deleted: { id: String(cropId) } });
  })
);
