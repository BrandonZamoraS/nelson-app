import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  expenseTypeExists,
  getCropOwnedByUser,
  getExpenseOwnedByUser,
  insertAuditLog,
  isNumber,
  jsonErr,
  jsonOk,
  waHandler,
} from "../_shared/wa.ts";

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
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "not_found" },
      });
      return jsonErr(404, "expense_not_found", "Expense not found");
    }

    const patch: Record<string, unknown> = {};
    if (body?.description !== undefined) {
      patch.description = typeof body.description === "string" ? body.description : null;
    }
    if (body?.amount !== undefined) {
      if (!isNumber(body.amount) || body.amount <= 0) {
        await insertAuditLog(supabase, {
          entity_type: "expense",
          entity_id: String(expenseId),
          action: "update",
          result: "error",
          detail: { phone, expense_id: expenseId, payload: body, error: "invalid_amount" },
        });
        return jsonErr(400, "invalid_amount", "amount must be a number > 0", { amount: body.amount });
      }
      patch.amount = body.amount;
    }
    if (body?.expense_type !== undefined) {
      if (body.expense_type === null || body.expense_type === "") {
        patch.expense_type = null;
      } else {
        const ok = await expenseTypeExists(supabase, body.expense_type);
        if (!ok) {
          await insertAuditLog(supabase, {
            entity_type: "expense",
            entity_id: String(expenseId),
            action: "update",
            result: "error",
            detail: { phone, expense_id: expenseId, payload: body, error: "expense_type_not_found" },
          });
          return jsonErr(404, "expense_type_not_found", "Expense type not found");
        }
        patch.expense_type = body.expense_type;
      }
    }
    if (body?.crop_id !== undefined) {
      if (body.crop_id === null || body.crop_id === "") {
        await insertAuditLog(supabase, {
          entity_type: "expense",
          entity_id: String(expenseId),
          action: "update",
          result: "error",
          detail: { phone, expense_id: expenseId, payload: body, error: "missing_crop_id" },
        });
        return jsonErr(400, "missing_crop_id", "crop_id cannot be null/empty");
      }
      const crop = await getCropOwnedByUser(supabase, user.id, body.crop_id);
      if (!crop) {
        await insertAuditLog(supabase, {
          entity_type: "expense",
          entity_id: String(expenseId),
          action: "update",
          result: "error",
          detail: { phone, expense_id: expenseId, payload: body, error: "crop_not_found" },
        });
        return jsonErr(404, "crop_not_found", "Crop not found");
      }
      patch.crop_id = body.crop_id;
    }

    if (Object.keys(patch).length === 0) {
      return jsonErr(400, "no_fields", "No updatable fields provided");
    }

    const { data, error } = await supabase
      .from("expenses")
      .update(patch)
      .eq("id", expenseId)
      .select("id, created_at, description, amount, crop_id, expense_type")
      .single();
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, patch, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to update expense", error);
    }

    await insertAuditLog(supabase, {
      entity_type: "expense",
      entity_id: String(expenseId),
      action: "update",
      result: "ok",
      detail: { phone, expense_id: expenseId, patch },
    });

    return jsonOk({ expense: data });
  })
);

