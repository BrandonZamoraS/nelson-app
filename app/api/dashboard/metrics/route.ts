import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { getDashboardData } from "@/lib/data/dashboard";
import { fail, ok } from "@/lib/http/json";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const data = await getDashboardData();
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
