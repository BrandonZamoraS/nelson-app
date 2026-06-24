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

test("apply_subscription_event RPC revokes direct public execution and only grants the service role", () => {
  const sql = readMigration();

  assert.match(sql, /revoke all on function public\.apply_subscription_event\(jsonb\) from public/i);
  assert.match(sql, /revoke all on function public\.apply_subscription_event\(jsonb\) from anon/i);
  assert.match(sql, /revoke all on function public\.apply_subscription_event\(jsonb\) from authenticated/i);
  assert.match(sql, /grant execute on function public\.apply_subscription_event\(jsonb\) to service_role/i);
});

test("apply_subscription_event RPC preserves sanitized identity hints for pending review reconciliation", () => {
  const sql = readMigration();

  assert.match(sql, /'whatsapp',[\s\S]*v_whatsapp/i);
  assert.match(sql, /'full_name',[\s\S]*v_full_name/i);
});

test("apply_subscription_event RPC reactivates inactive users for existing subscriptions only when needed", () => {
  const sql = readMigration();

  assert.match(sql, /v_reactivated_user boolean := false/i);
  assert.match(sql, /if v_user\.id is not null and v_user\.is_active = false then[\s\S]*update public\.users[\s\S]*is_active = true[\s\S]*v_reactivated_user := true/i);
  assert.match(sql, /'reactivated_user',[\s\S]*case when v_reactivated_user then true else null end/i);
});

test("apply_subscription_event RPC restarts suspended or terminated subscriptions before null-cycle review", () => {
  const sql = readMigration();

  assert.match(
    sql,
    /if v_subscription\.status in \('gracia', 'suspendida', 'terminada'\) then[\s\S]*v_next_billing_date := \(v_paid_at::date \+ interval '1 month'\)::date[\s\S]*elsif v_subscription\.next_billing_date is null then[\s\S]*missing_subscription_cycle/i,
  );
});

test("apply_subscription_event RPC rejects user identity conflicts against the locked subscription owner", () => {
  const sql = readMigration();

  assert.match(sql, /v_subscription\.user_id is not null/i);
  assert.match(sql, /v_user_id is not null and v_user_id <> v_subscription\.user_id/i);
  assert.match(sql, /v_event_status := 'rejected';[\s\S]*v_error_code := 'subscription_user_conflict';/i);
});

test("apply_subscription_event RPC returns rejected events from the exception handler instead of promising a rolled-back audit row", () => {
  const sql = readMigration();

  assert.match(sql, /exception[\s\S]*when others then[\s\S]*status = 'rejected'/i);
  assert.match(sql, /return jsonb_build_object\([\s\S]*'event', to_jsonb\(v_event\)/i);
  assert.doesNotMatch(sql, /exception[\s\S]*when others then[\s\S]*raise;/i);
});
