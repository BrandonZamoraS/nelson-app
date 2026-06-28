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
  const [amountUsd, setAmountUsd] = useState(
    subscriptions[0] ? subscriptions[0].amount_cents / 100 : 0,
  );
  const [paidAt, setPaidAt] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  const handleSubscriptionChange = (newId: string) => {
    setSelectedId(newId);
    const sub = subscriptions.find((s) => s.id === newId);
    if (sub) {
      setAmountUsd(sub.amount_cents / 100);
    }
  };

  return (
    <form action={createManualPaymentAction} className="stack">
      <label className="field">
        <span>Suscripción</span>
        <select
          name="subscription_id"
          value={selectedId}
          onChange={(e) => handleSubscriptionChange(e.target.value)}
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
        <span>Monto (USD)</span>
        <input
          type="number"
          name="amount_usd"
          value={amountUsd}
          onChange={(e) => setAmountUsd(Number(e.target.value))}
          min={0.01}
          step="0.01"
          required
        />
      </label>

      <label className="field">
        <span>Fecha de pago</span>
        <input
          type="date"
          name="paid_at"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
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
