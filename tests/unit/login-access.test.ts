import assert from "node:assert/strict";
import test from "node:test";

import { shouldRedirectAuthenticatedUserFromLogin } from "@/lib/auth/login-access";

test("shouldRedirectAuthenticatedUserFromLogin returns false when there is no user", () => {
  assert.equal(shouldRedirectAuthenticatedUserFromLogin(null, null), false);
});

test("shouldRedirectAuthenticatedUserFromLogin returns true for active admin", () => {
  assert.equal(
    shouldRedirectAuthenticatedUserFromLogin(
      { id: "auth-user-1" },
      { is_active: true },
    ),
    true,
  );
});

test("shouldRedirectAuthenticatedUserFromLogin returns false for inactive admin", () => {
  assert.equal(
    shouldRedirectAuthenticatedUserFromLogin(
      { id: "auth-user-1" },
      { is_active: false },
    ),
    false,
  );
});

test("shouldRedirectAuthenticatedUserFromLogin returns false without admin profile", () => {
  assert.equal(
    shouldRedirectAuthenticatedUserFromLogin({ id: "auth-user-1" }, null),
    false,
  );
});
