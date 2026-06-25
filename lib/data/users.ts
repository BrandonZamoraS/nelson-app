import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createUserWithSubscriptionUsingClient,
  updateUserAndSubscriptionUsingClient,
} from "@/lib/data/users-reactivation";
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
      is_active: row.is_active,
      deactivated_at: row.deactivated_at,
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
      "id,full_name,whatsapp,is_active,deactivated_at,created_at,updated_at,subscriptions(id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at)",
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
      "id,full_name,whatsapp,is_active,deactivated_at,created_at,updated_at,subscriptions(id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at)",
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

export async function createUserWithSubscription(
  input: CreateUserInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();

  return createUserWithSubscriptionUsingClient(client, input, logAudit, actorAdminId);
}

export async function updateUserAndSubscription(
  userId: string,
  input: UpdateUserInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();

  return updateUserAndSubscriptionUsingClient(
    client,
    userId,
    input,
    logAudit,
    getUserById,
    actorAdminId,
  );
}
