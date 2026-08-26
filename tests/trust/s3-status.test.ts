import assert from "node:assert/strict";
import test from "node:test";
import { resolveS3Configuration } from "../../lib/storage/s3-config-validation";
import { getS3StatusLabel } from "../../lib/storage/s3-status";
import { isExpectedLeastPrivilegeListDenial } from "../../lib/storage/s3-status";

const configuredEnvironment = {
  AWS_REGION: "ap-south-1",
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
  AWS_S3_BUCKET: "private-test-bucket",
  AWS_S3_PRIVATE_PREFIX: "/writex-private/"
};

test("resolves the approved S3 variable names and normalizes the private prefix", () => {
  const result = resolveS3Configuration(configuredEnvironment);
  assert.equal(result.configured, true);
  if (!result.configured) return;
  assert.equal(result.configuration.privatePrefix, "writex-private");
  assert.equal(result.configuration.bucket, "private-test-bucket");
});

test("does not accept obsolete bucket variables or an empty prefix", () => {
  const obsoleteEnvironment = {
    ...configuredEnvironment,
    AWS_S3_BUCKET: undefined,
    AWS_S3_PRIVATE_PREFIX: "",
    S3_BUCKET: "obsolete-bucket"
  };
  const result = resolveS3Configuration(obsoleteEnvironment);
  assert.equal(result.configured, false);
  if (result.configured) return;
  assert.deepEqual(result.missing, ["AWS_S3_BUCKET", "AWS_S3_PRIVATE_PREFIX"]);
});

test("uses distinct, calm Admin labels for every S3 state", () => {
  assert.equal(
    getS3StatusLabel("configured_healthy"),
    "Connected and Healthy"
  );
  assert.equal(
    getS3StatusLabel("configured_unreachable"),
    "Configured but Unreachable"
  );
  assert.equal(getS3StatusLabel("not_configured"), "Not Configured");
  assert.equal(
    getS3StatusLabel("status_unavailable"),
    "Status Check Failed"
  );
});

test("distinguishes the approved no-list boundary from a network failure", () => {
  assert.equal(
    isExpectedLeastPrivilegeListDenial({
      name: "AccessDenied",
      $metadata: { httpStatusCode: 403 }
    }),
    true
  );
  assert.equal(
    isExpectedLeastPrivilegeListDenial({ name: "TimeoutError" }),
    false
  );
  assert.equal(
    isExpectedLeastPrivilegeListDenial({
      name: "InvalidAccessKeyId",
      $metadata: { httpStatusCode: 403 }
    }),
    false
  );
});

test("storage status implementation keeps secrets out of the sanitized contract", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile("lib/storage/s3-status.ts", "utf8")
  );
  assert.equal(source.includes("accessKeyId"), false);
  assert.equal(source.includes("secretAccessKey"), false);
  assert.equal(source.includes("AWS_SECRET_ACCESS_KEY"), false);
});
