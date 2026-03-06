import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import {
  DEFAULT_CREATE_USER_FORM_VALUES,
  buildUserFormErrorRedirect,
  getFirstZodIssueMessage,
  readUserFormValues,
} from "@/lib/users/form-state";

test("buildUserFormErrorRedirect preserves entered values for create modal", () => {
  const location = buildUserFormErrorRedirect({
    mode: "create",
    error: "Monto invalido.",
    values: {
      ...DEFAULT_CREATE_USER_FORM_VALUES,
      full_name: "Maria Lopez",
      whatsapp: "+5493514558821",
      amount_cents: "",
      start_date: "2026-03-06",
      next_billing_date: "",
    },
  });

  const url = new URL(location, "https://example.com");

  assert.equal(url.pathname, "/usuarios");
  assert.equal(url.searchParams.get("modal"), "create");
  assert.equal(url.searchParams.get("error"), "Monto invalido.");
  assert.equal(url.searchParams.get("full_name"), "Maria Lopez");
  assert.equal(url.searchParams.get("whatsapp"), "+5493514558821");
  assert.equal(url.searchParams.get("amount_cents"), "");
  assert.equal(url.searchParams.get("start_date"), "2026-03-06");
  assert.equal(url.searchParams.get("next_billing_date"), "");
});

test("readUserFormValues preserves blank query values instead of resetting defaults", () => {
  const values = readUserFormValues(
    {
      full_name: "Maria Lopez",
      whatsapp: "+5493514558821",
      amount_cents: "",
      start_date: "2026-03-06",
      next_billing_date: "",
    },
    DEFAULT_CREATE_USER_FORM_VALUES,
  );

  assert.equal(values.full_name, "Maria Lopez");
  assert.equal(values.whatsapp, "+5493514558821");
  assert.equal(values.amount_cents, "");
  assert.equal(values.start_date, "2026-03-06");
  assert.equal(values.next_billing_date, "");
  assert.equal(values.plan, "manual");
  assert.equal(values.status, "activa");
});

test("getFirstZodIssueMessage exposes the first specific validation error", () => {
  const schema = z.object({
    amount_cents: z.number().positive("Monto invalido."),
  });
  const parsed = schema.safeParse({
    amount_cents: 0,
  });

  assert.equal(parsed.success, false);
  assert.equal(getFirstZodIssueMessage(parsed.error), "Monto invalido.");
});
