import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentSession() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { session: null, error };
  }

  return { session: data.session ?? null, error: null };
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { user: null, error };
  }

  return { user: data.user ?? null, error: null };
}