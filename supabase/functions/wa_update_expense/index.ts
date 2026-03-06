import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { coercePositiveFiniteNumber } from "../../../lib/utils/coerce-number.ts";
import {
  computeCropBudgetStatus,
  expenseTypeExists,
  getCropOwnedByUser,
  getExpenseOwnedByUser,
  isCropActive,
  isPositiveFiniteNumber,
  insertAuditLog,
  jsonErr,
  jsonOk,
  waHandler,
} from "../_shared/wa.ts";

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
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "not_found" },
      });
      return jsonErr(404, "expense_not_found", "Expense not found");
    }
    if (existing.crop_id === null) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "crop_not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }
    const existingCrop = await getCropOwnedByUser(supabase, user.id, existing.crop_id);
    if (!existingCrop) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "crop_not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }
    if (!isCropActive(existingCrop)) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, error: "crop_inactive", crop_id: existingCrop.id, end_date: existingCrop.end_date },
      });
      return jsonErr(409, "crop_inactive", "Cannot modify expenses for a finalized crop", {
        crop_id: existingCrop.id,
        end_date: existingCrop.end_date,
      });
    }

    const patch: Record<string, unknown> = {};
    if (body?.description !== undefined) {
      patch.description = typeof body.description === "string" ? body.description : null;
    }
    if (body?.amount !== undefined) {
      const parsedAmount = coercePositiveFiniteNumber(body.amount);
      if (!parsedAmount.ok) {
        await insertAuditLog(supabase, {
          entity_type: "expense",
          entity_id: String(expenseId),
          action: "update",
          result: "error",
          detail: { phone, expense_id: expenseId, payload: body, error: "invalid_amount" },
        });
        return jsonErr(400, "invalid_amount", "amount must be a number > 0", { amount: body.amount });
      }
      patch.amount = parsedAmount.value;
    }
    if (body?.expense_type !== undefined) {
      if (body.expense_type === null || body.expense_type === "") {
        patch.expense_type = null;
      } else {
        const parsedExpenseTypeId = coercePositiveIntId(body.expense_type);
        if (!parsedExpenseTypeId.ok) {
          await insertAuditLog(supabase, {
            entity_type: "expense",
            entity_id: String(expenseId),
            action: "update",
            result: "error",
            detail: { phone, expense_id: expenseId, payload: body, error: "invalid_expense_type" },
          });
          return jsonErr(400, "invalid_expense_type", "expense_type must be a positive integer", {
            expense_type: body.expense_type,
          });
        }

        const ok = await expenseTypeExists(supabase, parsedExpenseTypeId.value);
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
        patch.expense_type = parsedExpenseTypeId.value;
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
      const parsedCropId = coercePositiveIntId(body.crop_id);
      if (!parsedCropId.ok) {
        await insertAuditLog(supabase, {
          entity_type: "expense",
          entity_id: String(expenseId),
          action: "update",
          result: "error",
          detail: { phone, expense_id: expenseId, payload: body, error: "invalid_crop_id" },
        });
        return jsonErr(400, "invalid_crop_id", "crop_id must be a positive integer", { crop_id: body.crop_id });
      }

      const crop = await getCropOwnedByUser(supabase, user.id, parsedCropId.value);
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
      if (!isCropActive(crop)) {
        await insertAuditLog(supabase, {
          entity_type: "expense",
          entity_id: String(expenseId),
          action: "update",
          result: "error",
          detail: {
            phone,
            expense_id: expenseId,
            payload: body,
            error: "crop_inactive",
            crop_id: crop.id,
            end_date: crop.end_date,
          },
        });
        return jsonErr(409, "crop_inactive", "Cannot modify expenses for a finalized crop", {
          crop_id: crop.id,
          end_date: crop.end_date,
        });
      }
      patch.crop_id = parsedCropId.value;
    }

    if (Object.keys(patch).length === 0) {
      return jsonErr(400, "no_fields", "No updatable fields provided");
    }

    const targetCropId = typeof patch.crop_id === "number" ? patch.crop_id : existing.crop_id;
    const targetCrop = await getCropOwnedByUser(supabase, user.id, targetCropId);
    if (!targetCrop) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, patch, error: "crop_not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }
    if (!isCropActive(targetCrop)) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, patch, error: "crop_inactive", crop_id: targetCrop.id, end_date: targetCrop.end_date },
      });
      return jsonErr(409, "crop_inactive", "Cannot modify expenses for a finalized crop", {
        crop_id: targetCrop.id,
        end_date: targetCrop.end_date,
      });
    }
    if (!isPositiveFiniteNumber(targetCrop.budget)) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, patch, error: "crop_budget_missing" },
      });
      return jsonErr(400, "crop_budget_missing", "Crop budget must be configured (> 0) before registering expenses", {
        crop_id: targetCrop.id,
      });
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

    let budgetStatus;
    try {
      budgetStatus = await computeCropBudgetStatus(supabase, targetCrop.id, targetCrop.budget);
    } catch (statusError) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String(expenseId),
        action: "update",
        result: "error",
        detail: { phone, expense_id: expenseId, patch, error: "budget_status_error", status_error: String(statusError) },
      });
      return jsonErr(500, "db_error", "Failed to compute crop budget status", statusError);
    }

    await insertAuditLog(supabase, {
      entity_type: "expense",
      entity_id: String(expenseId),
      action: "update",
      result: "ok",
      detail: { phone, expense_id: expenseId, patch, budget_status: budgetStatus },
    });

    return jsonOk({ expense: data, budget_status: budgetStatus });
  })
);
