import "server-only";

import { ApiError, badRequest } from "@/lib/api/response";
import {
  dbQuery,
  withDatabaseAdvisoryLock,
  withDbTransaction
} from "@/lib/db";
import { reviewHolidayThemeAsset, saveHolidayThemeAsset } from "./repository";
import {
  assertFestivalReviewSourceIntegrity,
  getFestivalAssetIntegritySummary
} from "./festival-asset-integrity";
import type { HolidayAssetRole } from "./types";
import {
  FESTIVAL_REVIEW_CONTEXTS,
  FESTIVAL_REVIEW_UNIVERSAL_CHECKS,
  festivalReviewChecklistFailures,
  festivalReviewMissingContexts,
  festivalReviewScore,
  festivalReviewScoreComplete,
  festivalReviewSpecificChecks,
  type FestivalReviewAxoCheck,
  type FestivalReviewChecklist,
  type FestivalReviewInteractionResult,
  type FestivalReviewScores
} from "./festival-review-standard";

export { FESTIVAL_REVIEW_AXO_CHECKS } from "./festival-review-standard";

export type FestivalReviewCollection = "review_first" | "remaining" | "all";
export type FestivalReviewBatchKey =
  | "festival-review-batch-1"
  | "festival-uat-assets-v1";
type ReviewState =
  | "visual_review_required"
  | "approved"
  | "rejected"
  | "improvement_requested"
  | "hidden"
  | "source_required";

export const FESTIVAL_REVIEW_BATCH_STABLE_KEY = "festival-review-batch-1";
export const FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY = "festival-uat-assets-v1";
export const FESTIVAL_REVIEW_SAMPLE_SIZE = 30;

type AxoCheckState = "pass" | "issue";

export type FestivalReviewDecisionMetadata = {
  collection?: FestivalReviewCollection;
  culturalAttentionAcknowledged?: boolean;
  universalChecklist?: FestivalReviewChecklist;
  specificChecklist?: FestivalReviewChecklist;
  axoChecklist?: Partial<Record<FestivalReviewAxoCheck, AxoCheckState>>;
  scores?: FestivalReviewScores;
  interactionResult?: FestivalReviewInteractionResult;
};

type ReviewItemRow = {
  id: string;
  stable_asset_id: string;
  display_name: string;
  festival_slug: string;
  festival_name: string;
  category: string;
  source_s3_key: string;
  checksum_sha256: string;
  mime_type: string;
  width: number;
  height: number;
  review_state: ReviewState;
  review_note: string | null;
  promoted_library_asset_id: string | null;
  promoted_version_asset_id: string | null;
  metadata_json: Record<string, unknown> | null;
  is_representative: boolean;
  batch_stable_key: string;
  updated_at: Date | string;
};

type ReviewableAssetRow = {
  id: string;
  theme_id: string;
  asset_role: HolidayAssetRole;
  variant: string;
  s3_key: string;
  checksum_sha256: string | null;
  review_status: string;
  library_asset_id: string | null;
};

type GovernedVersionRow = ReviewableAssetRow & {
  version_number: number;
  approved_at: Date | string | null;
  approved_by: string | null;
  library_approval_state: string;
  library_lifecycle_state: string;
  current_version_asset_id: string | null;
};

type TransactionQuery = <R extends import("pg").QueryResultRow>(
  text: string,
  values?: unknown[]
) => Promise<R[]>;

type ReviewQueryOptions = {
  page?: number;
  pageSize?: number;
  festival?: string;
  category?: string;
  state?: string;
  collection?: FestivalReviewCollection;
  batchKey?: FestivalReviewBatchKey;
};

const roleByCategory: Record<string, HolidayAssetRole> = {
  header: "header",
  ground: "decorative_overlay",
  axo: "axo",
  ambient: "particle_overlay",
  feature: "decorative_overlay"
};

export type FestivalApprovalVersionComparison = {
  reviewItemId: string;
  existing: {
    libraryAssetId: string;
    versionAssetId: string;
    version: number;
    checksumSha256: string;
    approvalDate: string | null;
    reviewerId: string | null;
  };
  reviewed: {
    version: number;
    checksumSha256: string;
    reviewDate: string;
  };
};

export class FestivalApprovalVersionConflict extends Error {
  comparison: FestivalApprovalVersionComparison;

  constructor(comparison: FestivalApprovalVersionComparison) {
    super(
      "A different approved version exists. Compare both versions before replacing or creating a new version."
    );
    this.name = "FestivalApprovalVersionConflict";
    this.comparison = comparison;
  }
}

// The sample is deliberately deterministic rather than appearance-curated.
// It covers all seven festival groups and includes exactly six items per category.
export const REVIEW_FIRST_TARGETS = [
  ["independence-day", "header"],
  ["diwali", "header"],
  ["holi", "header"],
  ["durga-puja", "header"],
  ["eid", "header"],
  ["christmas", "header"],
  ["shared", "ground"],
  ["independence-day", "ground"],
  ["diwali", "ground"],
  ["holi", "ground"],
  ["durga-puja", "ground"],
  ["eid", "ground"],
  ["christmas", "axo"],
  ["shared", "axo"],
  ["independence-day", "axo"],
  ["diwali", "axo"],
  ["holi", "axo"],
  ["durga-puja", "axo"],
  ["eid", "ambient"],
  ["christmas", "ambient"],
  ["shared", "ambient"],
  ["independence-day", "ambient"],
  ["diwali", "ambient"],
  ["holi", "ambient"],
  ["durga-puja", "feature"],
  ["eid", "feature"],
  ["christmas", "feature"],
  ["shared", "feature"],
  ["independence-day", "feature"],
  ["diwali", "feature"]
] as const;

function representativeCte() {
  const values = REVIEW_FIRST_TARGETS.map(
    ([festival, category], index) =>
      `('${festival}'::text,'${category}'::text,${index + 1}::int)`
  ).join(",");
  return `
    representative_targets(festival_slug,category,sort_order) as (values ${values}),
    representative_items as (
      select candidate.id,target.sort_order
      from representative_targets target
      cross join lateral (
        select item.id
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        where batch.stable_key='${FESTIVAL_REVIEW_BATCH_STABLE_KEY}'
          and item.festival_slug=target.festival_slug
          and item.category=target.category
        order by item.stable_asset_id
        limit 1
      ) candidate
    )`;
}

function restrictionList(metadata: Record<string, unknown> | null) {
  const restrictions = metadata?.restrictions;
  return Array.isArray(restrictions)
    ? restrictions.filter((value): value is string => typeof value === "string")
    : [];
}

