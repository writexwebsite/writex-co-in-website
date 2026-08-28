const enabled = (value: string | undefined) =>
  value?.trim().toLowerCase() === "true";

const explicitlyDisabled = (value: string | undefined) =>
  value?.trim().toLowerCase() === "false";

export const MY_WRITEX_DEMO_CUSTOMER_ID = "CUST-DEMO-SHUBHAM";
export const MY_WRITEX_DEMO_WRITEX_ID = "shubham.demo";
export const MY_WRITEX_DEMO_PHONE = "+919000000001";
export const MY_WRITEX_DEMO_INVOICE = "WX-MW-1001";

export const MY_WRITEX_DEMO_RISK_FLAGS = [
  "MY_WRITEX_LTS_INTEGRATION_ENABLED",
  "MY_WRITEX_CUSTOMER_MASTER_ENABLED",
  "MY_WRITEX_REAL_REQUESTS_ENABLED",
  "MY_WRITEX_PRODUCTION_AUTH_ENABLED",
] as const;

export function isMyWritexDemoModeEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (environment.NODE_ENV !== "production") return false;
  if (!enabled(environment.MY_WRITEX_DEMO_MODE)) return false;
  if (!enabled(environment.MY_WRITEX_ENABLED)) return false;
  if (!enabled(environment.MY_WRITEX_DEMO_ACCOUNT_ENABLED)) return false;
  if (!MY_WRITEX_DEMO_RISK_FLAGS.every((name) => explicitlyDisabled(environment[name]))) {
    return false;
  }
  if (environment.CLIENT_AUTH_PROVIDER?.trim().toLowerCase() === "lts") return false;
  for (const name of [
    "DATABASE_URL",
    "LTS_API_BASE_URL",
    "LTS_API_KEY",
    "PMT_API_BASE_URL",
    "PMT_API_KEY",
  ]) {
    if (environment[name]?.trim()) return false;
  }
  return true;
}

export function getMyWritexDemoHost(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  return environment.MY_WRITEX_DEMO_HOST?.trim().toLowerCase() || "demo.writex.co.in";
}

export function isExpectedMyWritexDemoHost(
  host: string | null | undefined,
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (!host) return false;
  return host.split(":", 1)[0]?.trim().toLowerCase() === getMyWritexDemoHost(environment);
}
