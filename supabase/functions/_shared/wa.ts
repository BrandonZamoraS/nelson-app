// Shared helpers for WhatsApp agent edge functions.
//
// Design goals:
// - No JWT auth (verify_jwt=false); internal auth via x-agent-key.
// - Identify user by E.164 phone from header/body (never from chat text).
// - Use service-role Supabase client to bypass RLS, but gate everything with AGENT_TOOL_KEY.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type WaErrorResponse = {
  ok: false;
  error: { code: string; message: string; detail?: unknown };
};

export type WaOkResponse<T extends Record<string, unknown>> = { ok: true } & T;

type UserRow = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  start_date: string;
  next_billing_date: string | null;
  amount_cents: number;
  currency: string;
};

type AppSettingsRow = {
  id: number;
  grace_days: number;
};

export type Access = {
  allowed: boolean;
  reason:
    | "user_not_found"
    | "no_subscription"
    | "active"
    | "grace_ok"
    | "grace_expired"
    | "suspendida"
    | "terminada"
    | "unknown_status";
  grace_until?: string; // YYYY-MM-DD
};

export type WaContext = {
  phone: string;
  exists: boolean;
  user: UserRow | null;
  subscription: Omit<SubscriptionRow, "user_id"> | null;
  access: Access;
  app_settings: Pick<AppSettingsRow, "grace_days"> | null;
};

type HandlerArgs = {
  req: Request;
  supabase: SupabaseClient;
  phone: string;
  body: any;
  ctx: WaContext;
};

export type CropRow = {
  id: number;
  created_at: string;
  description: string | null;
  size: number | null;
  start_date: string | null;
  end_date: string | null;
  user: string | null;
};

export type ExpenseRow = {
  id: number;
  created_at: string;
  description: string | null;
  expense_type: number | null;
  amount: number | null;
  crop_id: number | null;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-agent-key, x-wa-phone",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "content-type": "application/json; charset=utf-8",
};

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-client-info": "wa-edge/1.0.0" } },
  });
  return _admin;
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data } satisfies WaOkResponse<T>), {
    status,
    headers: JSON_HEADERS,
  });
}

export function jsonErr(
  status: number,
  code: string,
  message: string,
  detail?: unknown,
): Response {
  const body: WaErrorResponse = { ok: false, error: { code, message, detail } };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[^\d]+/g, "");
  if (!digits) return null;
  // Force E.164-like: '+' + digits.
  return `+${digits}`;
}

function utcTodayStr(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateUTC(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Validate round-trip (e.g. 2026-02-31 should be rejected).
  const rt = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  if (rt !== dateStr) return null;
  return dt;
}

function addDays(dateStr: string, days: number): string {
  const dt = parseDateUTC(dateStr);
  if (!dt) return dateStr;
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isISODate(input: unknown): input is string {
  return typeof input === "string" && parseDateUTC(input) !== null;
}

export function isNumber(input: unknown): input is number {
  return typeof input === "number" && Number.isFinite(input);
}

async function safeJson(req: Request): Promise<{ body: any; error: Response | null }> {
  if (req.method === "GET" || req.method === "HEAD") return { body: null, error: null };
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    // Allow empty body for POST if phone comes from headers, but reject non-empty invalid JSON.
    try {
      const text = await req.text();
      if (!text.trim()) return { body: null, error: null };
      return { body: null, error: jsonErr(400, "invalid_json", "Body must be JSON") };
    } catch {
      return { body: null, error: jsonErr(400, "invalid_json", "Body must be JSON") };
    }
  }
  try {
    const body = await req.json();
    return { body, error: null };
  } catch (e) {
    return { body: null, error: jsonErr(400, "invalid_json", "Invalid JSON body", String(e)) };
  }
}

function checkAgentKey(req: Request): Response | null {
  const provided = req.headers.get("x-agent-key") ?? "";
  // Primary secret name: AGENT_TOOL_KEY (as documented).
  // Back-compat: some environments may have been configured with a non-standard secret name.
  const expected = Deno.env.get("AGENT_TOOL_KEY") ?? Deno.env.get("x-agent-key") ?? "";
  if (!expected) return jsonErr(500, "missing_env", "AGENT_TOOL_KEY is not configured");
  if (!provided || provided !== expected) return jsonErr(401, "unauthorized", "Invalid agent key");
  return null;
}

async function fetchAppSettings(supabase: SupabaseClient): Promise<Pick<AppSettingsRow, "grace_days"> | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("grace_days")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? { grace_days: data.grace_days as number } : null;
}

async function fetchUserByPhone(supabase: SupabaseClient, phone: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, whatsapp, email")
    .eq("whatsapp", phone)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow) ?? null;
}

