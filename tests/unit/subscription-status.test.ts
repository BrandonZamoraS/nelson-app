import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllowedStatusTargets,
  isValidStatusTransition,
} from "@/lib/domain/subscription-status";

test("valid transition matrix supports expected paths", () => {
  assert.equal(isValidStatusTransition("activa", "gracia"), true);
  assert.equal(isValidStatusTransition("gracia", "suspendida"), true);
  assert.equal(isValidStatusTransition("suspendida", "activa"), true);
  assert.equal(isValidStatusTransition("terminada", "activa"), false);
  assert.deepEqual(getAllowedStatusTargets("terminada"), []);
});
