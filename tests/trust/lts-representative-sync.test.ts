import assert from "node:assert/strict";
import test from "node:test";
import {
  planLtsRepresentativeChanges,
  parseLtsRepresentativeDirectory,
  resolveSyncedRepresentativeDisplayName,
  type LtsRepresentativeSyncRecord
} from "../../lib/trust/lts-representative-records";
import {
  LtsRepresentativeSyncUnavailableError,
  synchronizeLtsRepresentativeDirectory,
  type LtsRepresentativeProvider,
  type LtsRepresentativeRepository
} from "../../lib/trust/lts-representative-sync-core";
import { readLtsTrustCentreConfig } from "../../lib/trust/lts-endpoint-config";
import {
  executeWithSingleTransientRetry,
  ltsFailureForHttpStatus,
  LtsRepresentativeSyncUnavailableError as PolicySyncError
} from "../../lib/trust/lts-representative-sync-policy";
import {
  InvalidRepresentativeDisplayNameConfigError,
  parseRepresentativeDisplayNameMappings,
  resolveRepresentativeDisplayName
} from "../../lib/trust/representative-display-names";

const ACTIVE_FIXTURE = {
  sourceEmployeeId: "WX-FIXTURE-001",
  fullName: "Test Representative",
  designation: "Senior Business Development Executive",
  department: "Sales",
  officialMobile: "+91 98765 43210",
  status: "Active",
  updatedAt: "2026-07-18T10:00:00.000Z"
};

test("uses endpoint-specific keys without consulting the obsolete shared key", () => {
  const config = readLtsTrustCentreConfig({
    LTS_HEALTH_URL: "https://api.example.test/health",
    LTS_HEALTH_API_KEY: "health-key",
    LTS_REPRESENTATIVES_URL: "https://api.example.test/representatives",
    LTS_REPRESENTATIVES_API_KEY: "representatives-key",
    LTS_API_KEY: "obsolete-shared-key",
    LTS_API_HEADER_NAME: "x-writex-api-key"
  });

  assert.ok(config);
  assert.equal(config.health.apiKey, "health-key");
  assert.equal(config.representatives.apiKey, "representatives-key");
});

test("does not substitute one endpoint key when the other is missing", () => {
  assert.equal(
    readLtsTrustCentreConfig({
      LTS_HEALTH_URL: "https://api.example.test/health",
      LTS_HEALTH_API_KEY: "health-key",
      LTS_REPRESENTATIVES_URL: "https://api.example.test/representatives",
      LTS_API_KEY: "obsolete-shared-key"
    }),
    null
  );
  assert.equal(
    readLtsTrustCentreConfig({
      LTS_HEALTH_URL: "https://api.example.test/health",
      LTS_REPRESENTATIVES_URL: "https://api.example.test/representatives",
      LTS_REPRESENTATIVES_API_KEY: "representatives-key"
    }),
    null
  );
});

test("retries one transient failure exactly once", async () => {
  let attempts = 0;
  const value = await executeWithSingleTransientRetry(async () => {
    attempts += 1;
    if (attempts === 1) throw ltsFailureForHttpStatus(503);
    return "ok";
  });

  assert.equal(value, "ok");
  assert.equal(attempts, 2);
});

test("does not retry authentication failures", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      executeWithSingleTransientRetry(async () => {
        attempts += 1;
        throw ltsFailureForHttpStatus(401);
      }),
    (error: unknown) =>
      error instanceof PolicySyncError && error.reason === "unauthorized"
  );
  assert.equal(attempts, 1);
});

function envelope(representatives: unknown[]) {
  return {
    representatives,
    generatedAt: "2026-07-18T10:05:00.000Z"
  };
}

test("accepts an active LTS fixture and stores no raw mobile", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([ACTIVE_FIXTURE]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.received, 1);
  assert.equal(parsed.rejected, 0);
  assert.equal(parsed.numbersReceived, 1);
  assert.equal(parsed.rejectedNumbers, 0);
  assert.equal(parsed.records[0].mobileLastFour, "3210");
  assert.equal(parsed.records[0].numbers.length, 1);
  assert.equal("officialMobile" in parsed.records[0], false);
  assert.match(parsed.records[0].normalizedMobileHash, /^[a-f0-9]{64}$/);
});

