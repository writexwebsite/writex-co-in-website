import "server-only";

type GuardResult = {
  ok: boolean;
  warnings: string[];
  blockers: string[];
};

function has(name: string) {
  return Boolean(process.env[name]);
}

export function getProductionReadiness() {
  const isProd = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (isProd && !has("AUTH_COOKIE_SECRET")) blockers.push("Auth cookie secret is required.");
  if (isProd && !has("CLIENT_ACCESS_CODE_PEPPER")) {
    blockers.push("Client access code pepper is required.");
  }
  if (isProd && !has("DATABASE_URL")) blockers.push("Database URL is required.");
  if (isProd && process.env.NEXT_PUBLIC_SITE_URL !== "https://www.writex.co.in") {
    blockers.push("Production site URL must be https://www.writex.co.in.");
  }
  if (process.env.INTEGRATION_MODE === "mock" && isProd) {
    blockers.push("Mock integration mode must not be used in production.");
  }
  if (isProd && process.env.DEMO_LOGIN_ENABLED === "true") {
    blockers.push("Server-side demo login must be disabled in production.");
  }
  if (isProd && process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true") {
    blockers.push("Public demo login must be disabled in production.");
  }
  if (isProd && process.env.PAYMENT_LOCAL_STORAGE_ENABLED === "true") {
    blockers.push("Local payment storage must be disabled in production.");
  }
  if (isProd && process.env.ALLOW_INSECURE_DEMO_COOKIE === "true") {
    blockers.push("Insecure demo cookies must be disabled in production.");
  }
  if (has("AWS_S3_BUCKET") && !has("AWS_REGION")) {
    warnings.push("AWS region should be configured with the S3 bucket.");
  }
  if (has("RESEND_API_KEY") && !has("QUOTE_NOTIFICATION_EMAIL")) {
    warnings.push("Quote notification email is missing.");
  }
  if (isProd && !has("JOB_SECRET")) blockers.push("Job route secret is required.");

  return {
    ok: blockers.length === 0,
    warnings,
    blockers
  } satisfies GuardResult;
}
