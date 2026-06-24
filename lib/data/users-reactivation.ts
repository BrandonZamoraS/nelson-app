import { AppError } from "@/lib/errors/app-error";
import type {
  SubscriptionRecord,
  SubscriptionStatus,
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
type ApplySubscriptionStatusChangeResult = {
  event?: {
    status?: string;
    error_code?: string | null;
  } | null;
};
type ApplySubscriptionStatusChangeInput = {
  idempotency_key: string;
  event_type: "manual_status_change";
  source: string;
  subscription_id: string;
  target_status: SubscriptionStatus;
  occurred_at: string;
  metadata: {
    actor_admin_id: string | null;
  };
};
type ApplySubscriptionStatusChange = (
  input: ApplySubscriptionStatusChangeInput,
) => Promise<ApplySubscriptionStatusChangeResult>;

const USER_COLUMNS = "id,full_name,whatsapp,is_active,deactivated_at,created_at,updated_at";

const ACCESS_RESTORING_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(["activa", "gracia"]);

function isAllowedManualStatusTransition(
  currentStatus: SubscriptionStatus,
  targetStatus: SubscriptionStatus,
) {
  return (
    (currentStatus === "activa" && ["gracia", "suspendida", "terminada"].includes(targetStatus)) ||
    (currentStatus === "gracia" && ["activa", "suspendida", "terminada"].includes(targetStatus)) ||
    (currentStatus === "suspendida" && ["activa", "terminada"].includes(targetStatus))
  );
}

function assertSubscriptionStatusChangeAllowed(
  currentStatus: SubscriptionStatus,
  targetStatus: SubscriptionStatus,
  userIsActive: boolean,
) {
  if (!userIsActive && ACCESS_RESTORING_SUBSCRIPTION_STATUSES.has(targetStatus)) {
    throw new AppError(
      "No se puede restaurar acceso desde la edición ordinaria mientras el usuario esté inactivo",
      409,
      "inactive_user_status_change_forbidden",
    );
  }

  if (!isAllowedManualStatusTransition(currentStatus, targetStatus)) {
    throw new AppError(
      "La suscripción no pudo actualizarse (invalid_transition)",
      409,
      "invalid_transition",
    );
  }
}

async function defaultApplySubscriptionStatusChange(payload: ApplySubscriptionStatusChangeInput) {
  const { applySubscriptionEvent } = await import("@/lib/data/subscription-events");

  return applySubscriptionEvent(payload);
}

function hasStatusChange(
  currentStatus: string | null | undefined,
  targetStatus: SubscriptionStatus,
): currentStatus is SubscriptionStatus {
  return typeof currentStatus === "string" && currentStatus !== targetStatus;
}

async function applyManualStatusChange(
  applySubscriptionStatusChange: ApplySubscriptionStatusChange,
  subscriptionId: string,
  targetStatus: SubscriptionStatus,
  actorAdminId?: string | null,
) {
  const eventResult = await applySubscriptionStatusChange({
    idempotency_key: `manual-status:${subscriptionId}:${targetStatus}:${Date.now()}`,
    event_type: "manual_status_change",
    source: "manual",
    subscription_id: subscriptionId,
    target_status: targetStatus,
    occurred_at: new Date().toISOString(),
    metadata: {
      actor_admin_id: actorAdminId ?? null,
    },
  });

  if (eventResult.event?.status !== "processed" && eventResult.event?.status !== "ignored") {
    throw new AppError(
      `La suscripción no pudo actualizarse (${String(eventResult.event?.error_code ?? eventResult.event?.status ?? "unknown")})`,
      409,
      String(eventResult.event?.error_code ?? "subscription_status_change_failed"),
    );
  }

  return eventResult;
}

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

async function findSubscriptionByUserId(client: SupabaseLikeClient, userId: string) {
  const { data, error } = await asTableBuilder(client.from("subscriptions"))
    .select(
      "id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message ?? "Error leyendo suscripción", 500, "subscription_read_failed");
  }

  return (data as SubscriptionRecord | null) ?? null;
}

async function updateSubscription(
  client: SupabaseLikeClient,
  subscriptionId: string,
  input: CreateUserInput,
) {
  const { data, error } = await asTableBuilder(client.from("subscriptions"))
    .update({
      plan: input.plan,
      amount_cents: input.amount_cents,
      start_date: input.start_date,
      next_billing_date: input.next_billing_date ?? null,
      source: input.source,
    })
    .eq("id", subscriptionId)
    .select(
      "id,user_id,plan,amount_cents,currency,status,start_date,next_billing_date,source,created_at,updated_at",
    )
    .single();

  if (error) {
    throw new AppError(error.message ?? "Error actualizando suscripción", 500, "subscription_update_failed");
  }

  return data as SubscriptionRecord;
}

async function restoreInactiveUser(client: SupabaseLikeClient, user: UserRecord) {
  await asTableBuilder(client.from("users"))
    .update({
      full_name: user.full_name,
      whatsapp: user.whatsapp,
      is_active: false,
      deactivated_at: user.deactivated_at ?? null,
    })
    .eq("id", user.id)
    .select(USER_COLUMNS)
    .single();
}

export async function createUserWithSubscriptionUsingClient(
  client: SupabaseLikeClient,
  input: CreateUserInput,
  logAudit: AuditLogger,
  actorAdminId?: string | null,
  applySubscriptionStatusChange: ApplySubscriptionStatusChange = defaultApplySubscriptionStatusChange,
) {
  let insertedFreshUser = false;
  let reactivatedUserSnapshot: UserRecord | null = null;

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

    reactivatedUserSnapshot = existingUser;
    user = await reactivateUser(client, existingUser.id, input.full_name, input.whatsapp);
  } else {
    user = insertedUser as UserRecord;
    insertedFreshUser = true;
  }

  try {
    const existingSubscription = await findSubscriptionByUserId(client, user.id);

    if (existingSubscription && hasStatusChange(existingSubscription.status, input.status)) {
      assertSubscriptionStatusChangeAllowed(existingSubscription.status, input.status, user.is_active !== false);
    }

    const subscription = existingSubscription
      ? await updateSubscription(client, existingSubscription.id, input)
      : await createSubscription(client, user.id, input);

    const statusEventResult =
      existingSubscription && hasStatusChange(existingSubscription.status, input.status)
        ? await applyManualStatusChange(
            applySubscriptionStatusChange,
            existingSubscription.id,
            input.status,
            actorAdminId,
          )
        : null;

    const finalSubscription =
      (statusEventResult as ApplySubscriptionStatusChangeResult & { subscription?: SubscriptionRecord | null } | null)
        ?.subscription ??
      (statusEventResult ? { ...subscription, status: input.status } : subscription);

    await logAudit({
      actorAuthId: actorAdminId,
      actorAdminId,
      entityType: "user",
      entityId: user.id,
      action: "user.create",
      detail: {
        full_name: user.full_name,
        whatsapp: user.whatsapp,
        subscription_id: finalSubscription.id,
        amount_cents: finalSubscription.amount_cents,
        reactivated: insertedFreshUser ? false : true,
      },
      result: "ok",
    });

    return { user, subscription: finalSubscription };
  } catch (error) {
    if (insertedFreshUser) {
      await asTableBuilder(client.from("users")).delete().eq("id", user.id);
    } else if (reactivatedUserSnapshot) {
      await restoreInactiveUser(client, reactivatedUserSnapshot);
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
  applySubscriptionStatusChange: ApplySubscriptionStatusChange = defaultApplySubscriptionStatusChange,
) {
  const { data: updatedUser, error: userError } = await asTableBuilder(client.from("users"))
    .update({
      full_name: input.full_name,
      whatsapp: input.whatsapp,
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
    .select("id,status")
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

  const subscriptionRecord = subscription as { id: string; status?: string };

  if (hasStatusChange(subscriptionRecord.status, input.status)) {
    assertSubscriptionStatusChangeAllowed(
      subscriptionRecord.status,
      input.status,
      (updatedUser as UserRecord | null)?.is_active !== false,
    );
  }

  const { error: subscriptionUpdateError } = await asTableBuilder(
    client.from("subscriptions"),
  )
    .update({
      plan: input.plan,
      amount_cents: input.amount_cents,
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

  if (hasStatusChange(subscriptionRecord.status, input.status)) {
    await applyManualStatusChange(
      applySubscriptionStatusChange,
      subscriptionRecord.id,
      input.status,
      actorAdminId,
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
