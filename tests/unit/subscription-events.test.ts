import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateNextBillingDate,
  classifySubscriptionEvent,
} from "@/lib/domain/subscription-events";

test("calculateNextBillingDate advances renewals from previous billing date", () => {
  assert.equal(
    calculateNextBillingDate({
      currentStatus: "activa",
      nextBillingDate: "2026-06-10",
      paidAt: "2026-06-15T10:00:00.000Z",
    }),
    "2026-07-10",
  );
});

test("calculateNextBillingDate restarts terminated subscriptions from paid_at", () => {
  assert.equal(
    calculateNextBillingDate({
      currentStatus: "terminada",
      nextBillingDate: "2026-05-10",
      paidAt: "2026-06-15T10:00:00.000Z",
    }),
    "2026-07-15",
  );
});

test("calculateNextBillingDate restarts expired subscriptions from paid_at", () => {
  assert.equal(
    calculateNextBillingDate({
      currentStatus: "gracia",
      nextBillingDate: "2026-06-10",
      paidAt: "2026-06-15T10:00:00.000Z",
    }),
    "2026-07-15",
  );
});

test("calculateNextBillingDate uses last valid day for month-end rollover", () => {
  assert.equal(
    calculateNextBillingDate({
      currentStatus: "activa",
      nextBillingDate: "2026-01-31",
      paidAt: "2026-01-31T10:00:00.000Z",
    }),
    "2026-02-28",
  );
});

test("classifySubscriptionEvent marks amount mismatches as pending review", () => {
  const result = classifySubscriptionEvent({
    eventType: "payment_succeeded",
    currentStatus: "activa",
    nextBillingDate: "2026-06-10",
    paidAt: "2026-06-15T10:00:00.000Z",
    amountCents: 1500,
    expectedAmountCents: 2000,
    hasSubscription: true,
  });

  assert.deepEqual(result, {
    status: "pending_review",
    paymentStatus: "pending",
    nextStatus: null,
    nextBillingDate: null,
    reason: "amount_mismatch",
    autoProvisionUser: false,
  });
});

test("classifySubscriptionEvent treats first complete payment as auto provision", () => {
  const result = classifySubscriptionEvent({
    eventType: "payment_succeeded",
    currentStatus: null,
    nextBillingDate: null,
    paidAt: "2026-06-15T10:00:00.000Z",
    amountCents: 2000,
    expectedAmountCents: 2000,
    hasSubscription: false,
    hasWhatsappIdentity: true,
  });

  assert.deepEqual(result, {
    status: "processed",
    paymentStatus: "paid",
    nextStatus: "activa",
    nextBillingDate: "2026-07-15",
    reason: "first_payment_auto_provision",
    autoProvisionUser: true,
  });
});

test("classifySubscriptionEvent reactivates expired subscriptions from paid_at", () => {
  const result = classifySubscriptionEvent({
    eventType: "payment_succeeded",
    currentStatus: "gracia",
    nextBillingDate: "2026-06-10",
    paidAt: "2026-06-15T10:00:00.000Z",
    amountCents: 2000,
    expectedAmountCents: 2000,
    hasSubscription: true,
  });

  assert.deepEqual(result, {
    status: "processed",
    paymentStatus: "paid",
    nextStatus: "activa",
    nextBillingDate: "2026-07-15",
    reason: "payment_reactivated_subscription",
    autoProvisionUser: false,
  });
});

test("classifySubscriptionEvent sends subscriptions without cycle data to pending review", () => {
  const result = classifySubscriptionEvent({
    eventType: "payment_succeeded",
    currentStatus: "activa",
    nextBillingDate: null,
    paidAt: "2026-06-15T10:00:00.000Z",
    amountCents: 2000,
    expectedAmountCents: 2000,
    hasSubscription: true,
  });

  assert.deepEqual(result, {
    status: "pending_review",
    paymentStatus: "pending",
    nextStatus: null,
    nextBillingDate: null,
    reason: "missing_subscription_cycle",
    autoProvisionUser: false,
  });
});

test("classifySubscriptionEvent uses a single missing identity reason taxonomy", () => {
  const result = classifySubscriptionEvent({
    eventType: "payment_succeeded",
    currentStatus: null,
    nextBillingDate: null,
    paidAt: "2026-06-15T10:00:00.000Z",
    amountCents: 2000,
    expectedAmountCents: 2000,
    hasSubscription: false,
    hasWhatsappIdentity: false,
  });

  assert.equal(result.reason, "missing_identity");
});

test("classifySubscriptionEvent keeps failed and refunded payments as financial facts only", () => {
  const failed = classifySubscriptionEvent({
    eventType: "payment_failed",
    currentStatus: "gracia",
    nextBillingDate: "2026-06-10",
    paidAt: null,
    amountCents: 2000,
    expectedAmountCents: 2000,
    hasSubscription: true,
  });

  const refunded = classifySubscriptionEvent({
    eventType: "payment_refunded",
    currentStatus: "activa",
    nextBillingDate: "2026-06-10",
    paidAt: "2026-06-15T10:00:00.000Z",
    amountCents: 2000,
    expectedAmountCents: 2000,
    hasSubscription: true,
  });

  assert.deepEqual(failed, {
    status: "processed",
    paymentStatus: "failed",
    nextStatus: null,
    nextBillingDate: null,
    reason: "payment_failed_recorded",
    autoProvisionUser: false,
  });

  assert.deepEqual(refunded, {
    status: "processed",
    paymentStatus: "refunded",
    nextStatus: null,
    nextBillingDate: null,
    reason: "payment_refunded_recorded",
    autoProvisionUser: false,
  });
});
