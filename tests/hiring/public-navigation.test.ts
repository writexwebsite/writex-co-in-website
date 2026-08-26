import assert from "node:assert/strict";
import test from "node:test";
import {
  getCompanyFooterNavigation,
  getPrimaryPublicNavigation,
  isPublicNavigationActive
} from "../../lib/public-navigation";

test("shows Careers in the approved desktop and footer positions when hiring is public", () => {
  assert.deepEqual(
    getPrimaryPublicNavigation({ showCareers: true }).map((item) => item.label),
    ["About Us", "Trust Centre\u2122", "Careers", "Pricing", "Contact"]
  );
  assert.deepEqual(
    getCompanyFooterNavigation(true).map((item) => item.label),
    [
      "About Us",
      "Trust Centre\u2122",
      "Careers",
      "Contact Us",
      "Client Login",
      "Employee Login"
    ]
  );
});

test("hides Careers everywhere when hiring applications are disabled", () => {
  assert.equal(
    getPrimaryPublicNavigation({ includeHome: true, showCareers: false }).some(
      (item) => item.href === "/careers"
    ),
    false
  );
  assert.equal(
    getCompanyFooterNavigation(false).some((item) => item.href === "/careers"),
    false
  );
});

test("keeps Careers active across role and application-status routes", () => {
  assert.equal(isPublicNavigationActive("/careers", "/careers"), true);
  assert.equal(
    isPublicNavigationActive("/careers/academic-writer", "/careers"),
    true
  );
  assert.equal(
    isPublicNavigationActive("/careers/subject-matter-expert", "/careers"),
    true
  );
  assert.equal(isPublicNavigationActive("/careers-old", "/careers"), false);
});
