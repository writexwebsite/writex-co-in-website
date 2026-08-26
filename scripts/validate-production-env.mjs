const required = [
  "DATABASE_URL",
  "AUTH_COOKIE_SECRET",
  "CLIENT_ACCESS_CODE_PEPPER",
  "JOB_SECRET"
];

const errors = [];

for (const name of required) {
  if (!process.env[name]) errors.push(`${name} is required.`);
}

if (process.env.APP_ENV !== "production") {
  errors.push("APP_ENV must be production.");
}

if (process.env.NEXT_PUBLIC_SITE_URL !== "https://www.writex.co.in") {
  errors.push("NEXT_PUBLIC_SITE_URL must be https://www.writex.co.in.");
}

for (const name of ["AUTH_COOKIE_SECRET", "CLIENT_ACCESS_CODE_PEPPER", "JOB_SECRET"]) {
  const value = process.env[name] || "";
  if (value.length < 32 || value.startsWith("REPLACE_WITH_")) {
    errors.push(`${name} must contain at least 32 non-placeholder characters.`);
  }
}

for (const name of ["DEMO_LOGIN_ENABLED", "NEXT_PUBLIC_DEMO_LOGIN_ENABLED"]) {
  if (process.env[name] === "true") errors.push(`${name} must be false in production.`);
}

if (
  process.env.CLIENT_PORTAL_TEST_ACCESS_ENABLED &&
  !["true", "false"].includes(process.env.CLIENT_PORTAL_TEST_ACCESS_ENABLED)
) {
  errors.push(
    "CLIENT_PORTAL_TEST_ACCESS_ENABLED must be exactly true or false."
  );
}

if (process.env.INTEGRATION_MODE === "mock") {
  errors.push("INTEGRATION_MODE cannot be mock in production.");
}

if (process.env.PAYMENT_LOCAL_STORAGE_ENABLED === "true") {
  errors.push("PAYMENT_LOCAL_STORAGE_ENABLED must be false in production.");
}

if (process.env.ALLOW_INSECURE_DEMO_COOKIE === "true") {
  errors.push("ALLOW_INSECURE_DEMO_COOKIE must be false in production.");
}

for (const name of [
  "ACADEMY_INTERNAL_BASE_URL",
  "ACADEMY_INTERNAL_SERVICE_ID",
  "ACADEMY_INTERNAL_KEY_ID",
  "ACADEMY_INTERNAL_SERVICE_SECRET"
]) {
  if (!process.env[name]) errors.push(`${name} is required for Website employee control.`);
}
if (process.env.ACADEMY_INTERNAL_BASE_URL) {
  try {
    const academyUrl = new URL(process.env.ACADEMY_INTERNAL_BASE_URL);
    if (!['127.0.0.1', 'localhost'].includes(academyUrl.hostname) || academyUrl.protocol !== 'http:') {
      errors.push("ACADEMY_INTERNAL_BASE_URL must use the local private service boundary.");
    }
  } catch {
    errors.push("ACADEMY_INTERNAL_BASE_URL must be a valid URL.");
  }
}
if ((process.env.ACADEMY_INTERNAL_SERVICE_SECRET || "").length < 32) {
  errors.push("ACADEMY_INTERNAL_SERVICE_SECRET must contain at least 32 characters.");
}

