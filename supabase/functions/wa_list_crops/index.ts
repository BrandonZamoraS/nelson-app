import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { jsonOk, jsonErr, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase, ctx }) => {
    const user = ctx.user!;

    const { data, error } = await supabase
      .from("crops")
      .select("id, created_at, description, size, start_date, end_date")
      .eq("user", user.id)
      .order("created_at", { ascending: false });
    if (error) return jsonErr(500, "db_error", "Failed to list crops", error);

    return jsonOk({ crops: data ?? [] });
  })
);

