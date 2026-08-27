import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getMyWritexFeatureFlags,
  MY_WRITEX_FEATURE_FLAG_DEFAULTS,
} from "../../lib/my-writex/integration/feature-flags";
import { ProductionLTSAdapter } from "../../lib/my-writex/integration/production-lts-adapter";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

test("Stage 3B-2 keeps every production-risk feature flag off", () => {
  assert.ok(Object.values(MY_WRITEX_FEATURE_FLAG_DEFAULTS).every((value) => !value));
  assert.deepEqual(
    getMyWritexFeatureFlags({
      NODE_ENV: "production",
      MY_WRITEX_ENABLED: "true",
      MY_WRITEX_LTS_INTEGRATION_ENABLED: "true",
      MY_WRITEX_CUSTOMER_MASTER_ENABLED: "true",
      MY_WRITEX_REAL_REQUESTS_ENABLED: "true",
      MY_WRITEX_PRODUCTION_AUTH_ENABLED: "true",
    }),
    MY_WRITEX_FEATURE_FLAG_DEFAULTS,
  );
  assert.throws(() => new ProductionLTSAdapter(), /not implemented or authorized/);
});

test("Founder launcher requires the readiness checkpoint and clears every live dependency", () => {
  const launcher = source("start-my-writex-founder-uat.ps1");
  assert.match(launcher, /e9ff03aaf198155e900edda5610b57024520f192/);
  assert.match(launcher, /merge-base --is-ancestor \$readinessCommit HEAD/);
  for (const flag of [
    "MY_WRITEX_ENABLED",
    "MY_WRITEX_LTS_INTEGRATION_ENABLED",
    "MY_WRITEX_CUSTOMER_MASTER_ENABLED",
    "MY_WRITEX_REAL_REQUESTS_ENABLED",
    "MY_WRITEX_PRODUCTION_AUTH_ENABLED",
  ]) {
    assert.match(launcher, new RegExp(`\\$env:${flag} = "false"`));
  }
  for (const secretOrEndpoint of [
    "LTS_API_BASE_URL",
    "LTS_API_KEY",
    "PMT_API_BASE_URL",
    "PMT_API_KEY",
    "DATABASE_URL",
  ]) {
    assert.match(launcher, new RegExp(`\\$env:${secretOrEndpoint} = ""`));
  }
  assert.match(launcher, /--hostname", "127\.0\.0\.1", "--port", "3000"/);
  assert.match(launcher, /-WindowStyle Hidden/);
});

test("Founder checklist contains every required journey and verdict field", () => {
  const checklist = source("MY_WRITEX_FOUNDER_UAT_CHECKLIST.md");
  for (const journey of [
    "WriteX ID customer login",
    "Home",
    "Projects",
    "Project Room",
    "Start New Requirement",
    "Draft autosave + refresh",
    "Submit requirement",
    "My Requests",
    "More Information Needed",
    "Customer response",
    "Order Similar Work",
    "Upcoming Work → Prepare Requirement",
    "Career / Jobs / CV Studio shells",
    "Manager / Relationship",
    "Invoice-only customer",
    "Invoice customer denied full My WriteX",
    "Logout",
    "Mobile 390×844 review",
  ]) {
    assert.match(checklist, new RegExp(journey.replace(/[+]/g, "\\+")));
  }
  assert.match(checklist, /☐ GO ☐ CHANGE ☐ NO-GO/g);
  assert.match(checklist, /rahulsharma\.7k2/);
  assert.match(checklist, /WX-MW-1001/);
});

test("rollout cohorts reconcile to the Stage 3B-1 eligibility population", () => {
  const rows = parseCsv(source("MY_WRITEX_ROLLOUT_COHORTS.csv"));
  assert.equal(rows.length, 5);
  const counts = Object.fromEntries(rows.slice(1).map((row) => [row[0], Number(row[2])]));
  assert.deepEqual(counts, { A: 3348, B: 1631, C: 336, D: 1423 });
  assert.equal(counts.A + counts.B, 4979);
  assert.equal(counts.A + counts.B + counts.C + counts.D, 6738);
});

test("strategy documents preserve fresh-snapshot, approval and rollback gates", () => {
  const expectations: Record<string, readonly string[]> = {
    "MY_WRITEX_ROLLOUT_COHORT_STRATEGY.md": ["3,348", "1,631", "336", "1,423", "fresh approved snapshot"],
    "MY_WRITEX_PILOT_PLAN.md": ["10–25", "Cross-customer exposure", "rollback"],
    "MY_WRITEX_STAGING_RUNBOOK.md": ["127.0.0.1:3100", "127.0.0.1:43306", "notification sink", "Destroy"],
    "MY_WRITEX_E3_STAGING_TEST_MATRIX.md": ["AUTH-01", "AUTHZ-05", "MIG-04", "OBS-04"],
    "MY_WRITEX_E4_PRODUCTION_PARITY_CHECKLIST.md": ["read-only", "NOT CONFIRMED", "No object contents"],
    "MY_WRITEX_DATA_OWNER_REVIEW.md": ["never auto-merges", "Review Required", "reversal"],
    "MY_WRITEX_ID_CLAIM_FLOW.md": ["WriteX ID + Registered Phone", "no OTP", "no password"],
    "MY_WRITEX_PILOT_ROLLBACK_PLAYBOOK.md": ["Cross-customer exposure", "revoke all pilot sessions", "invoice-only"],
  };
  for (const [file, fragments] of Object.entries(expectations)) {
    const content = source(file);
    for (const fragment of fragments) {
      assert.match(content, new RegExp(fragment.replace(/[+]/g, "\\+"), "i"));
    }
  }
});

test("Customer Master Review prototype is local-only and non-networking", () => {
  const prototype = source("prototypes/my-writex-customer-master-review/index.html");
  for (const label of [
    "Anonymized customer reference",
    "Masked phone",
    "Masked email",
    "Projects",
    "Invoices",
    "Assigned BDE",
    "Conflict",
    "CONFIDENCE",
    "Same Customer",
    "Different Customer",
    "Defer",
    "Preview Merge",
    "Reverse Merge",
  ]) {
    if (label === "Anonymized customer reference") {
      assert.match(prototype, /CMR-7K2A/);
    } else assert.match(prototype, new RegExp(label, "i"));
  }
  assert.match(prototype, /default-src 'none'/);
  assert.match(prototype, /form-action 'none'/);
  assert.match(prototype, /LOCAL PROTOTYPE · NO WRITES/);
  assert.doesNotMatch(prototype, /fetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//);
});
