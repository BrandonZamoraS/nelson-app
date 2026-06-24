import { logAudit } from "@/lib/audit/log-audit";
import { applySubscriptionEvent } from "@/lib/data/subscription-events";
import {
  ensureManualSubscriptionEventProcessed,
  toManualSubscriptionAuditEntry,
} from "@/lib/domain/manual-subscription-events";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionRecord, SubscriptionStatus } from "@/lib/types/domain";
import type { PatchSubscriptionStatusInput } from "@/lib/validators/subscriptions";

type ListSubscriptionsInput = {
  search?: string;
  status?: SubscriptionStatus;
  limit?: number;
};

export type SubscriptionWithUser = SubscriptionRecord & {
  users:
    | {
        id: string;
        full_name: string;
        whatsapp: string;
      }
    | {
        id: string;
        full_name: string;
        whatsapp: string;
      }[]
    | null;
};

export async function listSubscriptions(
  input: ListSubscriptionsInput = {},
): Promise<SubscriptionWithUser[]> {
  const client = createSupabaseAdminClient();
  const limit = input.limit ?? 100;

  let query = client
    .from("subscriptions")
    .select(
      "id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at,users(id,full_name,whatsapp)",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.search) {
    const escaped = input.search.replace(/[%_]/g, "");
    query = query.or(
      `plan.ilike.%${escaped}%,users.full_name.ilike.%${escaped}%,users.whatsapp.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(error.message, 500, "subscriptions_list_failed");
  }

  return (data ?? []) as unknown as SubscriptionWithUser[];
}

export async function patchSubscriptionStatus(
  subscriptionId: string,
  input: PatchSubscriptionStatusInput,
  actorAdminId?: string | null,
) {
  let result;

  try {
    result = await applySubscriptionEvent({
      idempotency_key: `manual-status:${subscriptionId}:${input.status}:${Date.now()}`,
      event_type: "manual_status_change",
      source: "manual",
      subscription_id: subscriptionId,
      target_status: input.status,
      occurred_at: new Date().toISOString(),
      metadata: {
        actor_admin_id: actorAdminId ?? null,
      },
    });
  } catch (error) {
    await logAudit(
      toManualSubscriptionAuditEntry({
        actorAdminId,
        outcome: "error",
        result: {
          duplicate: false,
          event: null,
          subscription: null,
          payment: null,
          user: null,
        },
        subscriptionId,
        targetStatus: input.status,
      }),
    );

    throw error;
  }

  try {
    const subscription = ensureManualSubscriptionEventProcessed(result, {
      allowIgnoredTerminalCancel: true,
    });

    await logAudit(
      toManualSubscriptionAuditEntry({
        actorAdminId,
        outcome: "ok",
        result,
        subscriptionId,
        targetStatus: input.status,
      }),
    );

    return subscription;
  } catch (error) {
    await logAudit(
      toManualSubscriptionAuditEntry({
        actorAdminId,
        outcome: "error",
        result,
        subscriptionId,
        targetStatus: input.status,
      }),
    );

    throw error;
  }
}

export async function terminateSubscription(
  subscriptionId: string,
  actorAdminId?: string | null,
) {
  let result;

  try {
    result = await applySubscriptionEvent({
      idempotency_key: `manual-terminate:${subscriptionId}:${Date.now()}`,
      event_type: "subscription_cancelled",
      source: "manual",
      subscription_id: subscriptionId,
      occurred_at: new Date().toISOString(),
      metadata: {
        actor_admin_id: actorAdminId ?? null,
      },
    });
  } catch (error) {
    await logAudit(
      toManualSubscriptionAuditEntry({
        actorAdminId,
        outcome: "error",
        result: {
          duplicate: false,
          event: null,
          subscription: null,
          payment: null,
          user: null,
        },
        subscriptionId,
        targetStatus: "terminada",
      }),
    );

    throw error;
  }

  try {
    const subscription = ensureManualSubscriptionEventProcessed(result, {
      allowIgnoredTerminalCancel: true,
    });

    await logAudit(
      toManualSubscriptionAuditEntry({
        actorAdminId,
        outcome: "ok",
        result,
        subscriptionId,
        targetStatus: "terminada",
      }),
    );

    return subscription;
  } catch (error) {
    await logAudit(
      toManualSubscriptionAuditEntry({
        actorAdminId,
        outcome: "error",
        result,
        subscriptionId,
        targetStatus: "terminada",
      }),
    );

    throw error;
  }
}
