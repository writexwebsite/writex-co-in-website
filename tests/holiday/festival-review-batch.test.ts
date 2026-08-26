import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, "private-assets/festival-review-batch-1/manifest.json"), "utf8")) as {
  total: number; approved: number; sourceRequired: number; byFestival: Record<string, number>; byCategory: Record<string, number>;
  assets: Array<{ id: string; festivalSlug: string; category: string; relativePath: string; checksumSha256: string; reviewState: string; publicEligible: boolean }>;
};

const reviewFirstTargets = [
  ["independence-day", "header"], ["diwali", "header"], ["holi", "header"], ["durga-puja", "header"], ["eid", "header"], ["christmas", "header"],
  ["shared", "ground"], ["independence-day", "ground"], ["diwali", "ground"], ["holi", "ground"], ["durga-puja", "ground"], ["eid", "ground"],
  ["christmas", "axo"], ["shared", "axo"], ["independence-day", "axo"], ["diwali", "axo"], ["holi", "axo"], ["durga-puja", "axo"],
  ["eid", "ambient"], ["christmas", "ambient"], ["shared", "ambient"], ["independence-day", "ambient"], ["diwali", "ambient"], ["holi", "ambient"],
  ["durga-puja", "feature"], ["eid", "feature"], ["christmas", "feature"], ["shared", "feature"], ["independence-day", "feature"], ["diwali", "feature"],
] as const;

