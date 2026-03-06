import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { coerceOptionalFiniteNumber, coercePositiveFiniteNumber } from "../../../lib/utils/coerce-number.ts";
import {
  getCropOwnedByUser,
  insertAuditLog,
  isISODate,
  jsonErr,
  jsonOk,
  waHandler,
} from "../_shared/wa.ts";

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
        action: "update",
        result: "error",
        detail: { phone, crop_id: cropId, error: "not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }

    const patch: Record<string, unknown> = {};
    if (body?.description !== undefined) {
      patch.description = typeof body.description === "string" ? body.description : null;
    }
    if (body?.size !== undefined) {
      const parsedSize = coerceOptionalFiniteNumber(body.size);
      if (!parsedSize.ok) {
        await insertAuditLog(supabase, {
          entity_type: "crop",
          entity_id: String(cropId),
          action: "update",
          result: "error",
          detail: { phone, crop_id: cropId, payload: body, error: "invalid_size" },
        });
        return jsonErr(400, "invalid_size", "size must be a number", { size: body.size });
      }
      patch.size = parsedSize.value;
    }
    if (body?.budget !== undefined) {
      const parsedBudget = coercePositiveFiniteNumber(body.budget);
      if (!parsedBudget.ok) {
        await insertAuditLog(supabase, {
          entity_type: "crop",
          entity_id: String(cropId),
          action: "update",
          result: "error",
          detail: { phone, crop_id: cropId, payload: body, error: "invalid_budget" },
        });
        return jsonErr(400, "invalid_budget", "budget must be a number > 0", { budget: body.budget });
      }
      patch.budget = parsedBudget.value;
    }
    if (body?.start_date !== undefined) {
      if (body.start_date !== null && !isISODate(body.start_date)) {
        await insertAuditLog(supabase, {
          entity_type: "crop",
          entity_id: String(cropId),
          action: "update",
          result: "error",
          detail: { phone, crop_id: cropId, payload: body, error: "invalid_start_date" },
        });
        return jsonErr(400, "invalid_start_date", "start_date must be YYYY-MM-DD", { start_date: body.start_date });
      }
      patch.start_date = body.start_date;
    }
    if (body?.end_date !== undefined) {
      if (body.end_date !== null && !isISODate(body.end_date)) {
        await insertAuditLog(supabase, {
          entity_type: "crop",
          entity_id: String(cropId),
          action: "update",
          result: "error",
          detail: { phone, crop_id: cropId, payload: body, error: "invalid_end_date" },
        });
        return jsonErr(400, "invalid_end_date", "end_date must be YYYY-MM-DD", { end_date: body.end_date });
      }
      patch.end_date = body.end_date;
    }

    if (Object.keys(patch).length === 0) {
      return jsonErr(400, "no_fields", "No updatable fields provided");
    }

    const { data, error } = await supabase
      .from("crops")
      .update(patch)
      .eq("id", cropId)
      .eq("user", user.id)
      .select("id, created_at, description, size, budget, start_date, end_date")
      .single();
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: String(cropId),
        action: "update",
        result: "error",
        detail: { phone, crop_id: cropId, patch, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to update crop", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "crop",
      entity_id: String(cropId),
      action: "update",
      result: "ok",
      detail: { phone, crop_id: cropId, patch },
    });

    return jsonOk({ crop: data });
  })
);
