import type { NextRequest } from "next/server";
import sharp from "sharp";
import { ApiError, apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import {
  assertCanManageWebsiteExperience,
  assertCanViewWebsiteExperience
} from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import {
  getHolidayAssetRecord,
  getHolidayExperienceSnapshot,
  reviewHolidayThemeAsset,
  saveHolidayThemeAsset
} from "@/lib/holiday/repository";
import {
  FESTIVAL_ASSET_PLACEMENTS,
  FESTIVAL_ASSET_PURPOSES,
  defaultPlacementsForPurpose,
  legacyRoleToPlacement,
  type FestivalAssetPlacement,
  type FestivalAssetPurpose
} from "@/lib/holiday/asset-governance-types";
import {
  getFestivalAssetLibrarySnapshot,
  setFestivalAssetLifecycle
} from "@/lib/holiday/asset-governance";
import {
  axoPlacementSchema,
  holidayAssetMetadataSchema
} from "@/lib/holiday/validation";
import {
  allowedHolidayMediaMimeTypes,
  describeHolidayImageDimensions,
  describeHolidayMediaAsset,
  normalizeHolidayMediaMimeType,
  validateHolidayHeaderOrnamentAsset,
  validateHolidayMediaAsset
} from "@/lib/holiday/assets";
import {
  extractHolidayPalette,
  safeNeutralExtractedPalette
} from "@/lib/holiday/palette";
import { resolveHolidayPlaybackRange } from "@/lib/holiday/playback";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext
} from "@/lib/security";
import { deleteFile, uploadFile } from "@/lib/storage/s3";
import { getPrivateObjectBuffer } from "@/lib/storage/s3";
import {
  assertFestivalUatAssetIsUnique,
  registerFestivalUatReviewAsset
} from "@/lib/holiday/festival-review-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxImageBytes = 40 * 1024 * 1024;
const maxAudioBytes = 12 * 1024 * 1024;
const paletteSourceRoles = new Set([
  "reference_image",
  "hero_art",
  "login_desktop",
  "login_mobile",
  "login_background"
]);

function requestReference(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function apiErrorWithReference(error: unknown, referenceId: string) {
  const response = apiError(error);
  response.headers.set("x-correlation-id", referenceId);
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanViewWebsiteExperience(admin);
    const assetId = request.nextUrl.searchParams.get("assetId")?.trim() || "";
    if (!assetId) throw badRequest("Select a reference asset.");
    const asset = await getHolidayAssetRecord(assetId);
    if (
      !asset ||
      ["deletion_pending", "deleted"].includes(asset.lifecycle_state || "") ||
      !["active", "staged", "replaced", "archived"].includes(asset.status)
    ) {
      throw badRequest("The reference asset was not found.");
    }
    const maxBytes =
      asset.asset_role === "audio" ? maxAudioBytes : maxImageBytes;
    const buffer = await getPrivateObjectBuffer(asset.s3_key, maxBytes);
    const isAudio = asset.asset_role === "audio";
    const range = isAudio
      ? resolveHolidayPlaybackRange(
          request.headers.get("range"),
          buffer.byteLength
        )
      : {
          start: 0,
          end: buffer.byteLength - 1,
          partial: false
        };
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          "content-range": `bytes */${buffer.byteLength}`,
          "cache-control": "private, no-store",
          "x-correlation-id": referenceId
        }
      });
    }
    const body = buffer.subarray(range.start, range.end + 1);
    return new Response(new Uint8Array(body), {
      status: range.partial ? 206 : 200,
      headers: {
        "content-type": asset.mime_type,
        "content-length": String(body.byteLength),
        "content-disposition": `inline; filename="${asset.safe_file_name}"`,
        ...(isAudio
          ? {
              "accept-ranges": "bytes",
              ...(range.partial
                ? {
                    "content-range": `bytes ${range.start}-${range.end}/${buffer.byteLength}`
                  }
                : {})
            }
          : {}),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-correlation-id": referenceId
      }
    });
  } catch (error) {
    return apiErrorWithReference(error, referenceId);
  }
}

