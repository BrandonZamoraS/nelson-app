import type { NextRequest } from "next/server";

import {
  authorizeSubscriptionEventRequest,
  getSubscriptionEventSecret,
} from "@/lib/domain/subscription-event-ingress";
import { applySubscriptionEvent } from "@/lib/data/subscription-events";
import { fail, ok } from "@/lib/http/json";

export async function POST(request: NextRequest) {
  try {
    authorizeSubscriptionEventRequest(
      request.headers,
      getSubscriptionEventSecret(),
    );

    const payload = await request.json().catch(() => null);
    const data = await applySubscriptionEvent(payload);
    return ok(data, 202);
  } catch (error) {
    return fail(error);
  }
}
