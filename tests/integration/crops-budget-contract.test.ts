import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260216052000_add_crops_budget.sql",
);
const grossProfitMigrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260302090000_add_crops_gross_profit.sql",
);
const measurementUnitMigrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260627193000_add_crop_measurement_unit.sql",
);

function readFileOrEmpty(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

test("crops budget migration exists", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    `Expected migration file at ${migrationPath}`,
  );
});

test("crops gross profit migration exists", () => {
  assert.equal(
    fs.existsSync(grossProfitMigrationPath),
    true,
    `Expected migration file at ${grossProfitMigrationPath}`,
  );
});

test("crop measurement unit migration exists", () => {
  assert.equal(
    fs.existsSync(measurementUnitMigrationPath),
    true,
    `Expected migration file at ${measurementUnitMigrationPath}`,
  );
});

test("crops gross profit migration adds gross_profit column with non-negative constraint", () => {
  const sql = readFileOrEmpty(grossProfitMigrationPath);

  assert.match(sql, /alter table public\.crops\s+add column if not exists gross_profit real/i);
  assert.match(sql, /add constraint crops_gross_profit_non_negative check \(gross_profit is null or gross_profit >= 0\)/i);
});

test("crops budget migration adds budget column with positive constraint", () => {
  const sql = readFileOrEmpty(migrationPath);

  assert.match(sql, /alter table public\.crops\s+add column if not exists budget real/i);
  assert.match(sql, /add constraint crops_budget_positive check \(budget is null or budget > 0\)/i);
});

test("crop measurement unit migration adds default, validation and immutability", () => {
  const sql = readFileOrEmpty(measurementUnitMigrationPath);

  assert.match(sql, /alter table public\.crops\s+add column if not exists measurement_unit text not null default 'kg'/i);
  assert.match(sql, /update public\.crops\s+set measurement_unit = 'kg'\s+where measurement_unit is null/i);
  assert.match(sql, /add constraint crops_measurement_unit_not_blank check \(char_length\(btrim\(measurement_unit\)\) between 1 and 32\)/i);
  assert.match(sql, /create or replace function public\.prevent_crop_measurement_unit_change\(\)/i);
  assert.match(sql, /raise exception 'measurement_unit is immutable'/i);
  assert.match(sql, /create trigger prevent_crop_measurement_unit_change\s+before update on public\.crops/i);
});

test("crop functions expose and validate budget and measurement unit", () => {
  const createCrop = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_create_crop", "index.ts"),
  );
  const updateCrop = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_update_crop", "index.ts"),
  );
  const listCrops = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_list_crops", "index.ts"),
  );
  const finalizeCrop = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_finalize_crop", "index.ts"),
  );
  const sharedWa = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "_shared", "wa.ts"),
  );
  const cropMeasurementRuntime = readFileOrEmpty(
    path.join(process.cwd(), "lib", "wa", "crop-measurement-runtime.ts"),
  );

  assert.match(createCrop, /createCropRuntime/i);
  assert.match(cropMeasurementRuntime, /missing_budget/i);
  assert.match(cropMeasurementRuntime, /invalid_budget/i);
  assert.match(cropMeasurementRuntime, /budget must be a number > 0/i);
  assert.match(cropMeasurementRuntime, /invalid_measurement_unit/i);
  assert.match(createCrop, /measurement_unit must be one of: kg, lb, quintal, cajuela/i);
  assert.match(cropMeasurementRuntime, /measurement_unit:/i);
  assert.match(cropMeasurementRuntime, /budget:/i);
  assert.match(createCrop, /select\("id, created_at, description, size, budget, measurement_unit, start_date, end_date"\)/i);

  assert.match(updateCrop, /updateCropRuntime/i);
  assert.match(cropMeasurementRuntime, /invalid_budget/i);
  assert.match(cropMeasurementRuntime, /budget must be a number > 0/i);
  assert.match(cropMeasurementRuntime, /measurement_unit_immutable/i);
  assert.match(cropMeasurementRuntime, /measurement_unit cannot be changed after crop creation/i);
  assert.match(cropMeasurementRuntime, /patch\.budget/i);
  assert.match(updateCrop, /select\("id, created_at, description, size, budget, measurement_unit, start_date, end_date"\)/i);

  assert.match(listCrops, /select\("id, created_at, description, size, budget, measurement_unit, start_date, end_date"\)/i);
  assert.match(finalizeCrop, /missing_gross_profit/i);
  assert.match(finalizeCrop, /gross_profit is required/i);
  assert.match(finalizeCrop, /invalid_gross_profit/i);
  assert.match(finalizeCrop, /gross_profit must be a number >= 0/i);
  assert.match(finalizeCrop, /select\("id, created_at, description, size, budget, gross_profit, measurement_unit, start_date, end_date"\)/i);
  assert.match(sharedWa, /measurement_unit: string;/i);
  assert.match(sharedWa, /select\("id, created_at, description, size, budget, gross_profit, measurement_unit, start_date, end_date, user"\)/i);
});
