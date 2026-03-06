import assert from "node:assert/strict";
import test from "node:test";

import { coerceOptionalFiniteNumber, coercePositiveFiniteNumber } from "@/lib/utils/coerce-number";

test("coerceOptionalFiniteNumber accepts finite numbers", () => {
  assert.deepEqual(coerceOptionalFiniteNumber(1.5), { ok: true, value: 1.5 });
  assert.deepEqual(coerceOptionalFiniteNumber(0), { ok: true, value: 0 });
});

test("coerceOptionalFiniteNumber accepts numeric strings", () => {
  assert.deepEqual(coerceOptionalFiniteNumber("1.5"), { ok: true, value: 1.5 });
  assert.deepEqual(coerceOptionalFiniteNumber(" 2,75 "), { ok: true, value: 2.75 });
});

test("coerceOptionalFiniteNumber keeps nullish as null", () => {
  assert.deepEqual(coerceOptionalFiniteNumber(null), { ok: true, value: null });
  assert.deepEqual(coerceOptionalFiniteNumber(undefined), { ok: true, value: null });
});

test("coerceOptionalFiniteNumber rejects invalid values", () => {
  assert.deepEqual(coerceOptionalFiniteNumber(""), { ok: false });
  assert.deepEqual(coerceOptionalFiniteNumber("abc"), { ok: false });
  assert.deepEqual(coerceOptionalFiniteNumber(Number.NaN), { ok: false });
  assert.deepEqual(coerceOptionalFiniteNumber(Number.POSITIVE_INFINITY), { ok: false });
});

test("coercePositiveFiniteNumber accepts positive numeric strings", () => {
  assert.deepEqual(coercePositiveFiniteNumber("10000"), { ok: true, value: 10000 });
  assert.deepEqual(coercePositiveFiniteNumber(" 10,5 "), { ok: true, value: 10.5 });
});

test("coercePositiveFiniteNumber rejects zero, negatives and invalid values", () => {
  assert.deepEqual(coercePositiveFiniteNumber(0), { ok: false });
  assert.deepEqual(coercePositiveFiniteNumber(-1), { ok: false });
  assert.deepEqual(coercePositiveFiniteNumber("abc"), { ok: false });
  assert.deepEqual(coercePositiveFiniteNumber(null), { ok: false });
});
