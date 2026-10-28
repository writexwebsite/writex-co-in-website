import assert from "node:assert/strict";
import test from "node:test";
import {
  createSignedInvoiceVerificationRequest,
  fetchLtsInvoiceVerification,
  LtsInvoiceVerificationUnavailableError,
  parseLtsInvoiceVerificationResult,
  readLtsInvoiceVerificationConfig
} from "../../lib/trust/lts-invoice-verification";

const config = {
  url: "https://lts.example.test/v1/writex/invoice-verifications",
  sharedSecret: "fixture-secret-with-at-least-32-bytes",
  issuer: "https://www.writex.co.in",
  subject: "trust-centre-invoice-verifier",
  audience: "lts-trust-invoice-v1",
  timeoutMs: 5000,
  lifetimeSeconds: 120
};

test("requires a complete HTTPS invoice connection with a short-lived authority", () => {
  assert.deepEqual(
    readLtsInvoiceVerificationConfig({
      LTS_INVOICE_VERIFICATION_URL: config.url,
      LTS_INVOICE_VERIFICATION_SHARED_SECRET: config.sharedSecret,
      LTS_INVOICE_VERIFICATION_ISSUER: config.issuer,
      LTS_INVOICE_VERIFICATION_SUBJECT: config.subject,
      LTS_INVOICE_VERIFICATION_AUDIENCE: config.audience,
      LTS_INVOICE_VERIFICATION_TOKEN_LIFETIME_SECONDS: "300"
    }),
    { ...config, lifetimeSeconds: 300 }
  );
  assert.equal(
    readLtsInvoiceVerificationConfig({
      LTS_INVOICE_VERIFICATION_URL: "http://lts.example.test/verify",
      LTS_INVOICE_VERIFICATION_SHARED_SECRET: config.sharedSecret,
      LTS_INVOICE_VERIFICATION_ISSUER: config.issuer,
      LTS_INVOICE_VERIFICATION_SUBJECT: config.subject,
      LTS_INVOICE_VERIFICATION_AUDIENCE: config.audience
    }),
    null
  );
});

test("signs the exact request body and principal for no more than 300 seconds", () => {
  const signed = createSignedInvoiceVerificationRequest({
    config,
    invoiceNumber: " WX#42 ",
    normalizedMobile: "+919876543210",
    correlationId: "fixture-correlation-1234",
    nowSeconds: 1793199600,
    nonce: "fixture_nonce_1234567890"
  });
  assert.equal(
    signed.body,
    '{"invoiceNumber":"WX#42","mobile":"+919876543210"}'
  );
  assert.equal(signed.headers["x-writex-issued-at"], "1793199600");
  assert.equal(signed.headers["x-writex-expires-at"], "1793199720");
  assert.equal(signed.headers["x-writex-subject"], config.subject);
  assert.equal(
    signed.headers["x-writex-signature"],
    "b6d77d556f6b911989ac5348c15fd2ed834cd89463d560fbd5d66c2e22ee67f8"
  );
});

test("accepts only the public LTS invoice DTO and discards extra private fields", () => {
  assert.deepEqual(
    parseLtsInvoiceVerificationResult({
      verified: true,
      invoiceNumber: "WX#42",
      invoiceDate: "2026-10-20",
      currency: "INR",
      totalAmount: 6000,
      paymentStatus: "Partially Paid",
      invoiceState: "Active",
      dataSource: "lts",
      generatedAt: "2026-10-28T15:00:00.000Z",
      customerName: "must not cross the boundary",
      whatsappNumber: "+919876543210"
    }),
    {
      verified: true,
      invoiceNumber: "WX#42",
      invoiceDate: "2026-10-20",
      currency: "INR",
      totalAmount: 6000,
      paymentStatus: "Partially Paid",
      invoiceState: "Active",
      dataSource: "lts",
      generatedAt: "2026-10-28T15:00:00.000Z"
    }
  );
  assert.throws(
    () => parseLtsInvoiceVerificationResult({ verified: true, customerName: "unsafe" }),
    LtsInvoiceVerificationUnavailableError
  );
});

test("sends the signed server request and fails closed on upstream errors", async () => {
  let capturedBody = "";
  const result = await fetchLtsInvoiceVerification({
    config,
    invoiceNumber: "WX#42",
    normalizedMobile: "+919876543210",
    fetchImplementation: (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = String(init?.body || "");
      return new Response(JSON.stringify({ verified: false }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }) as typeof fetch
  });
  assert.equal(capturedBody, '{"invoiceNumber":"WX#42","mobile":"+919876543210"}');
  assert.deepEqual(result, { verified: false });

  await assert.rejects(
    () =>
      fetchLtsInvoiceVerification({
        config,
        invoiceNumber: "WX#42",
        normalizedMobile: "+919876543210",
        fetchImplementation: (async () => new Response("bad gateway", { status: 502 })) as typeof fetch
      }),
    LtsInvoiceVerificationUnavailableError
  );
});
