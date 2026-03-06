import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function readFileOrEmpty(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

test("expense functions return crop budget status after create/update", () => {
  const createExpense = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_create_expense", "index.ts"),
  );
  const updateExpense = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_update_expense", "index.ts"),
  );
  const deleteExpense = readFileOrEmpty(
    path.join(process.cwd(), "supabase", "functions", "wa_delete_expense", "index.ts"),
  );

  assert.match(createExpense, /crop_budget_missing/i);
  assert.match(createExpense, /crop_inactive/i);
  assert.match(createExpense, /budget_status/i);
  assert.match(createExpense, /computeCropBudgetStatus/i);

  assert.match(updateExpense, /crop_inactive/i);
  assert.match(updateExpense, /budget_status/i);
  assert.match(updateExpense, /computeCropBudgetStatus/i);

  assert.match(deleteExpense, /crop_inactive/i);
});
