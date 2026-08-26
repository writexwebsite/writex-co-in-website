import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CAREERS_LOCATION,
  hiringRoleLabel
} from "../../lib/hiring/domain";

test("keeps the writer role key stable while presenting the approved label", () => {
  assert.equal(hiringRoleLabel("academic_writer"), "Academic Writer");
  assert.equal(hiringRoleLabel("Academic Writer"), "Academic Writer");
  assert.equal(hiringRoleLabel("sales_executive"), "Sales Executive");
});

test("uses the approved Careers location", () => {
  assert.equal(CAREERS_LOCATION, "Kolkata, India");
});

test("keeps the legacy role URL as a permanent redirect", () => {
  const legacyRoute = readFileSync(
    new URL("../../app/careers/subject-matter-expert/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    legacyRoute,
    /permanentRedirect\("\/careers\/academic-writer"\)/
  );
});
