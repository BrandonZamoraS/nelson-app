import { parsePhoneNumber } from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";
import type { CountryCode } from "libphonenumber-js";

function asCountryCode(value: unknown): CountryCode | undefined {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return undefined;
  }

  return normalized as CountryCode;
}

export function normalizePhoneNumber(value: unknown, defaultCountry?: unknown) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return {
      success: false,
      message: "Numero de telefono requerido.",
    };
  }

  try {
    const parsed = trimmed.startsWith("+")
      ? parsePhoneNumber(trimmed, {}, metadata)
      : parsePhoneNumber(
          trimmed,
          { defaultCountry: asCountryCode(defaultCountry) },
          metadata,
        );

    if (!parsed || !parsed.isValid()) {
      return {
        success: false,
        message: "Numero de telefono invalido.",
      };
    }

    return {
      success: true,
      value: parsed.format("E.164"),
    };
  } catch {
    return {
      success: false,
      message: "Numero de telefono invalido.",
    };
  }
}
