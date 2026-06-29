import { coercePositiveIntId } from "../utils/coerce-id.ts";
import { coerceOptionalFiniteNumber, coercePositiveFiniteNumber } from "../utils/coerce-number.ts";
import {
  INVALID_CROP_MEASUREMENT_UNIT_MESSAGE,
  DEFAULT_CROP_MEASUREMENT_UNIT,
  parseCropMeasurementUnit,
} from "../utils/crop-measurement-unit.ts";

type RuntimeErrorResponse = {
  ok: false;
  error: { code: string; message: string; detail?: unknown };
};

type CropRuntimeRow = {
  id: number;
  created_at: string;
  description: string | null;
  size: number | null;
  budget: number | null;
  gross_profit: number | null;
  measurement_unit: string;
  start_date: string | null;
  end_date: string | null;
  user: string | null;
};

type CreateCropInsert = {
  user: string;
  description: string | null;
  size: number | null;
  budget: number;
  measurement_unit: string;
  start_date: string | null;
  end_date: string | null;
};

type UpdateCropPatch = Partial<Pick<CropRuntimeRow, "description" | "size" | "budget" | "start_date" | "end_date">>;

type AuditEntry = {
  entity_type: "crop";
  entity_id: string;
  action: "create" | "update";
  detail: Record<string, unknown>;
  result: "ok" | "error";
};

type AuditLogger = (entry: AuditEntry) => Promise<void>;

const JSON_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-agent-key, x-wa-phone",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "content-type": "application/json; charset=utf-8",
};

function jsonOk<T extends Record<string, unknown>>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: JSON_HEADERS,
  });
}

