import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PendingReviewSubscriptionItem } from "@/lib/types/domain";
import type { Json } from "@/lib/types/database";
import { subscriptionEventInputSchema } from "@/lib/validators/subscription-events";

export type ApplySubscriptionEventResult = {
  duplicate: boolean;
  event: Record<string, unknown>;
  subscription: Record<string, unknown> | null;
  payment: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
};

export async function applySubscriptionEvent(input: unknown) {
  const parsed = subscriptionEventInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("Payload inválido", 400, "invalid_payload");
  }

  const client = createSupabaseAdminClient();
  const { data, error } = await client.rpc("apply_subscription_event", {
    event_payload: parsed.data as Json,
  });

  if (error) {
    throw new AppError(error.message, 500, "subscription_event_apply_failed");
  }

  return data as ApplySubscriptionEventResult;
}

function getPendingReviewReasonLabel(errorCode: string | null) {
  switch (errorCode) {
    case "amount_mismatch":
      return "Monto distinto al esperado";
    case "incomplete_payment_event":
      return "Faltan datos del pago confirmado";
    case "missing_identity":
      return "Faltan datos para identificar al usuario";
    case "missing_financial_context":
      return "Falta contexto financiero para registrar el movimiento";
    default:
      return "Revisión manual requerida antes de acreditar acceso";
  }
}

type PendingReviewEventRow = {
  id: string;
  event_type: string;
  source: string;
  occurred_at: string;
  amount_cents: number | null;
  currency: "USD";
  error_code: string | null;
  subscription_id: string | null;
  user_id: string | null;
};

type PendingReviewSubscriptionRow = {
  id: string;
  plan: string;
  amount_cents: number;
  user_id: string;
};

type PendingReviewUserRow = {
  id: string;
  full_name: string;
  whatsapp: string;
};

export async function listPendingReviewSubscriptionEvents(
  limit = 8,
): Promise<PendingReviewSubscriptionItem[]> {
  const client = createSupabaseAdminClient();
  const { data: eventRows, error: eventsError } = await client
    .from("subscription_events")
    .select(
      "id,event_type,source,occurred_at,amount_cents,currency,error_code,subscription_id,user_id",
    )
    .eq("status", "pending_review")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (eventsError) {
    throw new AppError(eventsError.message, 500, "pending_review_events_failed");
  }

  const events = (eventRows ?? []) as PendingReviewEventRow[];
  if (events.length === 0) {
    return [];
  }

  const subscriptionIds = Array.from(
    new Set(
      events
        .map((event) => event.subscription_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const userIdsFromEvents = events
    .map((event) => event.user_id)
    .filter((value): value is string => Boolean(value));

  const subscriptions = subscriptionIds.length
    ? await client
        .from("subscriptions")
        .select("id,plan,amount_cents,user_id")
        .in("id", subscriptionIds)
    : { data: [], error: null };

  if (subscriptions.error) {
    throw new AppError(
      subscriptions.error.message,
      500,
      "pending_review_subscriptions_failed",
    );
  }

  const subscriptionRows = (subscriptions.data ?? []) as PendingReviewSubscriptionRow[];
  const subscriptionsById = new Map(subscriptionRows.map((row) => [row.id, row]));

  const userIds = Array.from(
    new Set([
      ...userIdsFromEvents,
      ...subscriptionRows
        .map((subscription) => subscription.user_id)
        .filter((value): value is string => Boolean(value)),
    ]),
  );

  const users = userIds.length
    ? await client
        .from("users")
        .select("id,full_name,whatsapp")
        .in("id", userIds)
    : { data: [], error: null };

  if (users.error) {
    throw new AppError(users.error.message, 500, "pending_review_users_failed");
  }

  const usersById = new Map(
    ((users.data ?? []) as PendingReviewUserRow[]).map((row) => [row.id, row]),
  );

  return events.map((event) => {
    const subscription = event.subscription_id
      ? subscriptionsById.get(event.subscription_id)
      : null;
    const resolvedUserId = event.user_id ?? subscription?.user_id ?? null;
    const user = resolvedUserId ? usersById.get(resolvedUserId) : null;

    return {
      id: event.id,
      eventType: event.event_type,
      source: event.source,
      occurredAt: event.occurred_at,
      amountCents: event.amount_cents,
      currency: event.currency,
      reasonCode: event.error_code,
      reasonLabel: getPendingReviewReasonLabel(event.error_code),
      subscriptionId: event.subscription_id,
      subscriptionPlan: subscription?.plan ?? null,
      expectedAmountCents: subscription?.amount_cents ?? null,
      userId: resolvedUserId,
      userName: user?.full_name ?? null,
      userWhatsapp: user?.whatsapp ?? null,
    } satisfies PendingReviewSubscriptionItem;
  });
}
