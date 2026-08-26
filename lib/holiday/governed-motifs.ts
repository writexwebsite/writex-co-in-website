import type { FestivalLibraryAsset } from "./asset-governance-types";
import type { FestivalMotifDefinition } from "./motif-library";
import type { HolidayStudioMotion } from "./types";

const supportedPresentations = new Set<
  FestivalMotifDefinition["presentation"]
>(["single", "cluster", "garland", "toran", "border", "corner", "scene", "overlay", "axo"]);

function presentationFor(
  category: string | null,
  usageLocations: string[],
  metadata: Record<string, unknown>
): FestivalMotifDefinition["presentation"] {
  const supplied = String(metadata.presentation || "");
  if (supportedPresentations.has(supplied as FestivalMotifDefinition["presentation"])) {
    return supplied as FestivalMotifDefinition["presentation"];
  }
  if (category === "axo" || usageLocations.includes("axo_area")) return "axo";
  if (category === "header" || usageLocations.includes("navigation_rail")) return "border";
  if (category === "ground" || usageLocations.includes("footer_decoration")) return "cluster";
  return "overlay";
}

function motionsFor(
  category: string | null,
  metadata: Record<string, unknown>
): HolidayStudioMotion[] {
  const supplied = Array.isArray(metadata.supportedMotions)
    ? metadata.supportedMotions.filter(
        (value): value is HolidayStudioMotion => typeof value === "string"
      )
    : [];
  if (supplied.length > 0) return supplied;
  if (category === "axo") return ["static", "axo_interaction"];
  if (category === "ambient") return ["static", "floating"];
  if (category === "feature") return ["static", "twinkling"];
  return ["static", "gentle_wind"];
}

export function governedFestivalMotifs(
  assets: FestivalLibraryAsset[],
  festivalSlug: string
): FestivalMotifDefinition[] {
  return assets.flatMap((library) => {
    const version = library.versions.find(
      (item) => item.id === library.currentVersionId
    );
    if (
      !version ||
      library.lifecycleState !== "active" ||
      library.approvalState !== "approved" ||
      version.reviewStatus !== "approved" ||
      !["approved", "approved_with_size_restrictions"].includes(
        version.qualityStatus
      ) ||
      (version.intendedFestival !== festivalSlug &&
        version.intendedFestival !== "shared")
    ) {
      return [];
    }
    const metadata = version.assetMetadata || {};
    const usageLocations = version.usageLocations || [];
    const assetId = `governed-${version.id.replaceAll("-", "")}`;
    return [{
      id: assetId,
      name: library.displayName,
      category:
        version.assetCategory === "axo"
          ? "axo_accessories"
          : version.assetCategory === "header"
            ? "light_fire"
            : "patterns",
      intendedObject:
        typeof metadata.intendedObject === "string"
          ? metadata.intendedObject
          : library.displayName,
      intendedFestivals: [version.intendedFestival || festivalSlug],
      path: `/api/website-experience/assets/${version.id}?route=%2F`,
      presentation: presentationFor(
        version.assetCategory,
        usageLocations,
        metadata
      ),
      visualStyle: "soft_dimensional",
      supportedMotions: motionsFor(version.assetCategory, metadata),
      qualityStatus: version.qualityStatus as FestivalMotifDefinition["qualityStatus"],
      sizeRestrictions:
        typeof metadata.sizeRestrictions === "string"
          ? metadata.sizeRestrictions
          : null,
      culturalReviewRequired:
        metadata.culturalAttentionAcknowledged === true ||
        metadata.culturalReviewRequired === true,
      religiousApprovalRequired:
        metadata.religiousApprovalRequired === true,
      auditClassification: "keep",
      reviewNote: "Founder-approved governed Festival Asset Library version.",
      source: "governed",
      libraryAssetId: library.id,
      assetVersionId: version.id,
      assetVersionNumber: version.versionNumber,
      checksumSha256: version.checksumSha256,
      sourceCategory: version.assetCategory,
      supportedRegions: Array.isArray(metadata.supportedRegions)
        ? metadata.supportedRegions.filter(
            (value): value is string => typeof value === "string"
          )
        : usageLocations,
      completeComposition: metadata.completeComposition === true
    }];
  });
}
