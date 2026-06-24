import { AppError } from "@/lib/errors/app-error";
import type { SubscriptionRecord } from "@/lib/types/domain";

type ManualSubscriptionEvent = {
  id?: string;
  status?: string;
  error_code?: string | null;
};

type ManualSubscriptionEventResult = {
  duplicate: boolean;
  event: ManualSubscriptionEvent | null;
  subscription: Record<string, unknown> | null;
  payment: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
};

type AuditOutcome = "ok" | "error";

type ManualSubscriptionAuditEntryInput = {
  actorAdminId?: string | null;
  outcome: AuditOutcome;
  result: ManualSubscriptionEventResult;
  subscriptionId: string;
  targetStatus: string;
};

function mapEventFailureToAppError(event: ManualSubscriptionEvent | null) {
  const status = event?.status ?? "rejected";
  const errorCode = event?.error_code ?? null;

  if (status === "ignored") {
    return new AppError(
      "La suscripción no tuvo cambios para aplicar",
      409,
      "subscription_event_ignored",
    );
  }

  if (errorCode === "subscription_not_found") {
    return new AppError("Suscripción no encontrada", 404, errorCode);
  }

  if (errorCode === "target_status_required") {
    return new AppError("Falta el estado de destino", 400, errorCode);
  }

  return new AppError(
    `La suscripción no pudo actualizarse (${errorCode ?? status})`,
    409,
    errorCode ?? `subscription_event_${status}`,
  );
}

export function ensureManualSubscriptionEventProcessed(
  result: ManualSubscriptionEventResult,
) {
  if (result.event?.status !== "processed") {
    throw mapEventFailureToAppError(result.event);
  }

  if (!result.subscription) {
    throw new AppError("Suscripción no encontrada", 404, "subscription_not_found");
  }

  return result.subscription as SubscriptionRecord;
}

export function toManualSubscriptionAuditEntry({
  actorAdminId,
  outcome,
  result,
  subscriptionId,
  targetStatus,
}: ManualSubscriptionAuditEntryInput) {
  return {
    actorAuthId: actorAdminId ?? null,
    actorAdminId: actorAdminId ?? null,
    entityType: "subscription",
    entityId: subscriptionId,
    action: "subscription.status.change",
    detail: {
      event_id: result.event?.id ?? null,
      event_status: result.event?.status ?? null,
      target_status: targetStatus,
      resulting_status:
        result.subscription && typeof result.subscription.status === "string"
          ? result.subscription.status
          : null,
      error_code: result.event?.error_code ?? null,
    },
    result: outcome,
  };
}
