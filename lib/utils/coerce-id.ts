export type PositiveIntResult =
  | { ok: true; value: number }
  | { ok: false };

const INTEGER_PATTERN = /^[+]?\d+$/;

export function coercePositiveIntId(input: unknown): PositiveIntResult {
  if (typeof input === "number") {
    return Number.isInteger(input) && input > 0 ? { ok: true, value: input } : { ok: false };
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!INTEGER_PATTERN.test(trimmed)) {
      return { ok: false };
    }

    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed > 0 ? { ok: true, value: parsed } : { ok: false };
  }

  return { ok: false };
}
