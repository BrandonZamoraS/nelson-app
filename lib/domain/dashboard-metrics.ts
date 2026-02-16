import { SYSTEM_CURRENCY } from "@/lib/domain/currency";
import type {
  AuditLogRecord,
  PaymentRecord,
  SubscriptionRecord,
} from "@/lib/types/domain";

export type DashboardKpis = {
  totalSubscriptions: number;
  activeCount: number;
  graceCount: number;
  suspendedCount: number;
  terminatedCount: number;
  dueSoonCount: number;
};

export type DashboardAlert = {
  level: "info" | "warning" | "critical";
  message: string;
};

export type DashboardRevenue = {
  monthCents: number;
  last7DaysCents: number;
  estimatedMrrCents: number;
  arpu30dCents: number;
  currency: typeof SYSTEM_CURRENCY;
};

export function computeDashboardKpis(
  subscriptions: Pick<SubscriptionRecord, "status" | "next_billing_date">[],
  today = new Date(),
): DashboardKpis {
  const bucket = {
    activa: 0,
    gracia: 0,
    suspendida: 0,
    terminada: 0,
    dueSoon: 0,
  };

  const now = new Date(today.toISOString().slice(0, 10));

  for (const item of subscriptions) {
    bucket[item.status] += 1;

    if (item.next_billing_date) {
      const due = new Date(item.next_billing_date);
      const distanceMs = due.getTime() - now.getTime();
      const days = Math.floor(distanceMs / (1000 * 60 * 60 * 24));

      if (days >= 0 && days <= 7) {
        bucket.dueSoon += 1;
      }
    }
  }

  return {
    totalSubscriptions: subscriptions.length,
    activeCount: bucket.activa,
    graceCount: bucket.gracia,
    suspendedCount: bucket.suspendida,
    terminatedCount: bucket.terminada,
    dueSoonCount: bucket.dueSoon,
  };
}

export function buildDashboardAlerts(kpis: DashboardKpis): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (kpis.graceCount > 0) {
    alerts.push({
      level: "warning",
      message: `${kpis.graceCount} suscripciones estan en periodo de gracia.`,
    });
  }

  if (kpis.suspendedCount > 0) {
    alerts.push({
      level: "critical",
      message: `${kpis.suspendedCount} suscripciones estan suspendidas.`,
    });
  }

  if (kpis.dueSoonCount > 0) {
    alerts.push({
      level: "info",
      message: `${kpis.dueSoonCount} suscripciones vencen en los proximos 7 dias.`,
    });
  }

  return alerts;
}

type RevenuePayment = Pick<
  PaymentRecord,
  "amount_cents" | "paid_at" | "status" | "user_id"
>;

type RevenueSubscription = Pick<SubscriptionRecord, "status" | "amount_cents">;

function getStartOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isWithinRange(date: Date, startInclusive: Date, endExclusive: Date) {
  const time = date.getTime();
  return time >= startInclusive.getTime() && time < endExclusive.getTime();
}

export function computeDashboardRevenue(
  payments: RevenuePayment[],
  subscriptions: RevenueSubscription[],
  today = new Date(),
): DashboardRevenue {
  const dayStart = getStartOfUtcDay(today);
  const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));
  const nextMonthStart = new Date(
    Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth() + 1, 1),
  );
  const last7DaysStart = new Date(dayStart);
  last7DaysStart.setUTCDate(last7DaysStart.getUTCDate() - 6);
  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const last30DaysStart = new Date(dayStart);
  last30DaysStart.setUTCDate(last30DaysStart.getUTCDate() - 29);

  let monthCents = 0;
  let last7DaysCents = 0;
  let paid30dCents = 0;
  const paid30dUsers = new Set<string>();

  for (const payment of payments) {
    if (payment.status !== "paid" || !payment.paid_at) {
      continue;
    }

    const paidAt = new Date(payment.paid_at);
    if (Number.isNaN(paidAt.getTime())) {
      continue;
    }

    if (isWithinRange(paidAt, monthStart, nextMonthStart)) {
      monthCents += payment.amount_cents;
    }

    if (isWithinRange(paidAt, last7DaysStart, tomorrowStart)) {
      last7DaysCents += payment.amount_cents;
    }

    if (isWithinRange(paidAt, last30DaysStart, tomorrowStart)) {
      paid30dCents += payment.amount_cents;
      paid30dUsers.add(payment.user_id);
    }
  }

  let estimatedMrrCents = 0;
  for (const subscription of subscriptions) {
    if (subscription.status === "activa" || subscription.status === "gracia") {
      estimatedMrrCents += subscription.amount_cents;
    }
  }

  const arpu30dCents =
    paid30dUsers.size > 0 ? Math.round(paid30dCents / paid30dUsers.size) : 0;

  return {
    monthCents,
    last7DaysCents,
    estimatedMrrCents,
    arpu30dCents,
    currency: SYSTEM_CURRENCY,
  };
}

export function mapRecentActivity(logs: AuditLogRecord[]) {
  return logs.map((log) => ({
    id: log.id,
    when: log.occurred_at,
    title: `${log.action} (${log.entity_type})`,
    result: log.result,
  }));
}
