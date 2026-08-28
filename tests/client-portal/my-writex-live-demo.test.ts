import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMyWritexDemoRequestDatabase } from "../../lib/my-writex/demo-request-seed";
import {
  isMyWritexDemoModeEnabled,
  MY_WRITEX_DEMO_CUSTOMER_ID,
  MY_WRITEX_DEMO_PHONE,
  MY_WRITEX_DEMO_WRITEX_ID,
} from "../../lib/my-writex/demo-mode";
import { getMyWritexFeatureFlags } from "../../lib/my-writex/integration/feature-flags";
import { ProductionLTSAdapter } from "../../lib/my-writex/integration/production-lts-adapter";

const demoEnvironment = {
  NODE_ENV: "production",
  APP_ENV: "demo",
  MY_WRITEX_DEMO_MODE: "true",
  MY_WRITEX_ENABLED: "true",
  MY_WRITEX_DEMO_ACCOUNT_ENABLED: "true",
  MY_WRITEX_LTS_INTEGRATION_ENABLED: "false",
  MY_WRITEX_CUSTOMER_MASTER_ENABLED: "false",
  MY_WRITEX_REAL_REQUESTS_ENABLED: "false",
  MY_WRITEX_PRODUCTION_AUTH_ENABLED: "false",
  MY_WRITEX_LOCAL_MOCK_ENABLED: "false",
  MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED: "false",
  CLIENT_AUTH_PROVIDER: "disabled",
  MY_WRITEX_DEMO_HOST: "demo.writex.co.in",
  DATABASE_URL: "",
  LTS_API_BASE_URL: "",
  LTS_API_KEY: "",
  PMT_API_BASE_URL: "",
  PMT_API_KEY: "",
} as const;

test("production demo mode requires every isolation guard", () => {
  assert.equal(isMyWritexDemoModeEnabled(demoEnvironment), true);
  assert.equal(
    isMyWritexDemoModeEnabled({ ...demoEnvironment, MY_WRITEX_LTS_INTEGRATION_ENABLED: "true" }),
    false,
  );
  assert.equal(
    isMyWritexDemoModeEnabled({ ...demoEnvironment, DATABASE_URL: "postgres://production.example.invalid/writex" }),
    false,
  );
  const flags = getMyWritexFeatureFlags(demoEnvironment);
  assert.equal(flags.MY_WRITEX_ENABLED, true);
  assert.equal(flags.MY_WRITEX_LTS_INTEGRATION_ENABLED, false);
  assert.equal(flags.MY_WRITEX_CUSTOMER_MASTER_ENABLED, false);
  assert.equal(flags.MY_WRITEX_REAL_REQUESTS_ENABLED, false);
  assert.equal(flags.MY_WRITEX_PRODUCTION_AUTH_ENABLED, false);
  assert.equal(flags.MY_WRITEX_LOCAL_MOCK_ENABLED, false);
  assert.equal(flags.MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED, false);
  assert.throws(() => new ProductionLTSAdapter(), /not implemented or authorized/);
});

