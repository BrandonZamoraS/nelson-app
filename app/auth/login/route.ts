import { NextResponse, type NextRequest } from "next/server";

import {
  getE2EAdminEmail,
  getE2EAdminPassword,
  isE2EAuthStubEnabled,
} from "@/lib/env/runtime-flags";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { loginInputSchema } from "@/lib/validators/auth";

function buildLoginRedirect(request: NextRequest, error?: string) {
  const target = new URL("/login", request.url);
  if (error) {
    target.searchParams.set("error", error);
  }
  return NextResponse.redirect(target, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = loginInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return buildLoginRedirect(request, "Credenciales invalidas.");
  }

  const redirectTo = new URL(parsed.data.next || "/", request.url);
  const response = NextResponse.redirect(redirectTo, { status: 303 });

  if (isE2EAuthStubEnabled()) {
    if (
      parsed.data.email === getE2EAdminEmail() &&
      parsed.data.password === getE2EAdminPassword()
    ) {
      response.cookies.set("e2e-auth", "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }

    return buildLoginRedirect(request, "Email o contraseña incorrectos.");
  }

  const supabase = createRouteSupabaseClient(request, response);
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return buildLoginRedirect(request, "Email o contraseña incorrectos.");
  }

  return response;
}
