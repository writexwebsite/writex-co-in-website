import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSuspiciousReportSubmissionKey,
  maskTrustIdentifier,
  suspiciousReportSchema
} from "../../lib/trust/reporting-validation";

const validReport = {
  reportType: "Fake invoice" as const,
  identifier: "+91 98742 13123",
  relatedReference: "WX-INV-1001",
  description:
    "A payment request used different details from the official invoice.",
  customerEmail: "customer@example.invalid",
  customerMobile: "+91 98742 13123"
};

test("accepts the approved suspicious-report payload and rejects unsafe shapes", () => {
  assert.equal(suspiciousReportSchema.safeParse(validReport).success, true);
  assert.equal(
    suspiciousReportSchema.safeParse({
      ...validReport,
      reportType: "Unapproved category"
    }).success,
    false
  );
  assert.equal(
    suspiciousReportSchema.safeParse({
      ...validReport,
      description: "Too short"
    }).success,
    false
  );
});

test("masks report identifiers without exposing full mobile or email values", () => {
  assert.equal(maskTrustIdentifier("+91 98742 13123"), "***3123");
  assert.equal(
    maskTrustIdentifier("suspicious@example.invalid"),
    "su***@example.invalid"
  );
});

test("uses stable idempotency keys for duplicate suppression", () => {
  const supplied = "trust_report_1234567890";
  assert.equal(
    buildSuspiciousReportSubmissionKey(validReport, supplied),
    buildSuspiciousReportSubmissionKey(validReport, supplied)
  );
  assert.equal(
    buildSuspiciousReportSubmissionKey(validReport),
    buildSuspiciousReportSubmissionKey(validReport)
  );
});

test("keeps browser components away from direct LTS and PMT calls", async () => {
  const files = [
    "components/trust/RepresentativeVerificationForm.tsx",
    "components/trust/TrustSystemVerificationForms.tsx",
    "components/trust/SuspiciousActivityReportForm.tsx"
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.equal(source.includes("api.writexapp.co.in"), false, file);
    assert.equal(source.includes("LTS_API_KEY"), false, file);
    assert.equal(source.includes("PMT_API_KEY"), false, file);
  }
});

test("unavailable record providers cannot return mock success", async () => {
  const source = await readFile("lib/trust/providers.ts", "utf8");
  assert.match(source, /TrustProviderUnavailableError\("invoice"\)/);
  assert.match(source, /TrustProviderUnavailableError\("payment"\)/);
  assert.match(source, /TrustProviderUnavailableError\("enquiry"\)/);
  assert.equal(source.includes("mock"), false);
});

test("Trust Centre migration preserves private evidence and audit records", async () => {
  const migration = await readFile(
    "database/migrations/20260723_trust_centre_hub.sql",
    "utf8"
  );
  assert.match(migration, /trust_report_evidence/);
  assert.match(migration, /trust_suspicious_reports/);
  assert.match(migration, /trust_verification_events/);
  assert.match(migration, /submission_key text not null unique/);
});

test("Super Admin evidence revocation deletes private storage and preserves case audit", async () => {
  const [migration, operations, route, signedUrlRoute, queue] =
    await Promise.all([
      readFile(
        "database/migrations/20260724_trust_report_evidence_revocation.sql",
        "utf8"
      ),
      readFile("lib/trust/admin-operations.ts", "utf8"),
      readFile(
        "app/api/admin/trust-centre/reports/[id]/evidence/route.ts",
        "utf8"
      ),
      readFile("app/api/admin/files/[fileAssetId]/signed-url/route.ts", "utf8"),
      readFile("components/admin/SuspiciousReportQueue.tsx", "utf8")
    ]);

  assert.match(migration, /evidence_revoked_at/);
  assert.match(migration, /evidence_revoked_by_admin_id/);
  assert.match(operations, /deleteFileFromS3/);
  assert.match(route, /assertCanManageRepresentativeDirectory/);
  assert.match(route, /assertSameOrigin/);
  assert.match(route, /trust_suspicious_report_evidence_revoked/);
  assert.match(signedUrlRoute, /evidence_revoked_at/);
  assert.match(queue, /Revoke evidence/);
  assert.match(queue, /Case history preserved/);
});