test("the synthetic Shubham fixture and request lifecycle are complete", async () => {
  const fixture = await readFile("lib/my-writex/dev-fixture.ts", "utf8");
  assert.match(fixture, /name: "Shubham"/);
  assert.match(fixture, /relationshipSince: 2024/);
  assert.match(fixture, /country: "United Kingdom"/);
  assert.match(fixture, /programme: "Postgraduate Business Programme"/);
  assert.match(fixture, /summary: \{[\s\S]*activeProjects: 3,[\s\S]*completedProjects: 44,[\s\S]*upcomingDeliveries: 2/);
  assert.equal(MY_WRITEX_DEMO_WRITEX_ID, "shubham.demo");
  assert.equal(MY_WRITEX_DEMO_PHONE, "+919000000001");

  const database = createMyWritexDemoRequestDatabase();
  assert.equal(database.requests.length, 3);
  assert.equal(database.requests.some((request) => request.status === "More Information Needed"), true);
  assert.equal(database.requests.some((request) => request.status === "Reviewing"), true);
  assert.equal(database.requests.some((request) => request.status === "Closed"), true);
  assert.equal(database.requests.every((request) => request.fixtureScope === `customer:${MY_WRITEX_DEMO_CUSTOMER_ID}`), true);
});

test("demo authentication is isolated, generic and cookie scoped", async () => {
  const login = await readFile("app/api/client/auth/login/route.ts", "utf8");
  const auth = await readFile("lib/auth/index.ts", "utf8");
  const review = await readFile("lib/my-writex/demo-review-auth.ts", "utf8");
  assert.match(login, /Demo mode never falls through to LTS/);
  assert.match(login, /isMyWritexDemoFixtureEnabled\(\)[\s\S]*\? null[\s\S]*resolveDevelopmentInvoice/);
  assert.match(login, /isExpectedMyWritexDemoHost/);
  assert.match(login, /We couldn't verify those details/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /secure: process\.env\.NODE_ENV === "production"/);
  assert.match(auth, /sameSite: "lax"/);
  assert.match(review, /__Host-my_writex_demo_review/);
  assert.match(review, /httpOnly: true/);
  assert.match(review, /secure: true/);
  assert.match(review, /sameSite: "strict"/);
});

test("demo mutations are origin checked, rate limited, idempotent and capped", async () => {
  const customerRequests = await readFile("app/api/my-writex/requests/route.ts", "utf8");
  const responseRoute = await readFile("app/api/my-writex/requests/[requestRef]/respond/route.ts", "utf8");
  const repository = await readFile("lib/my-writex/request-repository.ts", "utf8");
  for (const source of [customerRequests, responseRoute]) {
    assert.match(source, /assertSameOrigin\(request\)/);
    assert.match(source, /assertRateLimit/);
  }
  assert.match(repository, /DEMO_MAX_REQUESTS = 100/);
  assert.match(repository, /DEMO_MAX_STORE_BYTES = 1024 \* 1024/);
  assert.match(repository, /candidate\.idempotencyKey === input\.idempotencyKey/);
  assert.match(repository, /resetMyWritexDemoRequestStore/);
});

test("the responsive customer drawer keeps logout above the bottom navigation", async () => {
  const navigation = await readFile("components/my-writex/MyWritexNavigation.tsx", "utf8");
  assert.match(navigation, /max-w-\[420px\][^"]*overflow-hidden/);
  assert.match(navigation, /min-h-0 flex-1 overflow-y-auto pb-5/);
  assert.match(navigation, /mt-5 shrink-0 border-y[^"]*">\s*<ClientLogoutButton/);
});

test("search, unsafe APIs and public diagnostics are blocked", async () => {
  const proxy = await readFile("proxy.ts", "utf8");
  const robots = await readFile("app/robots.ts", "utf8");
  const sitemap = await readFile("app/sitemap.ts", "utf8");
  const config = await readFile("next.config.mjs", "utf8");
  const nginx = await readFile("deploy/my-writex-demo/nginx-https.conf", "utf8");
  assert.match(proxy, /X-Robots-Tag/);
  assert.match(proxy, /noindex, nofollow, noarchive/);
  assert.match(robots, /disallow: "\/"/);
  assert.match(sitemap, /isMyWritexDemoModeEnabled\(\)\) return \[\]/);
  assert.match(config, /productionBrowserSourceMaps: false/);
  assert.match(config, /unoptimized: process\.env\.MY_WRITEX_DEMO_MODE === "true"/);
  assert.match(nginx, /api\/\(admin\|employee\|contact\|demo/);
  assert.match(nginx, /location ~ \^\/client\(\/\|\$\)/);
  assert.match(nginx, /api\/client\/\(dashboard\|download\|files/);
});

test("deployment assets are isolated and reject broad production operations", async () => {
  const deploy = await readFile("scripts/deploy-my-writex-demo.sh", "utf8");
  const workflow = await readFile(".github/workflows/deploy-my-writex-demo.yml", "utf8");
  const nginx = await readFile("deploy/my-writex-demo/nginx-https.conf", "utf8");
  const reset = await readFile("scripts/reset-my-writex-demo.ts", "utf8");
  for (const text of [deploy, workflow, nginx]) {
    assert.doesNotMatch(text, /pm2\s+(stop|restart|delete)\s+all/i);
  }
  assert.match(deploy, /\/var\/www\/my-writex-demo/);
  assert.match(deploy, /prune_demo_route "app\/admin"/);
  assert.match(deploy, /prune_demo_route "app\/api\/admin"/);
  assert.match(deploy, /prune_demo_route "app\/employee"/);
  assert.match(deploy, /prune_demo_route "app\/employee-login"/);
  assert.match(deploy, /prune_demo_route "app\/api\/client\/dashboard"/);
  assert.match(deploy, /prune_demo_route "app\/api\/quote"/);
  assert.match(deploy, /app-layout\.tsx/);
  assert.match(deploy, /tsconfig\.demo\.json/);
  assert.match(deploy, /my-writex-live-demo\.test\.ts/);
  assert.match(deploy, /my-writex-stage3a\.test\.ts/);
  assert.ok(
    deploy.indexOf("pnpm exec tsx --test") < deploy.indexOf('prune_demo_route "app/admin"'),
    "source-contract tests must run before non-demo routes are pruned",
  );
  assert.doesNotMatch(deploy, /pnpm run test:client-portal/);
  assert.match(deploy, /pm2 restart my-writex-demo/);
  assert.match(deploy, /getent ahostsv4[\s\S]*\|\| true/);
  assert.match(deploy, /PRODUCTION_ISOLATION=verified/);
  assert.match(nginx, /server_name demo\.writex\.co\.in/);
  assert.match(nginx, /X-Robots-Tag "noindex, nofollow, noarchive"/);
  assert.match(workflow, /my-writex-demo-v\*/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /bash -n scripts\/deploy-my-writex-demo\.sh scripts\/rollback-my-writex-demo\.sh/);
  assert.doesNotMatch(reset, /server-only|request-repository|dev-fixture/);
});
