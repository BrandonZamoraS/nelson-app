type AuditActorDetail = Record<string, unknown>;

type AuditActionSummaryInput = {
  action: string;
  entityType: string;
  detail?: AuditActorDetail | null;
  result?: "ok" | "error";
};

const entityNouns: Record<string, string> = {
  user: "un usuario",
  users: "un usuario",
  subscription: "una suscripción",
  subscriptions: "una suscripción",
  payment: "un pago",
  payments: "un pago",
  crop: "un cultivo",
  expense: "un gasto",
  sale: "una venta",
  settings: "la configuración",
};

const actionVerbs: Record<string, string> = {
  create: "creó",
  update: "actualizó",
  delete: "eliminó",
  suspend: "suspendió",
  reactivate: "reactivó",
  terminate: "finalizó",
  sync: "sincronizó",
  "settings.update": "actualizó",
  "subscription.status.change": "cambió el estado de",
  "user.create": "creó",
  "user.update": "actualizó",
};

const attemptedActionVerbs: Record<string, string> = {
  create: "crear",
  update: "actualizar",
  delete: "eliminar",
  suspend: "suspender",
  reactivate: "reactivar",
  terminate: "finalizar",
  sync: "sincronizar",
  "settings.update": "actualizar",
  "subscription.status.change": "cambiar el estado de",
  "user.create": "crear",
  "user.update": "actualizar",
};

function readableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function humanize(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

export function formatAuditActor(detail?: AuditActorDetail | null) {
  const safeDetail = detail ?? {};

  return (
    readableString(safeDetail.actor_name) ??
    readableString(safeDetail.actor_full_name) ??
    readableString(safeDetail.actor_email) ??
    "Sistema"
  );
}

export function formatAuditActionSummary({
  action,
  entityType,
  result = "ok",
}: AuditActionSummaryInput) {
  const verb = actionVerbs[action] ?? humanize(action);
  const attemptedVerb = attemptedActionVerbs[action] ?? humanize(action);
  const entity = entityNouns[entityType] ?? humanize(entityType);
  const sentence = `${verb} ${entity}`;

  return result === "error" ? `intentó ${attemptedVerb} ${entity}, pero falló` : sentence;
}
