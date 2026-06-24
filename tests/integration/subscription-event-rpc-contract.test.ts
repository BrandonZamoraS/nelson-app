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

test("apply_subscription_event RPC exists as the single write gate", () => {
  const sql = readMigration();

  assert.match(sql, /create or replace function public\.apply_subscription_event\(/i);
  assert.match(sql, /language plpgsql/i);
  assert.match(sql, /security definer/i);
});

test("apply_subscription_event RPC enforces idempotency and transactional locking", () => {
  const sql = readMigration();

  assert.match(sql, /insert into public\.subscription_events/i);
  assert.match(sql, /on conflict \(idempotency_key\) do nothing/i);
  assert.match(
    sql,
    /select[\s\S]*from public\.subscriptions[\s\S]*for update/i,
  );
  assert.match(sql, /update public\.subscription_events/i);
});

test("apply_subscription_event RPC writes payments, subscriptions and continuity outcomes", () => {
  const sql = readMigration();

  assert.match(sql, /insert into public\.payments/i);
  assert.match(sql, /update public\.subscriptions/i);
  assert.match(sql, /pending_review/i);
  assert.match(sql, /reactivate|is_active = true|deactivated_at = null/i);
  assert.match(sql, /whatsapp/i);
});

test("apply_subscription_event RPC restarts expired subscriptions from paid_at", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /v_subscription\.status\s+in\s*\('gracia',\s*'suspendida',\s*'terminada'\)/i,
  );
  assert.match(sql, /v_next_billing_date\s*:=\s*\(v_paid_at::date \+ interval '1 month'\)::date/i);
});

test("apply_subscription_event RPC sends missing subscription cycles to pending review", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /if v_subscription\.next_billing_date is null then[\s\S]*v_event_status := 'pending_review';[\s\S]*v_error_code := 'missing_subscription_cycle';/i,
  );
});
