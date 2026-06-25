import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { AppError } from "@/lib/errors/app-error";
import {
  ensureManualSubscriptionEventProcessed,
  toManualSubscriptionAuditEntry,
} from "@/lib/domain/manual-subscription-events";

const subscription = {
  id: "sub-1",
  user_id: "user-1",
  plan: "Mensual",
  amount_cents: 2000,
  currency: "USD" as const,
  status: "gracia" as const,
  start_date: "2026-06-01",
  next_billing_date: "2026-07-01",
  source: "manual",
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-15T00:00:00.000Z",
};

test("ensureManualSubscriptionEventProcessed propagates rejected RPC event outcomes", () => {
  assert.throws(
    () =>
      ensureManualSubscriptionEventProcessed({
        duplicate: false,
        event: {
          id: "evt-1",
          status: "rejected",
          error_code: "invalid_transition",
        },
        subscription,
        payment: null,
        user: null,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 409);
      assert.equal(error.code, "invalid_transition");
      assert.equal(error.message, "La suscripción no pudo actualizarse (invalid_transition)");
      return true;
    },
  );
});

test("toManualSubscriptionAuditEntry restores audit logging for successful manual changes", () => {
  const auditEntry = toManualSubscriptionAuditEntry({
    actorAdminId: "admin-1",
    subscriptionId: subscription.id,
    targetStatus: "activa",
    result: {
      duplicate: false,
      event: {
        id: "evt-2",
        status: "processed",
        error_code: null,
      },
      subscription: { ...subscription, status: "activa" },
      payment: null,
      user: null,
    },
    outcome: "ok",
  });

  assert.deepEqual(auditEntry, {
    actorAuthId: "admin-1",
    actorAdminId: "admin-1",
    entityType: "subscription",
    entityId: subscription.id,
    action: "subscription.status.change",
    detail: {
      event_id: "evt-2",
      event_status: "processed",
      target_status: "activa",
      resulting_status: "activa",
      error_code: null,
    },
    result: "ok",
  });
});

test("ensureManualSubscriptionEventProcessed does not report success when the event is ignored", () => {
  assert.throws(
    () =>
      ensureManualSubscriptionEventProcessed({
        duplicate: false,
        event: {
          id: "evt-3",
          status: "ignored",
          error_code: null,
        },
        subscription: { ...subscription, status: "terminada", next_billing_date: null },
        payment: null,
        user: null,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 409);
      assert.equal(error.code, "subscription_event_ignored");
      return true;
    },
  );
});

test("ensureManualSubscriptionEventProcessed treats ignored terminal cancels as a successful no-op", () => {
  const result = ensureManualSubscriptionEventProcessed(
    {
      duplicate: false,
      event: {
        id: "evt-4",
        status: "ignored",
        error_code: null,
      },
      subscription: { ...subscription, status: "terminada", next_billing_date: null },
      payment: null,
      user: null,
    },
    { allowIgnoredTerminalCancel: true },
  );

  assert.deepEqual(result, { ...subscription, status: "terminada", next_billing_date: null });
});

test("terminateSubscription allows ignored terminal cancels as an idempotent success", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "lib", "data", "subscriptions.ts"),
    "utf8",
  );

  assert.match(
    source,
    /ensureManualSubscriptionEventProcessed\(result,\s*\{\s*allowIgnoredTerminalCancel:\s*true,?\s*\}\)/,
  );
});
