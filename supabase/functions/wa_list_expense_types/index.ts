import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { jsonErr, jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: true, requireAllowed: true }, async ({ supabase }) => {
    const { data, error } = await supabase
      .from("expenses_type")
      .select("id, created_at, description")
      .order("description", { ascending: true });
    if (error) return jsonErr(500, "db_error", "Failed to list expense types", error);

    return jsonOk({ expense_types: data ?? [] });
  })
);

