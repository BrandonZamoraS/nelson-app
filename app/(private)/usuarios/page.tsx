import { PrivateShell } from "@/components/layout/private-shell";
import { FlashMessage } from "@/components/ui/flash-message";
import { Modal } from "@/components/ui/modal";
import { PhoneInput } from "@/components/ui/phone-input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createUserAction,
  updateUserAction,
} from "@/lib/actions/private-actions";
import { getUserById, listUsers } from "@/lib/data/users";
import { SUBSCRIPTION_STATUSES } from "@/lib/types/domain";
import { formatCurrencyCents, formatDate } from "@/lib/utils/format";
import { listUsersInputSchema } from "@/lib/validators/users";

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const parsed = listUsersInputSchema.safeParse({
    search: asString(params.search) || undefined,
    status: asString(params.status) || undefined,
    limit: 100,
  });
  const filters = parsed.success ? parsed.data : {};

  const [rows, selected] = await Promise.all([
    listUsers(filters),
    asString(params.id)
      ? getUserById(asString(params.id)).catch(() => null)
      : Promise.resolve(null),
  ]);

  const modal = asString(params.modal);
  const success = asString(params.success);
  const error = asString(params.error);

  return (
    <PrivateShell
      title="Usuarios"
      subtitle="Gestion de usuarios con suscripcion inicial y edicion"
      actions={
        <a href="/usuarios?modal=create" className="button button-primary">
          Crear usuario
        </a>
      }
    >
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
                <th>Nombre</th>
                <th>WhatsApp</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Proximo cobro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.user.id}>
                  <td data-label="Nombre">{entry.user.full_name}</td>
                  <td data-label="WhatsApp">{entry.user.whatsapp}</td>
                  <td data-label="Estado">
                    {entry.subscription ? (
                      <StatusBadge status={entry.subscription.status} />
                    ) : (
                      <span className="badge badge-muted">sin suscripcion</span>
                    )}
                  </td>
                  <td data-label="Monto">
                    {entry.subscription
                      ? formatCurrencyCents(entry.subscription.amount_cents)
                      : "-"}
                  </td>
                  <td data-label="Proximo cobro">{formatDate(entry.subscription?.next_billing_date)}</td>
                  <td>
                    <div className="row-actions">
                      <a href={`/usuarios?modal=view&id=${entry.user.id}`}>Ver</a>
                      <a href={`/usuarios?modal=edit&id=${entry.user.id}`}>Editar</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal === "create" ? (
        <Modal title="Crear usuario" closeHref="/usuarios">
          <form action={createUserAction} className="stack-form">
            <input type="hidden" name="source" value="manual" />
            <input type="hidden" name="plan" value="manual" />
            <input type="hidden" name="status" value="activa" />
            <label className="field">
              <span>Nombre completo</span>
              <input name="full_name" required minLength={3} />
            </label>
            <div className="field">
              <span>WhatsApp</span>
              <PhoneInput name="whatsapp" required />
            </div>
            <label className="field">
              <span>Monto (centavos USD)</span>
              <input
                name="amount_cents"
                type="number"
                min={1}
                step={1}
                defaultValue={19800}
                required
              />
            </label>
            <label className="field">
              <span>Fecha inicio</span>
              <input name="start_date" type="date" required />
            </label>
            <label className="field">
              <span>Proximo cobro</span>
              <input name="next_billing_date" type="date" />
            </label>
            <button type="submit" className="button button-primary">
              Guardar
            </button>
          </form>
        </Modal>
      ) : null}

      {modal === "view" && selected ? (
        <Modal title="Detalle de usuario" closeHref="/usuarios">
          <dl className="details-grid">
            <dt>Nombre</dt>
            <dd>{selected.user.full_name}</dd>
            <dt>WhatsApp</dt>
            <dd>{selected.user.whatsapp}</dd>
            <dt>Plan</dt>
            <dd>{selected.subscription?.plan ?? "-"}</dd>
            <dt>Monto</dt>
            <dd>
              {selected.subscription
                ? formatCurrencyCents(selected.subscription.amount_cents)
                : "-"}
            </dd>
            <dt>Estado</dt>
            <dd>{selected.subscription?.status ?? "-"}</dd>
            <dt>Inicio</dt>
            <dd>{formatDate(selected.subscription?.start_date ?? null)}</dd>
            <dt>Proximo cobro</dt>
            <dd>{formatDate(selected.subscription?.next_billing_date ?? null)}</dd>
          </dl>
        </Modal>
      ) : null}

      {modal === "edit" && selected ? (
        <Modal title="Editar usuario" closeHref="/usuarios">
          <form action={updateUserAction} className="stack-form">
            <input type="hidden" name="user_id" value={selected.user.id} />
            <input type="hidden" name="source" value="manual" />
            <input type="hidden" name="plan" value="manual" />
            <label className="field">
              <span>Nombre completo</span>
              <input
                name="full_name"
                defaultValue={selected.user.full_name}
                required
                minLength={3}
              />
            </label>
            <div className="field">
              <span>WhatsApp</span>
              <PhoneInput
                name="whatsapp"
                defaultValue={selected.user.whatsapp}
                required
              />
            </div>
            <label className="field">
              <span>Monto (centavos USD)</span>
              <input
                name="amount_cents"
                type="number"
                min={1}
                step={1}
                defaultValue={selected.subscription?.amount_cents ?? 19800}
                required
              />
            </label>
            <label className="field">
              <span>Estado</span>
              <select name="status" defaultValue={selected.subscription?.status}>
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Fecha inicio</span>
              <input
                name="start_date"
                type="date"
                defaultValue={selected.subscription?.start_date ?? ""}
                required
              />
            </label>
            <label className="field">
              <span>Proximo cobro</span>
              <input
                name="next_billing_date"
                type="date"
                defaultValue={selected.subscription?.next_billing_date ?? ""}
              />
            </label>
            <button type="submit" className="button button-primary">
              Guardar cambios
            </button>
          </form>
        </Modal>
      ) : null}
    </PrivateShell>
  );
}
