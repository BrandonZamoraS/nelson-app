import { logAudit } from "@/lib/audit/log-audit";
import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentRecord, PaymentStatus } from "@/lib/types/domain";
import type {
  CreateManualPaymentInput,
  UpdatePaymentStatusInput,
} from "@/lib/validators/payments";

type ListPaymentsInput = {
  search?: string;
  status?: PaymentStatus;
  limit?: number;
};

export type PaymentWithRelations = PaymentRecord & {
  users: {
    id: string;
    full_name: string;
    whatsapp: string;
  } | null;
  subscriptions: {
    id: string;
    plan: string;
    status: string;
    next_billing_date: string | null;
  } | null;
};

export type ActiveSubscriptionOption = {
  id: string;
  plan: string;
  amount_cents: number;
  next_billing_date: string | null;
  status: string;
  users: {
    id: string;
    full_name: string;
    whatsapp: string;
  } | null;
};

export async function listPayments(
  input: ListPaymentsInput = {},
): Promise<PaymentWithRelations[]> {
  const client = createSupabaseAdminClient();
  const limit = input.limit ?? 100;

  let query = client
    .from("payments")
    .select(
      "id,subscription_id,user_id,event_id,amount_cents,currency,status,paid_at,due_at,source,external_ref,created_at,updated_at,users!inner(id,full_name,whatsapp),subscriptions(id,plan,status,next_billing_date)",
    )
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.search) {
    const escaped = input.search.replace(/[%_]/g, "");
    query = query.or(
      `full_name.ilike.%${escaped}%,whatsapp.ilike.%${escaped}%`,
      { referencedTable: "users" },
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(error.message, 500, "payments_list_failed");
  }

  return (data ?? []) as unknown as PaymentWithRelations[];
}

export async function listActiveSubscriptions(): Promise<
  ActiveSubscriptionOption[]
> {
  const client = createSupabaseAdminClient();

  const { data, error } = await client
    .from("subscriptions")
    .select(
      "id,plan,amount_cents,next_billing_date,status,users(id,full_name,whatsapp)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new AppError(
      error.message,
      500,
      "payments_active_subscriptions_failed",
    );
  }

  return (data ?? []) as unknown as ActiveSubscriptionOption[];
}

function addMonths(dateStr: string, months: number): string {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const targetMonth = month + months - 1;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);

  const mm = String(normalizedMonth + 1).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

