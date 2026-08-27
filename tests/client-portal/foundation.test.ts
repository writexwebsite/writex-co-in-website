import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  invoiceReferencesMatch,
  normalizeInvoiceId,
  normalizeWhatsapp
} from "../../lib/client/identifiers";
import {
  validateClientStatusOverride
} from "../../lib/client/status-overrides";

test("client login normalizes invoice and supported Indian mobile formats", () => {
  assert.equal(normalizeInvoiceId(" wx-1001 "), "WX-1001");
  for (const input of [
    "9874213123",
    "+91 98742 13123",
    "91-98742-13123",
    "(91) 9874213123",
    "0091 9874213123"
  ]) {
    assert.equal(normalizeWhatsapp(input), "+919874213123");
  }
  assert.equal(normalizeWhatsapp("+44 7700 900123"), "+447700900123");
  assert.equal(normalizeWhatsapp("98742abc13123"), "");
});

test("invoice ownership matching is case and whitespace safe", () => {
  assert.equal(invoiceReferencesMatch(" wx-1001 ", "WX-1001"), true);
  assert.equal(invoiceReferencesMatch("WX-1001", "WX-1002"), false);
});

test("high-risk client stages require provider-confirmed facts", () => {
  const expiry = new Date(Date.now() + 60_000).toISOString();
  const delivered = validateClientStatusOverride(
    {
      mode: "manual",
      publicStage: "Delivered",
      overrideReason: "Approved by management.",
      expiresAt: expiry
    },
    { approvedDeliverableAvailable: false, workComplete: true }
  );
  assert.equal(delivered.valid, false);

  const ready = validateClientStatusOverride(
    {
      mode: "manual",
      publicStage: "Ready for Delivery",
      overrideReason: "Approved by management.",
      expiresAt: expiry
    },
    { approvedDeliverableAvailable: true, workComplete: false }
  );
  assert.equal(ready.valid, false);
});

test("automatic client view reverts without carrying stale public data", () => {
  const result = validateClientStatusOverride(
    {
      mode: "automatic",
      publicStage: "Delivered",
      approvedPublicMessage: "Old message",
      overrideReason: "Old reason"
    },
    { approvedDeliverableAvailable: false, workComplete: false }
  );
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.publicStage, null);
    assert.equal(result.value.approvedPublicMessage, null);
  }
});

test("production provider factories contain no mock-success path", () => {
  const source = readFileSync(
    path.join(process.cwd(), "lib/client/providers/index.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /mock-success|mockSuccess|fixtureProvider/);
  assert.match(source, /new LtsBillingProvider/);
  assert.match(source, /new PmtProjectProvider/);
  assert.match(source, /new PmtDeliverablesProvider/);
});

test("client login stores the opaque random token, not a signed PII payload", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/api/client/auth/login/route.ts"),
    "utf8"
  );
  assert.match(source, /sessionRecord\.sessionToken/);
  assert.doesNotMatch(source, /createSignedSessionToken/);
});
