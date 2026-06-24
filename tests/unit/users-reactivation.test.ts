import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "@/lib/errors/app-error";
import {
  createUserWithSubscriptionUsingClient,
  updateUserAndSubscriptionUsingClient,
} from "@/lib/data/users-reactivation";

type FakeResult = { data: unknown; error: { code?: string; message?: string } | null };
type FakeOperation = {
  table: string;
  action: "insert" | "update" | "select" | "delete";
  payload?: unknown;
  filters: Record<string, unknown>;
  mode: "single" | "maybeSingle";
};

function createFakeClient(
  resolver: (operation: FakeOperation) => FakeResult | Promise<FakeResult>,
) {
  return {
    from(table: string) {
      const state = {
        table,
        action: "select" as FakeOperation["action"],
        payload: undefined as unknown,
        filters: {} as Record<string, unknown>,
      };

      const builder = {
        insert(payload: unknown) {
          state.action = "insert";
          state.payload = payload;
          return builder;
        },
        update(payload: unknown) {
          state.action = "update";
          state.payload = payload;
          return builder;
        },
        delete() {
          state.action = "delete";
          return builder;
        },
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value;
          return builder;
        },
        async single() {
          return resolver({ ...state, mode: "single" });
        },
        async maybeSingle() {
          return resolver({ ...state, mode: "maybeSingle" });
        },
      };

      return builder;
    },
  };
}

const createInput = {
  full_name: "Maria Lopez",
  whatsapp: "+5493514558821",
  plan: "Mensual",
  amount_cents: 2000,
  status: "activa" as const,
  start_date: "2026-06-15",
  next_billing_date: "2026-07-15",
  source: "manual",
};

test("createUserWithSubscriptionUsingClient reactivates an inactive WhatsApp identity instead of failing duplicate", async () => {
  const auditCalls: Array<Record<string, unknown>> = [];
  const operations: FakeOperation[] = [];
  const inactiveUser = {
    id: "user-inactive",
    full_name: "Maria Antigua",
    whatsapp: createInput.whatsapp,
    is_active: false,
    deactivated_at: "2026-06-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };
  const subscription = {
    id: "sub-1",
    user_id: inactiveUser.id,
    plan: createInput.plan,
    amount_cents: createInput.amount_cents,
    currency: "USD",
    status: createInput.status,
    start_date: createInput.start_date,
    next_billing_date: createInput.next_billing_date,
    source: createInput.source,
    created_at: "2026-06-15T00:00:00.000Z",
    updated_at: "2026-06-15T00:00:00.000Z",
  };

  const client = createFakeClient((operation) => {
    operations.push(operation);

    if (operation.table === "users" && operation.action === "insert") {
      return {
        data: null,
        error: { code: "23505", message: "duplicate key value violates whatsapp" },
      };
    }

    if (
      operation.table === "users" &&
      operation.action === "select" &&
      operation.filters.whatsapp === createInput.whatsapp
    ) {
      return { data: inactiveUser, error: null };
    }

    if (
      operation.table === "users" &&
      operation.action === "update" &&
      operation.filters.id === inactiveUser.id
    ) {
      return {
        data: {
          ...inactiveUser,
          full_name: createInput.full_name,
          is_active: true,
          deactivated_at: null,
        },
        error: null,
      };
    }

    if (operation.table === "subscriptions" && operation.action === "insert") {
      return { data: subscription, error: null };
    }

    throw new Error(`Unhandled operation: ${JSON.stringify(operation)}`);
  });

  const result = await createUserWithSubscriptionUsingClient(
    client,
    createInput,
    async (entry) => {
      auditCalls.push(entry as Record<string, unknown>);
    },
    "admin-1",
  );

  assert.equal(result.user.id, inactiveUser.id);
  assert.equal(result.user.is_active, true);
  assert.equal(result.user.deactivated_at, null);
  assert.equal(result.subscription.user_id, inactiveUser.id);
  assert.equal(auditCalls.length, 1);
  assert.deepEqual(operations[2]?.payload, {
    full_name: createInput.full_name,
    whatsapp: createInput.whatsapp,
    is_active: true,
    deactivated_at: null,
  });
});

test("createUserWithSubscriptionUsingClient still reports duplicate for an active WhatsApp identity", async () => {
  const client = createFakeClient((operation) => {
    if (operation.table === "users" && operation.action === "insert") {
      return {
        data: null,
        error: { code: "23505", message: "duplicate key value violates whatsapp" },
      };
    }

    if (operation.table === "users" && operation.action === "select") {
      return {
        data: {
          id: "user-active",
          full_name: "Maria Activa",
          whatsapp: createInput.whatsapp,
          is_active: true,
          deactivated_at: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
        error: null,
      };
    }

    throw new Error(`Unhandled operation: ${JSON.stringify(operation)}`);
  });

  await assert.rejects(
    () =>
      createUserWithSubscriptionUsingClient(client, createInput, async () => {}, "admin-1"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "duplicate_whatsapp");
      return true;
    },
  );
});

test("updateUserAndSubscriptionUsingClient rejects inactive duplicate WhatsApp identities instead of switching accounts", async () => {
  const operations: FakeOperation[] = [];
  const auditCalls: Array<Record<string, unknown>> = [];

  const client = createFakeClient((operation) => {
    operations.push(operation);

    if (
      operation.table === "users" &&
      operation.action === "update" &&
      operation.filters.id === "user-1"
    ) {
      return {
        data: null,
        error: { code: "23505", message: "duplicate key value violates whatsapp" },
      };
    }

    if (
      operation.table === "users" &&
      operation.action === "select" &&
      operation.filters.whatsapp === createInput.whatsapp
    ) {
      return {
        data: {
          id: "legacy-user",
          full_name: "Maria Antigua",
          whatsapp: createInput.whatsapp,
          is_active: false,
          deactivated_at: "2026-06-01T00:00:00.000Z",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
        error: null,
      };
    }

    throw new Error(`Unhandled operation: ${JSON.stringify(operation)}`);
  });

  await assert.rejects(
    () =>
      updateUserAndSubscriptionUsingClient(
        client,
        "user-1",
        createInput,
        async (entry) => {
          auditCalls.push(entry as Record<string, unknown>);
        },
        async () => {
          throw new Error("should not read switched account");
        },
        "admin-1",
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "duplicate_whatsapp");
      return true;
    },
  );

  assert.equal(
    operations.some(
      (operation) =>
        operation.table === "users" &&
        operation.action === "update" &&
        operation.filters.id === "legacy-user",
    ),
    false,
  );
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0]?.result, "error");
  assert.deepEqual(auditCalls[0]?.detail, { reason: "duplicate_whatsapp" });
});
