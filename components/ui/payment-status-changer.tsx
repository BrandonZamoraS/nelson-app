"use client";

import { useState, useTransition } from "react";
import { changePaymentStatusAction } from "@/lib/actions/private-actions";
import type { PaymentStatus } from "@/lib/types/domain";

type PaymentStatusChangerProps = {
  paymentId: string;
  currentStatus: PaymentStatus;
  userName: string;
  statuses: readonly PaymentStatus[];
};

export function PaymentStatusChanger({
  paymentId,
  currentStatus,
  userName,
  statuses,
}: PaymentStatusChangerProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PaymentStatus | null>(
    null,
  );

  const handleChange = (newStatus: PaymentStatus) => {
    if (newStatus === currentStatus) return;

    setPendingStatus(newStatus);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (!pendingStatus) return;

    const formData = new FormData();
    formData.set("payment_id", paymentId);
    formData.set("status", pendingStatus);

    startTransition(async () => {
      await changePaymentStatusAction(formData);
    });

    setShowConfirm(false);
    setPendingStatus(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingStatus(null);
  };

  return (
    <>
      <select
        value={currentStatus}
        onChange={(e) => handleChange(e.target.value as PaymentStatus)}
        disabled={isPending}
        className={isPending ? "select-loading" : ""}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      {showConfirm && pendingStatus && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirmar cambio de estado</h3>
            </div>
            <div className="modal-body pb-4">
              <p>
                ¿Cambiar el estado del pago de{" "}
                <strong>{userName}</strong> de{" "}
                <span className="status-highlight">{currentStatus}</span> a{" "}
                <span className="status-highlight">{pendingStatus}</span>?
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={handleConfirm}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="button button-ghost"
                onClick={handleCancel}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
