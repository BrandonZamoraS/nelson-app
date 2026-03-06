export type OptionalFiniteNumberResult =
  | { ok: true; value: number | null }
  | { ok: false };

export type PositiveFiniteNumberResult =
  | { ok: true; value: number }
  | { ok: false };

const DECIMAL_PATTERN = /^[+-]?\d+(?:[.,]\d+)?$/;

export function coerceOptionalFiniteNumber(input: unknown): OptionalFiniteNumberResult {
  if (input === null || input === undefined) {
    return { ok: true, value: null };
  }

  if (typeof input === "number") {
    return Number.isFinite(input) ? { ok: true, value: input } : { ok: false };
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed || !DECIMAL_PATTERN.test(trimmed)) {
      return { ok: false };
    }

    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false };
  }

  return { ok: false };
}

export function coercePositiveFiniteNumber(input: unknown): PositiveFiniteNumberResult {
  const parsed = coerceOptionalFiniteNumber(input);
  if (!parsed.ok || parsed.value === null || parsed.value <= 0) {
    return { ok: false };
  }

  return { ok: true, value: parsed.value };
}
