import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();
const functionsDir = path.join(rootDir, "supabase", "functions");
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const n8nScriptPath = path.join(rootDir, "docs", "n8n", "crop-html-report-code-node.js");

const requiredFunctions = [
  "wa_crop_budget_status",
  "wa_compare_finished_crops_costs",
  "wa_crop_report_data",
];

function readFileOrEmpty(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

test("required WA edge functions exist with verify_jwt disabled", () => {
  for (const functionName of requiredFunctions) {
    const indexPath = path.join(functionsDir, functionName, "index.ts");
    const configPath = path.join(functionsDir, functionName, "config.toml");

    assert.equal(fs.existsSync(indexPath), true, `Missing ${indexPath}`);
    assert.equal(fs.existsSync(configPath), true, `Missing ${configPath}`);

    const configSource = readFileOrEmpty(configPath);
    assert.match(configSource, /verify_jwt\s*=\s*false/i, `${functionName} must disable JWT verification`);
  }
});

test("shared WA helper exposes required auth, context and audit helpers", () => {
  const helperPath = path.join(functionsDir, "_shared", "wa.ts");
  assert.equal(fs.existsSync(helperPath), true, `Missing ${helperPath}`);

  const helperSource = readFileOrEmpty(helperPath);
  assert.match(helperSource, /export\s+(async\s+)?function\s+requireInternalKey\s*\(/);
  assert.match(helperSource, /export\s+(async\s+)?function\s+getPhone\s*\(/);
  assert.match(helperSource, /export\s+async\s+function\s+resolveUserAndAccess\s*\(/);
  assert.match(helperSource, /export\s+async\s+function\s+requireAllowed\s*\(/);
  assert.match(helperSource, /export\s+async\s+function\s+audit\s*\(/);
});

test("budget migrations keep only crops.budget and remove budget_amount", () => {
  const migrationFiles = fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir) : [];
  const sqlSources = migrationFiles
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileOrEmpty(path.join(migrationsDir, name)))
    .join("\n");

  assert.match(sqlSources, /alter table public\.crops\s+add column if not exists budget\s+(numeric|double precision|real)/i);
  assert.match(sqlSources, /check\s*\(budget is null or budget > 0\)/i);
  assert.match(sqlSources, /alter table public\.crops\s+drop column if exists budget_amount/i);
});

test("expenses.crop_id migration normalizes to bigint and recreates FK", () => {
  const migrationPath = path.join(
    migrationsDir,
    "20260215093000_fix_expenses_crop_id_bigint.sql",
  );
  assert.equal(fs.existsSync(migrationPath), true, `Missing ${migrationPath}`);

  const sql = readFileOrEmpty(migrationPath);
  assert.match(sql, /alter column crop_id type bigint/i);
  assert.match(sql, /foreign key\s*\(crop_id\)\s*references public\.crops\(id\)/i);
});

test("function contracts include required fields and action names", () => {
  const budgetStatus = readFileOrEmpty(
    path.join(functionsDir, "wa_crop_budget_status", "index.ts"),
  );
  const compareCosts = readFileOrEmpty(
    path.join(functionsDir, "wa_compare_finished_crops_costs", "index.ts"),
  );
  const reportData = readFileOrEmpty(
    path.join(functionsDir, "wa_crop_report_data", "index.ts"),
  );
  const cropMeasurementRuntime = readFileOrEmpty(
    path.join(rootDir, "lib", "wa", "crop-measurement-runtime.ts"),
  );

  assert.match(budgetStatus, /buildCropBudgetStatusRuntime/i);
  assert.match(cropMeasurementRuntime, /missing_budget/i);
  assert.match(cropMeasurementRuntime, /spent_amount/i);
  assert.match(cropMeasurementRuntime, /remaining_amount/i);
  assert.match(cropMeasurementRuntime, /budget_status/i);
  assert.match(cropMeasurementRuntime, /expense_summary/i);
  assert.match(cropMeasurementRuntime, /measurement_unit/i);
  assert.match(cropMeasurementRuntime, /application\/x-www-form-urlencoded/i);
  assert.doesNotMatch(budgetStatus, /\bbudget_amount\b/i);
  assert.match(cropMeasurementRuntime, /\bbudget\b/i);

  assert.match(compareCosts, /buildCompareFinishedCropsCostsRuntime/i);
  assert.match(cropMeasurementRuntime, /compare_finished_crops_costs/i);
  assert.match(cropMeasurementRuntime, /grand_total_spent/i);
  assert.match(cropMeasurementRuntime, /crop_id_1/i);
  assert.match(cropMeasurementRuntime, /crop_id_2/i);
  assert.match(cropMeasurementRuntime, /measurement_unit/i);
  assert.match(cropMeasurementRuntime, /items:/i);
  assert.match(cropMeasurementRuntime, /application\/x-www-form-urlencoded/i);

  assert.match(reportData, /buildCropReportDataRuntime/i);
  assert.match(cropMeasurementRuntime, /crop_report_data/i);
  assert.match(cropMeasurementRuntime, /report_type/i);
  assert.match(cropMeasurementRuntime, /partial|total/i);
  assert.match(cropMeasurementRuntime, /expense_type/i);
  assert.match(cropMeasurementRuntime, /gross_profit/i);
  assert.match(cropMeasurementRuntime, /net_profit/i);
  assert.match(cropMeasurementRuntime, /measurement_unit/i);
  assert.doesNotMatch(reportData, /\bbudget_amount\b/i);
  assert.match(cropMeasurementRuntime, /\bbudget\b/i);
  assert.doesNotMatch(reportData, /\bdate_from\b/i);
  assert.doesNotMatch(reportData, /\bdate_to\b/i);
  assert.match(cropMeasurementRuntime, /application\/x-www-form-urlencoded/i);
});

test("n8n crop html report script is saved with measurement unit fallback labels", () => {
  assert.equal(fs.existsSync(n8nScriptPath), true, `Missing ${n8nScriptPath}`);

  const script = readFileOrEmpty(n8nScriptPath);
  assert.match(script, /measurementUnit/i);
  assert.match(script, /measurement_unit \?\? ['"]kg['"]/i);
  assert.match(script, /per \$\{measurementUnit\}/i);
  assert.match(script, /kilos\b/i);
});
