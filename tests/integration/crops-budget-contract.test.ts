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

test("crop functions expose and validate budget", () => {
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

  assert.match(createCrop, /missing_budget/i);
  assert.match(createCrop, /invalid_budget/i);
  assert.match(createCrop, /budget must be a number > 0/i);
  assert.match(createCrop, /budget:/i);
  assert.match(createCrop, /select\("id, created_at, description, size, budget, start_date, end_date"\)/i);

  assert.match(updateCrop, /invalid_budget/i);
  assert.match(updateCrop, /budget must be a number > 0/i);
  assert.match(updateCrop, /patch\.budget/i);
  assert.match(updateCrop, /select\("id, created_at, description, size, budget, start_date, end_date"\)/i);

  assert.match(listCrops, /select\("id, created_at, description, size, budget, start_date, end_date"\)/i);
  assert.match(finalizeCrop, /missing_gross_profit/i);
  assert.match(finalizeCrop, /gross_profit is required/i);
  assert.match(finalizeCrop, /invalid_gross_profit/i);
  assert.match(finalizeCrop, /gross_profit must be a number >= 0/i);
  assert.match(finalizeCrop, /select\("id, created_at, description, size, budget, gross_profit, start_date, end_date"\)/i);
});
