import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { subscriptionEventInputSchema } from "@/lib/validators/subscription-events";

const routePath = path.join(
  process.cwd(),
  "app",
  "api",
  "subscription-events",
  "route.ts",
);
const subscriptionsDataPath = path.join(
  process.cwd(),
  "lib",
  "data",
  "subscriptions.ts",
);
const privateActionsPath = path.join(
  process.cwd(),
  "lib",
  "actions",
  "private-actions.ts",
);
const subscriptionsPagePath = path.join(
  process.cwd(),
  "app",
  "(private)",
  "suscripciones",
  "page.tsx",
);
const subscriptionEventsDataPath = path.join(
  process.cwd(),
  "lib",
  "data",
  "subscription-events.ts",
);
const ingressDomainPath = path.join(
  process.cwd(),
  "lib",
  "domain",
  "subscription-event-ingress.ts",
);

function readFileOrEmpty(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

test("subscriptionEventInputSchema accepts canonical payment payloads", () => {
  const parsed = subscriptionEventInputSchema.safeParse({
    idempotency_key: "evt-1",
    event_type: "payment_succeeded",
    source: "n8n",
    occurred_at: "2026-06-15T10:00:00.000Z",
    paid_at: "2026-06-15T10:00:00.000Z",
    amount_cents: 2000,
    currency: "USD",
    whatsapp: "+5493514558821",
    full_name: "Maria Lopez",
  });

  assert.equal(parsed.success, true);
});

test("subscriptionEventInputSchema rejects provider specific fields", () => {
  const parsed = subscriptionEventInputSchema.safeParse({
    idempotency_key: "evt-1",
    event_type: "payment_succeeded",
    source: "n8n",
    occurred_at: "2026-06-15T10:00:00.000Z",
    paid_at: "2026-06-15T10:00:00.000Z",
    amount_cents: 2000,
    currency: "USD",
    provider: "stripe",
  });

  assert.equal(parsed.success, false);
});

test("subscription events route exists for canonical billing ingress", () => {
  assert.equal(fs.existsSync(routePath), true, `Missing ${routePath}`);
});

test("subscription events route guards ingress with the shared secret before calling the admin gateway", () => {
  const routeSource = readFileOrEmpty(routePath);
  const ingressSource = readFileOrEmpty(ingressDomainPath);

  assert.match(routeSource, /authorizeSubscriptionEventRequest/);
  assert.match(ingressSource, /x-nelson-event-secret/);
  assert.match(ingressSource, /NELSON_EVENT_SECRET/);
});

test("manual subscription actions reroute through applySubscriptionEvent", () => {
  const subscriptionsSource = readFileOrEmpty(subscriptionsDataPath);
  const privateActionsSource = readFileOrEmpty(privateActionsPath);

  assert.match(subscriptionsSource, /applySubscriptionEvent\(/);
  assert.match(privateActionsSource, /changeSubscriptionStatusAction/);
  assert.match(privateActionsSource, /terminateSubscriptionAction/);
});

test("subscriptions page wires pending review visibility for manual follow-up", () => {
  const pageSource = readFileOrEmpty(subscriptionsPagePath);
  const dataSource = readFileOrEmpty(subscriptionEventsDataPath);
  const subscriptionsSource = readFileOrEmpty(subscriptionsDataPath);

  assert.match(pageSource, /listPendingReviewSubscriptionEvents/);
  assert.match(
    pageSource,
    /PendingReviewSubscriptionsPanel[\s\S]*items=\{pendingReview\.items\}[\s\S]*totalCount=\{pendingReview\.totalCount\}/,
  );
  assert.match(dataSource, /from\("subscription_events"\)/);
  assert.match(dataSource, /eq\("status", "pending_review"\)/);
  assert.match(dataSource, /order\("occurred_at", \{ ascending: false \}\)/);
  assert.match(dataSource, /count:\s*"exact"/);
  assert.match(dataSource, /metadata/);
  assert.match(subscriptionsSource, /try\s*\{[\s\S]*applySubscriptionEvent\(/);
  assert.match(subscriptionsSource, /catch \(error\)/);
  assert.match(subscriptionsSource, /outcome:\s*"error"/);
});
