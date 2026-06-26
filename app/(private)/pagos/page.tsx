import { PrivateShell } from "@/components/layout/private-shell";
import { CreatePaymentForm } from "@/components/ui/create-payment-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { Modal } from "@/components/ui/modal";
import { PaymentStatusChanger } from "@/components/ui/payment-status-changer";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  listActiveSubscriptions,
  listPayments,
} from "@/lib/data/payments";
import { PAYMENT_STATUSES } from "@/lib/validators/payments";
import { formatCurrencyCents, formatDate } from "@/lib/utils/format";
import { listPaymentsInputSchema } from "@/lib/validators/payments";

type PaymentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const parsed = listPaymentsInputSchema.safeParse({
    search: asString(params.search) || undefined,
    status: asString(params.status) || undefined,
    limit: 100,
  });
  const filters = parsed.success ? parsed.data : {};
  const rows = await listPayments(filters);
  const success = asString(params.success);
  const error = asString(params.error);
  const showCreate = asString(params.create) === "1";
  const subscriptions = showCreate ? await listActiveSubscriptions() : [];

  return (
    <PrivateShell title="Pagos" subtitle="Historial y registro manual de pagos">
      {success ? <FlashMessage kind="success" message={success} /> : null}
      {error ? <FlashMessage kind="error" message={error} /> : null}

      <section className="panel-block">
        <form className="toolbar" method="get">
          <input
            type="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Buscar por nombre o WhatsApp"
          />
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos los estados</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="button button-ghost" type="submit">
            Filtrar
          </button>
          <a href="/pagos?create=1" className="button button-primary">
            Registrar pago
          </a>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Plan</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Pagado el</th>
                <th>Vence</th>
                <th>Fuente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const user = row.users;
                const sub = row.subscriptions;

                return (
                  <tr key={row.id}>
                    <td data-label="Usuario">
                      <strong>{user?.full_name ?? "Sin nombre"}</strong>
                      <p className="muted">{user?.whatsapp ?? "-"}</p>
                    </td>
                    <td data-label="Plan">{sub?.plan ?? "-"}</td>
                    <td data-label="Monto">
                      {formatCurrencyCents(row.amount_cents)}
                    </td>
                    <td data-label="Estado">
                      <StatusBadge status={row.status} />
                    </td>
                    <td data-label="Pagado el">{formatDate(row.paid_at)}</td>
                    <td data-label="Vence">{formatDate(row.due_at)}</td>
                    <td data-label="Fuente">{row.source}</td>
                    <td data-label="Acciones">
                      <PaymentStatusChanger
                        paymentId={row.id}
                        currentStatus={row.status}
                        userName={user?.full_name ?? "Sin nombre"}
                        statuses={PAYMENT_STATUSES}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate ? (
        <Modal title="Registrar pago manual" closeHref="/pagos">
          {subscriptions.length > 0 ? (
            <CreatePaymentForm subscriptions={subscriptions} />
          ) : (
            <p>No hay suscripciones activas para registrar pagos.</p>
          )}
        </Modal>
      ) : null}
    </PrivateShell>
  );
}
