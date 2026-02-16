import assert from "node:assert/strict";
import test from "node:test";

import { createUserInputSchema } from "@/lib/validators/users";
import { updateSettingsInputSchema } from "@/lib/validators/settings";
import { patchSubscriptionStatusInputSchema } from "@/lib/validators/subscriptions";
import { auditFilterInputSchema } from "@/lib/validators/audit";

test("createUserInputSchema accepts valid payload", () => {
  const parsed = createUserInputSchema.safeParse({
    full_name: "Maria Lopez",
    whatsapp: "+5493514558821",
    plan: "Mensual",
    amount_cents: 250000,
    status: "activa",
    start_date: "2026-02-13",
    next_billing_date: "2026-03-13",
    source: "manual",
  });

  assert.equal(parsed.success, true);
});

test("createUserInputSchema rejects invalid whatsapp", () => {
  const parsed = createUserInputSchema.safeParse({
    full_name: "Maria Lopez",
    whatsapp: "bad-value",
    plan: "Mensual",
    amount_cents: 0,
    status: "activa",
    start_date: "2026-02-13",
    next_billing_date: null,
    source: "manual",
  });

  assert.equal(parsed.success, false);
});

test("patchSubscriptionStatusInputSchema validates status enum", () => {
  const valid = patchSubscriptionStatusInputSchema.safeParse({
    status: "gracia",
  });
  const invalid = patchSubscriptionStatusInputSchema.safeParse({
    status: "otro",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("updateSettingsInputSchema enforces grace constraints", () => {
  const parsed = updateSettingsInputSchema.safeParse({
    grace_days: 3,
    payment_reminder_template: "Hola {{name}}, recuerda pagar hoy.",
    suspension_notice_template: "Hola {{name}}, tu cuenta esta suspendida.",
    timezone: "America/Argentina/Buenos_Aires",
    date_format: "DD/MM/YYYY",
  });

  const invalid = updateSettingsInputSchema.safeParse({
    grace_days: 42,
    payment_reminder_template: "corta",
    suspension_notice_template: "corta",
    timezone: "A",
    date_format: "YY",
  });

  assert.equal(parsed.success, true);
  assert.equal(invalid.success, false);
});

test("auditFilterInputSchema defaults pagination", () => {
  const parsed = auditFilterInputSchema.parse({});
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 20);
});
