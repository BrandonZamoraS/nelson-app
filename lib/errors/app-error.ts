export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "internal_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function asAppError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError("Unexpected error", 500, "internal_error");
}
