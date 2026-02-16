import { PrivateShell } from "@/components/layout/private-shell";
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

  return (
    <PrivateShell
      title="Auditoria"
      subtitle="Trazabilidad completa de mutaciones del sistema"
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

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Accion</th>
                <th>Entidad</th>
                <th>ID</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Fecha">{formatDateTime(row.occurred_at)}</td>
                  <td data-label="Accion">{row.action}</td>
                  <td data-label="Entidad">{row.entity_type}</td>
                  <td data-label="ID">{row.entity_id}</td>
                  <td data-label="Resultado">
                    <span className={row.result === "ok" ? "badge badge-active" : "badge badge-critical"}>
                      {row.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row-between">
          <p className="muted">
            Pagina {result.page} de {totalPages} - {result.total} eventos
          </p>
          <div className="row-inline">
            <a
              href={`/auditoria?page=${prevPage}&pageSize=${result.pageSize}`}
              className="button button-ghost"
            >
              Anterior
            </a>
            <a
              href={`/auditoria?page=${nextPage}&pageSize=${result.pageSize}`}
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
