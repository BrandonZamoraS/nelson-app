import assert from "node:assert/strict";
import test from "node:test";

import { parseDollarAmountToCents } from "@/lib/validators/users";

test("parseDollarAmountToCents accepts dollars with dot or comma cents", () => {
  assert.deepEqual(parseDollarAmountToCents("198"), { ok: true, value: 19800 });
  assert.deepEqual(parseDollarAmountToCents("198.00"), { ok: true, value: 19800 });
  assert.deepEqual(parseDollarAmountToCents("198,00"), { ok: true, value: 19800 });
  assert.deepEqual(parseDollarAmountToCents("198.5"), { ok: true, value: 19850 });
});

test("parseDollarAmountToCents rejects invalid dollar amounts", () => {
  assert.deepEqual(parseDollarAmountToCents(""), { ok: false });
  assert.deepEqual(parseDollarAmountToCents("0"), { ok: false });
  assert.deepEqual(parseDollarAmountToCents("-1"), { ok: false });
  assert.deepEqual(parseDollarAmountToCents("abc"), { ok: false });
  assert.deepEqual(parseDollarAmountToCents("10.999"), { ok: false });
  assert.deepEqual(parseDollarAmountToCents("10,999"), { ok: false });
  assert.deepEqual(parseDollarAmountToCents("10..99"), { ok: false });
});
