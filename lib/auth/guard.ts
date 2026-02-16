import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { isE2EAuthStubEnabled } from "@/lib/env/runtime-flags";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route";
import { getAdminProfileByAuthUserId } from "@/lib/auth/admin-profile";
import type { AdminProfileRecord } from "@/lib/types/domain";

export type AuthenticatedAdminContext = {
  authUser: {
    id: string;
    email: string | null;
  };
  adminProfile: AdminProfileRecord;
};

function buildStubAdminContext(): AuthenticatedAdminContext {
  return {
    authUser: {
      id: "e2e-admin",
      email: "admin@example.com",
    },
    adminProfile: {
      id: "e2e-admin",
      email: "admin@example.com",
      full_name: "E2E Admin",
      role: "owner",
      is_active: true,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    },
  };
}

export async function requirePageSession(): Promise<AuthenticatedAdminContext> {
  if (isE2EAuthStubEnabled()) {
    const cookieStore = await cookies();
    const hasStubSession = cookieStore.get("e2e-auth")?.value === "1";
    if (!hasStubSession) {
      redirect("/login");
    }

    return buildStubAdminContext();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminProfile = await getAdminProfileByAuthUserId(user.id);
  if (!adminProfile || !adminProfile.is_active) {
    redirect("/login?error=Admin%20no%20autorizado");
  }

  return {
    authUser: {
      id: user.id,
      email: user.email ?? null,
    },
    adminProfile,
  };
}

export async function getRouteSessionUser(request: NextRequest) {
  if (isE2EAuthStubEnabled()) {
    const hasStubSession = request.cookies.get("e2e-auth")?.value === "1";
    return {
      context: hasStubSession ? buildStubAdminContext() : null,
      response: NextResponse.next(),
      supabase: null,
    };
  }

  const response = NextResponse.next();
  const supabase = createRouteSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { context: null, response, supabase };
  }

  const adminProfile = await getAdminProfileByAuthUserId(user.id);
  if (!adminProfile || !adminProfile.is_active) {
    return { context: null, response, supabase };
  }

  return {
    context: {
      authUser: {
        id: user.id,
        email: user.email ?? null,
      },
      adminProfile,
    } satisfies AuthenticatedAdminContext,
    response,
    supabase,
  };
}
