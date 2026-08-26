import assert from "node:assert/strict";
import test from "node:test";
import { hashRepresentativeMobile } from "../../lib/trust/representative-hash";
import { normalizeIndianMobile } from "../../lib/trust/mobile";
import {
  type RepresentativeDirectoryProvider,
  toPublicRepresentative,
  UnavailableRepresentativeDirectoryProvider,
  RepresentativeDirectoryUnavailableError
} from "../../lib/trust/representative-public";

test("normalizes supported Indian mobile formats", () => {
  for (const value of [
    "9874213123",
    "+91 98742 13123",
    "91-98742-13123",
    "(91) 9874213123",
    "+91-9874213123",
    "0091 9874213123",
    "  +91 98742 13123  ",
    "+91.98742.13123",
    "+91--98742..13123"
  ]) {
    assert.equal(normalizeIndianMobile(value), "+919874213123");
  }
});

test("rejects invalid mobile formats", () => {
  assert.equal(normalizeIndianMobile("12345"), null);
  assert.equal(normalizeIndianMobile("+44 7700 900123"), null);
  assert.equal(normalizeIndianMobile("5123456789"), null);
  assert.equal(normalizeIndianMobile("98742abc13123"), null);
  assert.equal(normalizeIndianMobile("9874213123 / 9123456789"), null);
  assert.equal(normalizeIndianMobile("9874213123 9123456789"), null);
  assert.equal(normalizeIndianMobile("+91 98742131230"), null);
  assert.equal(normalizeIndianMobile("9874213123#"), null);
  assert.equal(normalizeIndianMobile("91) 9874213123("), null);
  assert.equal(normalizeIndianMobile("+91+9874213123"), null);
});

test("produces one lookup hash for every supported presentation", () => {
  const secret = "fixture-representative-directory-secret";
  const values = [
    "9874213123",
    "+91 98742 13123",
    "91-98742-13123",
    "(91) 9874213123",
    "+91-9874213123",
    "0091 9874213123"
  ];
  const hashes = values.map((value) => {
    const normalized = normalizeIndianMobile(value);
    assert.ok(normalized);
    return hashRepresentativeMobile(normalized, secret);
  });

  assert.equal(new Set(hashes).size, 1);
});

test("returns only approved public fields for an active fixture", () => {
  assert.deepEqual(
    toPublicRepresentative({
      full_name: "Local Fixture",
      designation: "Senior Business Development Executive",
      department: "Business Development",
      status: "Active",
      is_publicly_verifiable: true
    }),
    {
      name: "Local Fixture",
      designation: "Senior Business Development Executive",
      department: "Business Development",
      status: "Active"
    }
  );
});

test("returns the public display name without exposing the source full name", () => {
  const representative = toPublicRepresentative({
    full_name: "Shruti Jha",
    source_full_name: "Shruti Jha",
    public_display_name: "Nisha",
    designation: "Business Development Executive",
    department: "Sales",
    status: "Active",
    is_publicly_verifiable: true
  });

  assert.deepEqual(representative, {
    name: "Nisha",
    designation: "Business Development Executive",
    department: "Sales",
    status: "Active"
  });
  assert.equal(JSON.stringify(representative).includes("Shruti Jha"), false);
  assert.deepEqual(Object.keys(representative || {}).sort(), [
    "department",
    "designation",
    "name",
    "status"
  ]);
});

test("local fixture provider can return a verified public result", async () => {
  const fixtureProvider: RepresentativeDirectoryProvider = {
    async verifyByMobile() {
      return {
        name: "Local Fixture",
        designation: "Senior Business Development Executive",
        department: "Business Development",
        status: "Active"
      };
    }
  };

  const result = await fixtureProvider.verifyByMobile("+919876543210");
  assert.equal(result?.status, "Active");
  assert.deepEqual(Object.keys(result || {}).sort(), [
    "department",
    "designation",
    "name",
    "status"
  ]);
});

test("local missing-record fixture returns an unverified result", async () => {
  const fixtureProvider: RepresentativeDirectoryProvider = {
    async verifyByMobile() {
      return null;
    }
  };

  assert.equal(
    await fixtureProvider.verifyByMobile("+919876543210"),
    null
  );
});

test("does not verify inactive or hidden fixtures", () => {
  assert.equal(
    toPublicRepresentative({
      full_name: "Hidden Fixture",
      designation: "Team Member",
      department: "Operations",
      status: "Inactive",
      is_publicly_verifiable: true
    }),
    null
  );
  assert.equal(
    toPublicRepresentative({
      full_name: "Private Fixture",
      designation: "Team Member",
      department: "Operations",
      status: "Active",
      is_publicly_verifiable: false
    }),
    null
  );
});

test("unavailable provider never returns a fake verification", async () => {
  const provider = new UnavailableRepresentativeDirectoryProvider();
  await assert.rejects(
    () => provider.verifyByMobile("+919876543210"),
    RepresentativeDirectoryUnavailableError
  );
});