export async function createManualPayment(
  input: CreateManualPaymentInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();

  const { data: subscription, error: subError } = await client
    .from("subscriptions")
    .select("id,user_id,status,next_billing_date,amount_cents")
    .eq("id", input.subscription_id)
    .single();

  if (subError || !subscription) {
    throw new AppError(
      subError?.message ?? "Subscription not found",
      404,
      "payment_subscription_not_found",
    );
  }

  const paidAt = input.paid_at;

  let newNextBilling: string;

  if (
    subscription.status === "gracia" ||
    subscription.status === "suspendida" ||
    subscription.status === "terminada"
  ) {
    newNextBilling = addMonths(paidAt, 1);
  } else if (subscription.next_billing_date) {
    newNextBilling = addMonths(subscription.next_billing_date, 1);
  } else {
    newNextBilling = addMonths(paidAt, 1);
  }

  const dueAt = newNextBilling;

  // Insert first, then verify uniqueness to narrow the race-condition window.
  // TODO: add a unique partial index on (subscription_id, paid_at::date)
  // WHERE source = 'manual' to enforce this at the database level.
  const { data: payment, error: paymentError } = await client
    .from("payments")
    .insert({
      subscription_id: input.subscription_id,
      user_id: subscription.user_id,
      amount_cents: input.amount_cents,
      currency: "USD",
      status: "paid",
      paid_at: paidAt + "T00:00:00Z",
      due_at: dueAt,
      source: "manual",
      external_ref: input.external_ref ?? null,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    throw new AppError(
      paymentError?.message ?? "Failed to create payment",
      500,
      "payment_create_failed",
    );
  }

  // Post-insert duplicate verification: if another manual payment for the
  // same subscription/date was committed, roll back this one.
  const { data: sameDayPayments } = await client
    .from("payments")
    .select("id")
    .eq("subscription_id", input.subscription_id)
    .eq("source", "manual")
    .gte("paid_at", paidAt + "T00:00:00Z")
    .lt("paid_at", paidAt + "T23:59:59Z");

  if (sameDayPayments && sameDayPayments.length > 1) {
    await client.from("payments").delete().eq("id", payment.id);
    throw new AppError(
      "Already exists a manual payment for this subscription on this date",
      409,
      "payment_duplicate",
    );
  }

  const { error: updateError } = await client
    .from("subscriptions")
    .update({
      status: "activa",
      next_billing_date: newNextBilling,
    })
    .eq("id", input.subscription_id);

  if (updateError) {
    await client.from("payments").delete().eq("id", payment.id);
    throw new AppError(
      updateError.message,
      500,
      "payment_subscription_update_failed",
    );
  }

  // Fix #3: Reactivate user when reviving a suspended/terminated subscription
  if (
    subscription.status === "suspendida" ||
    subscription.status === "terminada"
  ) {
    const { data: user } = await client
      .from("users")
      .select("id,is_active")
      .eq("id", subscription.user_id)
      .maybeSingle();

    if (user && user.is_active === false) {
      await client
        .from("users")
        .update({ is_active: true, deactivated_at: null })
        .eq("id", subscription.user_id);
    }
  }

  await logAudit({
    actorAdminId: actorAdminId ?? null,
    entityType: "payment",
    entityId: payment.id,
    action: "manual_create",
    detail: {
      subscription_id: input.subscription_id,
      amount_cents: input.amount_cents,
      paid_at: paidAt,
      new_next_billing: newNextBilling,
    },
    result: "ok",
  });

  return payment;
}

export async function updatePaymentStatus(
  input: UpdatePaymentStatusInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();

  const { data: existing, error: fetchError } = await client
    .from("payments")
    .select("id,status,paid_at,subscription_id,user_id")
    .eq("id", input.payment_id)
    .single();

  if (fetchError || !existing) {
    throw new AppError(
      fetchError?.message ?? "Payment not found",
      404,
      "payment_not_found",
    );
  }

  if (existing.status === input.status) {
    return existing;
  }

  const updatePayload: Record<string, unknown> = { status: input.status };
  const paidAtTimestamp =
    input.status === "paid" && !existing.paid_at
      ? new Date().toISOString()
      : null;

  if (paidAtTimestamp) {
    updatePayload.paid_at = paidAtTimestamp;
  }

  const { error: updateError } = await client
    .from("payments")
    .update(updatePayload)
    .eq("id", input.payment_id);

  if (updateError) {
    throw new AppError(
      updateError.message,
      500,
      "payment_status_update_failed",
    );
  }

  // When transitioning to "paid", propagate subscription and user effects
  // so the customer's access stays consistent with the payment state.
  if (input.status === "paid" && existing.subscription_id) {
    const { data: subscription } = await client
      .from("subscriptions")
      .select("id,status,next_billing_date")
      .eq("id", existing.subscription_id)
      .maybeSingle();

    if (subscription) {
      const paidAtDate = paidAtTimestamp
        ? paidAtTimestamp.slice(0, 10)
        : (existing.paid_at ?? "").slice(0, 10);

      let newNextBilling: string;
      if (
        subscription.status === "gracia" ||
        subscription.status === "suspendida" ||
        subscription.status === "terminada" ||
        !subscription.next_billing_date
      ) {
        newNextBilling = addMonths(paidAtDate, 1);
      } else {
        newNextBilling = addMonths(subscription.next_billing_date, 1);
      }

      await client
        .from("subscriptions")
        .update({ status: "activa", next_billing_date: newNextBilling })
        .eq("id", existing.subscription_id);

      if (existing.user_id) {
        const { data: user } = await client
          .from("users")
          .select("id,is_active")
          .eq("id", existing.user_id)
          .maybeSingle();

        if (user && user.is_active === false) {
          await client
            .from("users")
            .update({ is_active: true, deactivated_at: null })
            .eq("id", existing.user_id);
        }
      }
    }
  }

  await logAudit({
    actorAdminId: actorAdminId ?? null,
    entityType: "payment",
    entityId: input.payment_id,
    action: "status_change",
    detail: {
      from: existing.status,
      to: input.status,
    },
    result: "ok",
  });

  return { id: input.payment_id, status: input.status };
}
