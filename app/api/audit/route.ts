import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { listAuditLogs } from "@/lib/data/audit";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http/json";
import { auditFilterInputSchema } from "@/lib/validators/audit";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const params = request.nextUrl.searchParams;
  const parsed = auditFilterInputSchema.safeParse({
    action: params.get("action") ?? undefined,
    entity_type: params.get("entity_type") ?? undefined,
    entity_id: params.get("entity_id") ?? undefined,
    result: params.get("result") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return fail(new AppError("Parametros invalidos", 400, "invalid_query"));
  }

  try {
    const data = await listAuditLogs(parsed.data);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
