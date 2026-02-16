import { NextResponse, type NextRequest } from "next/server";

import { isE2EAuthStubEnabled } from "@/lib/env/runtime-flags";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const redirectTo = new URL("/login", request.url);
  const response = NextResponse.redirect(redirectTo, { status: 303 });

  if (isE2EAuthStubEnabled()) {
    response.cookies.delete("e2e-auth");
    return response;
  }

  const supabase = createRouteSupabaseClient(request, response);
  await supabase.auth.signOut();
  return response;
}
