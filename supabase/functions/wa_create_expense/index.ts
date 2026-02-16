import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  expenseTypeExists,
  getCropOwnedByUser,
  insertAuditLog,
  isNumber,
  jsonErr,
  jsonOk,
  waHandler,
} from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, phone, ctx, body }) => {
    const user = ctx.user!;
    const cropId = body?.crop_id;
    const expenseTypeId = body?.expense_type;
    const amount = body?.amount;
    const description = typeof body?.description === "string" ? body.description : null;

    if (cropId === undefined || cropId === null || cropId === "") {
      return jsonErr(400, "missing_crop_id", "crop_id is required");
    }
    if (expenseTypeId === undefined || expenseTypeId === null || expenseTypeId === "") {
      return jsonErr(400, "missing_expense_type", "expense_type is required");
    }
    if (!isNumber(amount) || amount <= 0) {
      await insertAuditLog(supabase, {
        entity_type: "expense",
        entity_id: "(new)",
        action: "create",
        result: "error",
        detail: { phone, payload: { crop_id: cropId, expense_type: expenseTypeId, amount }, error: "invalid_amount" },
      });
      return jsonErr(400, "invalid_amount", "amount must be a number > 0", { amount });
    }

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

    await insertAuditLog(supabase, {
      entity_type: "expense",
      entity_id: String((data as any).id),
      action: "create",
      result: "ok",
      detail: { phone, payload },
    });

    return jsonOk({ expense: data });
  })
);