function jsonErr(status: number, code: string, message: string, detail?: unknown): Response {
  const body: RuntimeErrorResponse = { ok: false, error: { code, message, detail } };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isIsoDate(input: unknown): input is string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const [y, m, d] = input.split("-").map((value) => Number(value));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}` === input;
}

export function enforceMeasurementUnitImmutability(previous: unknown, next: unknown): void {
  if (previous !== next) {
    throw new Error("measurement_unit is immutable");
  }
}

export async function createCropRuntime(args: {
  body: Record<string, unknown> | null;
  phone: string;
  userId: string;
  insertCrop: (payload: CreateCropInsert) => Promise<{ data: unknown; error: unknown }>;
  audit: AuditLogger;
}): Promise<Response> {
  const { body, phone, userId, insertCrop, audit } = args;
  const parsedSize = coerceOptionalFiniteNumber(body?.size);
  const budgetRaw = body?.budget;
  const parsedBudget = coercePositiveFiniteNumber(budgetRaw);
  const parsedMeasurementUnit = parseCropMeasurementUnit(body?.measurement_unit);

  const payload = {
    description: typeof body?.description === "string" ? body.description : null,
    size: parsedSize.ok ? parsedSize.value : body?.size,
    budget: parsedBudget.ok ? parsedBudget.value : budgetRaw,
    measurement_unit: parsedMeasurementUnit.ok ? parsedMeasurementUnit.value : body?.measurement_unit,
    start_date: body?.start_date ?? null,
    end_date: body?.end_date ?? null,
  };

  if (!parsedSize.ok) {
    await audit({ entity_type: "crop", entity_id: "(new)", action: "create", result: "error", detail: { phone, payload, error: "invalid_size" } });
    return jsonErr(400, "invalid_size", "size must be a number", { size: payload.size });
  }
  if (budgetRaw === undefined || budgetRaw === null || budgetRaw === "") {
    await audit({ entity_type: "crop", entity_id: "(new)", action: "create", result: "error", detail: { phone, payload, error: "missing_budget" } });
    return jsonErr(400, "missing_budget", "budget is required");
  }
  if (!parsedBudget.ok) {
    await audit({ entity_type: "crop", entity_id: "(new)", action: "create", result: "error", detail: { phone, payload, error: "invalid_budget" } });
    return jsonErr(400, "invalid_budget", "budget must be a number > 0", { budget: budgetRaw });
  }
  if (!parsedMeasurementUnit.ok) {
    await audit({
      entity_type: "crop",
      entity_id: "(new)",
      action: "create",
      result: "error",
      detail: { phone, payload, error: "invalid_measurement_unit" },
    });
    return jsonErr(400, "invalid_measurement_unit", INVALID_CROP_MEASUREMENT_UNIT_MESSAGE, parsedMeasurementUnit.detail);
  }
  if (payload.start_date !== null && !isIsoDate(payload.start_date)) {
    await audit({ entity_type: "crop", entity_id: "(new)", action: "create", result: "error", detail: { phone, payload, error: "invalid_start_date" } });
    return jsonErr(400, "invalid_start_date", "start_date must be YYYY-MM-DD", { start_date: payload.start_date });
  }
  if (payload.end_date !== null && !isIsoDate(payload.end_date)) {
    await audit({ entity_type: "crop", entity_id: "(new)", action: "create", result: "error", detail: { phone, payload, error: "invalid_end_date" } });
    return jsonErr(400, "invalid_end_date", "end_date must be YYYY-MM-DD", { end_date: payload.end_date });
  }

  const { data, error } = await insertCrop({
    user: userId,
    description: payload.description,
    size: parsedSize.value,
    budget: parsedBudget.value,
    measurement_unit: parsedMeasurementUnit.value,
    start_date: payload.start_date,
    end_date: payload.end_date,
  });

  if (error) {
    await audit({ entity_type: "crop", entity_id: "(new)", action: "create", result: "error", detail: { phone, payload, db_error: String(error) } });
    return jsonErr(500, "db_error", "Failed to create crop", error);
  }

  const createdCrop = data as { id: string | number };
  await audit({
    entity_type: "crop",
    entity_id: String(createdCrop.id),
    action: "create",
    result: "ok",
    detail: { phone, payload: { ...payload, user_id: userId } },
  });

  return jsonOk({ crop: data as Record<string, unknown> });
}

export async function updateCropRuntime(args: {
  body: Record<string, unknown> | null;
  phone: string;
  userId: string;
  loadCrop: (userId: string, cropId: number) => Promise<CropRuntimeRow | null>;
  updateCrop: (userId: string, cropId: number, patch: UpdateCropPatch) => Promise<{ data: unknown; error: unknown }>;
  audit: AuditLogger;
}): Promise<Response> {
  const { body, phone, userId, loadCrop, updateCrop, audit } = args;
  const cropIdRaw = body?.crop_id ?? body?.id;
  if (cropIdRaw === undefined || cropIdRaw === null || cropIdRaw === "") {
    return jsonErr(400, "missing_crop_id", "crop_id is required");
  }
  const parsedCropId = coercePositiveIntId(cropIdRaw);
  if (!parsedCropId.ok) {
    return jsonErr(400, "invalid_crop_id", "crop_id must be a positive integer", { crop_id: cropIdRaw });
  }
  const cropId = parsedCropId.value;

  const existing = await loadCrop(userId, cropId);
  if (!existing) {
    await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, error: "not_found" } });
    return jsonErr(404, "crop_not_found", "Crop not found");
  }

  const patch: UpdateCropPatch = {};
  if (body && Object.prototype.hasOwnProperty.call(body, "measurement_unit")) {
    await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, payload: body, error: "measurement_unit_immutable" } });
    return jsonErr(400, "measurement_unit_immutable", "measurement_unit cannot be changed after crop creation");
  }
  if (body?.description !== undefined) {
    patch.description = typeof body.description === "string" ? body.description : null;
  }
  if (body?.size !== undefined) {
    const parsedSize = coerceOptionalFiniteNumber(body.size);
    if (!parsedSize.ok) {
      await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, payload: body, error: "invalid_size" } });
      return jsonErr(400, "invalid_size", "size must be a number", { size: body.size });
    }
    patch.size = parsedSize.value;
  }
  if (body?.budget !== undefined) {
    const parsedBudget = coercePositiveFiniteNumber(body.budget);
    if (!parsedBudget.ok) {
      await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, payload: body, error: "invalid_budget" } });
      return jsonErr(400, "invalid_budget", "budget must be a number > 0", { budget: body.budget });
    }
    patch.budget = parsedBudget.value;
  }
  if (body?.start_date !== undefined) {
    if (body.start_date !== null && !isIsoDate(body.start_date)) {
      await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, payload: body, error: "invalid_start_date" } });
      return jsonErr(400, "invalid_start_date", "start_date must be YYYY-MM-DD", { start_date: body.start_date });
    }
    patch.start_date = body.start_date as string | null;
  }
  if (body?.end_date !== undefined) {
    if (body.end_date !== null && !isIsoDate(body.end_date)) {
      await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, payload: body, error: "invalid_end_date" } });
      return jsonErr(400, "invalid_end_date", "end_date must be YYYY-MM-DD", { end_date: body.end_date });
    }
    patch.end_date = body.end_date as string | null;
  }

  if (Object.keys(patch).length === 0) {
    return jsonErr(400, "no_fields", "No updatable fields provided");
  }

  const { data, error } = await updateCrop(userId, cropId, patch);
  if (error) {
    await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "error", detail: { phone, crop_id: cropId, patch, db_error: String(error) } });
    return jsonErr(500, "db_error", "Failed to update crop", error);
  }

  await audit({ entity_type: "crop", entity_id: String(cropId), action: "update", result: "ok", detail: { phone, crop_id: cropId, patch } });
  return jsonOk({ crop: data as Record<string, unknown> });
}

export async function buildCropReportDataRuntime(args: {
  body: Record<string, unknown> | null;
  contentType: string;
  userId: string;
  loadCrop: (userId: string, cropId: number) => Promise<CropRuntimeRow | null>;
  listExpensesByCropId: (cropId: number) => Promise<Array<{ amount: unknown }>>;
}): Promise<Response> {
  const cropId = coercePositiveIntId(args.body?.crop_id);
  const reportType = args.body?.report_type === "total" ? "total" : "partial";

  if (!cropId.ok) return jsonErr(400, "invalid_crop_id", "crop_id is required");

  const crop = await args.loadCrop(args.userId, cropId.value);
  if (!crop) return jsonErr(404, "crop_not_found", "Crop not found");

  let expenses: Array<{ amount: unknown }>;
  try {
    expenses = await args.listExpensesByCropId(cropId.value);
  } catch (error) {
    return jsonErr(500, "db_error", "Failed to load expenses", error);
  }
  const totalExpenses = expenses.reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);
  const grossProfit = crop.gross_profit ?? 0;
  const netProfit = grossProfit - totalExpenses;

  return jsonOk({
    action: "crop_report_data",
    report_type: reportType,
    measurement_unit: crop.measurement_unit,
    crop: {
      id: crop.id,
      description: crop.description,
      size: crop.size,
      budget: crop.budget,
      gross_profit: grossProfit,
      measurement_unit: crop.measurement_unit,
      start_date: crop.start_date,
      end_date: crop.end_date,
    },
    expense_type: "all",
    total_expenses: totalExpenses,
    gross_profit: grossProfit,
    net_profit: netProfit,
    supports_form_body: args.contentType.includes("application/x-www-form-urlencoded"),
  });
}

export async function buildCropBudgetStatusRuntime(args: {
  body: Record<string, unknown> | null;
  contentType: string;
  userId: string;
  loadCrop: (userId: string, cropId: number) => Promise<CropRuntimeRow | null>;
  listExpensesByCropId: (cropId: number) => Promise<Array<{ amount: unknown }>>;
}): Promise<Response> {
  const parsedCropId = coercePositiveIntId(args.body?.crop_id);
  if (!parsedCropId.ok) {
    return jsonErr(400, "invalid_crop_id", "crop_id is required");
  }

  const crop = await args.loadCrop(args.userId, parsedCropId.value);
  if (!crop) return jsonErr(404, "crop_not_found", "Crop not found");
  if (crop.budget == null || crop.budget <= 0) {
    return jsonErr(400, "missing_budget", "Crop budget is required");
  }

  let expenses: Array<{ amount: unknown }>;
  try {
    expenses = await args.listExpensesByCropId(parsedCropId.value);
  } catch (error) {
    return jsonErr(500, "db_error", "Failed to load expenses", error);
  }
  const spentAmount = expenses.reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);
  const remainingAmount = crop.budget - spentAmount;

  return jsonOk({
    crop: {
      id: crop.id,
      description: crop.description,
      start_date: crop.start_date,
      end_date: crop.end_date,
      budget: crop.budget,
      measurement_unit: crop.measurement_unit,
    },
    budget_status: {
      crop_id: parsedCropId.value,
      budget: crop.budget,
      measurement_unit: crop.measurement_unit,
      spent_amount: spentAmount,
      remaining_amount: remainingAmount,
      over_budget: remainingAmount < 0,
      supports_form_body: args.contentType.includes("application/x-www-form-urlencoded"),
    },
    expense_summary: { spent_amount: spentAmount },
  });
}

export async function buildCompareFinishedCropsCostsRuntime(args: {
  body: Record<string, unknown> | null;
  contentType: string;
  userId: string;
  loadCrop: (userId: string, cropId: number) => Promise<CropRuntimeRow | null>;
  listExpensesForCropIds: (cropIds: number[]) => Promise<Array<{ amount: unknown; crop_id: unknown }>>;
}): Promise<Response> {
  const cropId1 = coercePositiveIntId(args.body?.crop_id_1);
  const cropId2 = coercePositiveIntId(args.body?.crop_id_2);

  if (!cropId1.ok || !cropId2.ok) {
    return jsonErr(400, "invalid_crop_ids", "crop_id_1 and crop_id_2 are required");
  }

  const [crop1, crop2] = await Promise.all([
    args.loadCrop(args.userId, cropId1.value),
    args.loadCrop(args.userId, cropId2.value),
  ]);
  if (!crop1 || !crop2) return jsonErr(404, "crop_not_found", "One or both crops were not found");

  let expenses: Array<{ amount: unknown; crop_id: unknown }>;
  try {
    expenses = await args.listExpensesForCropIds([cropId1.value, cropId2.value]);
  } catch (error) {
    return jsonErr(500, "db_error", "Failed to load expenses", error);
  }
  const grandTotalSpent = expenses.reduce((sum, row) => sum + (typeof row.amount === "number" ? row.amount : 0), 0);
  const cropTotals = new Map<number, number>();

  for (const row of expenses) {
    if (typeof row.crop_id !== "number") continue;
    const amount = typeof row.amount === "number" ? row.amount : 0;
    cropTotals.set(row.crop_id, (cropTotals.get(row.crop_id) ?? 0) + amount);
  }

  return jsonOk({
    action: "compare_finished_crops_costs",
    crop_id_1: cropId1.value,
    crop_id_2: cropId2.value,
    items: [crop1, crop2].map((crop) => ({
      crop_id: crop.id,
      description: crop.description,
      end_date: crop.end_date,
      budget: crop.budget,
      gross_profit: crop.gross_profit,
      measurement_unit: crop.measurement_unit,
      total_spent: cropTotals.get(crop.id) ?? 0,
    })),
    grand_total_spent: grandTotalSpent,
    supports_form_body: args.contentType.includes("application/x-www-form-urlencoded"),
  });
}

export { DEFAULT_CROP_MEASUREMENT_UNIT };
