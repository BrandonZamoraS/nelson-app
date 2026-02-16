import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardAlerts,
  computeDashboardKpis,
  computeDashboardRevenue,
} from "@/lib/domain/dashboard-metrics";

test("computeDashboardKpis aggregates status and due soon counts", () => {
  const kpis = computeDashboardKpis(
    [
      { status: "activa", next_billing_date: "2026-02-15" },
      { status: "gracia", next_billing_date: "2026-02-20" },
      { status: "suspendida", next_billing_date: null },
      { status: "terminada", next_billing_date: null },
    ],
    new Date("2026-02-13T12:00:00.000Z"),
  );

  assert.equal(kpis.totalSubscriptions, 4);
  assert.equal(kpis.activeCount, 1);
  assert.equal(kpis.graceCount, 1);
  assert.equal(kpis.suspendedCount, 1);
  assert.equal(kpis.terminatedCount, 1);
  assert.equal(kpis.dueSoonCount, 2);
});

test("buildDashboardAlerts emits warning and critical alerts when needed", () => {
  const alerts = buildDashboardAlerts({
    totalSubscriptions: 10,
    activeCount: 5,
    graceCount: 2,
    suspendedCount: 1,
    terminatedCount: 2,
    dueSoonCount: 3,
  });

  assert.equal(alerts.length, 3);
  assert.equal(alerts[0]?.level, "warning");
  assert.equal(alerts[1]?.level, "critical");
  assert.equal(alerts[2]?.level, "info");
});

test("computeDashboardRevenue calculates month, last7d, mrr and arpu30d", () => {
  const revenue = computeDashboardRevenue(
    [
      {
        status: "paid",
        amount_cents: 250_000,
        paid_at: "2026-02-01T12:00:00.000Z",
        user_id: "user-1",
      },
      {
        status: "paid",
        amount_cents: 175_000,
        paid_at: "2026-02-12T08:00:00.000Z",
        user_id: "user-2",
      },
      {
        status: "paid",
        amount_cents: 50_000,
        paid_at: "2026-01-20T10:00:00.000Z",
        user_id: "user-1",
      },
      {
        status: "failed",
        amount_cents: 999_000,
        paid_at: "2026-02-10T10:00:00.000Z",
        user_id: "user-4",
      },
      {
        status: "paid",
        amount_cents: 88_000,
        paid_at: null,
        user_id: "user-5",
      },
    ],
    [
      { status: "activa", amount_cents: 100_000 },
      { status: "gracia", amount_cents: 80_000 },
      { status: "suspendida", amount_cents: 200_000 },
      { status: "terminada", amount_cents: 150_000 },
    ],
    new Date("2026-02-13T12:00:00.000Z"),
  );

  assert.equal(revenue.monthCents, 425_000);
  assert.equal(revenue.last7DaysCents, 175_000);
  assert.equal(revenue.estimatedMrrCents, 180_000);
  assert.equal(revenue.arpu30dCents, 237_500);
  assert.equal(revenue.currency, "USD");
});

test("computeDashboardRevenue returns zero arpu when there are no paid users in 30d", () => {
  const revenue = computeDashboardRevenue(
    [
      {
        status: "pending",
        amount_cents: 120_000,
        paid_at: null,
        user_id: "user-1",
      },
    ],
    [{ status: "activa", amount_cents: 120_000 }],
    new Date("2026-02-13T12:00:00.000Z"),
  );

  assert.equal(revenue.arpu30dCents, 0);
});
