import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().email("Ingresa un email valido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  next: z.string().startsWith("/").optional(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
