import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "202602140001_payments_and_fixed_currency.sql",
);

function readMigration() {
  if (!fs.existsSync(migrationPath)) {
    return "";
  }

  return fs.readFileSync(migrationPath, "utf8");
}

test("payments and fixed currency migration exists", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    `Expected migration file at ${migrationPath}`,
  );
});

test("payments and fixed currency migration creates payments and updates schema", () => {
  const sql = readMigration();

  assert.match(sql, /create table if not exists public\.payments/i);
  assert.match(sql, /amount_cents integer not null/i);
  assert.match(sql, /currency text not null default 'USD'/i);
  assert.match(sql, /status text not null/i);
  assert.match(sql, /check \(status in \('pending','paid','failed','refunded'\)\)/i);
  assert.match(sql, /add column if not exists amount_cents integer/i);
  assert.match(sql, /add column if not exists currency text not null default 'USD'/i);
  assert.match(
    sql,
    /alter table public\.app_settings\s+drop column if exists currency/i,
  );
  assert.match(sql, /alter table public\.payments enable row level security/i);
  assert.match(sql, /create policy payments_select_active_admin/i);
});
