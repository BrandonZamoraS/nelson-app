export const SUBSCRIPTION_STATUSES = [
  "activa",
  "gracia",
  "suspendida",
  "terminada",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan: string;
  amount_cents: number;
  currency: "USD";
  status: SubscriptionStatus;
  start_date: string;
  next_billing_date: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

export type UserRecord = {
  id: string;
  full_name: string;
  whatsapp: string;
  is_active?: boolean;
  deactivated_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type UserWithSubscription = {
  user: UserRecord;
  subscription: SubscriptionRecord | null;
};

export type AuditLogRecord = {
  id: number;
  occurred_at: string;
  actor_admin_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  detail: Record<string, unknown>;
  result: "ok" | "error";
  actor_profile?: {
    full_name: string | null;
    email: string;
  } | null;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentRecord = {
  id: string;
  subscription_id: string;
  user_id: string;
  event_id?: string | null;
  amount_cents: number;
  currency: "USD";
  status: PaymentStatus;
  paid_at: string | null;
  due_at: string;
  source: string;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProfileRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSettingsRecord = {
  id: number;
  grace_days: number;
  initial_subscription_amount_cents: number;
  payment_reminder_template: string;
  suspension_notice_template: string;
  updated_at: string;
};

export type SubscriptionEventRecord = {
  id: string;
  idempotency_key: string;
  event_type: string;
  source: string;
  subscription_id: string | null;
  user_id: string | null;
  amount_cents: number | null;
  currency: "USD";
  occurred_at: string;
  paid_at: string | null;
  status: "processed" | "ignored" | "rejected" | "pending_review";
  error_code: string | null;
  metadata: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PendingReviewSubscriptionItem = {
  id: string;
  eventType: string;
  source: string;
  occurredAt: string;
  amountCents: number | null;
  currency: "USD";
  reasonCode: string | null;
  reasonLabel: string;
  subscriptionId: string | null;
  subscriptionPlan: string | null;
  expectedAmountCents: number | null;
  userId: string | null;
  userName: string | null;
  userWhatsapp: string | null;
};
