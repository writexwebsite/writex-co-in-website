import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import {
  approveSelectedReviewedFestivalAssets,
  FestivalApprovalVersionConflict,
  FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY,
  getFestivalReviewBatch,
  recordFestivalReviewContextPreview,
  resolveFestivalApprovalVersionConflict,
  reviewFestivalBatchItem,
  type FestivalReviewCollection,
  type FestivalReviewDecisionMetadata
} from "@/lib/holiday/festival-review-batch";
import {
  FESTIVAL_REVIEW_AXO_CHECKS,
  FESTIVAL_REVIEW_CATEGORY_CHECKS,
  FESTIVAL_REVIEW_FOOTER_CHECKS,
  FESTIVAL_REVIEW_INTERACTION_RESULTS,
  FESTIVAL_REVIEW_SCORE_DIMENSIONS,
  FESTIVAL_REVIEW_UNIVERSAL_CHECKS
} from "@/lib/holiday/festival-review-standard";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import { getPrivateObjectBuffer } from "@/lib/storage/s3";
import { auditApprovedFestivalAssetIntegrity } from "@/lib/holiday/festival-asset-integrity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestReference(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function responseError(error: unknown, referenceId: string) {
  console.error("Festival Founder review request failed.", {
    referenceId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage:
      error instanceof Error ? error.message : "Unknown review failure"
  });
  const response = error instanceof FestivalApprovalVersionConflict
    ? NextResponse.json(
        {
          ok: false,
          error: { code: "VERSION_CONFLICT", message: error.message },
          conflict: error.comparison
        },
        { status: 409 }
      )
    : apiError(error);
  response.headers.set("x-correlation-id", referenceId);
  response.headers.set("cache-control", "private, no-store");
  return response;
}

function parseReviewMetadata(value: unknown): FestivalReviewDecisionMetadata {
  const rawMetadata = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const parseChecklist = (
    checklistValue: unknown,
    keys: ReadonlyArray<string>
  ) => {
    const rawChecklist = checklistValue && typeof checklistValue === "object"
      ? checklistValue as Record<string, unknown>
      : {};
    return Object.fromEntries(keys.flatMap((check) => {
      const checkValue = rawChecklist[check];
      return checkValue === "pass" || checkValue === "issue"
        ? [[check, checkValue]]
        : [];
    }));
  };
  const universalChecklist = parseChecklist(
    rawMetadata.universalChecklist,
    FESTIVAL_REVIEW_UNIVERSAL_CHECKS.map(([key]) => key)
  ) as NonNullable<FestivalReviewDecisionMetadata["universalChecklist"]>;
  const axoChecklist = parseChecklist(
    rawMetadata.axoChecklist,
    FESTIVAL_REVIEW_AXO_CHECKS.map(([key]) => key)
  ) as NonNullable<FestivalReviewDecisionMetadata["axoChecklist"]>;
  const specificKeys = [
    ...Object.values(FESTIVAL_REVIEW_CATEGORY_CHECKS).flat().map(([key]) => key),
    ...FESTIVAL_REVIEW_FOOTER_CHECKS.map(([key]) => key)
  ];
  const specificChecklist = parseChecklist(
    rawMetadata.specificChecklist,
    specificKeys
  ) as NonNullable<FestivalReviewDecisionMetadata["specificChecklist"]>;
  const rawScores = rawMetadata.scores && typeof rawMetadata.scores === "object"
    ? rawMetadata.scores as Record<string, unknown>
    : {};
  const scores = Object.fromEntries(
    FESTIVAL_REVIEW_SCORE_DIMENSIONS.flatMap(([key, , maximum]) => {
      const score = Number(rawScores[key]);
      return Number.isFinite(score) && score >= 0 && score <= maximum
        ? [[key, score]]
        : [];
    })
  ) as NonNullable<FestivalReviewDecisionMetadata["scores"]>;
  const interactionResult = FESTIVAL_REVIEW_INTERACTION_RESULTS.includes(
    rawMetadata.interactionResult as (typeof FESTIVAL_REVIEW_INTERACTION_RESULTS)[number]
  )
    ? rawMetadata.interactionResult as NonNullable<
        FestivalReviewDecisionMetadata["interactionResult"]
      >
    : undefined;
  const collection = ["review_first", "remaining", "all"].includes(
    String(rawMetadata.collection)
  )
    ? rawMetadata.collection as FestivalReviewCollection
    : undefined;
  return {
    ...(collection ? { collection } : {}),
    ...(typeof rawMetadata.culturalAttentionAcknowledged === "boolean"
      ? { culturalAttentionAcknowledged: rawMetadata.culturalAttentionAcknowledged }
      : {}),
    ...(Object.keys(universalChecklist).length > 0 ? { universalChecklist } : {}),
    ...(Object.keys(specificChecklist).length > 0 ? { specificChecklist } : {}),
    ...(Object.keys(axoChecklist).length > 0 ? { axoChecklist } : {}),
    ...(Object.keys(scores).length > 0 ? { scores } : {}),
    ...(interactionResult ? { interactionResult } : {})
  };
}

