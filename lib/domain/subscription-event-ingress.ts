import { timingSafeEqual } from "node:crypto";

import { AppError } from "@/lib/errors/app-error";

export const SUBSCRIPTION_EVENT_SECRET_HEADER = "x-nelson-event-secret";

function secretsMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function getSubscriptionEventSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.NELSON_EVENT_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

export function authorizeSubscriptionEventRequest(
  headers: Headers,
  configuredSecret: string | null,
) {
  if (!configuredSecret) {
    throw new AppError(
      "Configuración incompleta del ingreso de eventos",
      503,
      "subscription_event_auth_unconfigured",
    );
  }

  const providedSecret = headers.get(SUBSCRIPTION_EVENT_SECRET_HEADER)?.trim();
  if (!providedSecret || !secretsMatch(configuredSecret, providedSecret)) {
    throw new AppError("No autorizado", 401, "subscription_event_unauthorized");
  }
}
