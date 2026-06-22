import assert from "node:assert/strict";
import test from "node:test";

import { formatAuditActor, formatAuditActionSummary } from "@/lib/audit/summary";

test("formatAuditActor prefers a readable actor name without exposing ids", () => {
  assert.equal(
    formatAuditActor({ actor_name: "Maria Lopez", actor_auth_id: "secret-auth-id" }),
    "Maria Lopez",
  );
});

test("formatAuditActor falls back to Sistema when there is no readable person", () => {
  assert.equal(formatAuditActor({ actor_auth_id: "secret-auth-id" }), "Sistema");
});

test("formatAuditActionSummary returns a short Spanish sentence without sensitive detail", () => {
  assert.equal(
    formatAuditActionSummary({
      action: "user.update",
      entityType: "user",
      detail: {
        full_name: "Carlos Perez",
        whatsapp: "+50688888888",
        actor_auth_id: "secret-auth-id",
      },
    }),
    "actualizó un usuario",
  );
});

test("formatAuditActionSummary marks failed events without exposing the error payload", () => {
  assert.equal(
    formatAuditActionSummary({
      action: "delete",
      entityType: "payment",
      result: "error",
      detail: { error: "database constraint details" },
    }),
    "intentó eliminar un pago, pero falló",
  );
});