test("accepts multiple authoritative official numbers for one representative", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        officialMobiles: [
          "+91 98765 43210",
          "91-98765-43211",
          "+91 98765 43210"
        ]
      }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.received, 1);
  assert.equal(parsed.numbersReceived, 3);
  assert.equal(parsed.rejectedNumbers, 0);
  assert.equal(parsed.records[0].numbers.length, 2);
  assert.deepEqual(
    parsed.records[0].numbers.map((number) => ({
      lastFour: number.mobileLastFour,
      sourcePhoneType: number.sourcePhoneType,
      isPrimary: number.isPrimary
    })),
    [
      {
        lastFour: "3210",
        sourcePhoneType: "primary_official",
        isPrimary: true
      },
      {
        lastFour: "3211",
        sourcePhoneType: "secondary_official",
        isPrimary: false
      }
    ]
  );
});

test("blocks a number assigned to two representatives without duplicating either identity", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        officialMobiles: ["9876543210", "9876543211"]
      },
      {
        ...ACTIVE_FIXTURE,
        sourceEmployeeId: "WX-FIXTURE-002",
        fullName: "Second Representative",
        officialMobile: "+91 98765 43212",
        officialMobiles: ["9876543210", "9876543212"]
      }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.rejected, 0);
  assert.equal(parsed.rejectedNumbers, 2);
  assert.deepEqual(
    parsed.records.map((record) => record.numbers[0].mobileLastFour),
    ["3211", "3212"]
  );
});

test("keeps the legacy officialMobile contract as a safe fallback", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([ACTIVE_FIXTURE]),
    "fixture-hmac-secret"
  );
  assert.equal(parsed.records[0].numbers.length, 1);
  assert.equal(parsed.records[0].numbers[0].isPrimary, true);
});

test("uses an approved public display-name mapping without replacing the source name", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        sourceEmployeeId: "W0186",
        fullName: "Shruti Jha"
      }
    ]),
    "fixture-hmac-secret",
    parseRepresentativeDisplayNameMappings("W0186:Nisha")
  );

  assert.equal(parsed.records[0].sourceFullName, "Shruti Jha");
  assert.equal(parsed.records[0].publicDisplayName, "Nisha");
  assert.equal(parsed.records[0].publicDisplayNameSource, "management_mapping");
});

test("uses a website-approved mapping before the LTS public display name", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        publicDisplayName: "Approved Public Name",
        salesDisplayName: "Approved Sales Name"
      }
    ]),
    "fixture-hmac-secret",
    parseRepresentativeDisplayNameMappings("WX-FIXTURE-001:Mapped Name")
  );

  assert.equal(parsed.records[0].publicDisplayName, "Mapped Name");
  assert.equal(
    parsed.records[0].publicDisplayNameSource,
    "management_mapping"
  );
  assert.equal(parsed.records[0].ltsPublicDisplayName, "Approved Public Name");
});

test("uses the LTS public display name when no website override exists", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        fullName: "Source Legal Name",
        publicDisplayName: "Approved Public Name"
      }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records[0].sourceFullName, "Source Legal Name");
  assert.equal(parsed.records[0].ltsPublicDisplayName, "Approved Public Name");
  assert.equal(parsed.records[0].publicDisplayName, "Approved Public Name");
  assert.equal(
    parsed.records[0].publicDisplayNameSource,
    "lts_public_display_name"
  );
});

test("preserves an explicit manual override ahead of LTS and fallback names", () => {
  const resolved = resolveRepresentativeDisplayName({
    sourceEmployeeId: "W0186",
    fullName: "Shruti Jha",
    manualDisplayName: "Website Approved Name",
    publicDisplayName: "Nisha",
    approvedMappings: new Map()
  });

  assert.deepEqual(resolved, {
    name: "Website Approved Name",
    source: "manual_override"
  });
});

test("clearing a manual override restores the LTS public name", () => {
  const resolved = resolveRepresentativeDisplayName({
    sourceEmployeeId: "W0186",
    fullName: "Shruti Jha",
    manualDisplayName: null,
    publicDisplayName: "Nisha",
    approvedMappings: new Map()
  });

  assert.deepEqual(resolved, {
    name: "Nisha",
    source: "lts_public_display_name"
  });
});

