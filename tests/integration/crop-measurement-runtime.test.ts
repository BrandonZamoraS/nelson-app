import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import {
  buildCompareFinishedCropsCostsRuntime,
  buildCropBudgetStatusRuntime,
  buildCropReportDataRuntime,
  createCropRuntime,
  enforceMeasurementUnitImmutability,
  updateCropRuntime,
} from "../../lib/wa/crop-measurement-runtime";

const n8nScriptPath = path.join(process.cwd(), "docs", "n8n", "crop-html-report-code-node.js");

type CropRecord = {
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

function createRuntimeDb(seed?: { crops?: CropRecord[]; expenses?: Array<{ crop_id: number; amount: number; expense_type?: number | null }> }) {
  const crops = new Map<number, CropRecord>((seed?.crops ?? []).map((crop) => [crop.id, { ...crop }]));
  const expenses = [...(seed?.expenses ?? [])];
  let nextCropId = Math.max(0, ...Array.from(crops.keys())) + 1;

  return {
    async insertCrop(payload: Omit<CropRecord, "id" | "created_at" | "gross_profit">) {
      const crop: CropRecord = {
        id: nextCropId++,
        created_at: "2026-06-29T00:00:00.000Z",
        gross_profit: null,
        ...payload,
      };
      crops.set(crop.id, crop);
      return { data: crop, error: null };
    },
    async loadCrop(userId: string, cropId: number) {
      const crop = crops.get(cropId) ?? null;
      return crop?.user === userId ? { ...crop } : null;
    },
    async updateCrop(userId: string, cropId: number, patch: Partial<CropRecord>) {
      const current = crops.get(cropId);
      if (!current || current.user !== userId) {
        return { data: null, error: new Error("not found") };
      }

      const updated = { ...current, ...patch };
      crops.set(cropId, updated);
      return { data: { ...updated }, error: null };
    },
    async listExpensesByCropId(cropId: number) {
      return expenses.filter((expense) => expense.crop_id === cropId).map((expense) => ({ ...expense }));
    },
    async listExpensesForCropIds(cropIds: number[]) {
      const ids = new Set(cropIds);
      return expenses.filter((expense) => ids.has(expense.crop_id)).map((expense) => ({ ...expense }));
    },
    getCrop(cropId: number) {
      return crops.get(cropId);
    },
  };
}

async function responseJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

function executeN8nScript(reportPayload: Record<string, unknown>) {
  const source = fs.readFileSync(n8nScriptPath, "utf8");
  const wrapped = `(function () { ${source} })()`;
  return vm.runInNewContext(wrapped, {
    $input: {
      first: () => ({ json: reportPayload }),
    },
    Intl,
  }) as Array<{ json: Record<string, unknown> }>;
}

test("createCropRuntime defaults measurement_unit to kg when omitted", async () => {
  const db = createRuntimeDb();

  const response = await createCropRuntime({
    body: {
      description: "Maiz de prueba",
      size: 12,
      budget: 4000,
      start_date: "2026-06-01",
    },
    phone: "+50499990000",
    userId: "user-1",
    insertCrop: (payload) => db.insertCrop(payload),
    audit: async () => undefined,
  });

  const json = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal((json.crop as { measurement_unit: string }).measurement_unit, "kg");
  assert.equal(db.getCrop(1)?.measurement_unit, "kg");
});

test("createCropRuntime persists custom measurement_unit from the allowlist", async () => {
  const db = createRuntimeDb();

  const response = await createCropRuntime({
    body: {
      description: "Frijol rojo",
      size: 4,
      budget: 1800,
      measurement_unit: "LB",
    },
    phone: "+50499990000",
    userId: "user-1",
    insertCrop: (payload) => db.insertCrop(payload),
    audit: async () => undefined,
  });

  const json = await responseJson(response);
  assert.equal(response.status, 200);
  assert.equal((json.crop as { measurement_unit: string }).measurement_unit, "lb");
  assert.equal(db.getCrop(1)?.measurement_unit, "lb");
});

test("updateCropRuntime rejects measurement_unit changes and keeps the stored value unchanged", async () => {
  const db = createRuntimeDb({
    crops: [{
      id: 7,
      created_at: "2026-06-01T00:00:00.000Z",
      description: "Cafe",
      size: 2,
      budget: 2200,
      gross_profit: null,
      measurement_unit: "kg",
      start_date: "2026-06-01",
      end_date: null,
      user: "user-1",
    }],
  });

  const response = await updateCropRuntime({
    body: {
      crop_id: 7,
      measurement_unit: "lb",
      budget: 2300,
    },
    phone: "+50499990000",
    userId: "user-1",
    loadCrop: (userId, cropId) => db.loadCrop(userId, cropId),
    updateCrop: (userId, cropId, patch) => db.updateCrop(userId, cropId, patch),
    audit: async () => undefined,
  });

  const json = await responseJson(response);
  assert.equal(response.status, 400);
  assert.equal(json.ok, false);
  assert.equal((json.error as { code: string }).code, "measurement_unit_immutable");
  assert.equal(db.getCrop(7)?.measurement_unit, "kg");
  assert.equal(db.getCrop(7)?.budget, 2200);
});

test("enforceMeasurementUnitImmutability models the trigger behavior for direct updates", () => {
  assert.doesNotThrow(() => enforceMeasurementUnitImmutability("kg", "kg"));
  assert.throws(
    () => enforceMeasurementUnitImmutability("kg", "lb"),
    /measurement_unit is immutable/i,
  );
});

test("report runtimes expose crop-level measurement_unit metadata without changing totals", async () => {
  const db = createRuntimeDb({
    crops: [
      {
        id: 11,
        created_at: "2026-06-01T00:00:00.000Z",
        description: "Maiz",
        size: 3,
        budget: 1000,
        gross_profit: 1500,
        measurement_unit: "lb",
        start_date: "2026-06-01",
        end_date: null,
        user: "user-1",
      },
      {
        id: 12,
        created_at: "2026-05-01T00:00:00.000Z",
        description: "Cacao",
        size: 1,
        budget: 900,
        gross_profit: 1300,
        measurement_unit: "quintal",
        start_date: "2026-05-01",
        end_date: "2026-06-10",
        user: "user-1",
      },
    ],
    expenses: [
      { crop_id: 11, amount: 100, expense_type: 1 },
      { crop_id: 11, amount: 250, expense_type: 2 },
      { crop_id: 12, amount: 80, expense_type: 1 },
    ],
  });

  const reportResponse = await buildCropReportDataRuntime({
    body: { crop_id: 11, report_type: "total" },
    contentType: "application/json",
    userId: "user-1",
    loadCrop: (userId, cropId) => db.loadCrop(userId, cropId),
    listExpensesByCropId: (cropId) => db.listExpensesByCropId(cropId),
  });
  const budgetResponse = await buildCropBudgetStatusRuntime({
    body: { crop_id: 11 },
    contentType: "application/x-www-form-urlencoded",
    userId: "user-1",
    loadCrop: (userId, cropId) => db.loadCrop(userId, cropId),
    listExpensesByCropId: (cropId) => db.listExpensesByCropId(cropId),
  });
  const compareResponse = await buildCompareFinishedCropsCostsRuntime({
    body: { crop_id_1: 11, crop_id_2: 12 },
    contentType: "application/x-www-form-urlencoded",
    userId: "user-1",
    loadCrop: (userId, cropId) => db.loadCrop(userId, cropId),
    listExpensesForCropIds: (cropIds) => db.listExpensesForCropIds(cropIds),
  });

  const reportJson = await responseJson(reportResponse);
  const budgetJson = await responseJson(budgetResponse);
  const compareJson = await responseJson(compareResponse);

  assert.equal(reportResponse.status, 200);
  assert.equal(reportJson.measurement_unit, "lb");
  assert.equal((reportJson.crop as { measurement_unit: string }).measurement_unit, "lb");
  assert.equal(reportJson.total_expenses, 350);
  assert.equal(reportJson.gross_profit, 1500);
  assert.equal(reportJson.net_profit, 1150);

  assert.equal(budgetResponse.status, 200);
  assert.equal((budgetJson.crop as { measurement_unit: string }).measurement_unit, "lb");
  assert.equal((budgetJson.budget_status as { measurement_unit: string }).measurement_unit, "lb");
  assert.equal((budgetJson.budget_status as { spent_amount: number }).spent_amount, 350);
  assert.equal((budgetJson.budget_status as { supports_form_body: boolean }).supports_form_body, true);

  assert.equal(compareResponse.status, 200);
  assert.equal((compareJson.items as Array<{ measurement_unit: string }>)[0].measurement_unit, "lb");
  assert.equal((compareJson.items as Array<{ measurement_unit: string }>)[1].measurement_unit, "quintal");
  assert.equal(compareJson.grand_total_spent, 430);
});

test("n8n crop report script renders dynamic measurement-unit labels and kg fallback", () => {
  const dynamicResult = executeN8nScript({
    measurement_unit: "lb",
    crop: { description: "Maiz", budget: 1000 },
    total_expenses: 200,
    gross_profit: 500,
    net_profit: 300,
    yield_amount: 42,
    price_per_unit: "L 10",
    cost_per_unit: "L 5",
  });
  const fallbackResult = executeN8nScript({
    crop: { description: "Frijol", measurement_unit: "kg", budget: 800 },
    total_expenses: 100,
    gross_profit: 250,
    net_profit: 150,
  });

  const dynamicHtml = String(dynamicResult[0]?.json.html ?? "");
  const fallbackHtml = String(fallbackResult[0]?.json.html ?? "");
  const source = fs.readFileSync(n8nScriptPath, "utf8");

  assert.match(source, /repo-maintained code node script for pr review/i);
  assert.match(source, /replace the workflow script on deploy/i);
  assert.match(dynamicHtml, /Unidad de medida:<\/strong> lb/i);
  assert.match(dynamicHtml, /Price per lb/i);
  assert.match(dynamicHtml, /Cost per lb/i);
  assert.match(fallbackHtml, /Rendimiento \(kilos\):/i);
});
