import { PrivateShell } from "@/components/layout/private-shell";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDashboardUsd, formatDateTime } from "@/lib/utils/format";

function metricCard(label: string, value: number) {
  return (
    <article className="metric-card" key={label}>
      <p className="metric-value">{value}</p>
      <p className="metric-label">{label}</p>
    </article>
  );
}

function revenueCard(label: string, value: number) {
  return (
    <article className="revenue-card" key={label}>
      <p className="revenue-value">{formatDashboardUsd(value)}</p>
      <p className="revenue-label">{label}</p>
    </article>
  );
}

export default async function DashboardPage() {
  const { alerts, kpis, recentActivity, revenue } = await getDashboardData();

  return (
    <PrivateShell
      title="Inicio"
      subtitle="Resumen operativo de usuarios y suscripciones"
    >
      <section className="grid-cards">
        {metricCard("Suscripciones activas", kpis.activeCount)}
        {metricCard("En gracia", kpis.graceCount)}
        {metricCard("Suspendidas", kpis.suspendedCount)}
        {metricCard("Terminadas", kpis.terminatedCount)}
      </section>

      <section className="panel-block">
        <h2>Alertas operativas</h2>
        {alerts.length === 0 ? (
          <p className="muted">Sin alertas por ahora.</p>
        ) : (
          <ul className="stack-list">
            {alerts.map((alert) => (
              <li key={alert.message} className={`alert alert-${alert.level}`}>
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel-block">
        <div className="row-between">
          <h2>Actividad reciente</h2>
          <a href="/auditoria" className="button button-ghost">
            Ver auditoria completa
          </a>
        </div>
        {recentActivity.length === 0 ? (
          <p className="muted">Todavia no hay actividad registrada.</p>
        ) : (
          <ul className="stack-list">
            {recentActivity.map((item) => (
              <li key={item.id} className="audit-row">
                <p className="audit-main">{item.title}</p>
                <p className="audit-meta">
                  {formatDateTime(item.when)} - {item.result}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="revenue-section">
        <h2 className="revenue-title">Ingresos</h2>
        <div className="revenue-row">
          {revenueCard("Ingresos del mes", revenue.monthCents)}
          {revenueCard("Ingresos últimos 7 días", revenue.last7DaysCents)}
          {revenueCard("MRR estimado", revenue.estimatedMrrCents)}
          {revenueCard("ARPU promedio", revenue.arpu30dCents)}
        </div>
      </section>
    </PrivateShell>
  );
}
