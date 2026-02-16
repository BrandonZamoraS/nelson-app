import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SubscriptionRecord,
  SubscriptionStatus,
  UserRecord,
  UserWithSubscription,
} from "@/lib/types/domain";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validators/users";
import { logAudit } from "@/lib/audit/log-audit";

type ListUsersInput = {
  search?: string;
  status?: SubscriptionStatus;
  limit?: number;
};

function mapSubscription(raw: unknown): SubscriptionRecord | null {
  if (!raw) {
    return null;
  }

  if (Array.isArray(raw)) {
    return (raw[0] as SubscriptionRecord) ?? null;
  }

  return raw as SubscriptionRecord;
}

function mapUserRecord(raw: unknown): UserWithSubscription {
  const row = raw as UserRecord & { subscriptions?: unknown };
  return {
    user: {
      id: row.id,
      full_name: row.full_name,
      whatsapp: row.whatsapp,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    subscription: mapSubscription(row.subscriptions),
  };
}

export async function listUsers(input: ListUsersInput = {}) {
  const client = createSupabaseAdminClient();
  const limit = input.limit ?? 100;
  let query = client
    .from("users")
    .select(
      "id,full_name,whatsapp,created_at,updated_at,subscriptions(id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.search) {
    const escaped = input.search.replace(/[%_]/g, "");
    query = query.or(`full_name.ilike.%${escaped}%,whatsapp.ilike.%${escaped}%`);
  }

  if (input.status) {
    query = query.eq("subscriptions.status", input.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(error.message, 500, "users_list_failed");
  }

  return ((data ?? []) as unknown[]).map(mapUserRecord);
}

export async function getUserById(userId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("users")
    .select(
      "id,full_name,whatsapp,created_at,updated_at,subscriptions(id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at)",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500, "user_read_failed");
  }

  if (!data) {
    throw new AppError("Usuario no encontrado", 404, "user_not_found");
  }

  return mapUserRecord(data);
}

function isDuplicateWhatsappError(error: { code?: string; message?: string }) {
  return error.code === "23505" && (error.message ?? "").toLowerCase().includes("whatsapp");
}

export async function createUserWithSubscription(
  input: CreateUserInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();

  const { data: user, error: userError } = await client
    .from("users")
    .insert({
      full_name: input.full_name,
      whatsapp: input.whatsapp,
    })
    .select("id,full_name,whatsapp,created_at,updated_at")
    .single();

  if (userError) {
    if (isDuplicateWhatsappError(userError)) {
      await logAudit({
        actorAuthId: actorAdminId,
        actorAdminId,
        entityType: "user",
        entityId: input.whatsapp,
        action: "user.create",
        detail: { reason: "duplicate_whatsapp" },
        result: "error",
      });
      throw new AppError("WhatsApp duplicado", 409, "duplicate_whatsapp");
    }

    throw new AppError(userError.message, 500, "user_create_failed");
  }

  const { data: subscription, error: subscriptionError } = await client
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan: input.plan,
      amount_cents: input.amount_cents,
      status: input.status,
      start_date: input.start_date,
      next_billing_date: input.next_billing_date ?? null,
      source: input.source,
    })
    .select(
      "id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at",
    )
    .single();

  if (subscriptionError) {
    await client.from("users").delete().eq("id", user.id);
    throw new AppError(subscriptionError.message, 500, "subscription_create_failed");
  }

  await logAudit({
    actorAuthId: actorAdminId,
    actorAdminId,
    entityType: "user",
    entityId: user.id,
    action: "user.create",
    detail: {
      full_name: user.full_name,
      whatsapp: user.whatsapp,
      subscription_id: subscription.id,
      amount_cents: subscription.amount_cents,
    },
    result: "ok",
  });

  return {
    user: user as UserRecord,
    subscription: subscription as SubscriptionRecord,
  };
}

export async function updateUserAndSubscription(
  userId: string,
  input: UpdateUserInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();

  const { error: userError } = await client
    .from("users")
    .update({
      full_name: input.full_name,
      whatsapp: input.whatsapp,
    })
    .eq("id", userId);

  if (userError) {
    if (isDuplicateWhatsappError(userError)) {
      await logAudit({
        actorAuthId: actorAdminId,
        actorAdminId,
        entityType: "user",
        entityId: userId,
        action: "user.update",
        detail: { reason: "duplicate_whatsapp" },
        result: "error",
      });
      throw new AppError("WhatsApp duplicado", 409, "duplicate_whatsapp");
    }

    throw new AppError(userError.message, 500, "user_update_failed");
  }

  const { data: subscription, error: subscriptionReadError } = await client
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionReadError) {
    throw new AppError(
      subscriptionReadError.message,
      500,
      "subscription_read_failed",
    );
  }

  if (!subscription) {
    throw new AppError("Suscripcion no encontrada", 404, "subscription_not_found");
  }

  const { error: subscriptionUpdateError } = await client
    .from("subscriptions")
    .update({
      plan: input.plan,
      amount_cents: input.amount_cents,
      status: input.status,
      start_date: input.start_date,
      next_billing_date: input.next_billing_date,
      source: input.source,
    })
    .eq("id", subscription.id);

  if (subscriptionUpdateError) {
    throw new AppError(
      subscriptionUpdateError.message,
      500,
      "subscription_update_failed",
    );
  }

  await logAudit({
    actorAuthId: actorAdminId,
    actorAdminId,
    entityType: "user",
    entityId: userId,
    action: "user.update",
    detail: {
      full_name: input.full_name,
      whatsapp: input.whatsapp,
      status: input.status,
      plan: input.plan,
      amount_cents: input.amount_cents,
    },
    result: "ok",
  });

  return getUserById(userId);
}
