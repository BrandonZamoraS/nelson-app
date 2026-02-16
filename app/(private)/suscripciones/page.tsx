import { PrivateShell } from "@/components/layout/private-shell";
import { FlashMessage } from "@/components/ui/flash-message";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubscriptionStatusChanger } from "@/components/ui/subscription-status-changer";
import {
  changeSubscriptionStatusAction,
  terminateSubscriptionAction,
} from "@/lib/actions/private-actions";
import { listSubscriptions } from "@/lib/data/subscriptions";
import { SUBSCRIPTION_STATUSES } from "@/lib/types/domain";
import { formatCurrencyCents, formatDate } from "@/lib/utils/format";
import { listSubscriptionsInputSchema } from "@/lib/validators/subscriptions";

type SubscriptionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function SubscriptionsPage({
  searchParams,
}: SubscriptionsPageProps) {
  const params = await searchParams;
  const parsed = listSubscriptionsInputSchema.safeParse({
    search: asString(params.search) || undefined,
    status: asString(params.status) || undefined,
    limit: 100,
  });
  const filters = parsed.success ? parsed.data : {};
  const rows = await listSubscriptions(filters);
  const success = asString(params.success);
  const error = asString(params.error);
  const terminateId = asString(params.terminate);
  const terminateTarget =
    terminateId && rows.find((row) => row.id === terminateId)
      ? rows.find((row) => row.id === terminateId)
      : null;

  return (
    <PrivateShell
      title="Suscripciones"
      subtitle="Cambio manual de estado y terminacion confirmada"
    >
      {success ? <FlashMessage kind="success" message={success} /> : null}
      {error ? <FlashMessage kind="error" message={error} /> : null}

      <section className="panel-block">
        <form className="toolbar" method="get">
          <input
            type="search"
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Buscar por plan, nombre o WhatsApp"
          />
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Todos los estados</option>
            {SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="button button-ghost" type="submit">
            Filtrar
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Plan</th>
                <th>Monto</th>
                <th>Estado actual</th>
                <th>Proximo cobro</th>
                <th>Cambiar estado</th>
                <th>Terminar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const user = Array.isArray(row.users) ? row.users[0] : row.users;

                return (
                  <tr key={row.id}>
                    <td data-label="Usuario">
                      <strong>{user?.full_name ?? "Sin nombre"}</strong>
                      <p className="muted">{user?.whatsapp ?? "-"}</p>
                    </td>
                    <td data-label="Plan">{row.plan}</td>
                    <td data-label="Monto">{formatCurrencyCents(row.amount_cents)}</td>
                    <td data-label="Estado actual">
                      <StatusBadge status={row.status} />
                    </td>
                    <td data-label="Proximo cobro">{formatDate(row.next_billing_date)}</td>
                    <td data-label="Cambiar estado">
                      <SubscriptionStatusChanger
                        subscriptionId={row.id}
                        currentStatus={row.status}
                        userName={user?.full_name ?? "Sin nombre"}
                        statuses={SUBSCRIPTION_STATUSES}
                      />
                    </td>
                    <td>
                      <a
                        className="button button-danger"
                        href={`/suscripciones?terminate=${row.id}`}
                      >
                        Terminar
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {terminateTarget ? (
        <Modal title="Confirmar terminacion" closeHref="/suscripciones">
          <p>
            Vas a terminar la suscripcion de{" "}
            <strong>
              {Array.isArray(terminateTarget.users)
                ? terminateTarget.users[0]?.full_name
                : terminateTarget.users?.full_name}
            </strong>
            .
          </p>
          <form action={terminateSubscriptionAction} className="row-inline">
            <input
              type="hidden"
              name="subscription_id"
              value={terminateTarget.id}
            />
            <button type="submit" className="button button-danger">
              Confirmar
            </button>
            <a href="/suscripciones" className="button button-ghost">
              Cancelar
            </a>
          </form>
        </Modal>
      ) : null}
    </PrivateShell>
  );
}
