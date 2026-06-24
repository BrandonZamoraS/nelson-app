import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "@/lib/errors/app-error";
import { authorizeSubscriptionEventRequest } from "@/lib/domain/subscription-event-ingress";

test("authorizeSubscriptionEventRequest rejects requests without the shared secret", () => {
  assert.throws(
    () => authorizeSubscriptionEventRequest(new Headers(), "super-secret"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 401);
      assert.equal(error.code, "subscription_event_unauthorized");
      return true;
    },
  );
});

test("authorizeSubscriptionEventRequest fails closed when the ingress secret is not configured", () => {
  assert.throws(
    () =>
      authorizeSubscriptionEventRequest(
        new Headers({ "x-nelson-event-secret": "super-secret" }),
        null,
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.status, 503);
      assert.equal(error.code, "subscription_event_auth_unconfigured");
      return true;
    },
  );
});

test("authorizeSubscriptionEventRequest accepts the configured shared secret", () => {
  assert.doesNotThrow(() => {
    authorizeSubscriptionEventRequest(
      new Headers({ "x-nelson-event-secret": "super-secret" }),
      "super-secret",
    );
  });
});
