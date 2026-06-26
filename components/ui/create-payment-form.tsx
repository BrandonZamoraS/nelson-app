"use client";

import { useState } from "react";
import { createManualPaymentAction } from "@/lib/actions/private-actions";
import type { ActiveSubscriptionOption } from "@/lib/data/payments";

type CreatePaymentFormProps = {
  subscriptions: ActiveSubscriptionOption[];
};

export function CreatePaymentForm({ subscriptions }: CreatePaymentFormProps) {
  const [selectedId, setSelectedId] = useState(
    subscriptions[0]?.id ?? "",
  );

  const selected = subscriptions.find((s) => s.id === selectedId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={createManualPaymentAction} className="stack">
      <label className="field">
        <span>Suscripción</span>
        <select
          name="subscription_id"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          required
        >
          {subscriptions.map((sub) => {
            const user = Array.isArray(sub.users) ? sub.users[0] : sub.users;
            return (
              <option key={sub.id} value={sub.id}>
                {user?.full_name ?? "Sin nombre"} — {sub.plan}
              </option>
            );
          })}
        </select>
      </label>

      <label className="field">
        <span>Monto (centavos)</span>
        <input
          type="number"
          name="amount_cents"
          defaultValue={selected?.amount_cents ?? ""}
          min={1}
          required
        />
      </label>

      <label className="field">
        <span>Fecha de pago</span>
        <input
          type="date"
          name="paid_at"
          defaultValue={today}
          required
        />
      </label>

      <label className="field">
        <span>Referencia externa (opcional)</span>
        <input type="text" name="external_ref" />
      </label>

      <div className="row-inline">
        <button type="submit" className="button button-primary">
          Registrar pago
        </button>
        <a href="/pagos" className="button button-ghost">
          Cancelar
        </a>
      </div>
    </form>
  );
}