async function founder(request: NextRequest) {
  const admin = getAdminSessionFromRequest(request);
  await assertActiveAdminActor(admin.adminUserId);
  if (admin.role !== "super_admin") throw new Response("Not found", { status: 404 });
  return admin;
}

export async function GET(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    await founder(request);
    const governedPreviewId = request.nextUrl.searchParams
      .get("governedPreview")
      ?.trim();
    if (governedPreviewId) {
      const governed = await dbQuery<{ s3_key: string; mime_type: string }>(
        `select s3_key,mime_type
         from holiday_theme_assets
         where id=$1 and review_status='approved' and status in ('active','replaced')`,
        [governedPreviewId]
      );
      if (!governed.rows[0]) throw badRequest("The governed preview was not found.");
      const buffer = await getPrivateObjectBuffer(
        governed.rows[0].s3_key,
        8 * 1024 * 1024
      );
      return new NextResponse(buffer, {
        headers: {
          "content-type": governed.rows[0].mime_type,
          "cache-control": "private, no-store",
          "content-security-policy": "default-src 'none'; sandbox",
          "x-content-type-options": "nosniff",
          "x-correlation-id": referenceId
        }
      });
    }
    const previewId = request.nextUrl.searchParams.get("preview")?.trim();
    const previewKind = request.nextUrl.searchParams.get("kind") === "source" ? "source_s3_key" : "thumbnail_s3_key";
    if (previewId) {
      const result = await dbQuery<{ s3_key: string; mime_type: string }>(`select ${previewKind} s3_key,mime_type from festival_asset_review_items where id=$1`, [previewId]);
      if (!result.rows[0]) throw badRequest("The review preview was not found.");
      const buffer = await getPrivateObjectBuffer(result.rows[0].s3_key, 8 * 1024 * 1024);
      return new NextResponse(buffer, { headers: { "content-type": previewKind === "thumbnail_s3_key" ? "image/webp" : result.rows[0].mime_type, "cache-control": "private, no-store", "content-security-policy": "default-src 'none'; sandbox", "x-content-type-options": "nosniff", "x-correlation-id": referenceId } });
    }
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(48, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") || 30)));
    const requestedCollection = request.nextUrl.searchParams.get("collection");
    const collection: FestivalReviewCollection = ["review_first", "remaining", "all"].includes(String(requestedCollection))
      ? requestedCollection as FestivalReviewCollection
      : "review_first";
    const data = await getFestivalReviewBatch({ page, pageSize, collection, festival: request.nextUrl.searchParams.get("festival") || "", category: request.nextUrl.searchParams.get("category") || "", state: request.nextUrl.searchParams.get("state") || "", batchKey: request.nextUrl.searchParams.get("batch") === "uat" ? FESTIVAL_UAT_REVIEW_BATCH_STABLE_KEY : undefined });
    return apiOk(data, { headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId } });
  } catch (error) { return error instanceof Response ? error : responseError(error, referenceId); }
}

