import type { SubscriptionStatus } from "@/lib/types/domain";

const classByStatus: Record<SubscriptionStatus, string> = {
  activa: "badge badge-active",
  gracia: "badge badge-warning",
  suspendida: "badge badge-critical",
  terminada: "badge badge-muted",
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return <span className={classByStatus[status]}>{status}</span>;
}
