import type { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/require-api-session";
import { getSettings, patchSettings } from "@/lib/data/settings";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http/json";
import { updateSettingsInputSchema } from "@/lib/validators/settings";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const data = await getSettings();
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSettingsInputSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(new AppError("Payload invalido", 400, "invalid_payload"));
  }

  try {
    const data = await patchSettings(parsed.data, auth.adminProfile.id);
    return ok(data);
  } catch (error) {
    return fail(error);
  }
}
