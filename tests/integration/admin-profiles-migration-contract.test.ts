import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "202602130002_admin_profiles_and_audit_actor.sql",
);

function readMigration() {
  if (!fs.existsSync(migrationPath)) {
    return "";
  }

  return fs.readFileSync(migrationPath, "utf8");
}

test("admin profile migration exists", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    `Expected migration file at ${migrationPath}`,
  );
});

test("admin profile migration creates admin_profiles and links audit actor", () => {
  const sql = readMigration();
  assert.match(sql, /create table if not exists public\.admin_profiles/i);
  assert.match(sql, /references auth\.users\(id\)/i);
  assert.match(sql, /add column if not exists actor_admin_id uuid/i);
  assert.match(
    sql,
    /references public\.admin_profiles\(id\)\s+on delete set null/i,
  );
  assert.match(sql, /drop column if exists actor_user_id/i);
  assert.match(sql, /create or replace function public\.is_active_admin\(\)/i);
  assert.match(sql, /alter table public\.admin_profiles enable row level security/i);
  assert.match(sql, /alter table public\.users enable row level security/i);
  assert.match(sql, /alter table public\.subscriptions enable row level security/i);
  assert.match(sql, /alter table public\.audit_logs enable row level security/i);
  assert.match(sql, /alter table public\.app_settings enable row level security/i);
  assert.match(sql, /create policy users_select_active_admin/i);
  assert.match(sql, /create policy subscriptions_select_active_admin/i);
  assert.match(sql, /create policy audit_logs_select_active_admin/i);
  assert.match(sql, /create policy app_settings_select_active_admin/i);
});
