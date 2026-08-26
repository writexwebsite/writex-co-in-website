import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildClientPortalPaymentView,
  buildClientPortalTrustSummary
} from "../../lib/trust/client-portal-summary";

const verifiedAt = "2026-07-23T10:00:00.000Z";

test("verifies matching invoice and current payment with a persisted reference", () => {
  const result = buildClientPortalTrustSummary({
    sessionInvoiceId: "WX-INV-1001",
    invoiceId: "wx-inv-1001",
    paymentStatus: "partial",
    representative: {
      name: "Approved Sales Name",
      designation: "Business Development Executive",
      department: "Sales",
      status: "Active",
      approved: true
    },
    verificationId: "WX-VRF-ABC12345",
    verifiedAt
  });

  assert.equal(result.invoice.state, "verified");
  assert.equal(result.payment.state, "verified");
  assert.equal(result.payment.status, "partial");
  assert.equal(result.representative.state, "verified");
  assert.equal(result.representative.name, "Approved Sales Name");
  assert.equal(result.verificationId, "WX-VRF-ABC12345");
  assert.equal(result.lastVerifiedAt, verifiedAt);
});

test("does not infer representative approval from an active status", () => {
  const result = buildClientPortalTrustSummary({
    sessionInvoiceId: "WX-INV-1001",
    invoiceId: "WX-INV-1001",
    paymentStatus: "paid",
    representative: {
      name: "Unconfirmed Name",
      status: "Active",
      approved: false
    },
    verificationId: "WX-VRF-ABC12345",
    verifiedAt
  });

  assert.equal(result.invoice.state, "verified");
  assert.equal(result.representative.state, "unavailable");
  assert.equal(result.representative.name, undefined);
});

test("keeps billing status but removes verification claims when invoice scope differs", () => {
  const result = buildClientPortalTrustSummary({
    sessionInvoiceId: "WX-INV-1001",
    invoiceId: "WX-INV-2002",
    paymentStatus: "partially_paid",
    verificationId: "WX-VRF-ABC12345",
    verifiedAt
  });

  assert.equal(result.invoice.state, "unavailable");
  assert.equal(result.payment.state, "unavailable");
  assert.equal(result.payment.status, "partially_paid");
  assert.equal(result.verificationId, null);
  assert.equal(result.lastVerifiedAt, null);
});

test("does not claim payment verification for an unknown status", () => {
  const result = buildClientPortalTrustSummary({
    sessionInvoiceId: "WX-INV-1001",
    invoiceId: "WX-INV-1001",
    paymentStatus: "unknown",
    verificationId: "WX-VRF-ABC12345",
    verifiedAt
  });

  assert.equal(result.invoice.state, "verified");
  assert.equal(result.payment.state, "unavailable");
  assert.equal(result.payment.status, "unknown");
});

test("client trust payload and browser component exclude sensitive source fields", async () => {
  const result = buildClientPortalTrustSummary({
    sessionInvoiceId: "WX-INV-1001",
    invoiceId: "WX-INV-1001",
    paymentStatus: "paid",
    verificationId: "WX-VRF-ABC12345",
    verifiedAt
  });
  const serialized = JSON.stringify(result);

  for (const forbidden of [
    "officialMobile",
    "sourceEmployeeId",
    "bankDetails",
    "upiDetails",
    "API_KEY"
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }

  const component = await readFile(
    "components/client/ClientTrustPanel.tsx",
    "utf8"
  );
  assert.equal(component.includes("api.writexapp.co.in"), false);
  assert.equal(component.includes("PMT_API"), false);
  assert.equal(component.includes("LTS_API"), false);
});

test("client payment projection strips bank, UPI and raw-provider fields", () => {
  const payment = buildClientPortalPaymentView({
    invoiceId: "WX-INV-1001",
    paymentStatus: "partial",
    isSettled: false,
    canUnlockDownload: false,
    totalAmount: 24000,
    paidAmount: 12000,
    balanceAmount: 12000,
    currency: "INR",
    updatedAt: verifiedAt,
    dueDate: "2026-08-01",
    bankDetails: { account: "not-public" },
    upiDetails: { id: "not-public" },
    rawResponse: { provider: "not-public" }
  } as Parameters<typeof buildClientPortalPaymentView>[0] & {
    bankDetails: unknown;
    upiDetails: unknown;
    rawResponse: unknown;
  });

  const serialized = JSON.stringify(payment);
  assert.equal(serialized.includes("bankDetails"), false);
  assert.equal(serialized.includes("upiDetails"), false);
  assert.equal(serialized.includes("rawResponse"), false);
  assert.equal(payment.paymentStatus, "partial");
});
