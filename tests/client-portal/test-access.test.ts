import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import {
  generateClientTestId,
  generateClientTestPassword,
  isStrongClientTestPassword
} from "../../lib/client/test-access-credentials";
import { getClientTestFixture } from "../../lib/client/test-fixtures";
import {
  getClientTestAccessStatus,
  getUserAgentCategory,
  isSafeClientTestInvoiceReference,
  normalizeClientTestId
} from "../../lib/client/test-access-types";

test("temporary credentials are cryptographically generated in approved formats", async () => {
  const ids = new Set<string>();
  for (let index = 0; index < 100; index += 1) {
    const testId = generateClientTestId();
    assert.match(testId, /^WX-TEST-[A-Z2-9]{10}$/);
    ids.add(testId);
  }
  assert.equal(ids.size, 100);

  const password = generateClientTestPassword();
  assert.equal(password.length >= 16, true);
  assert.equal(isStrongClientTestPassword(password), true);
  const hash = await bcrypt.hash(password, 12);
  assert.notEqual(hash, password);
  assert.equal(await bcrypt.compare(password, hash), true);
});

test("test IDs and invoice references are normalized and constrained", () => {
  assert.equal(normalizeClientTestId(" wx-test-abcd234567 "), "WX-TEST-ABCD234567");
  assert.equal(isSafeClientTestInvoiceReference("WX-TEST-PORTAL-1001"), true);
  assert.equal(isSafeClientTestInvoiceReference("WX-REAL-1001"), false);
  assert.equal(isSafeClientTestInvoiceReference("customer-invoice"), false);
});

test("temporary access status handles active, single-use, expiry, and revocation", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(
    getClientTestAccessStatus({
      expiresAt: future,
      singleUse: true,
      usedAt: null,
      revokedAt: null
    }),
    "active"
  );
  assert.equal(
    getClientTestAccessStatus({
      expiresAt: future,
      singleUse: true,
      usedAt: new Date().toISOString(),
      revokedAt: null
    }),
    "used"
  );
  assert.equal(
    getClientTestAccessStatus({
      expiresAt: future,
      singleUse: false,
      usedAt: new Date().toISOString(),
      revokedAt: null
    }),
    "active"
  );
  assert.equal(
    getClientTestAccessStatus({
      expiresAt: past,
      singleUse: false,
      usedAt: null,
      revokedAt: null
    }),
    "expired"
  );
  assert.equal(
    getClientTestAccessStatus({
      expiresAt: future,
      singleUse: false,
      usedAt: null,
      revokedAt: new Date().toISOString()
    }),
    "revoked"
  );
});

test("user-agent audit stores a category rather than the raw value", () => {
  assert.equal(getUserAgentCategory("Mozilla/5.0 (iPhone; Mobile)"), "mobile");
  assert.equal(getUserAgentCategory("Mozilla/5.0 (iPad; Tablet)"), "tablet");
  assert.equal(getUserAgentCategory("Mozilla/5.0 (Windows NT 10.0)"), "desktop");
  assert.equal(getUserAgentCategory("HeadlessBrowser Bot"), "automated");
});

test("all approved fixture profiles use sanitized test-only data", () => {
  for (const profile of [
    "partially_paid",
    "fully_paid",
    "project_in_progress",
    "delivered"
  ] as const) {
    const fixture = getClientTestFixture(profile, "WX-TEST-PORTAL-1001");
    assert.equal(fixture.displayName, "Test Client");
    assert.equal(fixture.billing.invoiceReference, "WX-TEST-PORTAL-1001");
    assert.equal(fixture.files.length, 0);
    assert.match(fixture.filesUnavailableMessage, /disabled in this test session/i);
  }
  assert.equal(
    getClientTestFixture("partially_paid", "WX-TEST-PARTIAL").billing
      .paymentStatus,
    "Partially Paid"
  );
  assert.equal(
    getClientTestFixture("fully_paid", "WX-TEST-PAID").billing.paymentStatus,
    "Fully Paid"
  );
  assert.equal(
    getClientTestFixture("project_in_progress", "WX-TEST-PROJECT").project
      ?.publicStage,
    "Work in Progress"
  );
  assert.equal(
    getClientTestFixture("delivered", "WX-TEST-DELIVERED").project?.publicStage,
    "Delivered"
  );
});

test("public client login does not expose temporary test access", () => {
  const clientLoginPage = readFileSync(
    path.join(process.cwd(), "app/client-login/page.tsx"),
    "utf8"
  );
  const clientLoginForm = readFileSync(
    path.join(process.cwd(), "components/client/ClientLoginForm.tsx"),
    "utf8"
  );
  assert.equal(
    existsSync(path.join(process.cwd(), "components/client/TemporaryClientTestLogin.tsx")),
    false
  );
  assert.equal(
    existsSync(path.join(process.cwd(), "app/api/client/auth/test-login/route.ts")),
    false
  );
  assert.doesNotMatch(clientLoginPage, /CLIENT_PORTAL_TEST_ACCESS_ENABLED|testAccessEnabled|TemporaryClientTestLogin/);
  assert.doesNotMatch(clientLoginForm, /Use Temporary Test Access|Temporary Password|Open Test Portal|test-login|TemporaryClientTestLogin/);
});

