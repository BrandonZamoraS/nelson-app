import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { jsonOk, waHandler } from "../_shared/wa.ts";

serve((req) =>
  waHandler(req, { requireUser: false, requireAllowed: false }, async ({ ctx }) => {
    return jsonOk({
      exists: ctx.exists,
      phone: ctx.phone,
      user: ctx.user
        ? {
          id: ctx.user.id,
          full_name: ctx.user.full_name,
          whatsapp: ctx.user.whatsapp,
          email: ctx.user.email,
        }
        : undefined,
      subscription: ctx.subscription
        ? {
          id: ctx.subscription.id,
          plan: ctx.subscription.plan,
          status: ctx.subscription.status,
          next_billing_date: ctx.subscription.next_billing_date,
          amount_cents: ctx.subscription.amount_cents,
          currency: ctx.subscription.currency,
        }
        : undefined,
      access: ctx.access,
    });
  })
);

