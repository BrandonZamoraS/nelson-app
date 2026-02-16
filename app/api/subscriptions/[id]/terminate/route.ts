import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { terminateSubscription } from "@/lib/data/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http/json";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const { id } = await params;
  if (!id) {
    return fail(new AppError("Id requerido", 400, "missing_id"));
  }

  try {
    const data = await terminateSubscription(id, auth.adminProfile.id);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
