import { formatCurrencyCents, formatDateTime } from "@/lib/utils/format";
import type { PendingReviewSubscriptionItem } from "@/lib/types/domain";

export type { PendingReviewSubscriptionItem } from "@/lib/types/domain";

function getEventLabel(eventType: string) {
  switch (eventType) {
    case "payment_succeeded":
      return "Pago retenido";
    case "payment_failed":
      return "Pago fallido a revisar";
    case "payment_refunded":
      return "Reembolso a revisar";
    default:
      return "Evento pendiente";
  }
}

function formatAmount(amountCents: number | null, currency: "USD") {
  if (amountCents === null) {
    return "Sin monto informado";
  }

  return formatCurrencyCents(amountCents, currency);
}

export function PendingReviewSubscriptionsPanel({
  items,
  totalCount = items.length,
}: {
  items: PendingReviewSubscriptionItem[];
  totalCount?: number;
}) {
  return (
    <section className="panel-block">
      <div className="row-between">
        <div>
          <h2>Cobros pendientes de revisión</h2>
          <p className="muted">
            Visibilidad rápida para seguimiento manual antes de acreditar acceso.
          </p>
        </div>
        <span className="badge badge-warning">{totalCount} abiertos</span>
      </div>

      {items.length === 0 ? (
        <p className="muted">Sin casos abiertos por ahora.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Monto</th>
                <th>Detectado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Usuario">
                    <strong>{item.userName ?? "Usuario por confirmar"}</strong>
                    <p className="muted">
                      {item.userWhatsapp ?? "Sin WhatsApp"}
                    </p>
                    <p className="muted">
                      {item.subscriptionPlan ?? "Sin suscripción vinculada"}
                    </p>
                  </td>
                  <td data-label="Tipo">
                    <strong>{getEventLabel(item.eventType)}</strong>
                    <p className="muted">Fuente: {item.source}</p>
                  </td>
                  <td data-label="Motivo">
                    <strong>{item.reasonLabel}</strong>
                    {item.reasonCode ? (
                      <p className="muted">Código: {item.reasonCode}</p>
                    ) : null}
                  </td>
                  <td data-label="Monto">
                    <strong>{formatAmount(item.amountCents, item.currency)}</strong>
                    {item.expectedAmountCents !== null ? (
                      <p className="muted">
                        Esperado: {formatCurrencyCents(item.expectedAmountCents)}
                      </p>
                    ) : null}
                  </td>
                  <td data-label="Detectado">{formatDateTime(item.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
