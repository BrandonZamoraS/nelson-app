import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { patchSubscriptionStatus } from "@/lib/data/subscriptions";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http/json";
import { patchSubscriptionStatusInputSchema } from "@/lib/validators/subscriptions";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const { id } = await params;
  if (!id) {
    return fail(new AppError("Id requerido", 400, "missing_id"));
  }

  const payload = await request.json().catch(() => null);
  const parsed = patchSubscriptionStatusInputSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(new AppError("Payload invalido", 400, "invalid_payload"));
  }

  try {
    const data = await patchSubscriptionStatus(
      id,
      parsed.data,
      auth.adminProfile.id,
    );
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