test("feature routes are server-gated and Super Admin protected", () => {
  const adminRoute = readFileSync(
    path.join(
      process.cwd(),
      "app/api/admin/client-portal/test-access/route.ts"
    ),
    "utf8"
  );
  const launchRoute = readFileSync(
    path.join(
      process.cwd(),
      "app/api/admin/client-portal/test-access/[id]/launch/route.ts"
    ),
    "utf8"
  );
  const auditRoute = readFileSync(
    path.join(
      process.cwd(),
      "app/api/admin/client-portal/test-access/[id]/audit/route.ts"
    ),
    "utf8"
  );
  assert.match(adminRoute, /assertClientPortalTestAccessEnabled\(\)/);
  assert.match(adminRoute, /assertCanManageClientPortal\(admin\)/);
  assert.doesNotMatch(adminRoute, /temporaryPassword|credentials/);
  assert.match(launchRoute, /assertClientPortalTestAccessEnabled\(\)/);
  assert.match(launchRoute, /assertSameOrigin\(request\)/);
  assert.match(launchRoute, /assertCanManageClientPortal\(admin\)/);
  assert.match(launchRoute, /setClientSessionCookie/);
  assert.match(launchRoute, /assertRateLimit/);
  assert.doesNotMatch(launchRoute, /LTS_API_KEY|PMT_API_KEY|mock.*success/i);
  assert.match(auditRoute, /assertClientPortalTestAccessEnabled\(\)/);
  assert.match(auditRoute, /assertCanManageClientPortal\(admin\)/);
  assert.match(auditRoute, /assertRateLimit/);
  assert.doesNotMatch(auditRoute, /test_id_hash|ip_hash|metadata/);
});

test("feature-flag disable persists revocation without exposing credentials", () => {
  const state = readFileSync(
    path.join(process.cwd(), "lib/client/test-access-state.ts"),
    "utf8"
  );
  const auth = readFileSync(
    path.join(process.cwd(), "lib/auth/index.ts"),
    "utf8"
  );
  assert.match(state, /PUBLIC_TEST_ENTRY_REMOVED/);
  assert.match(state, /update client_portal_test_access/);
  assert.match(state, /update client_sessions/);
  assert.match(state, /security_revoked/);
  assert.match(auth, /await enforceDisabledClientPortalTestAccess\(\)/);
  assert.doesNotMatch(state, /password_hash|session_token_hash|api.?key/i);
});

test("migration stores only a password hash and links test sessions", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "database/migrations/20260723_client_portal_temporary_test_access.sql"
    ),
    "utf8"
  );
  assert.match(migration, /password_hash text not null/);
  assert.doesNotMatch(migration, /plaintext_password|temporary_password text/);
  assert.match(migration, /test_session boolean not null default false/);
  assert.match(migration, /test_access_id uuid/);
  assert.match(migration, /unique index if not exists client_portal_test_access_test_id_idx/);
});

test("public-exposure remediation migration revokes active test access and sessions", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "database/migrations/20260724_remove_public_client_test_access.sql"
    ),
    "utf8"
  );
  assert.match(migration, /security_remediation_public_client_login_test_access_removed/);
  assert.match(migration, /event_type in \(/);
  assert.match(migration, /'launched'/);
  assert.match(migration, /'security_revoked'/);
  assert.match(migration, /update client_portal_test_access/);
  assert.match(migration, /where revoked_at is null\s+and expires_at > now\(\)/);
  assert.match(migration, /update client_sessions/);
  assert.match(migration, /where test_session = true\s+and revoked_at is null/);

  const finalMigration = readFileSync(
    path.join(
      process.cwd(),
      "database/migrations/20260724_finalize_admin_only_client_test_access.sql"
    ),
    "utf8"
  );
  assert.match(finalMigration, /PUBLIC_TEST_ENTRY_REMOVED/);
  assert.match(finalMigration, /update client_portal_test_access/);
  assert.match(finalMigration, /update client_sessions/);
});

test("test-session safeguards cover downloads, mutations, notifications, and legacy APIs", () => {
  const auth = readFileSync(
    path.join(process.cwd(), "lib/auth/index.ts"),
    "utf8"
  );
  assert.match(auth, /if \(session\.testSession\)/);
  assert.match(auth, /This action is disabled in a test session/);

  for (const route of [
    "app/api/client/files/[fileReference]/download/route.ts",
    "app/api/client/payment-proof/route.ts",
    "app/api/client/revision-request/route.ts",
    "app/api/client/download/[invoiceId]/route.ts",
    "app/api/client/preview/[invoiceId]/route.ts"
  ]) {
    const source = readFileSync(path.join(process.cwd(), route), "utf8");
    assert.match(source, /assertFullClientAccess/);
  }

  for (const route of [
    "app/api/contact/route.ts",
    "app/api/quote/route.ts",
    "app/api/upload-brief/route.ts",
    "app/api/trust/report-suspicious-activity/route.ts"
  ]) {
    const routePath = path.join(process.cwd(), route);
    if (!existsSync(routePath)) continue;
    const source = readFileSync(routePath, "utf8");
    assert.match(source, /assertNotTestClientRequest/);
  }
});

test("test-session UX is persistent and Admin operations expose safe status and audit controls", () => {
  const portalChrome = readFileSync(
    path.join(process.cwd(), "components/client/ClientPortalChrome.tsx"),
    "utf8"
  );
  const adminControl = readFileSync(
    path.join(process.cwd(), "components/admin/ClientPortalTestAccess.tsx"),
    "utf8"
  );
  assert.match(portalChrome, /Test Session/);
  assert.match(portalChrome, /sanitized demonstration data/i);
  assert.match(portalChrome, /payments, downloads, customer actions/);
  assert.match(adminControl, /Temporary Portal Testing/);
  assert.match(adminControl, /Active Test Access/);
  assert.match(adminControl, /Active Test Sessions/);
  assert.match(adminControl, /Launch Test Portal/);
  assert.match(adminControl, /View Audit/);
  assert.doesNotMatch(adminControl, /temporaryPassword|passwordHash|sessionToken/);
});
