import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { createUserWithSubscription, listUsers } from "@/lib/data/users";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http/json";
import { getFirstZodIssueMessage } from "@/lib/users/form-state";
import {
  createUserInputSchema,
  listUsersInputSchema,
} from "@/lib/validators/users";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const params = request.nextUrl.searchParams;
  const parsed = listUsersInputSchema.safeParse({
    search: params.get("search") ?? undefined,
    status: params.get("status") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return fail(new AppError("Parametros invalidos", 400, "invalid_query"));
  }

  try {
    const data = await listUsers(parsed.data);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = createUserInputSchema.safeParse(payload);

  if (!parsed.success) {
    return fail(
      new AppError(
        getFirstZodIssueMessage(parsed.error, "Payload invalido"),
        400,
        "invalid_payload",
      ),
    );
  }

  try {
    const data = await createUserWithSubscription(
      parsed.data,
      auth.adminProfile.id,
    );
    return ok(data, 201);
  } catch (error) {
    return fail(error);
  }
}
