import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { insertAuditLog, isISODate, isNumber, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;

    const payload = {
      description: typeof body?.description === "string" ? body.description : null,
      size: body?.size === null || body?.size === undefined ? null : body.size,
      start_date: body?.start_date ?? null,
      end_date: body?.end_date ?? null,
    };

    if (payload.size !== null && !isNumber(payload.size)) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload, error: "invalid_size" },
      });
      return jsonErr(400, "invalid_size", "size must be a number", { size: payload.size });
    }
    if (payload.start_date !== null && !isISODate(payload.start_date)) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload, error: "invalid_start_date" },
      });
      return jsonErr(400, "invalid_start_date", "start_date must be YYYY-MM-DD", { start_date: payload.start_date });
    }
    if (payload.end_date !== null && !isISODate(payload.end_date)) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload, error: "invalid_end_date" },
      });
      return jsonErr(400, "invalid_end_date", "end_date must be YYYY-MM-DD", { end_date: payload.end_date });
    }

    const { data, error } = await supabase
      .from("crops")
      .insert({
        user: user.id,
        description: payload.description,
        size: payload.size,
        start_date: payload.start_date,
        end_date: payload.end_date,
      })
      .select("id, created_at, description, size, start_date, end_date")
      .single();

    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "crop",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to create crop", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "crop",
      entity_id: String((data as any).id),
      action: "create",
      result: "ok",
      detail: { phone, payload: { ...payload, user_id: user.id } },
    });

    return jsonOk({ crop: data });
  })
);

