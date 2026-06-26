import type { PaymentStatus, SubscriptionStatus } from "@/lib/types/domain";

const subscriptionClasses: Record<SubscriptionStatus, string> = {
  activa: "badge badge-active",
  gracia: "badge badge-warning",
  suspendida: "badge badge-critical",
  terminada: "badge badge-muted",
};

const paymentClasses: Record<PaymentStatus, string> = {
  paid: "badge badge-active",
  pending: "badge badge-warning",
  failed: "badge badge-critical",
  refunded: "badge badge-muted",
};

type BadgeStatus = SubscriptionStatus | PaymentStatus;

function getClassName(status: BadgeStatus): string {
  if (status in subscriptionClasses) {
    return subscriptionClasses[status as SubscriptionStatus];
  }
  if (status in paymentClasses) {
    return paymentClasses[status as PaymentStatus];
  }
  return "badge";
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return <span className={getClassName(status)}>{status}</span>;
}
