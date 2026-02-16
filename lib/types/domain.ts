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
};

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentRecord = {
  id: string;
  subscription_id: string;
  user_id: string;
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
  payment_reminder_template: string;
  suspension_notice_template: string;
  updated_at: string;
};