const smartHiringEnabled = process.env.SMART_HIRING_ENABLED === "true";
if (smartHiringEnabled) {
  for (const flag of [
    "HIRING_APPLICATIONS_ENABLED",
    "HIRING_ASSESSMENTS_ENABLED",
    "HIRING_ANTI_CHEAT_ENABLED",
    "HIRING_ADMIN_ENABLED",
    "HIRING_CONNECTED_CANDIDATES_ENABLED"
  ]) {
    if (process.env[flag] !== "true") errors.push(`${flag} must be true when Smart Hiring is active.`);
  }
  for (const secret of ["HIRING_RISK_HMAC_SECRET", "HIRING_REVIEW_ENCRYPTION_KEY"]) {
    const value = process.env[secret] || "";
    if (value.length < 32 || value.startsWith("REPLACE_WITH_")) {
      errors.push(`${secret} must contain at least 32 non-placeholder characters.`);
    }
  }
  if (!process.env.HIRING_NOTIFICATION_EMAIL) {
    errors.push("HIRING_NOTIFICATION_EMAIL is required when Smart Hiring is active.");
  }
  if (process.env.HIRING_HRMS_PROVIDER !== "unavailable") {
    errors.push("HIRING_HRMS_PROVIDER must remain unavailable until an approved provider is configured.");
  }
  if (process.env.HIRING_TRUST_PUBLISHING_ENABLED !== "false") {
    errors.push("HIRING_TRUST_PUBLISHING_ENABLED must remain false until HRMS publishing is approved.");
  }
  const providerModes = {
    HIRING_AADHAAR_PROVIDER: ["unavailable"],
    HIRING_BACKGROUND_PROVIDER: ["manual", "unavailable"],
    HIRING_MALWARE_PROVIDER: ["unavailable"]
  };
  for (const [name, allowed] of Object.entries(providerModes)) {
    if (!allowed.includes(process.env[name] || "")) {
      errors.push(`${name} must be one of: ${allowed.join(", ")}.`);
    }
  }
}

const representativeDirectorySource =
  process.env.REPRESENTATIVE_DIRECTORY_SOURCE ||
  (process.env.REPRESENTATIVE_DIRECTORY_MODE === "database" ? "excel" :
    process.env.REPRESENTATIVE_DIRECTORY_MODE) ||
  "unavailable";
if (!["lts", "excel", "unavailable"].includes(representativeDirectorySource)) {
  errors.push("REPRESENTATIVE_DIRECTORY_SOURCE must be lts, excel, or unavailable.");
}
if (
  representativeDirectorySource !== "unavailable" &&
  !process.env.REPRESENTATIVE_DIRECTORY_HMAC_SECRET
) {
  errors.push("REPRESENTATIVE_DIRECTORY_HMAC_SECRET is required for representative verification.");
}
if (
  representativeDirectorySource === "lts" &&
  (!process.env.LTS_API_BASE_URL ||
    !process.env.LTS_REPRESENTATIVES_URL ||
    !process.env.LTS_REPRESENTATIVES_API_KEY ||
    !process.env.LTS_HEALTH_URL ||
    !process.env.LTS_HEALTH_API_KEY ||
    !process.env.LTS_API_HEADER_NAME)
) {
  errors.push(
    "LTS_API_BASE_URL, LTS_REPRESENTATIVES_URL, LTS_REPRESENTATIVES_API_KEY, LTS_HEALTH_URL, LTS_HEALTH_API_KEY, and LTS_API_HEADER_NAME are required in lts mode."
  );
}

for (const name of [
  "TRUST_REPRESENTATIVE_PROVIDER",
  "TRUST_INVOICE_PROVIDER",
  "TRUST_PAYMENT_PROVIDER",
  "TRUST_ENQUIRY_PROVIDER"
]) {
  const value = process.env[name];
  const allowed =
    name === "TRUST_REPRESENTATIVE_PROVIDER"
      ? ["lts", "live", "unavailable"]
      : ["live", "unavailable"];
  if (value && !allowed.includes(value)) {
    errors.push(`${name} must be one of: ${allowed.join(", ")}.`);
  }
}

