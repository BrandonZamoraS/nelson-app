import type { PaymentStatus, SubscriptionStatus } from "@/lib/types/domain";

export const SUBSCRIPTION_EVENT_TYPES = [
  "payment_succeeded",
  "payment_failed",
  "payment_refunded",
  "subscription_cancelled",
  "manual_status_change",
  "account_deleted",
] as const;

export const SUBSCRIPTION_EVENT_SOURCES = ["n8n", "manual", "system"] as const;

export const SUBSCRIPTION_EVENT_RESULTS = [
  "processed",
  "ignored",
  "rejected",
  "pending_review",
] as const;

export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENT_TYPES)[number];
export type SubscriptionEventSource = (typeof SUBSCRIPTION_EVENT_SOURCES)[number];
export type SubscriptionEventResult = (typeof SUBSCRIPTION_EVENT_RESULTS)[number];

type CalculateNextBillingDateInput = {
  currentStatus: SubscriptionStatus;
  nextBillingDate: string | null;
  paidAt: string;
};

type ClassifySubscriptionEventInput = {
  eventType: SubscriptionEventType;
  currentStatus: SubscriptionStatus | null;
  nextBillingDate: string | null;
  paidAt: string | null;
  amountCents: number | null;
  expectedAmountCents: number | null;
  hasSubscription: boolean;
  hasWhatsappIdentity?: boolean;
};

export type SubscriptionEventClassification = {
  status: SubscriptionEventResult;
  paymentStatus: PaymentStatus | null;
  nextStatus: SubscriptionStatus | null;
  nextBillingDate: string | null;
  reason: string;
  autoProvisionUser: boolean;
};

function asUtcDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function asIsoDate(timestamp: string) {
  return timestamp.slice(0, 10);
}

function shouldRestartSubscriptionCycle(input: CalculateNextBillingDateInput) {
  return input.currentStatus === "gracia"
    || input.currentStatus === "suspendida"
    || input.currentStatus === "terminada";
}

function addCalendarMonth(date: string) {
  const { year, month, day } = asUtcDateParts(date);
  const targetMonthIndex = month;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = targetMonthIndex % 12;
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, normalizedMonthIndex + 1, 0),
  ).getUTCDate();

  const nextDate = new Date(
    Date.UTC(targetYear, normalizedMonthIndex, Math.min(day, daysInTargetMonth)),
  );

  return nextDate.toISOString().slice(0, 10);
}

export function calculateNextBillingDate(input: CalculateNextBillingDateInput) {
  const baseDate = shouldRestartSubscriptionCycle(input)
    ? asIsoDate(input.paidAt)
    : input.nextBillingDate ?? asIsoDate(input.paidAt);

  return addCalendarMonth(baseDate);
}

export function classifySubscriptionEvent(
  input: ClassifySubscriptionEventInput,
): SubscriptionEventClassification {
  switch (input.eventType) {
    case "payment_failed":
      return {
        status: "processed",
        paymentStatus: "failed",
        nextStatus: null,
        nextBillingDate: null,
        reason: "payment_failed_recorded",
        autoProvisionUser: false,
      };
    case "payment_refunded":
      return {
        status: "processed",
        paymentStatus: "refunded",
        nextStatus: null,
        nextBillingDate: null,
        reason: "payment_refunded_recorded",
        autoProvisionUser: false,
      };
    case "payment_succeeded": {
      if (
        input.amountCents == null ||
        input.expectedAmountCents == null ||
        !input.paidAt
      ) {
        return {
          status: "pending_review",
          paymentStatus: "pending",
          nextStatus: null,
          nextBillingDate: null,
          reason: "incomplete_payment_event",
          autoProvisionUser: false,
        };
      }

      if (input.amountCents !== input.expectedAmountCents) {
        return {
          status: "pending_review",
          paymentStatus: "pending",
          nextStatus: null,
          nextBillingDate: null,
          reason: "amount_mismatch",
          autoProvisionUser: false,
        };
      }

      if (!input.hasSubscription) {
        if (!input.hasWhatsappIdentity) {
          return {
            status: "pending_review",
            paymentStatus: "pending",
            nextStatus: null,
            nextBillingDate: null,
            reason: "missing_identity",
            autoProvisionUser: false,
          };
        }

        return {
          status: "processed",
          paymentStatus: "paid",
          nextStatus: "activa",
          nextBillingDate: calculateNextBillingDate({
            currentStatus: "terminada",
            nextBillingDate: null,
            paidAt: input.paidAt,
          }),
          reason: "first_payment_auto_provision",
          autoProvisionUser: true,
        };
      }

      if (!input.currentStatus || !input.nextBillingDate) {
        return {
          status: "pending_review",
          paymentStatus: "pending",
          nextStatus: null,
          nextBillingDate: null,
          reason: "missing_subscription_cycle",
          autoProvisionUser: false,
        };
      }

      const reactivatesCycle = shouldRestartSubscriptionCycle({
        currentStatus: input.currentStatus,
        nextBillingDate: input.nextBillingDate,
        paidAt: input.paidAt,
      });

      return {
        status: "processed",
        paymentStatus: "paid",
        nextStatus: "activa",
        nextBillingDate: calculateNextBillingDate({
          currentStatus: input.currentStatus,
          nextBillingDate: input.nextBillingDate,
          paidAt: input.paidAt,
        }),
        reason: reactivatesCycle
          ? "payment_reactivated_subscription"
          : "payment_renewed_subscription",
        autoProvisionUser: false,
      };
    }
    case "subscription_cancelled":
      return {
        status: input.currentStatus === "terminada" ? "ignored" : "processed",
        paymentStatus: null,
        nextStatus: input.currentStatus === "terminada" ? null : "terminada",
        nextBillingDate: null,
        reason: input.currentStatus === "terminada"
          ? "subscription_already_terminated"
          : "subscription_cancelled",
        autoProvisionUser: false,
      };
    case "manual_status_change":
      return {
        status: "processed",
        paymentStatus: null,
        nextStatus: input.currentStatus,
        nextBillingDate: null,
        reason: "manual_status_change_requires_target_status",
        autoProvisionUser: false,
      };
    case "account_deleted":
      return {
        status: "processed",
        paymentStatus: null,
        nextStatus: "terminada",
        nextBillingDate: null,
        reason: "account_deactivated",
        autoProvisionUser: false,
      };
  }
}