test("a later LTS sync preserves the website-approved manual override", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        sourceEmployeeId: "W0186",
        fullName: "Shruti Jha",
        publicDisplayName: "Nisha"
      }
    ]),
    "fixture-hmac-secret"
  );
  const resolved = resolveSyncedRepresentativeDisplayName(
    parsed.records[0],
    "Website Approved Nisha",
    new Map()
  );

  assert.equal(resolved.sourceFullName, "Shruti Jha");
  assert.equal(resolved.ltsPublicDisplayName, "Nisha");
  assert.equal(resolved.publicDisplayName, "Website Approved Nisha");
  assert.equal(resolved.publicDisplayNameSource, "manual_override");
});

test("falls back to the source full name when no approved display name exists", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([ACTIVE_FIXTURE]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records[0].sourceFullName, "Test Representative");
  assert.equal(parsed.records[0].publicDisplayName, "Test Representative");
  assert.equal(parsed.records[0].publicDisplayNameSource, "full_name_fallback");
});

test("rejects unsafe display names and duplicate mappings", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([{ ...ACTIVE_FIXTURE, publicDisplayName: "<script>alert(1)</script>" }]),
    "fixture-hmac-secret"
  );
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 1);

  assert.throws(
    () =>
      parseRepresentativeDisplayNameMappings(
        "WX-FIXTURE-001:First,WX-FIXTURE-001:Second"
      ),
    InvalidRepresentativeDisplayNameConfigError
  );
});

test("rejects inactive and malformed fixtures", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      { ...ACTIVE_FIXTURE, status: "Inactive" },
      { ...ACTIVE_FIXTURE, sourceEmployeeId: "WX-FIXTURE-002", officialMobile: "12345" }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 2);
});

test("rejects representatives outside the approved department and designation lists", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      { ...ACTIVE_FIXTURE, department: "Business Development" },
      {
        ...ACTIVE_FIXTURE,
        sourceEmployeeId: "WX-FIXTURE-002",
        officialMobile: "+91 98765 43211",
        designation: "Intern"
      }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 2);
});

test("normalizes approved department and designation casing", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      {
        ...ACTIVE_FIXTURE,
        department: " management ",
        designation: " founder "
      }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records[0].department, "Management");
  assert.equal(parsed.records[0].designation, "Founder");
});

test("rejects every duplicate source ID or mobile", () => {
  const parsed = parseLtsRepresentativeDirectory(
    envelope([
      ACTIVE_FIXTURE,
      { ...ACTIVE_FIXTURE, fullName: "Duplicate Fixture" }
    ]),
    "fixture-hmac-secret"
  );

  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 2);
});

test("plans create, update and deactivation changes", () => {
  const unchanged: LtsRepresentativeSyncRecord = {
    sourceEmployeeId: "WX-FIXTURE-001",
    sourceFullName: "First Fixture",
    ltsPublicDisplayName: null,
    publicDisplayName: "First Fixture",
    publicDisplayNameSource: "full_name_fallback",
    designation: "Business Development Executive",
    department: "Sales",
    normalizedMobileHash: "a".repeat(64),
    mobileLastFour: "1111",
    numbers: [
      {
        normalizedMobileHash: "a".repeat(64),
        mobileLastFour: "1111",
        sourcePhoneType: "primary_official",
        isPrimary: true
      }
    ],
    status: "Active"
  };
  const changed: LtsRepresentativeSyncRecord = {
    ...unchanged,
    sourceEmployeeId: "WX-FIXTURE-002",
    sourceFullName: "Changed Fixture",
    publicDisplayName: "Changed Fixture",
    normalizedMobileHash: "b".repeat(64),
    mobileLastFour: "2222"
  };
  const removed: LtsRepresentativeSyncRecord = {
    ...unchanged,
    sourceEmployeeId: "WX-FIXTURE-003",
    normalizedMobileHash: "c".repeat(64),
    mobileLastFour: "3333"
  };
  const created: LtsRepresentativeSyncRecord = {
    ...unchanged,
    sourceEmployeeId: "WX-FIXTURE-004",
    normalizedMobileHash: "d".repeat(64),
    mobileLastFour: "4444"
  };

  const plan = planLtsRepresentativeChanges(
    [unchanged, changed, removed].map((record) => ({
      ...record,
      isPubliclyVerifiable: true
    })),
    [
      unchanged,
      {
        ...changed,
        sourceFullName: "Updated Fixture",
        publicDisplayName: "Updated Fixture"
      },
      created
    ]
  );

  assert.deepEqual(plan, {
    created: 1,
    updated: 1,
    deactivateSourceEmployeeIds: ["WX-FIXTURE-003"]
  });
});

