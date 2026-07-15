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

if (process.env.INTEGRATION_MODE === "mock") {
  errors.push("INTEGRATION_MODE cannot be mock in production.");
}

if (process.env.PAYMENT_LOCAL_STORAGE_ENABLED === "true") {
  errors.push("PAYMENT_LOCAL_STORAGE_ENABLED must be false in production.");
}

if (process.env.ALLOW_INSECURE_DEMO_COOKIE === "true") {
  errors.push("ALLOW_INSECURE_DEMO_COOKIE must be false in production.");
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

const awsNames = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"];
const configuredAws = awsNames.filter((name) => Boolean(process.env[name]));
if (configuredAws.length > 0 && configuredAws.length !== awsNames.length) {
  errors.push("AWS S3 variables must be configured as a complete group.");
}

if (errors.length > 0) {
  console.error("Production environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Production environment validation passed.");
