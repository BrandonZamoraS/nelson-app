import { logAudit } from "@/lib/audit/log-audit";
import { isValidStatusTransition } from "@/lib/domain/subscription-status";
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

  return (data ?? []) as SubscriptionWithUser[];
}

export async function patchSubscriptionStatus(
  subscriptionId: string,
  input: PatchSubscriptionStatusInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();
  const { data: subscription, error: readError } = await client
    .from("subscriptions")
    .select(
      "id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at",
    )
    .eq("id", subscriptionId)
    .maybeSingle();

  if (readError) {
    throw new AppError(readError.message, 500, "subscription_read_failed");
  }

  if (!subscription) {
    throw new AppError("Suscripcion no encontrada", 404, "subscription_not_found");
  }

  if (!isValidStatusTransition(subscription.status, input.status)) {
    await logAudit({
      actorAuthId: actorAdminId,
      actorAdminId,
      entityType: "subscription",
      entityId: subscriptionId,
      action: "subscription.status.change",
      detail: {
        previous_status: subscription.status,
        target_status: input.status,
        reason: "invalid_transition",
      },
      result: "error",
    });

    throw new AppError("Transicion de estado invalida", 409, "invalid_transition");
  }

  const updatePayload: Record<string, unknown> = { status: input.status };
  if (input.status === "terminada") {
    updatePayload.next_billing_date = null;
  }

  const { data: updated, error: updateError } = await client
    .from("subscriptions")
    .update(updatePayload)
    .eq("id", subscriptionId)
    .select(
      "id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at",
    )
    .single();

  if (updateError) {
    throw new AppError(updateError.message, 500, "subscription_update_failed");
  }

  await logAudit({
    actorAuthId: actorAdminId,
    actorAdminId,
    entityType: "subscription",
    entityId: subscriptionId,
    action: "subscription.status.change",
    detail: {
      previous_status: subscription.status,
      target_status: input.status,
    },
    result: "ok",
  });

  return updated as SubscriptionRecord;
}

export async function terminateSubscription(
  subscriptionId: string,
  actorAdminId?: string | null,
) {
  return patchSubscriptionStatus(
    subscriptionId,
    { status: "terminada" },
    actorAdminId,
  );
}
