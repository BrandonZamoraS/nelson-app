import { PrivateShell } from "@/components/layout/private-shell";
import { formatAuditActionSummary, formatAuditActor } from "@/lib/audit/summary";
import { listAuditLogs } from "@/lib/data/audit";
import { formatDateTime } from "@/lib/utils/format";
import { auditFilterInputSchema } from "@/lib/validators/audit";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const parsed = auditFilterInputSchema.safeParse({
    action: asString(params.action) || undefined,
    entity_type: asString(params.entity_type) || undefined,
    entity_id: asString(params.entity_id) || undefined,
    actor: asString(params.actor) || undefined,
    result: asString(params.result) || undefined,
    from: asString(params.from) || undefined,
    to: asString(params.to) || undefined,
    page: asString(params.page) || undefined,
    pageSize: asString(params.pageSize) || undefined,
  });

  const filters = parsed.success ? parsed.data : auditFilterInputSchema.parse({});
  const result = await listAuditLogs(filters);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const prevPage = Math.max(1, result.page - 1);
  const nextPage = Math.min(totalPages, result.page + 1);
  const paginationParams = new URLSearchParams();

  if (filters.actor) paginationParams.set("actor", filters.actor);
  if (filters.result) paginationParams.set("result", filters.result);
  if (filters.from) paginationParams.set("from", filters.from);
  if (filters.to) paginationParams.set("to", filters.to);
  paginationParams.set("pageSize", String(result.pageSize));

  const pageHref = (page: number) => {
    const params = new URLSearchParams(paginationParams);
    params.set("page", String(page));
    return `/auditoria?${params.toString()}`;
  };

  return (
    <PrivateShell
      title="Auditoria"
      subtitle="Historial simple de quién hizo qué, sin detalles sensibles"
    >
      <section className="panel-block">
        <form className="toolbar-grid" method="get">
          <div className="form-field">
            <label htmlFor="result">Resultado</label>
            <select id="result" name="result" defaultValue={filters.result ?? ""}>
              <option value="">Todos</option>
              <option value="ok">ok</option>
              <option value="error">error</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="actor">Usuario</label>
            <input
              id="actor"
              name="actor"
              placeholder="Nombre o email"
              defaultValue={filters.actor ?? ""}
            />
          </div>
          <div className="form-field">
            <label htmlFor="from">Desde</label>
            <input id="from" type="date" name="from" defaultValue={filters.from ?? ""} />
          </div>
          <div className="form-field">
            <label htmlFor="to">Hasta</label>
            <input id="to" type="date" name="to" defaultValue={filters.to ?? ""} />
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button className="button button-ghost" type="submit">
              Aplicar filtros
            </button>
          </div>
        </form>

        <div className="audit-event-list" aria-label="Eventos de auditoría">
          {result.rows.map((row) => {
            const actorName = row.actor_profile?.full_name ?? row.actor_profile?.email;
            const actor = formatAuditActor({ ...row.detail, actor_name: actorName });
            const action = formatAuditActionSummary({
              action: row.action,
              entityType: row.entity_type,
              result: row.result,
            });

            return (
              <article className="audit-event" key={row.id}>
                <time className="audit-event-date" dateTime={row.occurred_at}>
                  {formatDateTime(row.occurred_at)}
                </time>
                <p className="audit-event-summary">
                  <strong>{actor}</strong> {action}.
                </p>
              </article>
            );
          })}
        </div>

        <div className="row-between">
          <p className="muted">
            Pagina {result.page} de {totalPages} - {result.total} eventos
          </p>
          <div className="row-inline">
            <a
              href={pageHref(prevPage)}
              className="button button-ghost"
            >
              Anterior
            </a>
            <a
              href={pageHref(nextPage)}
              className="button button-ghost"
            >
              Siguiente
            </a>
          </div>
        </div>
      </section>
    </PrivateShell>
  );
}
