import type { ZodError } from "zod";

export const USER_FORM_FIELDS = [
  "full_name",
  "whatsapp",
  "plan",
  "amount_cents",
  "status",
  "start_date",
  "next_billing_date",
  "source",
] as const;

export type UserFormValues = Record<(typeof USER_FORM_FIELDS)[number], string>;

type UserFormSource =
  | FormData
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export const DEFAULT_CREATE_USER_FORM_VALUES: UserFormValues = {
  full_name: "",
  whatsapp: "",
  plan: "manual",
  amount_cents: "19800",
  status: "activa",
  start_date: "",
  next_billing_date: "",
  source: "manual",
};

function readSourceValue(
  source: UserFormSource,
  field: (typeof USER_FORM_FIELDS)[number],
): string | undefined {
  if (source instanceof FormData) {
    const value = source.get(field);
    return value === null ? undefined : String(value);
  }

  if (source instanceof URLSearchParams) {
    if (!source.has(field)) {
      return undefined;
    }

    return source.get(field) ?? "";
  }

  const value = source[field];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value;
}

export function readUserFormValues(
  source: UserFormSource,
  defaults: UserFormValues,
): UserFormValues {
  const values = {} as UserFormValues;

  for (const field of USER_FORM_FIELDS) {
    const value = readSourceValue(source, field);
    values[field] = value === undefined ? defaults[field] : value;
  }

  return values;
}

export function getFirstZodIssueMessage(
  error: ZodError,
  fallback = "Datos invalidos.",
) {
  return error.issues[0]?.message ?? fallback;
}

export function buildUserFormErrorRedirect(input: {
  mode: "create" | "edit";
  error: string;
  values: UserFormValues;
  userId?: string;
}) {
  const params = new URLSearchParams({
    modal: input.mode,
    error: input.error,
  });

  if (input.mode === "edit" && input.userId) {
    params.set("id", input.userId);
  }

  for (const field of USER_FORM_FIELDS) {
    params.set(field, input.values[field]);
  }

  return `/usuarios?${params.toString()}`;
}
