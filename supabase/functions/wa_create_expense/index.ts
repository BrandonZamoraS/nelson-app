import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { coercePositiveIntId } from "../../../lib/utils/coerce-id.ts";
import { coercePositiveFiniteNumber } from "../../../lib/utils/coerce-number.ts";
import {
  computeCropBudgetStatus,
  expenseTypeExists,
  getCropOwnedByUser,
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
    const cropIdRaw = body?.crop_id;
    const expenseTypeIdRaw = body?.expense_type;
    const amountRaw = body?.amount;
    const description = typeof body?.description === "string" ? body.description : null;

    if (cropIdRaw === undefined || cropIdRaw === null || cropIdRaw === "") {
      return jsonErr(400, "missing_crop_id", "crop_id is required");
    }
    if (expenseTypeIdRaw === undefined || expenseTypeIdRaw === null || expenseTypeIdRaw === "") {
      return jsonErr(400, "missing_expense_type", "expense_type is required");
    }
    const parsedCropId = coercePositiveIntId(cropIdRaw);
    if (!parsedCropId.ok) {
      return jsonErr(400, "invalid_crop_id", "crop_id must be a positive integer", { crop_id: cropIdRaw });
    }
    const cropId = parsedCropId.value;

    const parsedExpenseTypeId = coercePositiveIntId(expenseTypeIdRaw);
    if (!parsedExpenseTypeId.ok) {
      return jsonErr(400, "invalid_expense_type", "expense_type must be a positive integer", {
        expense_type: expenseTypeIdRaw,
      });
    }
    const expenseTypeId = parsedExpenseTypeId.value;

    const parsedAmount = coercePositiveFiniteNumber(amountRaw);
    if (!parsedAmount.ok) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload: { crop_id: cropId, expense_type: expenseTypeId, amount: amountRaw }, error: "invalid_amount" },
      });
      return jsonErr(400, "invalid_amount", "amount must be a number > 0", { amount: amountRaw });
    }
    const amount = parsedAmount.value;

    const crop = await getCropOwnedByUser(supabase, user.id, cropId);
    if (!crop) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload: { crop_id: cropId }, error: "crop_not_found" },
      });
      return jsonErr(404, "crop_not_found", "Crop not found");
    }
    if (!isCropActive(crop)) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload: { crop_id: cropId }, error: "crop_inactive", end_date: crop.end_date },
      });
      return jsonErr(409, "crop_inactive", "Cannot modify expenses for a finalized crop", {
        crop_id: cropId,
        end_date: crop.end_date,
      });
    }
    if (!isPositiveFiniteNumber(crop.budget)) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload: { crop_id: cropId, budget: crop.budget }, error: "crop_budget_missing" },
      });
      return jsonErr(400, "crop_budget_missing", "Crop budget must be configured (> 0) before creating expenses", {
        crop_id: cropId,
      });
    }

    const typeOk = await expenseTypeExists(supabase, expenseTypeId);
    if (!typeOk) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload: { expense_type: expenseTypeId }, error: "expense_type_not_found" },
      });
      return jsonErr(404, "expense_type_not_found", "Expense type not found");
    }

    const payload = { crop_id: cropId, expense_type: expenseTypeId, amount, description };
    const { data, error } = await supabase
      .from("expenses")
      .insert(payload)
      .select("id, created_at, description, amount, crop_id, expense_type")
      .single();
    if (error) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload, db_error: String(error) },
      });
      return jsonErr(500, "db_error", "Failed to create expense", error);
    }

    let budgetStatus;
    try {
      budgetStatus = await computeCropBudgetStatus(supabase, crop.id, crop.budget);
    } catch (statusError) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: String((data as any).id),
        action: "create",
        result: "error",
        detail: { phone, payload, error: "budget_status_error", status_error: String(statusError) },
      });
      return jsonErr(500, "db_error", "Failed to compute crop budget status", statusError);
    }

    await insertAuditLog(supabase, {
      entity_type: "expense",
      entity_id: String((data as any).id),
      action: "create",
      result: "ok",
      detail: { phone, payload, budget_status: budgetStatus },
    });

    return jsonOk({ expense: data, budget_status: budgetStatus });
  })
);