if (process.env.TRUST_REPORTING_ENABLED === "true") {
  const reportingRequirements = [
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
    "AWS_S3_PRIVATE_PREFIX",
    "SMTP_HOST",
    "SMTP_FROM_EMAIL",
    "TRUST_REPORT_NOTIFICATION_EMAILS"
  ];
  for (const name of reportingRequirements) {
    if (!process.env[name]) {
      errors.push(`${name} is required when TRUST_REPORTING_ENABLED=true.`);
    }
  }
}
if (
  representativeDirectorySource === "lts" &&
  process.env.LTS_API_HEADER_NAME !== "x-writex-api-key"
) {
  errors.push("LTS_API_HEADER_NAME must be x-writex-api-key in lts mode.");
}
for (const name of ["LTS_API_BASE_URL", "LTS_REPRESENTATIVES_URL", "LTS_HEALTH_URL"]) {
  const value = process.env[name];
  if (!value || representativeDirectorySource !== "lts") continue;
  try {
    if (new URL(value).protocol !== "https:") {
      errors.push(`${name} must use HTTPS in lts mode.`);
    }
  } catch {
    errors.push(`${name} must be a valid URL in lts mode.`);
  }
}

const representativeDisplayNameConfig =
  process.env.WRITEX_REPRESENTATIVE_DISPLAY_NAMES?.trim();
if (representativeDisplayNameConfig) {
  const seenSourceIds = new Set();
  for (const entry of representativeDisplayNameConfig.split(/[;,\n]/u)) {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) continue;
    const separatorIndex = trimmedEntry.indexOf(":");
    const sourceId = trimmedEntry.slice(0, separatorIndex).trim();
    const displayName = trimmedEntry.slice(separatorIndex + 1).trim();
    if (
      separatorIndex < 1 ||
      !/^[A-Za-z0-9._-]{1,120}$/u.test(sourceId) ||
      !displayName ||
      Array.from(displayName).length > 120 ||
      /[<>\u0000-\u001f\u007f]/u.test(displayName) ||
      seenSourceIds.has(sourceId)
    ) {
      errors.push(
        "WRITEX_REPRESENTATIVE_DISPLAY_NAMES is invalid or contains duplicate source IDs."
      );
      break;
    }
    seenSourceIds.add(sourceId);
  }
}

if (process.env.DATABASE_URL) {
  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const databaseName = databaseUrl.pathname.replace(/^\//, "");
    if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
      errors.push("DATABASE_URL must use PostgreSQL.");
    }
    if (databaseUrl.username !== "writex_co_in_app") {
      errors.push("DATABASE_URL must use the writex_co_in_app role.");
    }
    if (databaseUrl.password.length < 24 || databaseUrl.password.startsWith("REPLACE_WITH_")) {
      errors.push("DATABASE_URL must contain a strong non-placeholder password.");
    }
    if (databaseName !== "writex_co_in") {
      errors.push("DATABASE_URL must target the writex_co_in database.");
    }
    if (!["127.0.0.1", "localhost"].includes(databaseUrl.hostname)) {
      errors.push("DATABASE_URL must target PostgreSQL on the local Lightsail instance.");
    }
    if (process.env.DATABASE_URL.includes("thewritex")) {
      errors.push("DATABASE_URL must not reference the existing TheWriteX database.");
    }
  } catch {
    errors.push("DATABASE_URL is not a valid URL.");
  }
}

const awsNames = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET",
  "AWS_S3_PRIVATE_PREFIX"
];
const configuredAws = awsNames.filter((name) => Boolean(process.env[name]));
if (configuredAws.length > 0 && configuredAws.length !== awsNames.length) {
  errors.push("AWS S3 variables must be configured as a complete group.");
}

const smtpCoreNames = ["SMTP_HOST", "SMTP_FROM_EMAIL"];
const configuredSmtpCore = smtpCoreNames.filter((name) => Boolean(process.env[name]));
if (configuredSmtpCore.length > 0 && configuredSmtpCore.length !== smtpCoreNames.length) {
  errors.push("SMTP_HOST and SMTP_FROM_EMAIL must be configured together.");
}
const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
if (Boolean(process.env.SMTP_USER) !== Boolean(smtpPassword)) {
  errors.push("SMTP_USER and SMTP_PASSWORD must either both be configured or both be empty.");
}

if (errors.length > 0) {
  console.error("Production environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production environment validation passed.");
