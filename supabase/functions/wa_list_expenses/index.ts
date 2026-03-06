import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { getCropOwnedByUser, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx, body }) => {
    const user = ctx.user!;

    const cropIdRaw = body?.crop_id ?? null;
    let cropIds: Array<string | number> = [];

    if (cropIdRaw !== null && cropIdRaw !== undefined && cropIdRaw !== "") {
      const parsedCropId = coercePositiveIntId(cropIdRaw);
      if (!parsedCropId.ok) {
        return jsonErr(400, "invalid_crop_id", "crop_id must be a positive integer", { crop_id: cropIdRaw });
      }
      const cropId = parsedCropId.value;
      const owned = await getCropOwnedByUser(supabase, user.id, cropId);
      if (!owned) return jsonErr(404, "crop_not_found", "Crop not found");
      cropIds = [cropId];
    } else {
      const { data: crops, error: cropsErr } = await supabase
        .from("crops")
        .select("id")
        .eq("user", user.id);
      if (cropsErr) return jsonErr(500, "db_error", "Failed to resolve user crops", cropsErr);
      cropIds = (crops ?? []).map((c: any) => c.id);
    }

    if (cropIds.length === 0) return jsonOk({ expenses: [] });

    const { data: expenses, error: expErr } = await supabase
      .from("expenses")
      .select("id, created_at, description, amount, crop_id, expense_type")
      .in("crop_id", cropIds)
      .order("created_at", { ascending: false });
    if (expErr) return jsonErr(500, "db_error", "Failed to list expenses", expErr);

    const typeIds = Array.from(
      new Set((expenses ?? []).map((e: any) => e.expense_type).filter((id: any) => id !== null && id !== undefined)),
    );
    const typeMap = new Map<string, string>();
    if (typeIds.length > 0) {
      const { data: types, error: typesErr } = await supabase
        .from("expenses_type")
        .select("id, description")
        .in("id", typeIds);
      if (typesErr) return jsonErr(500, "db_error", "Failed to resolve expense types", typesErr);
      for (const t of types ?? []) typeMap.set(String((t as any).id), (t as any).description);
    }

    const out = (expenses ?? []).map((e: any) => ({
      ...e,
      expense_type_description: e.expense_type == null ? null : (typeMap.get(String(e.expense_type)) ?? null),
    }));

    return jsonOk({ expenses: out });
  })
);
