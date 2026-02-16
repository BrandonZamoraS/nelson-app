import { logAudit } from "@/lib/audit/log-audit";
import { AppError } from "@/lib/errors/app-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppSettingsRecord } from "@/lib/types/domain";
import type { UpdateSettingsInput } from "@/lib/validators/settings";

const defaultSettings = {
  id: 1,
  grace_days: 3,
  payment_reminder_template:
    "Hola {{name}}, tu pago vence el {{next_billing_date}}. Evita suspension renovando hoy.",
  suspension_notice_template:
    "Hola {{name}}, tu suscripcion fue suspendida. Escribenos para reactivarla.",
};

export async function getSettings() {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("app_settings")
    .select(
      "id,grace_days,payment_reminder_template,suspension_notice_template,updated_at",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500, "settings_read_failed");
  }

  if (data) {
    return data as AppSettingsRecord;
  }

  const { data: inserted, error: insertError } = await client
    .from("app_settings")
    .insert(defaultSettings)
    .select(
      "id,grace_days,payment_reminder_template,suspension_notice_template,updated_at",
    )
    .single();

  if (insertError) {
    throw new AppError(insertError.message, 500, "settings_seed_failed");
  }

  return inserted as AppSettingsRecord;
}

export async function patchSettings(
  input: UpdateSettingsInput,
  actorAdminId?: string | null,
) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("app_settings")
    .update(input)
    .eq("id", 1)
    .select(
      "id,grace_days,payment_reminder_template,suspension_notice_template,updated_at",
    )
    .single();

  if (error) {
    throw new AppError(error.message, 500, "settings_update_failed");
  }

  await logAudit({
    actorAuthId: actorAdminId,
    actorAdminId,
    entityType: "settings",
    entityId: "1",
    action: "settings.update",
    detail: {
      grace_days: input.grace_days,
    },
    result: "ok",
  });

  return data as AppSettingsRecord;
}

export async function updateAdminPassword(
  oldPassword: string,
  password: string,
) {
  const supabase = await createServerSupabaseClient();

  // Verify old password by attempting to sign in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new AppError(
      "Usuario no encontrado",
      401,
      "user_not_found",
    );
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (signInError) {
    throw new AppError(
      "La contraseña anterior es incorrecta",
      401,
      "invalid_old_password",
    );
  }

  // Update to new password
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new AppError(error.message, 500, "password_update_failed");
  }
}
