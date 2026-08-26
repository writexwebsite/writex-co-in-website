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
  if (
    isProd &&
    !(
      has("AWS_REGION") &&
      has("AWS_ACCESS_KEY_ID") &&
      has("AWS_SECRET_ACCESS_KEY") &&
      has("AWS_S3_BUCKET") &&
      has("AWS_S3_PRIVATE_PREFIX")
    )
  ) {
    blockers.push("Private AWS S3 storage is required.");
  }
  if (has("RESEND_API_KEY") && !has("QUOTE_NOTIFICATION_EMAIL")) {
    warnings.push("Quote notification email is missing.");
  }
  const smtpConfigured = has("SMTP_HOST") && has("SMTP_FROM_EMAIL");
  if (isProd && !smtpConfigured && !has("RESEND_API_KEY")) {
    blockers.push("Transactional email delivery is required.");
  }
  if (isProd && !has("QUOTE_NOTIFICATION_EMAIL")) {
    blockers.push("Quote notification recipient is required.");
  }
  if (isProd && !has("CONTACT_NOTIFICATION_EMAIL")) {
    blockers.push("Contact notification recipient is required.");
  }
  if (isProd && (process.env.INTEGRATION_MODE !== "live" || !has("LTS_API_BASE_URL") || !has("LTS_API_KEY"))) {
    blockers.push("Live LTS integration is required for client authentication.");
  }
  if (isProd && !(has("EMPLOYEE_AUTH_API_BASE_URL") || has("EMPLOYEE_DIRECTORY_API_BASE_URL"))) {
    blockers.push("Employee authentication directory is required.");
  }
  if (isProd && !has("JOB_SECRET")) blockers.push("Job route secret is required.");

  return {
    ok: blockers.length === 0,
    warnings,
    blockers
  } satisfies GuardResult;
}
