import type { SubscriptionStatus } from "@/lib/types/domain";

const allowedTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  activa: ["gracia", "suspendida", "terminada"],
  gracia: ["activa", "suspendida", "terminada"],
  suspendida: ["activa", "terminada"],
  terminada: [],
};

export function isValidStatusTransition(
  current: SubscriptionStatus,
  target: SubscriptionStatus,
) {
  if (current === target) {
    return true;
  }

  return allowedTransitions[current].includes(target);
}

export function assertValidStatusTransition(
  current: SubscriptionStatus,
  target: SubscriptionStatus,
) {
  if (!isValidStatusTransition(current, target)) {
    throw new Error(`Transicion invalida: ${current} -> ${target}`);
  }
}

export function getAllowedStatusTargets(current: SubscriptionStatus) {
  return [...allowedTransitions[current]];
}
