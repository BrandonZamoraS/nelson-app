import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuditLogRecord } from "@/lib/types/domain";
import type { AuditFilterInput } from "@/lib/validators/audit";

export async function listAuditLogs(input: AuditFilterInput) {
  const client = createSupabaseAdminClient();
  const fromIndex = (input.page - 1) * input.pageSize;
  const toIndex = fromIndex + input.pageSize - 1;

  let query = client
    .from("audit_logs")
    .select(
      "id,occurred_at,actor_admin_id,entity_type,entity_id,action,detail,result",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(fromIndex, toIndex);

  if (input.action) {
    query = query.ilike("action", `%${input.action}%`);
  }

  if (input.entity_type) {
    query = query.eq("entity_type", input.entity_type);
  }

  if (input.entity_id) {
    query = query.ilike("entity_id", `%${input.entity_id}%`);
  }

  if (input.result) {
    query = query.eq("result", input.result);
  }

  if (input.from) {
    query = query.gte("occurred_at", `${input.from}T00:00:00.000Z`);
  }

  if (input.to) {
    query = query.lte("occurred_at", `${input.to}T23:59:59.999Z`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new AppError(error.message, 500, "audit_list_failed");
  }

  return {
    rows: (data ?? []) as AuditLogRecord[],
    page: input.page,
    pageSize: input.pageSize,
    total: count ?? 0,
  };
}
