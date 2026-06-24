import { AppError } from "@/lib/errors/app-error";
import type {
  SubscriptionRecord,
  UserRecord,
  UserWithSubscription,
} from "@/lib/types/domain";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validators/users";

type QueryError = { code?: string; message?: string };

type QueryResponse<T> = Promise<{ data: T | null; error: QueryError | null }>;

type SupabaseLikeTableBuilder = {
  insert: (payload: unknown) => SupabaseLikeTableBuilder;
  update: (payload: unknown) => SupabaseLikeTableBuilder;
  delete: () => SupabaseLikeTableBuilder;
  select: (columns?: string) => SupabaseLikeTableBuilder;
  eq: (column: string, value: unknown) => SupabaseLikeTableBuilder;
  single: () => QueryResponse<unknown>;
  maybeSingle: () => QueryResponse<unknown>;
};

type SupabaseLikeClient = {
  from: (table: string) => unknown;
};

function asTableBuilder(builder: unknown) {
  return builder as SupabaseLikeTableBuilder;
}

type AuditEntry = {
  actorAuthId?: string | null;
  actorAdminId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  detail?: Record<string, unknown>;
  result: "ok" | "error";
};

type AuditLogger = (entry: AuditEntry) => Promise<void>;
type ReadUserById = (userId: string) => Promise<UserWithSubscription>;

const USER_COLUMNS = "id,full_name,whatsapp,is_active,deactivated_at,created_at,updated_at";

function isDuplicateWhatsappError(error: QueryError) {
  return error.code === "23505" && (error.message ?? "").toLowerCase().includes("whatsapp");
}

async function findUserByWhatsapp(client: SupabaseLikeClient, whatsapp: string) {
  const { data, error } = await asTableBuilder(client.from("users"))
    .select(USER_COLUMNS)
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message ?? "Error leyendo usuario", 500, "user_read_failed");
  }

  return (data as UserRecord | null) ?? null;
}

async function reactivateUser(
  client: SupabaseLikeClient,
  userId: string,
  fullName: string,
  whatsapp: string,
) {
  const { data, error } = await asTableBuilder(client.from("users"))
    .update({
      full_name: fullName,
      whatsapp,
      is_active: true,
      deactivated_at: null,
    })
    .eq("id", userId)
    .select(USER_COLUMNS)
    .single();

  if (error) {
    throw new AppError(error.message ?? "Error reactivando usuario", 500, "user_reactivate_failed");
  }

  return data as UserRecord;
}

async function createSubscription(
  client: SupabaseLikeClient,
  userId: string,
  input: CreateUserInput,
) {
  const { data, error } = await asTableBuilder(client.from("subscriptions"))
    .insert({
      user_id: userId,
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

  if (error) {
    throw new AppError(error.message ?? "Error creando suscripción", 500, "subscription_create_failed");
  }

  return data as SubscriptionRecord;
}

export async function createUserWithSubscriptionUsingClient(
  client: SupabaseLikeClient,
  input: CreateUserInput,
  logAudit: AuditLogger,
  actorAdminId?: string | null,
) {
  let insertedFreshUser = false;

  const { data: insertedUser, error: userError } = await asTableBuilder(client.from("users"))
    .insert({
      full_name: input.full_name,
      whatsapp: input.whatsapp,
    })
    .select(USER_COLUMNS)
    .single();

  let user = insertedUser as UserRecord | null;

  if (userError) {
    if (!isDuplicateWhatsappError(userError)) {
      throw new AppError(userError.message ?? "Error creando usuario", 500, "user_create_failed");
    }

    const existingUser = await findUserByWhatsapp(client, input.whatsapp);
    if (!existingUser || existingUser.is_active !== false) {
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

    user = await reactivateUser(client, existingUser.id, input.full_name, input.whatsapp);
  } else {
    user = insertedUser as UserRecord;
    insertedFreshUser = true;
  }

  try {
    const subscription = await createSubscription(client, user.id, input);

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
        reactivated: insertedFreshUser ? false : true,
      },
      result: "ok",
    });

    return { user, subscription };
  } catch (error) {
    if (insertedFreshUser) {
      await asTableBuilder(client.from("users")).delete().eq("id", user.id);
    }
    throw error;
  }
}

export async function updateUserAndSubscriptionUsingClient(
  client: SupabaseLikeClient,
  userId: string,
  input: UpdateUserInput,
  logAudit: AuditLogger,
  readUserById: ReadUserById,
  actorAdminId?: string | null,
) {
  const { error: userError } = await asTableBuilder(client.from("users"))
    .update({
      full_name: input.full_name,
      whatsapp: input.whatsapp,
      is_active: true,
      deactivated_at: null,
    })
    .eq("id", userId)
    .select(USER_COLUMNS)
    .single();

  if (userError) {
    if (!isDuplicateWhatsappError(userError)) {
      throw new AppError(userError.message ?? "Error actualizando usuario", 500, "user_update_failed");
    }

    await findUserByWhatsapp(client, input.whatsapp);
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

  const { data: subscription, error: subscriptionReadError } = await asTableBuilder(
    client.from("subscriptions"),
  )
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionReadError) {
    throw new AppError(
      subscriptionReadError.message ?? "Error leyendo suscripción",
      500,
      "subscription_read_failed",
    );
  }

  if (!subscription) {
    throw new AppError("Suscripción no encontrada", 404, "subscription_not_found");
  }

  const { error: subscriptionUpdateError } = await asTableBuilder(
    client.from("subscriptions"),
  )
    .update({
      plan: input.plan,
      amount_cents: input.amount_cents,
      status: input.status,
      start_date: input.start_date,
      next_billing_date: input.next_billing_date,
      source: input.source,
    })
    .eq("id", (subscription as { id: string }).id)
    .select("id")
    .single();

  if (subscriptionUpdateError) {
    throw new AppError(
      subscriptionUpdateError.message ?? "Error actualizando suscripción",
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
      requested_user_id: userId,
      full_name: input.full_name,
      whatsapp: input.whatsapp,
      status: input.status,
      plan: input.plan,
      amount_cents: input.amount_cents,
      reactivated_target: false,
    },
    result: "ok",
  });

  return readUserById(userId);
}
