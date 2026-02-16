import type { ReactNode } from "react";

import { requirePageSession } from "@/lib/auth/guard";

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePageSession();
  return children;
}
