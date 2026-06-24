import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PendingReviewSubscriptionsPanel,
  type PendingReviewSubscriptionItem,
} from "@/components/ui/pending-review-subscriptions-panel";

function render(items: PendingReviewSubscriptionItem[]) {
  return renderToStaticMarkup(
    React.createElement(PendingReviewSubscriptionsPanel, { items }),
  );
}

test("PendingReviewSubscriptionsPanel renders pending review payment details for manual follow-up", () => {
  const html = render([
    {
      id: "evt-1",
      eventType: "payment_succeeded",
      source: "n8n",
      occurredAt: "2026-06-23T12:00:00.000Z",
      amountCents: 1500,
      currency: "USD",
      reasonCode: "amount_mismatch",
      reasonLabel: "Monto distinto al esperado",
      subscriptionId: "sub-1",
      subscriptionPlan: "Plan mensual",
      expectedAmountCents: 2000,
      userId: "user-1",
      userName: "Ana Pérez",
      userWhatsapp: "+5493511234567",
    },
  ]);

  assert.match(html, /Cobros pendientes de revisión/);
  assert.match(html, /Ana Pérez/);
  assert.match(html, /\+5493511234567/);
  assert.match(html, /Monto distinto al esperado/);
  assert.match(html, /Plan mensual/);
  assert.match(html, /Esperado/);
});

test("PendingReviewSubscriptionsPanel shows a conservative empty state when there are no pending items", () => {
  const html = render([]);

  assert.match(html, /Sin casos abiertos por ahora\./);
  assert.doesNotMatch(html, /<table/);
});

test("PendingReviewSubscriptionsPanel falls back to manual review context when identity data is missing", () => {
  const html = render([
    {
      id: "evt-2",
      eventType: "payment_succeeded",
      source: "n8n",
      occurredAt: "2026-06-23T12:00:00.000Z",
      amountCents: 2000,
      currency: "USD",
      reasonCode: "missing_identity",
      reasonLabel: "Faltan datos para identificar al usuario",
      subscriptionId: null,
      subscriptionPlan: null,
      expectedAmountCents: null,
      userId: null,
      userName: null,
      userWhatsapp: null,
    },
  ]);

  assert.match(html, /Usuario por confirmar/);
  assert.match(html, /Sin suscripción vinculada/);
  assert.match(html, /Faltan datos para identificar al usuario/);
});