export async function POST(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    assertSameOrigin(request);
    const admin = await founder(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `festival-founder-review:${admin.adminUserId}:${context.ipAddress}`, limit: 120, windowSeconds: 3600 });
    const payload = await request.json().catch(() => null) as {
      itemId?: unknown;
      action?: unknown;
      note?: unknown;
      reviewMetadata?: unknown;
      expectedReviewVersion?: unknown;
      items?: unknown;
      resolution?: unknown;
      viewport?: unknown;
      appearance?: unknown;
    } | null;
    const itemId = typeof payload?.itemId === "string" ? payload.itemId.trim() : "";
    const requestedAction = String(payload?.action || "");
    const expectedReviewVersion =
      typeof payload?.expectedReviewVersion === "string"
        ? payload.expectedReviewVersion.trim()
        : "";

    if (requestedAction === "preview_opened") {
      const viewport = ["desktop", "tablet", "mobile"].includes(
        String(payload?.viewport)
      )
        ? payload?.viewport as "desktop" | "tablet" | "mobile"
        : null;
      const appearance = ["light", "dark"].includes(
        String(payload?.appearance)
      )
        ? payload?.appearance as "light" | "dark"
        : null;
      if (!itemId || !expectedReviewVersion) {
        throw badRequest("Open a current review item before recording its preview.");
      }
      if (!viewport || !appearance) {
        throw badRequest("Choose a valid real-context viewport and appearance.");
      }
      const result = await recordFestivalReviewContextPreview({
        itemId,
        expectedReviewVersion,
        actorId: admin.adminUserId,
        viewport,
        appearance
      });
      return apiOk(result, {
        headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId }
      });
    }

    if (requestedAction === "audit_integrity") {
      const result = await auditApprovedFestivalAssetIntegrity({
        actorId: admin.adminUserId
      });
      return apiOk(result, {
        headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId }
      });
    }

    if (requestedAction === "approve_selected") {
      const rawItems = Array.isArray(payload?.items) ? payload.items.slice(0, 20) : [];
      const selected = rawItems.map((value) => {
        const candidate = value && typeof value === "object"
          ? value as Record<string, unknown>
          : {};
        return {
          itemId: typeof candidate.itemId === "string" ? candidate.itemId.trim() : "",
          expectedReviewVersion:
            typeof candidate.expectedReviewVersion === "string"
              ? candidate.expectedReviewVersion.trim()
              : "",
          reviewMetadata: parseReviewMetadata(candidate.reviewMetadata)
        };
      });
      if (
        selected.length < 1 ||
        selected.some((item) => !item.itemId || !item.expectedReviewVersion)
      ) {
        throw badRequest("Choose reviewed assets with their exact current versions.");
      }
      const result = await approveSelectedReviewedFestivalAssets({
        items: selected,
        actorId: admin.adminUserId
      });
      return apiOk(result, {
        headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId }
      });
    }

    if (requestedAction === "resolve_version_conflict") {
      const resolution = [
        "create_next_version",
        "keep_existing",
        "request_improvement"
      ].includes(String(payload?.resolution || ""))
        ? String(payload?.resolution) as
            | "create_next_version"
            | "keep_existing"
            | "request_improvement"
        : null;
      if (!itemId || !expectedReviewVersion || !resolution) {
        throw badRequest("Choose a current conflict resolution.");
      }
      const result = await resolveFestivalApprovalVersionConflict({
        itemId,
        expectedReviewVersion,
        resolution,
        note: typeof payload?.note === "string"
          ? payload.note.trim().slice(0, 500)
          : "",
        actorId: admin.adminUserId,
        reviewMetadata: parseReviewMetadata(payload?.reviewMetadata)
      });
      return apiOk(result, {
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": referenceId
        }
      });
    }

    const action = ["approve", "reject", "request_improvement", "hide"].includes(requestedAction)
      ? requestedAction as "approve" | "reject" | "request_improvement" | "hide"
      : null;
    if (!itemId || !action || !expectedReviewVersion) {
      throw badRequest("Choose a current review asset and decision.");
    }
    const result = await reviewFestivalBatchItem({
      itemId,
      action,
      note: typeof payload?.note === "string" ? payload.note.trim().slice(0, 500) : "",
      actorId: admin.adminUserId,
      expectedReviewVersion,
      reviewMetadata: parseReviewMetadata(payload?.reviewMetadata)
    });
    return apiOk(result, {
      headers: { "cache-control": "private, no-store", "x-correlation-id": referenceId }
    });
  } catch (error) {
    return error instanceof Response ? error : responseError(error, referenceId);
  }
}
