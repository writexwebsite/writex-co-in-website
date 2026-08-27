export type MyWritexAuthScope = "customer" | "invoice";

export type MyWritexPrincipal = Readonly<{
  sessionRef: string;
  scope: MyWritexAuthScope;
  customerMasterId?: string;
  invoiceReference?: string;
}>;

export type MyWritexRequestStatus =
  | "Received"
  | "Reviewing"
  | "Waiting for Customer"
  | "Resolved";

export type MyWritexContractRequest = Readonly<{
  requestRef: string;
  title: string;
  type: string;
  status: MyWritexRequestStatus;
  createdAt: string;
  projectPublicRef?: string;
  lastResponse?: string;
}>;

export type MyWritexContractErrorCode =
  | "AUTHENTICATION_FAILED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "IDEMPOTENCY_CONFLICT"
  | "FIXTURES_DISABLED";

export class MyWritexContractError extends Error {
  constructor(
    public readonly code: MyWritexContractErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MyWritexContractError";
  }
}

export const GENERIC_AUTH_FAILURE =
  "We could not verify those details. Check them and try again.";

export function contractNotFound(): never {
  throw new MyWritexContractError(
    "NOT_FOUND",
    404,
    "The requested item was not found.",
  );
}
