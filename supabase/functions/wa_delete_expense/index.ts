import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { getCropOwnedByUser, getExpenseOwnedByUser, insertAuditLog, isCropActive, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;
    const expenseIdRaw = body?.expense_id ?? body?.id;
    if (expenseIdRaw === undefined || expenseIdRaw === null || expenseIdRaw === "") {
      return jsonErr(400, "missing_expense_id", "expense_id is required");
    }
    const parsedExpenseId = coercePositiveIntId(expenseIdRaw);
    if (!parsedExpenseId.ok) {
      return jsonErr(400, "invalid_expense_id", "expense_id must be a positive integer", { expense_id: expenseIdRaw });
    }
    const expenseId = parsedExpenseId.value;

    const existing = await getExpenseOwnedByUser(supabase, user.id, expenseId);
    if (!existing) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "delete",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "not_found" },
      });
      return jsonErr(404, "expense_not_found", "Expense not found");
    }
    if (existing.crop_id === null) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "delete",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "crop_not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }
    const crop = await getCropOwnedByUser(supabase, user.id, existing.crop_id);
    if (!crop) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "delete",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "crop_not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }
    if (!isCropActive(crop)) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "delete",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "crop_inactive", crop_id: crop.id, end_date: crop.end_date },
      });
      return jsonErr(409, "crop_inactive", "Cannot modify expenses for a finalized crop", {
        crop_id: crop.id,
        end_date: crop.end_date,
      });
    }

    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "delete",
        result: "error",
        detail: { phone, expense_id: expenseId, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to delete expense", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "expense",
      entity_id: String(expenseId),
      action: "delete",
      result: "ok",
      detail: { phone, expense_id: expenseId },
    });

    return jsonOk({ deleted: { id: String(expenseId) } });
  })
);
