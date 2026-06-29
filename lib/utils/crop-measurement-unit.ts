export const DEFAULT_CROP_MEASUREMENT_UNIT = "kg";

export const ALLOWED_CROP_MEASUREMENT_UNITS = [
  DEFAULT_CROP_MEASUREMENT_UNIT,
  "lb",
  "quintal",
  "cajuela",
] as const;

export type CropMeasurementUnit = (typeof ALLOWED_CROP_MEASUREMENT_UNITS)[number];

export const INVALID_CROP_MEASUREMENT_UNIT_MESSAGE =
  "measurement_unit must be one of: kg, lb, quintal, cajuela";

type CropMeasurementUnitResult =
  | { ok: true; value: CropMeasurementUnit }
  | { ok: false; code: "invalid_measurement_unit"; message: string; detail: { measurement_unit: unknown } };

const ALLOWED_UNITS = new Set<string>(ALLOWED_CROP_MEASUREMENT_UNITS);
export function parseCropMeasurementUnit(input: unknown): CropMeasurementUnitResult {
  if (input === undefined || input === null || input === "") {
    return { ok: true, value: DEFAULT_CROP_MEASUREMENT_UNIT };
  }

  if (typeof input !== "string") {
    return {
      ok: false,
      code: "invalid_measurement_unit",
      message: INVALID_CROP_MEASUREMENT_UNIT_MESSAGE,
      detail: { measurement_unit: input },
    };
  }

  const normalized = input.trim().toLowerCase();
  if (ALLOWED_UNITS.has(normalized)) {
    return { ok: true, value: normalized as CropMeasurementUnit };
  }

  return {
    ok: false,
    code: "invalid_measurement_unit",
    message: INVALID_CROP_MEASUREMENT_UNIT_MESSAGE,
    detail: { measurement_unit: input },
  };
}
