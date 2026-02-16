import { NextResponse } from "next/server";

import { asAppError } from "@/lib/errors/app-error";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(error: unknown) {
  const appError = asAppError(error);
  return NextResponse.json(
    {
      error: {
        message: appError.message,
        code: appError.code,
      },
    },
    { status: appError.status },
  );
}
