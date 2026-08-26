import assert from "node:assert/strict";
import test from "node:test";
import { organizationSchema } from "../../lib/schema";
import { siteConfig } from "../../lib/site";

const forbiddenPublicAddressFragments = [
  "42A, Express Tower",
  "Auckland Square",
  "700017",
  "streetAddress",
  "postalCode"
];

test("uses only the approved public location", () => {
  assert.equal(siteConfig.address, "Kolkata, India");
});

test("organization schema does not expose the private office address", () => {
  const serialized = JSON.stringify(organizationSchema());

  assert.match(serialized, /Kolkata, India/);
  for (const fragment of forbiddenPublicAddressFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});
