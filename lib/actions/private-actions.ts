"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePageSession } from "@/lib/auth/guard";
import { patchSettings, updateAdminPassword } from "@/lib/data/settings";
import {
  patchSubscriptionStatus,
  terminateSubscription,
} from "@/lib/data/subscriptions";
import {
  createUserWithSubscription,
  updateUserAndSubscription,
} from "@/lib/data/users";
import {
  DEFAULT_CREATE_USER_FORM_VALUES,
  buildUserFormErrorRedirect,
  getFirstZodIssueMessage,
  readUserFormValues,
} from "@/lib/users/form-state";
import { createUserInputSchema, updateUserInputSchema } from "@/lib/validators/users";
import { patchSubscriptionStatusInputSchema } from "@/lib/validators/subscriptions";
import {
  updatePasswordInputSchema,
  updateSettingsInputSchema,
} from "@/lib/validators/settings";

function asNullableDate(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

export async function createUserAction(formData: FormData) {
  const actor = await requirePageSession();
  const values = readUserFormValues(formData, DEFAULT_CREATE_USER_FORM_VALUES);
  const parsed = createUserInputSchema.safeParse({
    ...values,
    next_billing_date: asNullableDate(formData.get("next_billing_date")),
  });

  if (!parsed.success) {
    redirect(
      buildUserFormErrorRedirect({
        mode: "create",
        error: getFirstZodIssueMessage(parsed.error),
        values,
      }),
    );
  }

  try {
    await createUserWithSubscription(parsed.data, actor.adminProfile.id);
    revalidatePath("/usuarios");
    revalidatePath("/suscripciones");
    revalidatePath("/");
    redirect("/usuarios?success=Usuario creado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    redirect(
      buildUserFormErrorRedirect({
        mode: "create",
        error: message,
        values,
      }),
    );
  }
}

export async function updateUserAction(formData: FormData) {
  const actor = await requirePageSession();
  const userId = String(formData.get("user_id") ?? "").trim();
  const values = readUserFormValues(formData, DEFAULT_CREATE_USER_FORM_VALUES);

  const parsed = updateUserInputSchema.safeParse({
    ...values,
    next_billing_date: asNullableDate(formData.get("next_billing_date")),
  });

  if (!userId || !parsed.success) {
    redirect(
      buildUserFormErrorRedirect({
        mode: "edit",
        error: parsed.success ? "Usuario invalido." : getFirstZodIssueMessage(parsed.error),
        values,
        userId,
      }),
    );
  }

  try {
    await updateUserAndSubscription(userId, parsed.data, actor.adminProfile.id);
    revalidatePath("/usuarios");
    revalidatePath("/suscripciones");
    revalidatePath("/");
    redirect("/usuarios?success=Usuario actualizado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    redirect(
      buildUserFormErrorRedirect({
        mode: "edit",
        error: message,
        values,
        userId,
      }),
    );
  }
}

export async function changeSubscriptionStatusAction(formData: FormData) {
  const actor = await requirePageSession();
  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  const parsed = patchSubscriptionStatusInputSchema.safeParse({
    status: formData.get("status"),
  });

  if (!subscriptionId || !parsed.success) {
    redirect("/suscripciones?error=Datos invalidos.");
  }

  try {
    await patchSubscriptionStatus(
      subscriptionId,
      parsed.data,
      actor.adminProfile.id,
    );
    revalidatePath("/suscripciones");
    revalidatePath("/usuarios");
    revalidatePath("/");
    redirect("/suscripciones?success=Estado actualizado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    redirect(`/suscripciones?error=${encodeURIComponent(message)}`);
  }
}

export async function terminateSubscriptionAction(formData: FormData) {
  const actor = await requirePageSession();
  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();

  if (!subscriptionId) {
    redirect("/suscripciones?error=Suscripcion invalida.");
  }

  try {
    await terminateSubscription(subscriptionId, actor.adminProfile.id);
    revalidatePath("/suscripciones");
    revalidatePath("/usuarios");
    revalidatePath("/");
    redirect("/suscripciones?success=Suscripcion terminada.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    redirect(`/suscripciones?error=${encodeURIComponent(message)}`);
  }
}

export async function updateSettingsAction(formData: FormData) {
  const actor = await requirePageSession();
  const parsed = updateSettingsInputSchema.safeParse({
    grace_days: formData.get("grace_days"),
    payment_reminder_template: formData.get("payment_reminder_template"),
    suspension_notice_template: formData.get("suspension_notice_template"),
  });

  if (!parsed.success) {
    redirect("/configuracion?error=Datos invalidos.");
  }

  try {
    await patchSettings(parsed.data, actor.adminProfile.id);
    revalidatePath("/configuracion");
    revalidatePath("/");
    redirect("/configuracion?success=Configuracion actualizada.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    redirect(`/configuracion?error=${encodeURIComponent(message)}`);
  }
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = updatePasswordInputSchema.safeParse({
    oldPassword: formData.get("oldPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const message = firstError?.message || "Contraseña inválida.";
    redirect(`/configuracion?error=${encodeURIComponent(message)}`);
  }

  try {
    await updateAdminPassword(parsed.data.oldPassword, parsed.data.password);
    redirect("/configuracion?success=Contraseña actualizada.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    redirect(`/configuracion?error=${encodeURIComponent(message)}`);
  }
}
