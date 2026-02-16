import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { listSubscriptions } from "@/lib/data/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http/json";
import { listSubscriptionsInputSchema } from "@/lib/validators/subscriptions";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const params = request.nextUrl.searchParams;
  const parsed = listSubscriptionsInputSchema.safeParse({
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return fail(new AppError("Parametros invalidos", 400, "invalid_query"));
  }

  try {
    const data = await listSubscriptions(parsed.data);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
