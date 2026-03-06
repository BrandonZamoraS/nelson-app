import assert from "node:assert/strict";
import test from "node:test";

import { coercePositiveIntId } from "@/lib/utils/coerce-id";

test("coercePositiveIntId accepts positive integer numbers and strings", () => {
  assert.deepEqual(coercePositiveIntId(1), { ok: true, value: 1 });
  assert.deepEqual(coercePositiveIntId("42"), { ok: true, value: 42 });
  assert.deepEqual(coercePositiveIntId(" 7 "), { ok: true, value: 7 });
});

test("coercePositiveIntId rejects non-positive or non-integer values", () => {
  assert.deepEqual(coercePositiveIntId(0), { ok: false });
  assert.deepEqual(coercePositiveIntId(-1), { ok: false });
  assert.deepEqual(coercePositiveIntId(1.5), { ok: false });
  assert.deepEqual(coercePositiveIntId("1.5"), { ok: false });
  assert.deepEqual(coercePositiveIntId("abc"), { ok: false });
  assert.deepEqual(coercePositiveIntId(null), { ok: false });
});
