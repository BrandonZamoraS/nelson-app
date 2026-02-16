import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getExpenseOwnedByUser, insertAuditLog, jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;
    const expenseId = body?.expense_id ?? body?.id;
    if (expenseId === undefined || expenseId === null || expenseId === "") {
      return jsonErr(400, "missing_expense_id", "expense_id is required");
    }

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