function getCulturalFlags(item: {
  festival_slug: string;
  display_name: string;
  metadata_json: Record<string, unknown> | null;
}) {
  const genericFragments = [
    "founder approval required",
    "do not cover axo"
  ];
  const restrictions = restrictionList(item.metadata_json).filter(
    (restriction) =>
      !genericFragments.some((fragment) =>
        restriction.toLowerCase().includes(fragment)
      )
  );
  const sensitiveFestivals = new Set([
    "independence-day",
    "durga-puja",
    "eid",
    "diwali"
  ]);
  const sensitiveWords =
    /flag|chakra|national|religious|ceremonial|diya|rangoli|alpana|conch|dhunuchi|dhaak|crescent|mosque|lantern|puja|durga|eid/i;
  if (
    restrictions.length === 0 &&
    (sensitiveFestivals.has(item.festival_slug) ||
      sensitiveWords.test(item.display_name))
  ) {
    restrictions.push(
      "Founder cultural review is required for this national, religious or ceremonial motif."
    );
  }
  return restrictions;
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function percentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

export async function getFestivalReviewBatch({
  page = 1,
  pageSize = 30,
  festival = "",
  category = "",
  state = "",
  collection = "review_first",
  batchKey = FESTIVAL_REVIEW_BATCH_STABLE_KEY
}: ReviewQueryOptions = {}) {
  const selectedBatchKey = batchKey === FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY
    ? FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY
    : FESTIVAL_REVIEW_BATCH_STABLE_KEY;
  const isUatBatch = selectedBatchKey === FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY;
  const selectedCollection = isUatBatch ? "all" : collection;
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(48, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;
  const values: unknown[] = [selectedBatchKey];
  const filters: string[] = ["batch.stable_key = $1"];
  const add = (column: string, value: string) => {
    if (value) {
      values.push(value);
      filters.push(`${column} = $${values.length}`);
    }
  };
  add("item.festival_slug", festival);
  add("item.category", category);
  add("item.review_state", state);

  const qualityResult = isUatBatch
    ? await dbQuery(`
        select count(*)::int sample_size,
          count(*) filter(where item.review_state not in ('visual_review_required','source_required'))::int reviewed,
          count(*) filter(where item.review_state='visual_review_required')::int pending,
          count(*) filter(where item.review_state='approved')::int approved,
          count(*) filter(where item.review_state='improvement_requested')::int improvement_requested,
          count(*) filter(where item.review_state='rejected')::int rejected,
          count(*) filter(where item.review_state='hidden')::int hidden
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        where batch.stable_key=$1
      `, [selectedBatchKey])
    : await dbQuery(`
        with ${representativeCte()}
        select count(*)::int sample_size,
          count(*) filter(where item.review_state not in ('visual_review_required','source_required'))::int reviewed,
          count(*) filter(where item.review_state='visual_review_required')::int pending,
          count(*) filter(where item.review_state='approved')::int approved,
          count(*) filter(where item.review_state='improvement_requested')::int improvement_requested,
          count(*) filter(where item.review_state='rejected')::int rejected,
          count(*) filter(where item.review_state='hidden')::int hidden
        from representative_items representative
        join festival_asset_review_items item on item.id=representative.id
      `);
  const qualityRow = qualityResult.rows[0] || {};
  const sampleSize = safeNumber(qualityRow.sample_size);
  const reviewed = safeNumber(qualityRow.reviewed);
  const approved = safeNumber(qualityRow.approved);
  const improvementRequested = safeNumber(qualityRow.improvement_requested);
  const rejected = safeNumber(qualityRow.rejected);
  const hidden = safeNumber(qualityRow.hidden);
  const approvalRate = percentage(approved, sampleSize);
  const gateState = isUatBatch
    ? "passed"
    : reviewed < FESTIVAL_REVIEW_SAMPLE_SIZE
      ? "awaiting_decisions"
      : approvalRate >= 70
        ? "passed"
        : "stopped";
  const canReviewRemaining = isUatBatch || gateState === "passed";

  const collectionFilter =
    selectedCollection === "review_first"
      ? "representative.id is not null"
      : selectedCollection === "remaining"
        ? "representative.id is null"
        : "true";

  let result = { rows: [] as Array<Record<string, unknown>> };
  if (selectedCollection !== "remaining" || canReviewRemaining) {
    values.push(safePageSize, offset);
    result = await dbQuery(
      `
        with ${representativeCte()}
        select item.id,item.stable_asset_id,item.display_name,item.festival_slug,item.festival_name,
          item.category,item.subcategory,item.review_state,item.review_note,item.metadata_json,
          item.width,item.height,item.checksum_sha256,item.reviewed_at,
          item.promoted_library_asset_id,item.promoted_version_asset_id,item.created_at,
          item.updated_at,
          batch.stable_key as batch_stable_key,
          representative.sort_order,representative.id is not null as is_representative,
          (
            select count(distinct concat(
              preview_audit.safe_metadata->>'viewport',
              ':',
              preview_audit.safe_metadata->>'appearance'
            )) = ${FESTIVAL_REVIEW_CONTEXTS.length}
            from festival_asset_review_audit preview_audit
            where preview_audit.review_item_id=item.id
              and preview_audit.action='real_context_previewed'
              and preview_audit.safe_metadata->>'reviewVersion'=
                to_char(item.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
              and preview_audit.safe_metadata ? 'viewport'
              and preview_audit.safe_metadata ? 'appearance'
          ) as reviewed_in_context,
          coalesce((
            select array_agg(distinct concat(
              preview_audit.safe_metadata->>'viewport',
              ':',
              preview_audit.safe_metadata->>'appearance'
            ))
            from festival_asset_review_audit preview_audit
            where preview_audit.review_item_id=item.id
              and preview_audit.action='real_context_previewed'
              and preview_audit.safe_metadata->>'reviewVersion'=
                to_char(item.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
              and preview_audit.safe_metadata ? 'viewport'
              and preview_audit.safe_metadata ? 'appearance'
          ),array[]::text[]) as review_context_coverage,
          latest_audit.safe_metadata->'reviewMetadata' as founder_review_metadata,
          count(*) over()::int as filtered_count
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        left join representative_items representative on representative.id=item.id
        left join lateral (
          select audit.safe_metadata
          from festival_asset_review_audit audit
          where audit.review_item_id=item.id
            and audit.safe_metadata ? 'reviewMetadata'
          order by audit.created_at desc
          limit 1
        ) latest_audit on true
        where ${filters.join(" and ")} and ${collectionFilter}
        order by coalesce(representative.sort_order,1000),item.festival_name,item.category,item.display_name
        limit $${values.length - 1} offset $${values.length}
      `,
      values
    );
  }

  const [summaryResult, breakdownResult, recurringIssueResult] =
    await Promise.all([
      dbQuery(`
        select count(*)::int total,
          count(*) filter(where item.review_state='visual_review_required')::int review_required,
          count(*) filter(where item.review_state='approved')::int approved,
          count(*) filter(where item.review_state='rejected')::int rejected,
          count(*) filter(where item.review_state='improvement_requested')::int improvement_requested,
          count(*) filter(where item.review_state='hidden')::int hidden
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        where batch.stable_key=$1
      `, [selectedBatchKey]),
      dbQuery(`
        select 'festival' dimension,item.festival_slug key,max(item.festival_name) label,
          count(*)::int total,
          count(*) filter(where item.review_state='visual_review_required')::int pending,
          count(*) filter(where item.review_state='approved')::int approved,
          count(*) filter(where item.review_state='improvement_requested')::int improvement_requested,
          count(*) filter(where item.review_state='rejected')::int rejected,
          count(*) filter(where item.review_state='hidden')::int hidden
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        where batch.stable_key=$1
        group by item.festival_slug
        union all
        select 'category' dimension,item.category key,initcap(item.category) label,
          count(*)::int total,
          count(*) filter(where item.review_state='visual_review_required')::int pending,
          count(*) filter(where item.review_state='approved')::int approved,
          count(*) filter(where item.review_state='improvement_requested')::int improvement_requested,
          count(*) filter(where item.review_state='rejected')::int rejected,
          count(*) filter(where item.review_state='hidden')::int hidden
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        where batch.stable_key=$1
        group by item.category
        order by dimension,label
      `, [selectedBatchKey]),
      dbQuery(`
        select min(item.review_note) issue,count(*)::int count
        from festival_asset_review_items item
        join festival_asset_review_batches batch on batch.id=item.batch_id
        where batch.stable_key=$1
          and item.review_state in ('improvement_requested','rejected')
          and nullif(trim(item.review_note),'') is not null
        group by lower(trim(item.review_note))
        having count(*) > 1
        order by count(*) desc,min(item.review_note)
        limit 5
      `, [selectedBatchKey])
    ]);

  const items = result.rows.map((row) => {
    const typed = row as ReviewItemRow & Record<string, unknown>;
    const culturalFlags = getCulturalFlags(typed);
    return {
      ...row,
      updated_at: reviewVersion(typed.updated_at),
      cultural_attention_required: culturalFlags.length > 0,
      cultural_flags: culturalFlags
    };
  });
  const filteredCount = Number(result.rows[0]?.filtered_count || 0);

  const integrity = await getFestivalAssetIntegritySummary();
  return {
    items,
    summary: summaryResult.rows[0] || {},
    breakdowns: breakdownResult.rows,
    recurringIssues: recurringIssueResult.rows,
    qualityGate: {
      sampleSize,
      reviewed,
      pending: safeNumber(qualityRow.pending),
      approved,
      improvementRequested,
      rejected,
      hidden,
      approvalRate,
      improvementRate: percentage(improvementRequested, sampleSize),
      rejectionRate: percentage(rejected, sampleSize),
      state: gateState,
      canReviewRemaining
    },
    collection: selectedCollection,
    batchKey: selectedBatchKey,
    batchName: isUatBatch ? "Festival Studio UAT Assets" : "Founder Visual Review - Batch 1",
    integrity,
    filteredCount,
    page: safePage,
    pageSize: safePageSize
  };
}

async function resolveThemeId(festivalSlug: string) {
  const aliases: Record<string, string[]> = {
    eid: ["eid-al-fitr", "eid-al-adha", "eid"],
    shared: ["custom-event"]
  };
  const candidates = aliases[festivalSlug] || [festivalSlug];
  const result = await dbQuery<{ id: string }>(
    "select id from holiday_themes where slug=any($1::text[]) and status<>'archived' order by array_position($1::text[],slug) limit 1",
    [candidates]
  );
  if (!result.rows[0]) {
    throw badRequest(
      "A compatible festival theme is required before approval."
    );
  }
  return result.rows[0].id;
}

function validateApprovalChecks(
  item: ReviewItemRow,
  reviewMetadata: FestivalReviewDecisionMetadata
) {
  const universal = festivalReviewChecklistFailures(
    FESTIVAL_REVIEW_UNIVERSAL_CHECKS,
    reviewMetadata.universalChecklist
  );
  if (universal.issues.length > 0) {
    throw badRequest(
      `Approval blocked by: ${universal.issues.map(([, label]) => label).join(", ")}. Use Needs Improvement or Reject.`
    );
  }
  if (universal.incomplete.length > 0) {
    throw badRequest(
      `Complete mandatory review: ${universal.incomplete.map(([, label]) => label).join(", ")}.`
    );
  }

  const metadata = item.metadata_json || {};
  const supportedRegions = Array.isArray(metadata.supportedRegions)
    ? metadata.supportedRegions.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const specificChecks = festivalReviewSpecificChecks(
    item.category,
    supportedRegions
  );
  const specific = festivalReviewChecklistFailures(
    specificChecks,
    item.category === "axo"
      ? reviewMetadata.axoChecklist
      : reviewMetadata.specificChecklist
  );
  if (specific.issues.length > 0) {
    throw badRequest(
      `Approval blocked by: ${specific.issues.map(([, label]) => label).join(", ")}. Use Needs Improvement or Reject.`
    );
  }
  if (specific.incomplete.length > 0) {
    throw badRequest(
      `Complete ${item.category.toUpperCase()} review: ${specific.incomplete.map(([, label]) => label).join(", ")}.`
    );
  }

  if (!festivalReviewScoreComplete(reviewMetadata.scores)) {
    throw badRequest("Complete every Founder quality score before approval.");
  }
  const score = festivalReviewScore(reviewMetadata.scores);
  if (score < 85) {
    throw badRequest(
      `Founder quality score is ${score}/100. Approval requires at least 85/100.`
    );
  }

  if (item.category === "axo") {
    if (!reviewMetadata.interactionResult) {
      throw badRequest("Record the AXO Prop Interaction and Attachment result.");
    }
    if (
      ["floating_incorrect", "needs_improvement"].includes(
        reviewMetadata.interactionResult
      )
    ) {
      throw badRequest(
        "The AXO prop is floating or incorrectly attached. Use Needs Improvement and record the placement correction."
      );
    }
  }
  if (
    getCulturalFlags(item).length > 0 &&
    reviewMetadata.culturalAttentionAcknowledged !== true
  ) {
    throw badRequest(
      "Confirm the Founder cultural review before approving this exact version."
    );
  }
}

async function festivalReviewContextCoverage(
  itemId: string,
  version: string
) {
  const result = await dbQuery<{ contexts: string[] }>(
    `select coalesce(array_agg(distinct concat(
       safe_metadata->>'viewport',':',safe_metadata->>'appearance'
     )),array[]::text[]) contexts
     from festival_asset_review_audit
     where review_item_id=$1
       and action='real_context_previewed'
       and safe_metadata->>'reviewVersion'=$2
       and safe_metadata ? 'viewport'
       and safe_metadata ? 'appearance'`,
    [itemId, version]
  );
  return result.rows[0]?.contexts || [];
}

async function assertFestivalReviewContextCoverage(
  itemId: string,
  version: string
) {
  const contexts = await festivalReviewContextCoverage(itemId, version);
  const missing = festivalReviewMissingContexts(contexts);
  if (missing.length > 0) {
    throw badRequest(
      `Open the real placement preview for: ${missing.join(", ")}.`
    );
  }
}

function reviewVersion(value: Date | string) {
  return new Date(value).toISOString();
}

function assertExpectedReviewVersion(
  item: ReviewItemRow,
  expectedReviewVersion: string
) {
  const expected = new Date(expectedReviewVersion);
  if (
    !expectedReviewVersion ||
    Number.isNaN(expected.getTime()) ||
    expected.toISOString() !== reviewVersion(item.updated_at)
  ) {
    throw badRequest(
      "This review changed in another session. Refresh and retry."
    );
  }
}

function actionablePromotionError(error: unknown) {
  if (error instanceof FestivalApprovalVersionConflict) return error;
  if (error instanceof ApiError) return error;
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (["40001", "40P01", "55P03"].includes(code)) {
    return badRequest(
      "This asset was updated in another session. The latest state has been loaded."
    );
  }
  if (code === "23505") {
    return badRequest(
      "This exact reviewed version is already approved. The review status has been synchronised."
    );
  }
  return new ApiError(
    500,
    "SERVER_ERROR",
    "Approval could not be saved."
  );
}

function reviewedAssetVersion(item: ReviewItemRow) {
  const version = Number(item.metadata_json?.version || 1);
  return Number.isInteger(version) && version > 0 ? version : 1;
}

function approvalIdempotencyKey(item: ReviewItemRow) {
  return [
    item.id,
    reviewedAssetVersion(item),
    item.checksum_sha256,
    "approve"
  ].join(":");
}

async function governedVersionsForReview(
  query: TransactionQuery,
  item: ReviewItemRow
) {
  const metadata = item.metadata_json || {};
  const existingVersionAssetId =
    typeof metadata.existingVersionAssetId === "string"
      ? metadata.existingVersionAssetId
      : null;
  const existingLibraryAssetId =
    typeof metadata.existingLibraryAssetId === "string"
      ? metadata.existingLibraryAssetId
      : null;
  return query<GovernedVersionRow>(
    `select asset.id,asset.theme_id,asset.asset_role,asset.variant,asset.s3_key,
            asset.checksum_sha256,asset.review_status,asset.library_asset_id,
            asset.version_number,asset.approved_at,asset.approved_by,
            library.approval_state as library_approval_state,
            library.lifecycle_state as library_lifecycle_state,
            library.current_version_asset_id
     from holiday_theme_assets asset
     join festival_asset_library library on library.id=asset.library_asset_id
     where asset.variant=$1
        or asset.s3_key=$2
        or asset.checksum_sha256=$3
        or ($4::uuid is not null and asset.id=$4::uuid)
        or ($5::uuid is not null and asset.library_asset_id=$5::uuid)
     order by asset.version_number desc,asset.created_at desc
     for update of asset,library`,
    [
      item.stable_asset_id,
      item.source_s3_key,
      item.checksum_sha256,
      existingVersionAssetId,
      existingLibraryAssetId
    ]
  );
}

function exactGovernedVersion(
  item: ReviewItemRow,
  versions: GovernedVersionRow[]
) {
  const metadata = item.metadata_json || {};
  const existingVersionAssetId =
    typeof metadata.existingVersionAssetId === "string"
      ? metadata.existingVersionAssetId
      : null;
  return versions.find(
    (version) =>
      version.checksum_sha256 === item.checksum_sha256 &&
      (version.id === existingVersionAssetId ||
        version.variant === item.stable_asset_id ||
        version.s3_key === item.source_s3_key)
  ) || null;
}

function conflictingGovernedVersion(
  item: ReviewItemRow,
  versions: GovernedVersionRow[]
) {
  const metadata = item.metadata_json || {};
  const existingVersionAssetId =
    typeof metadata.existingVersionAssetId === "string"
      ? metadata.existingVersionAssetId
      : null;
  const existingLibraryAssetId =
    typeof metadata.existingLibraryAssetId === "string"
      ? metadata.existingLibraryAssetId
      : null;
  const submittedVersion = reviewedAssetVersion(item);
  return versions.find(
    (version) =>
      version.checksum_sha256 !== item.checksum_sha256 &&
      version.review_status === "approved" &&
      version.library_lifecycle_state === "active" &&
      version.version_number === submittedVersion &&
      (version.id === existingVersionAssetId ||
        version.library_asset_id === existingLibraryAssetId ||
        version.variant === item.stable_asset_id ||
        version.s3_key === item.source_s3_key)
  ) || null;
}

function versionConflict(
  item: ReviewItemRow,
  existing: GovernedVersionRow
) {
  return new FestivalApprovalVersionConflict({
    reviewItemId: item.id,
    existing: {
      libraryAssetId: existing.library_asset_id as string,
      versionAssetId: existing.id,
      version: existing.version_number,
      checksumSha256: existing.checksum_sha256 || "",
      approvalDate: existing.approved_at
        ? new Date(existing.approved_at).toISOString()
        : null,
      reviewerId: existing.approved_by
    },
    reviewed: {
      version: reviewedAssetVersion(item),
      checksumSha256: item.checksum_sha256,
      reviewDate: reviewVersion(item.updated_at)
    }
  });
}

async function approveFestivalReviewItemTransaction({
  itemId,
  note,
  actorId,
  expectedReviewVersion,
  reviewMetadata,
  conflictResolution = "none"
}: {
  itemId: string;
  note: string;
  actorId: string;
  expectedReviewVersion: string;
  reviewMetadata: FestivalReviewDecisionMetadata;
  conflictResolution?: "none" | "create_next_version";
}) {
  const preflight = await dbQuery<ReviewItemRow>(
    `select item.*,batch.stable_key as batch_stable_key,false as is_representative
     from festival_asset_review_items item
     join festival_asset_review_batches batch on batch.id=item.batch_id
     where item.id=$1`,
    [itemId]
  );
  const preflightItem = preflight.rows[0];
  if (!preflightItem) throw badRequest("The review asset was not found.");
  if (preflightItem.review_state !== "approved") {
    await assertFestivalReviewContextCoverage(
      preflightItem.id,
      reviewVersion(preflightItem.updated_at)
    );
  }
  const preflightMetadata = preflightItem.metadata_json || {};
  const preflightRegions = Array.isArray(preflightMetadata.supportedRegions)
    ? preflightMetadata.supportedRegions.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  await assertFestivalReviewSourceIntegrity({
    reviewItemId: preflightItem.id,
    sourceS3Key: preflightItem.source_s3_key,
    checksumSha256: preflightItem.checksum_sha256,
    mimeType: preflightItem.mime_type,
    category: preflightItem.category,
    usageLocations: preflightRegions
  });
  return withDbTransaction(async (query) => {
    const rows = await query<ReviewItemRow>(
      `select item.*,batch.stable_key as batch_stable_key,false as is_representative
       from festival_asset_review_items item
       join festival_asset_review_batches batch on batch.id=item.batch_id
       where item.id=$1
       for update of item`,
      [itemId]
    );
    const item = rows[0];
    if (!item) throw badRequest("The review asset was not found.");

    const versions = await governedVersionsForReview(query, item);
    const exact = exactGovernedVersion(item, versions);
    const conflict = conflictingGovernedVersion(item, versions);
    const exactApproved =
      exact?.review_status === "approved" &&
      exact.library_approval_state === "approved" &&
      exact.library_lifecycle_state === "active";

    if (!exactApproved) {
      assertExpectedReviewVersion(item, expectedReviewVersion);
      validateApprovalChecks(item, reviewMetadata);
    }

    if (conflict && !exact && conflictResolution !== "create_next_version") {
      throw versionConflict(item, conflict);
    }

    const metadata = item.metadata_json || {};
    const supportedRegions = Array.isArray(metadata.supportedRegions)
      ? metadata.supportedRegions.filter(
          (value): value is string => typeof value === "string"
        )
      : [];
    const idempotencyKey = approvalIdempotencyKey(item);
    let governed = exact;
    const outcome: "approved" | "already_approved" = exactApproved
      ? "already_approved"
      : "approved";

    if (!governed || (conflict && conflictResolution === "create_next_version")) {
      const aliases: Record<string, string[]> = {
        eid: ["eid-al-fitr", "eid-al-adha", "eid"],
        shared: ["custom-event"]
      };
      const candidates = aliases[item.festival_slug] || [item.festival_slug];
      const themes = await query<{ id: string }>(
        `select id from holiday_themes
         where slug=any($1::text[]) and status<>'archived'
         order by array_position($1::text[],slug)
         limit 1
         for update`,
        [candidates]
      );
      if (!themes[0]) {
        throw badRequest("A compatible festival theme is required before approval.");
      }

      const role = roleByCategory[item.category] || "supporting";
      const conflictLibraryId =
        conflictResolution === "create_next_version" && conflict
          ? conflict.library_asset_id
          : null;
      const previousVersionId = conflictLibraryId
        ? versions.find(
            (version) =>
              version.library_asset_id === conflictLibraryId &&
              version.id === version.current_version_asset_id
          )?.id || conflict?.id || null
        : null;
      const versionNumber = conflictLibraryId
        ? Math.max(
            0,
            ...versions
              .filter((version) => version.library_asset_id === conflictLibraryId)
              .map((version) => version.version_number)
          ) + 1
        : reviewedAssetVersion(item);
      const fileSize =
        typeof metadata.fileSize === "number" ? metadata.fileSize : 0;
      const inserted = await query<{ id: string }>(
        `insert into holiday_theme_assets (
           theme_id,asset_role,variant,s3_key,safe_file_name,mime_type,file_size,
           checksum_sha256,asset_metadata,status,review_status,quality_status,
           version_number,previous_asset_id,library_asset_id,version_state,
           uploaded_by,approved_by,approved_at,clarity_confirmation_by,
           clarity_confirmation_at,intended_object,intended_festival,
           asset_category,visual_style,usage_locations
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'active','approved','approved',
           $10,$11,$12,'current',$13,$13,now(),$13,now(),$14,$15,$16,
           'WriteX source-controlled festival vector',$17::text[]
         ) returning id`,
        [
          themes[0].id,
          role,
          item.stable_asset_id,
          item.source_s3_key,
          `${item.display_name}.svg`,
          item.mime_type,
          fileSize,
          item.checksum_sha256,
          JSON.stringify({
            storage: "private_s3",
            purpose: "library_unassigned",
            replacementMode: conflictLibraryId ? "keep_both" : "new_library",
            sourceDimensions: {
              width: item.width,
              height: item.height,
              format: "svg"
            },
            embeddedUiState: "no_embedded_ui",
            batchStableAssetId: item.stable_asset_id,
            reviewCollection: item.batch_stable_key,
            reviewMetadata,
            approvalIdempotencyKey: idempotencyKey
          }),
          versionNumber,
          previousVersionId,
          conflictLibraryId,
          actorId,
          item.display_name,
          item.festival_slug,
          item.category,
          supportedRegions
        ]
      );
      const versionAssetId = inserted[0]?.id;
      if (!versionAssetId) {
        throw new ApiError(500, "SERVER_ERROR", "Asset record could not be created.");
      }
      const libraryAssetId = conflictLibraryId || versionAssetId;
      if (!conflictLibraryId) {
        await query(
          `insert into festival_asset_library (
             id,owner_theme_id,display_name,default_purpose,asset_type,
             approval_state,lifecycle_state,current_version_asset_id,
             uploaded_by,updated_by
           ) values ($1,$2,$3,'library_unassigned','image','approved','active',$1,$4,$4)`,
          [libraryAssetId, themes[0].id, item.display_name, actorId]
        );
        await query(
          "update holiday_theme_assets set library_asset_id=$2 where id=$1",
          [versionAssetId, libraryAssetId]
        );
      } else {
        await query(
          `update holiday_theme_assets
           set version_state=case when id=$2 then 'current' else 'previous' end,
               updated_at=now()
           where library_asset_id=$1`,
          [libraryAssetId, versionAssetId]
        );
        await query(
          `update festival_asset_library
           set current_version_asset_id=$2,approval_state='approved',
               lifecycle_state='active',display_name=$3,updated_by=$4,updated_at=now()
           where id=$1`,
          [libraryAssetId, versionAssetId, item.display_name, actorId]
        );
      }
      governed = {
        id: versionAssetId,
        theme_id: themes[0].id,
        asset_role: role,
        variant: item.stable_asset_id,
        s3_key: item.source_s3_key,
        checksum_sha256: item.checksum_sha256,
        review_status: "approved",
        library_asset_id: libraryAssetId,
        version_number: versionNumber,
        approved_at: new Date(),
        approved_by: actorId,
        library_approval_state: "approved",
        library_lifecycle_state: "active",
        current_version_asset_id: versionAssetId
      };
    } else if (!exactApproved) {
      await query(
        `update holiday_theme_assets
         set status='active',review_status='approved',quality_status='approved',
             approved_at=coalesce(approved_at,now()),approved_by=coalesce(approved_by,$2),
             clarity_confirmation_at=coalesce(clarity_confirmation_at,now()),
             clarity_confirmation_by=coalesce(clarity_confirmation_by,$2),
             intended_object=$3,intended_festival=$4,asset_category=$5,
             visual_style='WriteX source-controlled festival vector',
             usage_locations=$6::text[],
             asset_metadata=coalesce(asset_metadata,'{}'::jsonb)||$7::jsonb,
             updated_at=now()
         where id=$1`,
        [
          governed.id,
          actorId,
          item.display_name,
          item.festival_slug,
          item.category,
          supportedRegions,
          JSON.stringify({
            batchStableAssetId: item.stable_asset_id,
            reviewCollection: item.batch_stable_key,
            reviewMetadata,
            approvalIdempotencyKey: idempotencyKey
          })
        ]
      );
      await query(
        `update festival_asset_library
         set approval_state='approved',lifecycle_state='active',
             current_version_asset_id=$2,display_name=$3,updated_by=$4,updated_at=now()
         where id=$1`,
        [governed.library_asset_id, governed.id, item.display_name, actorId]
      );
    }

    if (!governed?.library_asset_id) {
      throw new ApiError(500, "SERVER_ERROR", "Governed asset linkage was not saved.");
    }

    await query(
      `insert into festival_asset_audit (
         library_asset_id,asset_version_id,actor_admin_user_id,action,safe_metadata
       )
       select $1,$2,$3,'version_approved',$4::jsonb
       where not exists (
         select 1 from festival_asset_audit
         where library_asset_id=$1 and asset_version_id=$2 and action='version_approved'
           and safe_metadata->>'approvalIdempotencyKey'=$5
       )`,
      [
        governed.library_asset_id,
        governed.id,
        actorId,
        JSON.stringify({
          approvalIdempotencyKey: idempotencyKey,
          source: item.batch_stable_key,
          publicActivation: false
        }),
        idempotencyKey
      ]
    );

    const decisionTimestamp = governed.approved_at
      ? new Date(governed.approved_at).toISOString()
      : null;
    const updated = await query<{ updated_at: Date | string }>(
      `update festival_asset_review_items
       set review_state='approved',review_note=coalesce(review_note,$2),
           reviewed_by=coalesce(reviewed_by,$3,$4),
           reviewed_at=coalesce(reviewed_at,$5::timestamptz,now()),
           promoted_library_asset_id=$6,promoted_version_asset_id=$7,
           updated_at=case
             when review_state<>'approved'
               or promoted_library_asset_id is distinct from $6
               or promoted_version_asset_id is distinct from $7
             then now()
             else updated_at
           end
       where id=$1
       returning updated_at`,
      [
        item.id,
        note || null,
        governed.approved_by,
        actorId,
        decisionTimestamp,
        governed.library_asset_id,
        governed.id
      ]
    );
    await query(
      `insert into festival_asset_review_audit (
         review_item_id,actor_admin_user_id,action,previous_state,next_state,safe_metadata
       )
       select $1,$2,$3,$4,'approved',$5::jsonb
       where not exists (
         select 1 from festival_asset_review_audit
         where review_item_id=$1
           and safe_metadata->>'approvalIdempotencyKey'=$6
       )`,
      [
        item.id,
        exactApproved ? governed.approved_by || actorId : actorId,
        exactApproved ? "approval_synchronised" : "approve",
        item.review_state,
        JSON.stringify({
          approvalIdempotencyKey: idempotencyKey,
          checksumSha256: item.checksum_sha256,
          version: governed.version_number,
          outcome,
          reviewMetadata,
          publicActivation: false
        }),
        idempotencyKey
      ]
    );
    return {
      state: "approved" as const,
      outcome,
      message: exactApproved
        ? "This exact reviewed version is already approved. The review status has been synchronised."
        : "Approved exact reviewed version for the governed library.",
      reviewVersion: reviewVersion(updated[0]?.updated_at || item.updated_at),
      libraryAssetId: governed.library_asset_id,
      versionAssetId: governed.id,
      checksumSha256: item.checksum_sha256,
      assetVersion: governed.version_number
    };
  });
}

export async function recordFestivalReviewContextPreview({
  itemId,
  expectedReviewVersion,
  actorId,
  viewport,
  appearance
}: {
  itemId: string;
  expectedReviewVersion: string;
  actorId: string;
  viewport: "desktop" | "tablet" | "mobile";
  appearance: "light" | "dark";
}) {
  const result = await dbQuery<ReviewItemRow>(
    `select item.*,batch.stable_key as batch_stable_key,false as is_representative
     from festival_asset_review_items item
     join festival_asset_review_batches batch on batch.id=item.batch_id
     where item.id=$1`,
    [itemId]
  );
  const item = result.rows[0];
  if (!item) throw badRequest("The review asset was not found.");
  assertExpectedReviewVersion(item, expectedReviewVersion);
  await dbQuery(
    `insert into festival_asset_review_audit(
       review_item_id,actor_admin_user_id,action,previous_state,next_state,safe_metadata
     ) values($1,$2,'real_context_previewed',$3,$3,$4::jsonb)`,
    [
      itemId,
      actorId,
      item.review_state,
      JSON.stringify({
        reviewVersion: reviewVersion(item.updated_at),
        checksumPrefix: item.checksum_sha256.slice(0, 12),
        category: item.category,
        viewport,
        appearance
      })
    ]
  );
  const contexts = await festivalReviewContextCoverage(
    item.id,
    reviewVersion(item.updated_at)
  );
  return {
    reviewedInContext: festivalReviewMissingContexts(contexts).length === 0,
    reviewVersion: reviewVersion(item.updated_at),
    contexts
  };
}

export async function assertFestivalUatAssetIsUnique({
  checksumSha256,
  festivalSlug,
  category
}: {
  checksumSha256: string;
  festivalSlug: string;
  category: string;
}) {
  const duplicate = await dbQuery<{ display_name: string }>(`
    select item.display_name
    from festival_asset_review_items item
    join festival_asset_review_batches batch on batch.id=item.batch_id
    where batch.stable_key=$1 and item.checksum_sha256=$2
      and item.festival_slug=$3 and item.category=$4
    limit 1
  `, [
    FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY,
    checksumSha256,
    festivalSlug,
    category
  ]);
  if (duplicate.rows[0]) {
    throw badRequest(
      `This exact file is already in Visual Review as ${duplicate.rows[0].display_name}. Upload a corrected version or use Replace Asset.`
    );
  }
}

export async function registerFestivalUatReviewAsset({
  versionAssetId,
  libraryAssetId,
  displayName,
  festivalSlug,
  festivalName,
  category,
  sourceS3Key,
  thumbnailS3Key,
  checksumSha256,
  mimeType,
  width,
  height,
  fileSize,
  supportedRegions,
  provenance,
  axoAnchor,
  axoPlacement,
  presentation,
  supportedMotions,
  actorId
}: {
  versionAssetId: string;
  libraryAssetId: string;
  displayName: string;
  festivalSlug: string;
  festivalName: string;
  category: "header" | "ground" | "axo" | "ambient" | "feature";
  sourceS3Key: string;
  thumbnailS3Key: string;
  checksumSha256: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  supportedRegions: string[];
  provenance: string;
  axoAnchor: string | null;
  axoPlacement?: import("./festival-review-standard").FestivalAxoPlacement | null;
  presentation: string;
  supportedMotions: string[];
  actorId: string;
}) {
  const stableAssetId = `uat-${versionAssetId.replaceAll("-", "")}`;
  const metadata = {
    provenance,
    version: 1,
    fileSize,
    existingVersionAssetId: versionAssetId,
    existingLibraryAssetId: libraryAssetId,
    supportedRegions,
    transparentBackground: true,
    axoAnchor,
    axoPlacement: axoPlacement || null,
    presentation,
    supportedMotions,
    completeComposition: true,
    intendedObject: displayName,
    culturalReviewRequired: true,
    readiness: {
      sourceValidated: true,
      privateStorage: true,
      exactVersionLocked: true,
      publicActivation: false
    }
  };
  await withDbTransaction(async (query) => {
    await query(`
      insert into festival_asset_review_batches (
        stable_key,display_name,status,manifest_checksum_sha256,total_items,
        created_by
      ) values ($1,$2,'in_review',$3,1,$4)
      on conflict (stable_key) do update set
        status=case
          when festival_asset_review_batches.status='archived' then festival_asset_review_batches.status
          else 'in_review'
        end,
        updated_at=now()
    `, [
      FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY,
      "Festival Studio UAT Assets",
      checksumSha256,
      actorId
    ]);
    await query(`
      insert into festival_asset_review_items (
        batch_id,stable_asset_id,display_name,festival_slug,festival_name,
        category,subcategory,source_s3_key,thumbnail_s3_key,
        checksum_sha256,mime_type,width,height,metadata_json,review_state
      )
      select batch.id,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,
        'visual_review_required'
      from festival_asset_review_batches batch
      where batch.stable_key=$1 and batch.status<>'archived'
      on conflict (batch_id,stable_asset_id) do update set
        display_name=excluded.display_name,
        thumbnail_s3_key=excluded.thumbnail_s3_key,
        metadata_json=excluded.metadata_json,
        updated_at=now()
    `, [
      FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY,
      stableAssetId,
      displayName,
      festivalSlug,
      festivalName,
      category,
      axoAnchor || presentation,
      sourceS3Key,
      thumbnailS3Key,
      checksumSha256,
      mimeType,
      width,
      height,
      JSON.stringify(metadata)
    ]);
    await query(`
      update festival_asset_review_batches batch
      set total_items=(
        select count(*) from festival_asset_review_items item
        where item.batch_id=batch.id
      ),updated_at=now()
      where batch.stable_key=$1
    `, [FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY]);
    await query(`
      update holiday_theme_assets
      set intended_object=$2,intended_festival=$3,asset_category=$4,
        visual_style='WriteX source-controlled UAT vector',
        usage_locations=$5::text[],
        asset_metadata=coalesce(asset_metadata,'{}'::jsonb)||$6::jsonb,
        updated_at=now()
      where id=$1 and library_asset_id=$7
    `, [
      versionAssetId,
      displayName,
      festivalSlug,
      category,
      supportedRegions,
      JSON.stringify(metadata),
      libraryAssetId
    ]);
    await query(
      "update festival_asset_library set display_name=$2,updated_by=$3,updated_at=now() where id=$1",
      [libraryAssetId, displayName, actorId]
    );
  });
  return { stableAssetId, batchKey: FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY };
}

async function qualityGateAllowsRemaining() {
  const result = await dbQuery(`
    with ${representativeCte()}
    select count(*) filter(where item.review_state not in ('visual_review_required','source_required'))::int reviewed,
      count(*) filter(where item.review_state='approved')::int approved
    from representative_items representative
    join festival_asset_review_items item on item.id=representative.id
  `);
  const reviewed = safeNumber(result.rows[0]?.reviewed);
  const approved = safeNumber(result.rows[0]?.approved);
  return reviewed >= FESTIVAL_REVIEW_SAMPLE_SIZE && percentage(approved, FESTIVAL_REVIEW_SAMPLE_SIZE) >= 70;
}

async function reviewFestivalBatchItemUnlocked({
  itemId,
  action,
  note,
  actorId,
  expectedReviewVersion,
  reviewMetadata = {}
}: {
  itemId: string;
  action: "approve" | "reject" | "request_improvement" | "hide";
  note: string;
  actorId: string;
  expectedReviewVersion: string;
  reviewMetadata?: FestivalReviewDecisionMetadata;
}) {
  const locked = await dbQuery<ReviewItemRow>(
    `with ${representativeCte()}
     select item.*,batch.stable_key as batch_stable_key,
       representative.id is not null as is_representative
     from festival_asset_review_items item
     join festival_asset_review_batches batch on batch.id=item.batch_id
     left join representative_items representative on representative.id=item.id
     where item.id=$1`,
    [itemId]
  );
  const item = locked.rows[0];
  if (!item) throw badRequest("The review asset was not found.");
  if (action !== "approve") {
    assertExpectedReviewVersion(item, expectedReviewVersion);
  }
  if (
    item.batch_stable_key === FESTIVAL_REVIEW_BATCH_STABLE_KEY &&
    !item.is_representative &&
    !(await qualityGateAllowsRemaining())
  ) {
    throw badRequest(
      "Complete the representative 30 with at least a 70% approval rate before reviewing the remaining assets."
    );
  }
  if (item.review_state === "approved" && action !== "approve") {
    throw badRequest(
      "An approved exact version remains governed; archive it from the Asset Library instead."
    );
  }
  const transactionalApproval = action === "approve"
    ? await approveFestivalReviewItemTransaction({
        itemId,
        note,
        actorId,
        expectedReviewVersion,
        reviewMetadata
      })
    : null;
  if (transactionalApproval) return transactionalApproval;
  let next: ReviewState;
  if (action === "approve") {
    validateApprovalChecks(item, reviewMetadata);
    if (item.promoted_version_asset_id) {
      return {
        state: "approved",
        versionAssetId: item.promoted_version_asset_id,
        libraryAssetId: item.promoted_library_asset_id,
        checksumSha256: item.checksum_sha256,
        reviewVersion: reviewVersion(item.updated_at)
      };
    }
    const metadata = item.metadata_json || {};
    const supportedRegions = Array.isArray(metadata.supportedRegions)
      ? metadata.supportedRegions.filter(
          (value): value is string => typeof value === "string"
        )
      : [];
    const existingVersionAssetId =
      typeof metadata.existingVersionAssetId === "string"
        ? metadata.existingVersionAssetId
        : null;
    const existingLibraryAssetId =
      typeof metadata.existingLibraryAssetId === "string"
        ? metadata.existingLibraryAssetId
        : null;
    if (existingVersionAssetId && existingLibraryAssetId) {
      const exact = await dbQuery<{ id: string }>(`
        select asset.id
        from holiday_theme_assets asset
        join festival_asset_library library
          on library.id=asset.library_asset_id
        where asset.id=$1 and asset.library_asset_id=$2
          and asset.checksum_sha256=$3
          and asset.review_status='pending_review'
          and library.lifecycle_state='active'
          and (
            library.current_version_asset_id=asset.id
            or asset.previous_asset_id=library.current_version_asset_id
          )
          and not exists (
            select 1
            from holiday_theme_assets newer
            where newer.library_asset_id=asset.library_asset_id
              and newer.version_number>asset.version_number
              and newer.review_status in ('pending_review','approved')
          )
        limit 1
      `, [existingVersionAssetId, existingLibraryAssetId, item.checksum_sha256]);
      if (!exact.rows[0]) {
        throw badRequest(
          "This review item is no longer the current exact asset version. Open the latest version from the UAT review queue."
        );
      }
    }
    const role = roleByCategory[item.category] || "supporting";
    let resumable = existingVersionAssetId && existingLibraryAssetId
      ? null
      : (
          await dbQuery<ReviewableAssetRow>(
            `select id,theme_id,asset_role,variant,s3_key,checksum_sha256,
                    review_status,library_asset_id
             from holiday_theme_assets
             where s3_key=$1
             limit 1`,
            [item.source_s3_key]
          )
        ).rows[0] || null;
    if (
      resumable &&
      (resumable.checksum_sha256 !== item.checksum_sha256 ||
        resumable.variant !== item.stable_asset_id ||
        resumable.asset_role !== role ||
        !resumable.library_asset_id)
    ) {
      throw badRequest(
        "The governed-library record conflicts with another version. Refresh and retry; the existing record was not changed."
      );
    }
    let created = existingVersionAssetId && existingLibraryAssetId
      ? { id: existingVersionAssetId, libraryAssetId: existingLibraryAssetId }
      : resumable
        ? { id: resumable.id, libraryAssetId: resumable.library_asset_id as string }
        : null;
    if (!created) {
      const themeId = await resolveThemeId(item.festival_slug);
      try {
        created = await saveHolidayThemeAsset({
          themeId,
          role,
          variant: item.stable_asset_id,
          s3Key: item.source_s3_key,
          safeFileName: `${item.display_name}.svg`,
          mimeType: item.mime_type,
          fileSize: typeof metadata.fileSize === "number" ? metadata.fileSize : 0,
          checksumSha256: item.checksum_sha256,
          durationSeconds: null,
          actorId,
          purpose: "library_unassigned",
          placements: ["private_reference"],
          sourceDimensions: { width: item.width, height: item.height, format: "svg" },
          embeddedUiState: "no_embedded_ui"
        });
      } catch (error) {
        resumable = (
          await dbQuery<ReviewableAssetRow>(
            `select id,theme_id,asset_role,variant,s3_key,checksum_sha256,
                    review_status,library_asset_id
             from holiday_theme_assets
             where s3_key=$1 and checksum_sha256=$2 and variant=$3
             limit 1`,
            [item.source_s3_key, item.checksum_sha256, item.stable_asset_id]
          )
        ).rows[0] || null;
        if (!resumable?.library_asset_id) throw actionablePromotionError(error);
        created = {
          id: resumable.id,
          libraryAssetId: resumable.library_asset_id
        };
      }
    }
    await reviewHolidayThemeAsset({
      assetId: created.id,
      decision: "approved",
      reason: note || (existingVersionAssetId
        ? "Founder approved Festival Studio UAT exact version."
        : "Founder approved Batch 1 exact version."),
      isFallback: false,
      clarityConfirmed: true,
      actorId
    });
    await dbQuery(
      "update holiday_theme_assets set intended_object=$2,intended_festival=$3,asset_category=$4,visual_style='WriteX source-controlled festival vector',usage_locations=$5::text[],asset_metadata=asset_metadata||$6::jsonb where id=$1",
      [
        created.id,
        item.display_name,
        item.festival_slug,
        item.category,
        supportedRegions,
        JSON.stringify({
          batchStableAssetId: item.stable_asset_id,
          axoAnchor: metadata.axoAnchor,
          restrictions: metadata.restrictions,
          reviewMetadata: metadata,
          reviewCollection: item.batch_stable_key,
          culturalAttentionAcknowledged:
            reviewMetadata.culturalAttentionAcknowledged === true
        })
      ]
    );
    await dbQuery("update festival_asset_library set display_name=$2 where id=$1", [
      created.libraryAssetId,
      item.display_name
    ]);
    const approvedUpdate = await dbQuery<{ updated_at: Date | string }>(
      `update festival_asset_review_items
       set review_state='approved',review_note=$2,reviewed_by=$3,reviewed_at=now(),
           promoted_library_asset_id=$4,promoted_version_asset_id=$5,updated_at=now()
       where id=$1
         and date_trunc('milliseconds',updated_at)=$6::timestamptz
       returning updated_at`,
      [
        itemId,
        note || null,
        actorId,
        created.libraryAssetId,
        created.id,
        reviewVersion(item.updated_at)
      ]
    );
    if (!approvedUpdate.rows[0]) {
      throw badRequest(
        "This review changed in another session. Refresh and retry."
      );
    }
    next = "approved";
  } else {
    next =
      action === "reject"
        ? "rejected"
        : action === "hide"
          ? "hidden"
          : "improvement_requested";
    if (
      (next === "rejected" || next === "improvement_requested") &&
      !note.trim()
    ) {
      throw badRequest("Add a review note for this decision.");
    }
    const decisionUpdate = await dbQuery<{ updated_at: Date | string }>(
      `update festival_asset_review_items
       set review_state=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now()
       where id=$1
         and date_trunc('milliseconds',updated_at)=$5::timestamptz
       returning updated_at`,
      [itemId, next, note.trim() || null, actorId, reviewVersion(item.updated_at)]
    );
    if (!decisionUpdate.rows[0]) {
      throw badRequest(
        "This review changed in another session. Refresh and retry."
      );
    }
  }
  await dbQuery(
    "insert into festival_asset_review_audit(review_item_id,actor_admin_user_id,action,previous_state,next_state,safe_metadata) values($1,$2,$3,$4,$5,$6::jsonb)",
    [
      itemId,
      actorId,
      action,
      item.review_state,
      next,
      JSON.stringify({
        noteProvided: Boolean(note.trim()),
        reviewMetadata
      })
    ]
  );
  const current = await dbQuery<{
    updated_at: Date | string;
    promoted_library_asset_id: string | null;
    promoted_version_asset_id: string | null;
  }>(
    `select updated_at,promoted_library_asset_id,promoted_version_asset_id
     from festival_asset_review_items where id=$1`,
    [itemId]
  );
  return {
    state: next,
    reviewVersion: current.rows[0]
      ? reviewVersion(current.rows[0].updated_at)
      : reviewVersion(item.updated_at),
    libraryAssetId: current.rows[0]?.promoted_library_asset_id || null,
    versionAssetId: current.rows[0]?.promoted_version_asset_id || null,
    checksumSha256: item.checksum_sha256
  };
}

export async function reviewFestivalBatchItem(input: {
  itemId: string;
  action: "approve" | "reject" | "request_improvement" | "hide";
  note: string;
  actorId: string;
  expectedReviewVersion: string;
  reviewMetadata?: FestivalReviewDecisionMetadata;
}) {
  if (input.action === "approve") {
    try {
      return await reviewFestivalBatchItemUnlocked(input);
    } catch (error) {
      throw actionablePromotionError(error);
    }
  }
  const locked = await withDatabaseAdvisoryLock(
    `festival-founder-review:${input.itemId}`,
    async () => {
      try {
        return await reviewFestivalBatchItemUnlocked(input);
      } catch (error) {
        throw actionablePromotionError(error);
      }
    }
  );
  if (!locked.acquired) {
    throw badRequest(
      "This review is being updated in another session. Refresh and retry."
    );
  }
  return locked.value;
}

export async function resolveFestivalApprovalVersionConflict(input: {
  itemId: string;
  expectedReviewVersion: string;
  resolution: "create_next_version" | "keep_existing" | "request_improvement";
  note: string;
  actorId: string;
  reviewMetadata?: FestivalReviewDecisionMetadata;
}) {
  const locked = await withDatabaseAdvisoryLock(
    `festival-founder-review:${input.itemId}`,
    async () => {
      if (input.resolution === "create_next_version") {
        return approveFestivalReviewItemTransaction({
          itemId: input.itemId,
          note: input.note || "Founder approved the reviewed checksum as the next version.",
          actorId: input.actorId,
          expectedReviewVersion: input.expectedReviewVersion,
          reviewMetadata: input.reviewMetadata || {},
          conflictResolution: "create_next_version"
        });
      }
      return withDbTransaction(async (query) => {
        const rows = await query<ReviewItemRow>(
          `select item.*,batch.stable_key as batch_stable_key,false as is_representative
           from festival_asset_review_items item
           join festival_asset_review_batches batch on batch.id=item.batch_id
           where item.id=$1
           for update of item`,
          [input.itemId]
        );
        const item = rows[0];
        if (!item) throw badRequest("The review asset was not found.");
        assertExpectedReviewVersion(item, input.expectedReviewVersion);
        const versions = await governedVersionsForReview(query, item);
        const conflict = conflictingGovernedVersion(item, versions);
        if (!conflict) {
          throw badRequest(
            "This asset was updated in another session. The latest state has been loaded."
          );
        }
        const nextState = input.resolution === "request_improvement"
          ? "improvement_requested"
          : "hidden";
        const reason = input.note.trim() || (
          input.resolution === "request_improvement"
            ? "A different approved checksum exists; improve and submit a new version."
            : "Founder kept the existing approved version."
        );
        const updated = await query<{ updated_at: Date | string }>(
          `update festival_asset_review_items
           set review_state=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now()
           where id=$1
           returning updated_at`,
          [item.id, nextState, reason, input.actorId]
        );
        await query(
          `insert into festival_asset_review_audit (
             review_item_id,actor_admin_user_id,action,previous_state,next_state,safe_metadata
           ) values ($1,$2,$3,$4,$5,$6::jsonb)`,
          [
            item.id,
            input.actorId,
            input.resolution === "request_improvement"
              ? "version_conflict_needs_improvement"
              : "version_conflict_kept_existing",
            item.review_state,
            nextState,
            JSON.stringify({
              existingVersionAssetId: conflict.id,
              existingChecksumSha256: conflict.checksum_sha256,
              reviewedChecksumSha256: item.checksum_sha256,
              publicActivation: false
            })
          ]
        );
        return {
          state: nextState,
          outcome: input.resolution,
          message: input.resolution === "request_improvement"
            ? "The new reviewed version was marked Needs Improvement. The approved version was not changed."
            : "The existing approved version was kept. The new reviewed version was not promoted.",
          reviewVersion: reviewVersion(updated[0]?.updated_at || item.updated_at),
          libraryAssetId: conflict.library_asset_id,
          versionAssetId: conflict.id,
          checksumSha256: conflict.checksum_sha256
        };
      });
    }
  );
  if (!locked.acquired) {
    throw badRequest(
      "This asset was updated in another session. The latest state has been loaded."
    );
  }
  return locked.value;
}

export async function approveSelectedReviewedFestivalAssets({
  items,
  actorId
}: {
  items: Array<{
    itemId: string;
    expectedReviewVersion: string;
    reviewMetadata: FestivalReviewDecisionMetadata;
  }>;
  actorId: string;
}) {
  if (items.length < 1 || items.length > 20) {
    throw badRequest("Select between 1 and 20 reviewed assets.");
  }
  if (new Set(items.map((item) => item.itemId)).size !== items.length) {
    throw badRequest("Each reviewed asset may be selected only once.");
  }

  const eligible: typeof items = [];
  const results: Array<{
    itemId: string;
    outcome: "approved" | "already_approved" | "needs_resolution" | "failed";
    message: string;
    result?: Awaited<ReturnType<typeof reviewFestivalBatchItem>>;
    conflict?: FestivalApprovalVersionComparison;
  }> = [];

  for (const selected of items) {
    const result = await dbQuery<ReviewItemRow & { reviewed_in_context: boolean }>(
      `select item.*,batch.stable_key as batch_stable_key,false as is_representative,
         (
           select count(distinct concat(
             preview_audit.safe_metadata->>'viewport',
             ':',
             preview_audit.safe_metadata->>'appearance'
           )) = ${FESTIVAL_REVIEW_CONTEXTS.length}
           from festival_asset_review_audit preview_audit
           where preview_audit.review_item_id=item.id
             and preview_audit.action='real_context_previewed'
             and preview_audit.safe_metadata->>'reviewVersion'=
               to_char(item.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
             and preview_audit.safe_metadata ? 'viewport'
             and preview_audit.safe_metadata ? 'appearance'
         ) as reviewed_in_context
       from festival_asset_review_items item
       join festival_asset_review_batches batch on batch.id=item.batch_id
       where item.id=$1`,
      [selected.itemId]
    );
    const item = result.rows[0];
    if (!item) {
      results.push({
        itemId: selected.itemId,
        outcome: "failed",
        message: "The selected review asset was not found."
      });
      continue;
    }
    if (!item.reviewed_in_context && item.review_state !== "approved") {
      results.push({
        itemId: selected.itemId,
        outcome: "failed",
        message: `${item.display_name} must be opened in real-context preview before batch approval.`
      });
      continue;
    }
    try {
      validateApprovalChecks(item, selected.reviewMetadata);
      eligible.push(selected);
    } catch (error) {
      results.push({
        itemId: selected.itemId,
        outcome: "failed",
        message: error instanceof Error ? error.message : "Approval checks failed."
      });
    }
  }

  for (const selected of eligible) {
    try {
      const result = await reviewFestivalBatchItem({
        ...selected,
        action: "approve",
        note: "Founder approved selected reviewed exact version.",
        actorId
      });
      const outcome = "outcome" in result && result.outcome === "already_approved"
        ? "already_approved" as const
        : "approved" as const;
      results.push({
        itemId: selected.itemId,
        outcome,
        message: "message" in result
          ? result.message
          : "Approved exact reviewed version.",
        result
      });
    } catch (error) {
      if (error instanceof FestivalApprovalVersionConflict) {
        results.push({
          itemId: selected.itemId,
          outcome: "needs_resolution",
          message: error.message,
          conflict: error.comparison
        });
      } else {
        results.push({
          itemId: selected.itemId,
          outcome: "failed",
          message: error instanceof Error ? error.message : "Approval could not be saved."
        });
      }
    }
  }
  return {
    approved: results.filter((result) => result.outcome === "approved").length,
    alreadyApproved: results.filter(
      (result) => result.outcome === "already_approved"
    ).length,
    needsResolution: results.filter(
      (result) => result.outcome === "needs_resolution"
    ).length,
    failed: results.filter((result) => result.outcome === "failed").length,
    results
  };
}
