import { buildAuditActorOrFilter, sanitizeAuditSearch } from "@/lib/audit/filter";
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
      "id,occurred_at,actor_admin_id,entity_type,entity_id,action,detail,result,actor_profile:admin_profiles(full_name,email)",
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

  if (input.actor) {
    const escaped = sanitizeAuditSearch(input.actor);

    if (escaped.length > 0) {
      const { data: adminMatches, error: adminError } = await client
        .from("admin_profiles")
        .select("id")
        .or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);

      if (adminError) {
        throw new AppError(adminError.message, 500, "audit_actor_filter_failed");
      }

      const adminIds = (adminMatches ?? [])
        .map((row) => (typeof row.id === "string" ? row.id : null))
        .filter((id): id is string => id !== null);

      query = query.or(buildAuditActorOrFilter(escaped, adminIds));
    }
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
    rows: (data ?? []) as unknown as AuditLogRecord[],
    page: input.page,
    pageSize: input.pageSize,
    total: count ?? 0,
  };
}
