import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  adminGlossary,
  adminHelpArticles,
  adminProcessGuides,
  getRoleGuidanceArticles
} from "../../lib/admin/guidance-content";

test("role guidance never grants unrelated Super Admin modules", () => {
  const assessor = getRoleGuidanceArticles("assessor");
  assert.equal(
    assessor.some((article) => article.id === "trust-centre-operations-v1"),
    false
  );
  assert.equal(
    assessor.some((article) => article.id === "hiring-assessments-v1"),
    true
  );
});

test("guidance content is versioned, stable and searchable", () => {
  assert.equal(adminHelpArticles.every((article) => article.id && article.version), true);
  assert.equal(adminProcessGuides.length >= 4, true);
  assert.equal(adminGlossary.some(([term]) => term === "Advisory Signal"), true);
});

test("tutorial governance protects safety guidance from normal deactivation", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib/admin/guidance-store.ts"),
    "utf8"
  );
  assert.match(source, /protectedGuidanceArticleIds/);
  assert.match(source, /verification-centre-v1/);
  assert.match(source, /isProtected \? true : article\.active/);
  assert.match(source, /onboarding_reset_by_super_admin/);
});
