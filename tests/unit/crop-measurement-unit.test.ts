import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CROP_MEASUREMENT_UNIT,
  parseCropMeasurementUnit,
} from "../../lib/utils/crop-measurement-unit";

test("parseCropMeasurementUnit defaults to kg when missing", () => {
  const result = parseCropMeasurementUnit(undefined);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value, DEFAULT_CROP_MEASUREMENT_UNIT);
  }
});

test("parseCropMeasurementUnit accepts supported units with trim and lowercase normalization", () => {
  const result = parseCropMeasurementUnit(" LB ");

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value, "lb");
  }
});

test("parseCropMeasurementUnit rejects unsupported units", () => {
  const result = parseCropMeasurementUnit("tonelada");

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_measurement_unit");
    assert.match(result.message, /kg, lb, quintal, cajuela/i);
  }
});