test("reports create, update and deactivation counts from the repository", async () => {
  const provider: LtsRepresentativeProvider = {
    async fetchDirectory() {
      return envelope([ACTIVE_FIXTURE]);
    }
  };
  let synchronized: LtsRepresentativeSyncRecord[] = [];
  const repository: LtsRepresentativeRepository = {
    async synchronize(records) {
      synchronized = records;
      return {
        created: 1,
        updated: 2,
        deactivated: 3,
        numbersCreated: 1,
        numbersUpdated: 2,
        numbersDeactivated: 3,
        rejectedNumbers: 0
      };
    }
  };

  const summary = await synchronizeLtsRepresentativeDirectory({
    provider,
    repository,
    hmacSecret: "fixture-hmac-secret"
  });

  assert.equal(synchronized.length, 1);
  assert.deepEqual(summary, {
    received: 1,
    rejected: 0,
    created: 1,
    updated: 2,
    deactivated: 3,
    numbersReceived: 1,
    numbersCreated: 1,
    numbersUpdated: 2,
    numbersDeactivated: 3,
    rejectedNumbers: 0
  });
});

test("an LTS outage never calls the repository", async () => {
  let repositoryCalled = false;
  const provider: LtsRepresentativeProvider = {
    async fetchDirectory() {
      throw new LtsRepresentativeSyncUnavailableError();
    }
  };
  const repository: LtsRepresentativeRepository = {
    async synchronize() {
      repositoryCalled = true;
      return {
        created: 0,
        updated: 0,
        deactivated: 0,
        numbersCreated: 0,
        numbersUpdated: 0,
        numbersDeactivated: 0,
        rejectedNumbers: 0
      };
    }
  };

  await assert.rejects(
    () =>
      synchronizeLtsRepresentativeDirectory({
        provider,
        repository,
        hmacSecret: "fixture-hmac-secret"
      }),
    LtsRepresentativeSyncUnavailableError
  );
  assert.equal(repositoryCalled, false);
});

test("an empty or fully rejected response cannot deactivate the directory", async () => {
  let repositoryCalled = false;
  const provider: LtsRepresentativeProvider = {
    async fetchDirectory() {
      return envelope([]);
    }
  };
  const repository: LtsRepresentativeRepository = {
    async synchronize() {
      repositoryCalled = true;
      return {
        created: 0,
        updated: 0,
        deactivated: 0,
        numbersCreated: 0,
        numbersUpdated: 0,
        numbersDeactivated: 0,
        rejectedNumbers: 0
      };
    }
  };

  await assert.rejects(
    () =>
      synchronizeLtsRepresentativeDirectory({
        provider,
        repository,
        hmacSecret: "fixture-hmac-secret"
      }),
    (error: unknown) =>
      error instanceof LtsRepresentativeSyncUnavailableError &&
      error.reason === "empty_response"
  );
  assert.equal(repositoryCalled, false);
});

test("a malformed response is recorded as safe and never reaches the repository", async () => {
  let repositoryCalled = false;
  await assert.rejects(
    () =>
      synchronizeLtsRepresentativeDirectory({
        provider: {
          async fetchDirectory() {
            return { representatives: "not-an-array", generatedAt: "invalid" };
          }
        },
        repository: {
          async synchronize() {
            repositoryCalled = true;
            return {
              created: 0,
              updated: 0,
              deactivated: 0,
              numbersCreated: 0,
              numbersUpdated: 0,
              numbersDeactivated: 0,
              rejectedNumbers: 0
            };
          }
        },
        hmacSecret: "fixture-hmac-secret"
      }),
    (error: unknown) =>
      error instanceof LtsRepresentativeSyncUnavailableError &&
      error.reason === "malformed_response"
  );
  assert.equal(repositoryCalled, false);
});
