import {
  buildDashboardAlerts,
  computeDashboardKpis,
  computeDashboardRevenue,
  mapRecentActivity,
} from "@/lib/domain/dashboard-metrics";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AuditLogRecord,
  PaymentRecord,
  SubscriptionRecord,
} from "@/lib/types/domain";

export async function getDashboardData() {
  const client = createSupabaseAdminClient();

  const [
    { data: subscriptions, error: subscriptionsError },
    { data: logs, error: logsError },
    { data: payments, error: paymentsError },
  ] =
    await Promise.all([
      client
        .from("subscriptions")
        .select("status,next_billing_date,amount_cents")
        .limit(5000),
      client
        .from("audit_logs")
        .select(
          "id,occurred_at,actor_admin_id,entity_type,entity_id,action,detail,result",
        )
        .order("occurred_at", { ascending: false })
        .limit(8),
      client
        .from("payments")
        .select("amount_cents,paid_at,status,user_id")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

  if (subscriptionsError) {
    throw new AppError(
      subscriptionsError.message,
      500,
      "dashboard_subscriptions_failed",
    );
  }

  if (logsError) {
    throw new AppError(logsError.message, 500, "dashboard_logs_failed");
  }
  if (paymentsError) {
    throw new AppError(paymentsError.message, 500, "dashboard_payments_failed");
  }

  const kpis = computeDashboardKpis(subscriptions ?? []);
  const revenue = computeDashboardRevenue(
    (payments ?? []) as Pick<
      PaymentRecord,
      "amount_cents" | "paid_at" | "status" | "user_id"
    >[],
    (subscriptions ?? []) as Pick<
      SubscriptionRecord,
      "status" | "amount_cents"
    >[],
  );
  const alerts = buildDashboardAlerts(kpis);
  const recentActivity = mapRecentActivity((logs ?? []) as AuditLogRecord[]);

  return { kpis, alerts, recentActivity, revenue };
}