describe("Festival Asset Library Batch 1", () => {
  it("contains exactly the approved review scope", () => {
    assert.equal(manifest.total, 120);
    assert.deepEqual(manifest.byFestival, {
      "independence-day": 18, diwali: 22, holi: 18, "durga-puja": 20,
      eid: 16, christmas: 12, shared: 14,
    });
    assert.deepEqual(manifest.byCategory, {
      header: 28, ground: 24, axo: 28, ambient: 22, feature: 18,
    });
  });

  it("keeps every generated asset private and Founder-review gated", () => {
    assert.equal(manifest.approved, 0);
    assert.ok(manifest.assets.every((asset) => asset.reviewState === "visual_review_required"));
    assert.ok(manifest.assets.every((asset) => asset.publicEligible === false));
    assert.ok(manifest.assets.every((asset) => !asset.relativePath.startsWith("public/")));
  });

  it("uses stable unique identities and exact-version checksums", () => {
    assert.equal(new Set(manifest.assets.map((asset) => asset.id)).size, 120);
    assert.equal(new Set(manifest.assets.map((asset) => asset.checksumSha256)).size, 120);
  });

  it("builds an honest deterministic 30-item sample across every group and category", () => {
    const sample = reviewFirstTargets.map(([festivalSlug, category]) => {
      const matches = manifest.assets
        .filter((asset) => asset.festivalSlug === festivalSlug && asset.category === category)
        .sort((left, right) => left.id.localeCompare(right.id));
      assert.ok(matches.length > 0, `${festivalSlug}/${category} must have a representative asset`);
      return matches[0];
    });
    assert.equal(sample.length, 30);
    assert.equal(new Set(sample.map((asset) => asset.id)).size, 30);
    assert.deepEqual(
      Object.fromEntries([...new Set(sample.map((asset) => asset.category))].sort().map((category) => [category, sample.filter((asset) => asset.category === category).length])),
      { ambient: 6, axo: 6, feature: 6, ground: 6, header: 6 }
    );
    assert.deepEqual(
      [...new Set(sample.map((asset) => asset.festivalSlug))].sort(),
      ["christmas", "diwali", "durga-puja", "eid", "holi", "independence-day", "shared"]
    );
  });

  it("uses additive review tables without rewriting the governed library", () => {
    const migration = readFileSync(join(root, "database/migrations/20260801_festival_asset_review_batches.sql"), "utf8");
    assert.match(migration, /create table if not exists festival_asset_review_batches/);
    assert.match(migration, /create table if not exists festival_asset_review_items/);
    assert.doesNotMatch(migration, /update\s+(holiday_theme_assets|festival_asset_library)/i);
    assert.doesNotMatch(migration, /delete\s+from\s+(holiday_theme_assets|festival_asset_library)/i);
  });

  it("promotes only an approved exact version without public assignment", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    assert.match(repository, /saveHolidayThemeAsset/);
    assert.match(repository, /reviewHolidayThemeAsset/);
    assert.match(repository, /placements: \["private_reference"\]/);
    assert.doesNotMatch(repository, /assignFestivalAsset/);
  });

  it("keeps the remaining 90 locked behind a server-enforced 70% quality gate", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    assert.match(repository, /FESTIVAL_REVIEW_SAMPLE_SIZE = 30/);
    assert.match(repository, /approvalRate >= 70/);
    assert.match(repository, /qualityGateAllowsRemaining/);
    assert.match(repository, /!item\.is_representative/);
  });

  it("enforces universal, category-specific, scored and AXO interaction governance", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    const component = readFileSync(join(root, "components/admin/FestivalFounderReview.tsx"), "utf8");
    const standard = readFileSync(join(root, "lib/holiday/festival-review-standard.ts"), "utf8");
    assert.match(repository, /Complete mandatory review/);
    assert.match(repository, /Founder quality score is/);
    assert.match(repository, /score < 85/);
    assert.match(repository, /floating or incorrectly attached/);
    assert.match(repository, /culturalAttentionAcknowledged/);
    assert.match(repository, /Founder cultural review/);
    assert.match(standard, /grip_contact_aligned/);
    assert.match(standard, /no_floating_gap/);
    assert.match(standard, /natural_character_interaction/);
    assert.match(component, /AXO placement and interaction/);
    assert.match(component, /Founder quality score/);
    assert.match(component, /Approval requires 85\/100/);
    assert.match(component, /Review Details/);
    assert.match(component, /Add an improvement note/);
  });

  it("does not apply AXO alignment checks to Header, Ground, Ambient, or Feature decisions", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    const component = readFileSync(join(root, "components/admin/FestivalFounderReview.tsx"), "utf8");
    assert.match(repository, /if \(item\.category === "axo"\)/);
    assert.match(component, /activeItem\.category === "axo" \? \{ axoChecklist \} : \{\}/);
    assert.match(component, /Optional note for approval/);
  });

  it("recovers exact partial promotions and exposes actionable review conflicts", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    const route = readFileSync(join(root, "app/api/admin/website-experience/festival-review/route.ts"), "utf8");
    assert.match(repository, /where s3_key=\$1 and checksum_sha256=\$2 and variant=\$3/);
    assert.match(repository, /withDatabaseAdvisoryLock/);
    assert.match(repository, /This review changed in another session\. Refresh and retry\./);
    assert.match(repository, /This exact reviewed version is already approved/);
    assert.match(repository, /FestivalApprovalVersionConflict/);
    assert.match(repository, /approval_synchronised/);
    assert.match(repository, /approvalIdempotencyKey/);
    assert.match(repository, /ground: "decorative_overlay"/);
    assert.match(repository, /withDbTransaction/);
    assert.match(
      repository,
      /if \(input\.action === "approve"\)[\s\S]*reviewFestivalBatchItemUnlocked\(input\)/
    );
    assert.match(repository, /for update of item/);
    assert.match(repository, /Approval could not be saved/);
    assert.match(route, /x-correlation-id/);
    assert.match(route, /VERSION_CONFLICT/);
    assert.match(route, /Festival Founder review request failed/);
  });

  it("validates approved governed sources and hides failed current versions globally", () => {
    const integrity = readFileSync(join(root, "lib/holiday/festival-asset-integrity.ts"), "utf8");
    const migration = readFileSync(join(root, "database/migrations/20260804_festival_asset_integrity.sql"), "utf8");
    const publicResolver = readFileSync(join(root, "lib/holiday/public.ts"), "utf8");
    const assetRoute = readFileSync(join(root, "app/api/website-experience/assets/[assetId]/route.ts"), "utf8");
    const reviewRoute = readFileSync(join(root, "app/api/admin/website-experience/festival-review/route.ts"), "utf8");
    const component = readFileSync(join(root, "components/admin/FestivalFounderReview.tsx"), "utf8");
    assert.match(migration, /add column if not exists integrity_state/);
    assert.match(migration, /missing_source/);
    assert.match(integrity, /auditApprovedFestivalAssetIntegrity/);
    assert.match(integrity, /assertFestivalReviewSourceIntegrity/);
    assert.match(integrity, /The governed source checksum does not match/);
    assert.match(integrity, /repairThumbnail/);
    assert.match(integrity, /approval_state=\$2/);
    assert.match(publicResolver, /\(asset\.libraryApprovalState \|\| "approved"\) === "approved"/);
    assert.match(assetRoute, /\(asset\.library_approval_state \|\| "approved"\) !== "approved"/);
    assert.match(reviewRoute, /requestedAction === "audit_integrity"/);
    assert.match(component, /Verify Approved Assets/);
  });

  it("supports Approve and Next plus selected reviewed exact-version approval", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    const component = readFileSync(join(root, "components/admin/FestivalFounderReview.tsx"), "utf8");
    assert.match(repository, /real_context_previewed/);
    assert.match(repository, /must be opened in real-context preview before batch approval/);
    assert.match(repository, /approveSelectedReviewedFestivalAssets/);
    assert.match(component, /Approve &amp; Next/);
    assert.match(component, /Approve Selected Reviewed Assets/);
    assert.match(component, /Already Approved/);
    assert.match(component, /Needs Resolution/);
    assert.match(component, /Create as Next Version/);
    assert.match(component, /Keep Existing Approved Version/);
    assert.match(component, /Mark New Version Needs Improvement/);
    assert.match(component, /expectedReviewVersion/);
    assert.doesNotMatch(component, /Approve All Unseen/);
  });

  it("renders private real-context review controls without automatic approval", () => {
    const component = readFileSync(join(root, "components/admin/FestivalFounderReview.tsx"), "utf8");
    assert.match(component, /Review First 30/);
    assert.match(component, /Website Header placement/);
    assert.match(component, /Ground \/ page-bottom placement/);
    assert.match(component, /AXO placement and interaction/);
    assert.match(component, /Keyboard: A approve/);
    assert.match(component, /Tablet preview/);
    assert.match(component, /review_context_coverage/);
    assert.match(component, /Hand \/ prop alignment/);
    assert.match(component, /Public activation remains off/);
    assert.doesNotMatch(component, /autoApprove|automaticApproval/i);
  });

  it("registers new UAT uploads transactionally in a separate private review queue", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    const uploadRoute = readFileSync(join(root, "app/api/admin/website-experience/assets/route.ts"), "utf8");
    assert.match(repository, /FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY = "festival-uat-assets-v1"/);
    assert.match(repository, /withDbTransaction/);
    assert.match(repository, /values \(\$1,\$2,'in_review',\$3,1,\$4\)/);
    assert.match(repository, /existingVersionAssetId/);
    assert.match(repository, /existingLibraryAssetId/);
    assert.match(repository, /publicActivation: false/);
    assert.match(uploadRoute, /visualReviewRequired/);
    assert.match(uploadRoute, /assertFestivalUatAssetIsUnique/);
    assert.match(uploadRoute, /registerFestivalUatReviewAsset/);
    assert.match(uploadRoute, /asset role does not match its Visual Review category/i);
  });

  it("keeps UAT approval exact-version governed and independent of Batch 1's quality gate", () => {
    const repository = readFileSync(join(root, "lib/holiday/festival-review-batch.ts"), "utf8");
    assert.match(repository, /item\.batch_stable_key === FESTIVAL_REVIEW_BATCH_STABLE_KEY/);
    assert.match(repository, /asset\.previous_asset_id=library\.current_version_asset_id/);
    assert.match(repository, /newer\.version_number>asset\.version_number/);
    assert.match(repository, /asset\.review_status='pending_review'/);
    assert.match(repository, /This review item is no longer the current exact asset version/);
  });

  it("ships the two source-controlled Diwali UAT vectors without executable content", () => {
    for (const relativePath of [
      "public/festival-assets/uat/diwali/diwali-starlight-header-rail-v1.svg",
      "public/festival-assets/uat/diwali/diwali-axo-hand-lantern-v1.svg",
      "public/festival-assets/uat/diwali/diwali-axo-hand-lantern-v2.svg"
    ]) {
      const source = readFileSync(join(root, relativePath), "utf8");
      assert.match(source, /^<svg/);
      assert.match(source, /role="img"/);
      assert.doesNotMatch(source, /<script|onload=|javascript:/i);
      assert.doesNotMatch(source, /<text/i);
    }
  });

  it("keeps responsive AXO placement relative to the mascot bounds", () => {
    const standard = readFileSync(join(root, "lib/holiday/festival-review-standard.ts"), "utf8");
    const component = readFileSync(join(root, "components/holiday/HolidayDecorations.tsx"), "utf8");
    const review = readFileSync(join(root, "components/admin/FestivalFounderReview.tsx"), "utf8");
    const assetLibrary = readFileSync(join(root, "components/admin/FestivalAssetLibrary.tsx"), "utf8");
    assert.match(standard, /coordinateSpace: "axo_bounds" \| "anchor_box"/);
    assert.match(standard, /Record<"desktop" \| "tablet" \| "mobile"/);
    assert.match(component, /FestivalAxoAssetLayer/);
    assert.match(component, /--axo-left-tablet/);
    assert.match(component, /--axo-left-mobile/);
    assert.match(review, /aspect-\[752\/1159\]/);
    assert.match(assetLibrary, /Artwork framing/);
    assert.match(assetLibrary, /reviewedAxoPlacement/);
    assert.match(assetLibrary, /data\.set\(\s*"axoPlacement"/);
  });
});
