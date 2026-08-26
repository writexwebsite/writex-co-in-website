import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toPublicRepresentative } from "../../lib/trust/representative-public";

const migration = readFileSync(
  "database/migrations/20260723_official_representative_numbers.sql",
  "utf8"
);
const directorySource = readFileSync(
  "lib/trust/representative-directory.ts",
  "utf8"
);
const syncSource = readFileSync(
  "lib/trust/lts-representative-sync.ts",
  "utf8"
);
const adminSource = readFileSync(
  "lib/trust/representative-admin.ts",
  "utf8"
);

test("stores one representative with multiple independently revocable number rows", () => {
  assert.match(migration, /create table if not exists official_representative_numbers/i);
  assert.match(migration, /representative_id uuid not null/i);
  assert.match(migration, /unique index[\s\S]*normalized_mobile_hash/i);
  assert.match(migration, /status in \('Active', 'Inactive', 'Revoked'\)/i);
});

test("public lookup requires both an active number and an active representative", () => {
  assert.match(
    directorySource,
    /from official_representative_numbers number[\s\S]*inner join official_representatives representative/i
  );
  assert.match(directorySource, /number\.status = 'Active'/i);
  assert.match(directorySource, /representative\.status = 'Active'/i);
});

test("sync deactivates removed LTS numbers without deleting the representative", () => {
  assert.match(
    syncSource,
    /update official_representative_numbers[\s\S]*set status = 'Inactive'/i
  );
  assert.doesNotMatch(syncSource, /delete from official_representative_numbers/i);
});

test("admin number controls store hashes and return masked values only", () => {
  assert.match(adminSource, /hashRepresentativeMobile/);
  assert.match(adminSource, /maskedNumber: `\+91 •••••• \$\{row\.mobileLastFour\}`/);
  assert.match(adminSource, /return toAdminRepresentativeNumber/);
});

test("public representative projection never returns number metadata", () => {
  const result = toPublicRepresentative({
    full_name: "Safe Fixture",
    designation: "Business Development Executive",
    department: "Sales",
    status: "Active",
    is_publicly_verifiable: true
  });
  assert.deepEqual(result, {
    name: "Safe Fixture",
    designation: "Business Development Executive",
    department: "Sales",
    status: "Active"
  });
  assert.equal("numbers" in (result || {}), false);
  assert.equal("sourceEmployeeId" in (result || {}), false);
});
