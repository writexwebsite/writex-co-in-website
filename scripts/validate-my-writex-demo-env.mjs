const errors = [];

const mustEqual = (name, expected) => {
  if ((process.env[name] || "") !== expected) errors.push(`${name} must be ${expected}.`);
};

mustEqual("NODE_ENV", "production");
mustEqual("APP_ENV", "demo");
mustEqual("MY_WRITEX_DEMO_MODE", "true");
mustEqual("MY_WRITEX_ENABLED", "true");
mustEqual("MY_WRITEX_DEMO_ACCOUNT_ENABLED", "true");
mustEqual("MY_WRITEX_LTS_INTEGRATION_ENABLED", "false");
mustEqual("MY_WRITEX_CUSTOMER_MASTER_ENABLED", "false");
mustEqual("MY_WRITEX_REAL_REQUESTS_ENABLED", "false");
mustEqual("MY_WRITEX_PRODUCTION_AUTH_ENABLED", "false");
mustEqual("MY_WRITEX_LOCAL_MOCK_ENABLED", "false");
mustEqual("MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED", "false");
mustEqual("CLIENT_AUTH_PROVIDER", "disabled");
mustEqual("CLIENT_SESSION_COOKIE_NAME", "__Host-my_writex_demo_session");
mustEqual("NEXT_PUBLIC_SITE_URL", "https://demo.writex.co.in");
mustEqual("MY_WRITEX_DEMO_HOST", "demo.writex.co.in");
mustEqual("HEALTHCHECK_REQUIRE_DATABASE", "false");

for (const name of [
  "DATABASE_URL",
  "LTS_API_BASE_URL",
  "LTS_API_KEY",
  "PMT_API_BASE_URL",
  "PMT_API_KEY",
]) {
  if ((process.env[name] || "").trim()) errors.push(`${name} must be empty.`);
}

if ((process.env.AUTH_COOKIE_SECRET || "").length < 48) {
  errors.push("AUTH_COOKIE_SECRET must contain at least 48 characters.");
}
if ((process.env.MY_WRITEX_DEMO_REVIEW_SESSION_TOKEN || "").length < 32) {
  errors.push("MY_WRITEX_DEMO_REVIEW_SESSION_TOKEN must contain at least 32 characters.");
}
if (!/^[a-f0-9]{64}$/.test(process.env.MY_WRITEX_DEMO_REVIEW_CODE_HASH || "")) {
  errors.push("MY_WRITEX_DEMO_REVIEW_CODE_HASH must be a SHA-256 hex digest.");
}
if (!/^\d+$/.test(process.env.MY_WRITEX_DEMO_PORT || "")) {
  errors.push("MY_WRITEX_DEMO_PORT must be numeric.");
}
if (!process.env.MY_WRITEX_REQUEST_STORE_PATH?.startsWith("/var/www/my-writex-demo/shared/data/")) {
  errors.push("MY_WRITEX_REQUEST_STORE_PATH must remain in the isolated demo data directory.");
}

if (errors.length) {
  console.error("My WriteX demo environment is unsafe:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("My WriteX demo environment validated without printing secrets.");
