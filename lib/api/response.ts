import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "INTEGRATION_UNAVAILABLE"
  | "LEGACY_LOGIN_DISABLED"
  | "ADDITIONAL_VERIFICATION_REQUIRED"
  | "EMPLOYEE_DIRECTORY_UNAVAILABLE"
  | "SERVER_ERROR";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message
        }
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "SERVER_ERROR",
        message: "The request could not be completed."
      }
    },
    { status: 500 }
  );
}

export function notConfigured(message = "This backend capability is not configured.") {
  return new ApiError(503, "NOT_CONFIGURED", message);
}

export function unauthorized(message = "Authentication is required.") {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "You do not have access to this resource.") {
  return new ApiError(403, "FORBIDDEN", message);
}

export function badRequest(message = "The request is invalid.") {
  return new ApiError(400, "BAD_REQUEST", message);
}
