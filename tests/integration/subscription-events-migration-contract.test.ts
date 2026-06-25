import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "202606230001_provider_agnostic_subscription_events.sql",
);

function readMigration() {
  return fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
}

test("provider agnostic subscription migration exists", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    `Expected migration file at ${migrationPath}`,
  );
});

test("provider agnostic migration adds event table and billing config", () => {
  const sql = readMigration();

  assert.match(sql, /create table if not exists public\.subscription_events/i);
  assert.match(sql, /idempotency_key text not null/i);
  assert.match(sql, /unique \(idempotency_key\)/i);
  assert.match(sql, /status text not null/i);
  assert.match(sql, /check \(status in \('processed','ignored','rejected','pending_review'\)\)/i);
  assert.match(sql, /alter table public\.payments\s+add column if not exists event_id uuid/i);
  assert.match(sql, /unique \(event_id\)/i);
  assert.match(sql, /alter table public\.app_settings\s+add column if not exists initial_subscription_amount_cents integer/i);
  assert.match(sql, /initial_subscription_amount_cents = 2000|default 2000/i);
});

test("provider agnostic migration adds continuity fields and event indexes", () => {
  const sql = readMigration();

  assert.match(sql, /alter table public\.users\s+add column if not exists is_active boolean not null default true/i);
  assert.match(sql, /alter table public\.users\s+add column if not exists deactivated_at timestamptz null/i);
  assert.match(sql, /create index if not exists subscription_events_subscription_id_idx/i);
  assert.match(sql, /create index if not exists subscription_events_user_id_idx/i);
  assert.match(sql, /create index if not exists subscription_events_occurred_at_idx/i);
  assert.match(sql, /create index if not exists subscription_events_pending_review_idx/i);
});
