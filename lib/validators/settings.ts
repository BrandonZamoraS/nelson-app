import { z } from "zod";

// Password requirements: min 8 chars, 1 uppercase, 1 number, 1 special char
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula.")
  .regex(/[0-9]/, "Debe contener al menos un número.")
  .regex(/[.!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Debe contener al menos un carácter especial (.,!@#$%^&* etc.)");

export const updateSettingsInputSchema = z.object({
  grace_days: z.coerce.number().int().min(0).max(30),
  payment_reminder_template: z.string().trim().min(10),
  suspension_notice_template: z.string().trim().min(10),
});

export const updatePasswordInputSchema = z
  .object({
    oldPassword: z.string().min(1, "La contraseña anterior es requerida."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;
