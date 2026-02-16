import { AppError } from "@/lib/errors/app-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminProfileRecord } from "@/lib/types/domain";

export async function getAdminProfileByAuthUserId(authUserId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_profiles")
    .select("id,email,full_name,role,is_active,created_at,updated_at")
    .eq("id", authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError(error.message, 500, "admin_profile_read_failed");
  }

  return (data as AdminProfileRecord | null) ?? null;
}
