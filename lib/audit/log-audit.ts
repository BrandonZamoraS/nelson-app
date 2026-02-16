import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LogAuditInput = {
  actorAuthId?: string | null;
  actorAdminId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  detail?: Record<string, unknown>;
  result: "ok" | "error";
};

export async function logAudit(input: LogAuditInput) {
  const client = createSupabaseAdminClient();
  const detail = {
    ...(input.detail ?? {}),
    actor_auth_id: input.actorAuthId ?? null,
  };

  const { error } = await client.from("audit_logs").insert({
    actor_admin_id: input.actorAdminId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    detail,
    result: input.result,
  });

  if (error) {
    throw new Error(`Could not write audit log: ${error.message}`);
  }
}
