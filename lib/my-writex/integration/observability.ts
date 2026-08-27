export type MyWritexIntegrationResult =
  | "success"
  | "failure"
  | "denied"
  | "timeout";

export type MyWritexIntegrationLogInput = Readonly<{
  correlationId: string;
  authScope: "customer" | "invoice" | "anonymous";
  customerPublicRef?: string;
  route: string;
  latencyMs: number;
  result: MyWritexIntegrationResult;
  integrationErrorClass?: string;
}>;

const SAFE_REFERENCE = /^[A-Z][A-Z0-9-]{5,63}$/;
const SAFE_CORRELATION = /^[A-Za-z0-9._:-]{8,128}$/;
const SAFE_ROUTE = /^\/[A-Za-z0-9_/{}/.-]{1,127}$/;
const SAFE_ERROR_CLASS = /^[A-Z][A-Z0-9_]{2,63}$/;

export function safeMyWritexIntegrationLog(input: MyWritexIntegrationLogInput) {
  if (!SAFE_CORRELATION.test(input.correlationId)) {
    throw new Error("Unsafe correlation ID");
  }
  if (!SAFE_ROUTE.test(input.route)) throw new Error("Unsafe route");
  if (
    input.customerPublicRef &&
    !SAFE_REFERENCE.test(input.customerPublicRef)
  ) {
    throw new Error("Unsafe customer public reference");
  }
  if (
    input.integrationErrorClass &&
    !SAFE_ERROR_CLASS.test(input.integrationErrorClass)
  ) {
    throw new Error("Unsafe integration error class");
  }
  if (!Number.isFinite(input.latencyMs) || input.latencyMs < 0) {
    throw new Error("Invalid latency");
  }
  return {
    event: "my_writex.integration",
    correlationId: input.correlationId,
    authScope: input.authScope,
    customerPublicRef: input.customerPublicRef,
    route: input.route,
    latencyMs: Math.round(input.latencyMs),
    result: input.result,
    integrationErrorClass: input.integrationErrorClass,
  };
}