async function fetchSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Omit<SubscriptionRow, "user_id"> | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, plan, status, start_date, next_billing_date, amount_cents, currency")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Omit<SubscriptionRow, "user_id">) ?? null;
}

function computeAccess(
  subscription: Omit<SubscriptionRow, "user_id"> | null,
  graceDays: number,
  userExists: boolean,
): Access {
  if (!userExists) return { allowed: false, reason: "user_not_found" };
  if (!subscription) return { allowed: false, reason: "no_subscription" };

  const status = subscription.status;
  if (status === "activa") return { allowed: true, reason: "active" };
  if (status === "suspendida") return { allowed: false, reason: "suspendida" };
  if (status === "terminada") return { allowed: false, reason: "terminada" };

  if (status === "gracia") {
    const today = utcTodayStr();
    const base = subscription.next_billing_date ?? today;
    const graceUntil = addDays(base, graceDays);
    const todayDt = parseDateUTC(today)!;
    const untilDt = parseDateUTC(graceUntil)!;
    const allowed = todayDt.getTime() <= untilDt.getTime();
    return {
      allowed,
      reason: allowed ? "grace_ok" : "grace_expired",
      grace_until: graceUntil,
    };
  }

  return { allowed: false, reason: "unknown_status" };
}

export async function resolveWaContext(supabase: SupabaseClient, phone: string): Promise<WaContext> {
  const user = await fetchUserByPhone(supabase, phone);
  if (!user) {
    return {
      phone,
      exists: false,
      user: null,
      subscription: null,
      access: { allowed: false, reason: "user_not_found" },
      app_settings: null,
    };
  }

  const appSettings = await fetchAppSettings(supabase);
  const graceDays = appSettings?.grace_days ?? 0;
  const subscription = await fetchSubscriptionForUser(supabase, user.id);
  const access = computeAccess(subscription, graceDays, true);

  return {
    phone,
    exists: true,
    user,
    subscription,
    access,
    app_settings: appSettings ? { grace_days: graceDays } : null,
  };
}

export async function insertAuditLog(
  supabase: SupabaseClient,
  params: {
    entity_type: "user" | "crop" | "expense";
    entity_id: string;
    action: "create" | "update" | "delete" | "finalize";
    detail: Record<string, unknown>;
    result: "ok" | "error";
    actor_admin_id?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      action: params.action,
      detail: params.detail,
      result: params.result,
      actor_admin_id: params.actor_admin_id ?? null,
    });
  } catch {
    // Best-effort: never fail the business operation because audit insert failed.
  }
}

export async function getCropOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  cropId: string | number,
): Promise<CropRow | null> {
  const { data, error } = await supabase
    .from("crops")
    .select("id, created_at, description, size, start_date, end_date, user")
    .eq("id", cropId)
    .eq("user", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as CropRow) ?? null;
}

export async function expenseTypeExists(
  supabase: SupabaseClient,
  expenseTypeId: string | number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("expenses_type")
    .select("id")
    .eq("id", expenseTypeId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getExpenseOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  expenseId: string | number,
): Promise<ExpenseRow | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, created_at, description, expense_type, amount, crop_id")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) throw error;
  const exp = (data as ExpenseRow) ?? null;
  if (!exp || exp.crop_id == null) return null;

  const crop = await getCropOwnedByUser(supabase, userId, exp.crop_id);
  if (!crop) return null;
  return exp;
}

export async function waHandler(
  req: Request,
  opts: { requireUser: boolean; requireAllowed: boolean },
  handler: (args: HandlerArgs) => Promise<Response>,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  const authErr = checkAgentKey(req);
  if (authErr) return authErr;

  const { body, error } = await safeJson(req);
  if (error) return error;

  const rawPhone = req.headers.get("x-wa-phone") ?? body?.phone;
  const phone = normalizePhone(rawPhone);
  if (!phone) return jsonErr(400, "invalid_phone", "Missing or invalid phone (x-wa-phone or body.phone)");

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseAdmin();
  } catch (e) {
    return jsonErr(500, "missing_env", "Missing Supabase env vars", String(e));
  }

  try {
    const ctx = await resolveWaContext(supabase, phone);

    if (opts.requireUser && !ctx.user) {
      return jsonErr(404, "user_not_found", "User not found for phone", { phone });
    }
    if (opts.requireAllowed && !ctx.access.allowed) {
      return jsonErr(403, "forbidden", "Access denied by subscription status", {
        phone,
        reason: ctx.access.reason,
        grace_until: ctx.access.grace_until,
      });
    }

    return await handler({ req, supabase, phone, body, ctx });
  } catch (e) {
    return jsonErr(500, "internal_error", "Unhandled error", String(e));
  }
}