export async function POST(request: NextRequest) {
  const referenceId = requestReference(request);
  const uploadState: {
    uploaded: {
      s3Key: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    } | null;
    thumbnail: { s3Key: string } | null;
    committed: boolean;
  } = { uploaded: null, thumbnail: null, committed: false };
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `holiday-asset:${admin.adminUserId}:${context.ipAddress}`,
      limit: 30,
      windowSeconds: 60 * 60
    });

    const contentLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > maxImageBytes + 512 * 1024
    ) {
      throw badRequest(
        "Media upload failed. Audio files must not exceed 12 MB and master images must not exceed 40 MB."
      );
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw badRequest(
        "Media upload failed. The file could not be read or exceeds the supported size."
      );
    }
    const metadata = holidayAssetMetadataSchema.safeParse({
      themeId: form.get("themeId"),
      role: form.get("role"),
      variant: form.get("variant") || "default"
    });
    if (!metadata.success) throw badRequest("Complete the holiday asset details.");
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("Select an asset to upload.");
    const visualReviewRequired = form.get("visualReviewRequired") === "true";
    const displayName = String(form.get("displayName") || file.name)
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
    if (visualReviewRequired && displayName.length < 3) {
      throw badRequest("Enter a clear human-readable asset name.");
    }
    const supportedReviewCategories = [
      "header",
      "ground",
      "axo",
      "ambient",
      "feature"
    ] as const;
    const reviewCategoryValue = String(form.get("reviewCategory") || "");
    const reviewCategory = supportedReviewCategories.includes(
      reviewCategoryValue as (typeof supportedReviewCategories)[number]
    )
      ? (reviewCategoryValue as (typeof supportedReviewCategories)[number])
      : null;
    if (visualReviewRequired && !reviewCategory) {
      throw badRequest("Choose the Visual Review category for this asset.");
    }
    const provenance = String(form.get("provenance") || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 240);
    if (visualReviewRequired && provenance.length < 3) {
      throw badRequest("Record the asset provenance and creation method.");
    }
    const axoAnchor = String(form.get("axoAnchor") || "").trim() || null;
    if (visualReviewRequired && reviewCategory === "axo" && !axoAnchor) {
      throw badRequest("Choose the approved AXO accessory anchor.");
    }
    let axoPlacement: import("@/lib/holiday/festival-review-standard").FestivalAxoPlacement | null = null;
    const rawAxoPlacement = String(form.get("axoPlacement") || "").trim();
    if (rawAxoPlacement) {
      try {
        axoPlacement = axoPlacementSchema.parse(JSON.parse(rawAxoPlacement));
      } catch {
        throw badRequest("The AXO placement metadata is invalid.");
      }
    }
    const parseStringArray = (field: string) => {
      try {
        const value = JSON.parse(String(form.get(field) || "[]"));
        return Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [];
      } catch {
        throw badRequest(`The ${field} selection is invalid.`);
      }
    };
    const supportedRegions = parseStringArray("supportedRegions");
    const supportedMotions = parseStringArray("supportedMotions");
    const presentation = String(form.get("presentation") || "overlay")
      .trim()
      .slice(0, 32);
    const suppliedPurpose = form.get("purpose");
    const requestedPurpose = String(
      suppliedPurpose ||
        (metadata.data.role === "audio"
          ? "audio"
          : metadata.data.role === "hero_art"
            ? "homepage_hero_artwork"
            : metadata.data.role === "header"
              ? "header_decoration"
              : metadata.data.role.startsWith("login_")
                ? "client_login_background"
                : "design_reference_only")
    );
    if (
      !FESTIVAL_ASSET_PURPOSES.includes(
        requestedPurpose as FestivalAssetPurpose
      )
    ) {
      throw badRequest("Choose a supported asset purpose.");
    }
    const purpose = requestedPurpose as FestivalAssetPurpose;
    let requestedPlacements: unknown = [];
    try {
      requestedPlacements = JSON.parse(
        String(
          form.get("placements") ||
            JSON.stringify([legacyRoleToPlacement(metadata.data.role)])
        )
      );
    } catch {
      throw badRequest("The asset placement selection is invalid.");
    }
    const placements = (
      Array.isArray(requestedPlacements)
        ? requestedPlacements
        : defaultPlacementsForPurpose(purpose)
    ).filter(
      (value): value is FestivalAssetPlacement =>
        typeof value === "string" &&
        FESTIVAL_ASSET_PLACEMENTS.includes(value as FestivalAssetPlacement)
    );
    const resolvedPlacements =
      placements.length > 0 ? [...new Set(placements)] : defaultPlacementsForPurpose(purpose);
    if (visualReviewRequired && reviewCategory) {
      const categoryRole = {
        header: "header",
        ground: "footer",
        axo: "axo",
        ambient: "particle_overlay",
        feature: "decorative_overlay"
      }[reviewCategory];
      const categoryPlacement = {
        header: "header_decoration_rail",
        ground: "footer_accent",
        axo: "axo_theme_reference",
        ambient: "inner_page_accent",
        feature: "inner_page_accent"
      }[reviewCategory] as FestivalAssetPlacement;
      if (metadata.data.role !== categoryRole) {
        throw badRequest("The asset role does not match its Visual Review category.");
      }
      if (!resolvedPlacements.includes(categoryPlacement)) {
        throw badRequest(
          `${reviewCategory === "axo" ? "AXO" : "The selected"} asset must use its compatible website placement.`
        );
      }
    }
    const libraryAssetId = String(form.get("libraryAssetId") || "").trim() || null;
    const replacementModeValue = String(
      form.get("replacementMode") || "keep_both"
    );
    const replacementMode = [
      "replace_everywhere",
      "replace_selected",
      "keep_both"
    ].includes(replacementModeValue)
      ? (replacementModeValue as
          | "replace_everywhere"
          | "replace_selected"
          | "keep_both")
      : "keep_both";
    let selectedAssignmentIds: string[] = [];
    try {
      const value = JSON.parse(
        String(form.get("selectedAssignmentIds") || "[]")
      );
      selectedAssignmentIds = Array.isArray(value)
        ? value.filter(
            (item): item is string =>
              typeof item === "string" &&
              /^[0-9a-f-]{36}$/i.test(item)
          )
        : [];
    } catch {
      throw badRequest("The replacement assignment selection is invalid.");
    }
    const mimeType = normalizeHolidayMediaMimeType(file.type);
    const maxAssetBytes =
      metadata.data.role === "audio" ? maxAudioBytes : maxImageBytes;
    if (file.size <= 0) {
      throw badRequest("The selected asset is empty.");
    }
    if (file.size > maxAssetBytes) {
      throw badRequest(
        metadata.data.role === "audio"
          ? "Audio upload failed. Use a file up to 12 MB."
          : "Asset upload failed. Use a master image up to 40 MB."
      );
    }
    if (!allowedHolidayMediaMimeTypes.has(mimeType)) {
      throw badRequest(
        metadata.data.role === "audio"
          ? "Audio upload failed. The file type is not supported."
          : "Asset upload failed. Use PNG, JPG, AVIF, WebP or sanitised SVG."
      );
    }
    let buffer: Buffer;
    try {
      buffer = validateHolidayMediaAsset(
        Buffer.from(await file.arrayBuffer()),
        mimeType,
        metadata.data.role
      );
      if (
        metadata.data.role === "header" &&
        metadata.data.variant.startsWith("ornament-")
      ) {
        buffer = await validateHolidayHeaderOrnamentAsset(buffer, mimeType);
      }
    } catch (error) {
      const detail =
        error instanceof Error && /signature|SVG|format|static|transparent|256/i.test(error.message)
          ? error.message
          : "The asset is invalid or contains unsupported active content.";
      throw badRequest(
        metadata.data.role === "audio"
          ? `Audio upload failed. ${detail}`
          : `Asset upload failed. ${detail}`
      );
    }
    const mediaDescription = describeHolidayMediaAsset(
      buffer,
      mimeType,
      metadata.data.role
    );
    const imageDimensions =
      metadata.data.role === "audio"
        ? null
        : await describeHolidayImageDimensions(buffer, mimeType).catch(
            (error) => {
              throw badRequest(
                error instanceof Error
                  ? error.message
                  : "The image dimensions could not be validated."
              );
            }
          );
    const embeddedUiState = [
      "needs_review",
      "contains_embedded_ui",
      "no_embedded_ui"
    ].includes(String(form.get("embeddedUiState")))
      ? String(form.get("embeddedUiState"))
      : metadata.data.role.startsWith("login_")
        ? "needs_review"
        : "no_embedded_ui";
    const reviewTheme = visualReviewRequired
      ? (
          await dbQuery<{ slug: string; name: string }>(
            "select slug,name from holiday_themes where id=$1 and status<>'archived' limit 1",
            [metadata.data.themeId]
          )
        ).rows[0]
      : null;
    if (visualReviewRequired && (!reviewTheme || !reviewCategory)) {
      throw badRequest("Choose an active festival for Visual Review.");
    }
    if (visualReviewRequired && reviewTheme && reviewCategory) {
      await assertFestivalUatAssetIsUnique({
        checksumSha256: mediaDescription.checksumSha256,
        festivalSlug: reviewTheme.slug,
        category: reviewCategory
      });
    }

    try {
      uploadState.uploaded = await uploadFile({
        buffer,
        fileName: file.name,
        mimeType,
        assetType: "holiday_theme_asset",
        invoiceId: metadata.data.themeId,
        holidayAssetRole: metadata.data.role
      });
      if (visualReviewRequired && metadata.data.role !== "audio") {
        const thumbnail = await sharp(buffer, { limitInputPixels: false })
          .resize(640, 360, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .webp({ quality: 86, alphaQuality: 100 })
          .toBuffer();
        uploadState.thumbnail = await uploadFile({
          buffer: thumbnail,
          fileName: `${displayName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-thumbnail.webp`,
          mimeType: "image/webp",
          assetType: "holiday_theme_asset",
          invoiceId: metadata.data.themeId,
          holidayAssetRole: "supporting"
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) throw error;
      throw new ApiError(
        503,
        "INTEGRATION_UNAVAILABLE",
        metadata.data.role === "audio"
          ? "Audio upload failed while saving to private storage."
          : "Asset upload failed while saving to private storage."
      );
    }
    let detectedPalette;
    let paletteDetectionStatus:
      | "pending_review"
      | "needs_review"
      | undefined;
    let paletteDetectionMessage: string | null | undefined;
    if (paletteSourceRoles.has(metadata.data.role)) {
      try {
        detectedPalette = await extractHolidayPalette(buffer);
        paletteDetectionStatus = "pending_review";
        paletteDetectionMessage =
          "Detected from uploaded artwork. Preview and approve before activation.";
      } catch {
        detectedPalette = safeNeutralExtractedPalette();
        paletteDetectionStatus = "needs_review";
        paletteDetectionMessage =
          "Palette detection needs review. A safe WriteX-balanced palette is available.";
      }
    }
    let asset;
    try {
      const uploaded = uploadState.uploaded;
      if (!uploaded) {
        throw new ApiError(
          500,
          "SERVER_ERROR",
          "The private upload result was unavailable."
        );
      }
      asset = await saveHolidayThemeAsset({
        themeId: metadata.data.themeId,
        role: metadata.data.role,
        variant: metadata.data.variant,
        s3Key: uploaded.s3Key,
        safeFileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        checksumSha256: mediaDescription.checksumSha256,
        durationSeconds: mediaDescription.durationSeconds,
        actorId: admin.adminUserId,
        detectedPalette,
        paletteDetectionStatus,
        paletteDetectionMessage,
        purpose,
        placements: resolvedPlacements,
        libraryAssetId,
        replacementMode,
        selectedAssignmentIds,
        sourceDimensions: imageDimensions,
        embeddedUiState: embeddedUiState as
          | "needs_review"
          | "contains_embedded_ui"
          | "no_embedded_ui"
      });
      uploadState.committed = true;
      if (
        visualReviewRequired &&
        reviewTheme &&
        reviewCategory &&
        imageDimensions?.width &&
        imageDimensions?.height &&
        uploadState.thumbnail
      ) {
        await registerFestivalUatReviewAsset({
          versionAssetId: asset.id,
          libraryAssetId: asset.libraryAssetId,
          displayName,
          festivalSlug: reviewTheme.slug,
          festivalName: reviewTheme.name,
          category: reviewCategory,
          sourceS3Key: uploaded.s3Key,
          thumbnailS3Key: uploadState.thumbnail.s3Key,
          checksumSha256: mediaDescription.checksumSha256,
          mimeType: uploaded.mimeType,
          width: imageDimensions.width,
          height: imageDimensions.height,
          fileSize: uploaded.fileSize,
          supportedRegions,
          provenance,
          axoAnchor,
          axoPlacement,
          presentation,
          supportedMotions,
          actorId: admin.adminUserId
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) throw error;
      throw new ApiError(
        500,
        "SERVER_ERROR",
        metadata.data.role === "audio"
          ? "Audio was stored privately, but its event record could not be saved."
          : "The asset was stored privately, but its event record could not be saved."
      );
    }
    return apiOk(
      {
        assetId: asset?.id,
        libraryAssetId: asset?.libraryAssetId,
        library: await getFestivalAssetLibrarySnapshot(),
        snapshot: await getHolidayExperienceSnapshot()
      },
      {
        status: 201,
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": referenceId
        }
      }
    );
  } catch (error) {
    if (!uploadState.committed && uploadState.thumbnail) {
      await deleteFile(uploadState.thumbnail.s3Key).catch(() => undefined);
    }
    if (!uploadState.committed && uploadState.uploaded) {
      await deleteFile(uploadState.uploaded.s3Key).catch(() => undefined);
    }
    return apiErrorWithReference(error, referenceId);
  }
}

export async function PATCH(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `holiday-asset-review:${admin.adminUserId}:${context.ipAddress}`,
      limit: 60,
      windowSeconds: 60 * 60
    });
    const payload = (await request.json().catch(() => null)) as {
      assetId?: unknown;
      decision?: unknown;
      reason?: unknown;
      isFallback?: unknown;
      clarityConfirmed?: unknown;
    } | null;
    const assetId =
      typeof payload?.assetId === "string" ? payload.assetId.trim() : "";
    const decision = [
      "approved",
      "approved_with_size_restrictions",
      "ambiguous",
      "needs_replacement",
      "rejected"
    ].includes(String(payload?.decision))
      ? (payload?.decision as
          | "approved"
          | "approved_with_size_restrictions"
          | "ambiguous"
          | "needs_replacement"
          | "rejected")
      : null;
    if (!assetId || !decision) {
      throw badRequest("Choose an asset review decision.");
    }
    await reviewHolidayThemeAsset({
      assetId,
      decision,
      reason:
        typeof payload?.reason === "string"
          ? payload.reason.trim().slice(0, 240)
          : null,
      isFallback: payload?.isFallback === true,
      clarityConfirmed: payload?.clarityConfirmed === true,
      actorId: admin.adminUserId
    });
    return apiOk(
      { snapshot: await getHolidayExperienceSnapshot() },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": referenceId
        }
      }
    );
  } catch (error) {
    return apiErrorWithReference(error, referenceId);
  }
}

export async function DELETE(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `holiday-asset-remove:${admin.adminUserId}:${context.ipAddress}`,
      limit: 30,
      windowSeconds: 60 * 60
    });

    const payload = (await request.json().catch(() => null)) as {
      assetId?: unknown;
    } | null;
    const assetId =
      typeof payload?.assetId === "string" ? payload.assetId.trim() : "";
    if (!assetId) throw badRequest("Select a holiday asset to remove.");

    const asset = await getHolidayAssetRecord(assetId);
    if (!asset || !asset.library_asset_id) {
      throw badRequest("The available holiday asset was not found.");
    }

    await setFestivalAssetLifecycle({
      libraryAssetId: asset.library_asset_id,
      action: "archive",
      actorId: admin.adminUserId
    });

    return apiOk(
      {
        library: await getFestivalAssetLibrarySnapshot(),
        snapshot: await getHolidayExperienceSnapshot()
      },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-correlation-id": referenceId
        }
      }
    );
  } catch (error) {
    return apiErrorWithReference(error, referenceId);
  }
}
