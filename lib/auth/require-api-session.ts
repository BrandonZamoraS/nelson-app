import { NextResponse, type NextRequest } from "next/server";

import { getRouteSessionUser } from "@/lib/auth/guard";

export async function requireApiSession(request: NextRequest) {
  const { context, response } = await getRouteSessionUser(request);
  if (!context) {
    return {
      errorResponse: NextResponse.json(
        { error: { message: "No autenticado o no autorizado", code: "unauthorized" } },
        { status: 401 },
      ),
    };
  }

  return {
    authUser: context.authUser,
    adminProfile: context.adminProfile,
    response,
  };
}
