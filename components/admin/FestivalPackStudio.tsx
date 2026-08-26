"use client";

import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Monitor,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  RotateCcw,
  X
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  AdminStatusBadge,
  humaniseAdminStatus
} from "@/components/admin/AdminPrimitives";
import {
  FESTIVAL_MOTIF_CATEGORIES,
  FESTIVAL_MOTIF_LIBRARY,
  type FestivalMotifDefinition
} from "@/lib/holiday/motif-library";
import { BUILT_IN_FESTIVAL_ASSET_VERSION } from "@/lib/holiday/built-in-assets";
import {
  applyDecorationPackToStudio,
  decorationPacksForFestival,
  governedDecorationPacksForFestival,
  synchroniseDecorationPackMotions,
  type FestivalDecorationPackManifest
} from "@/lib/holiday/decoration-packs";
import {
  festivalAssignmentSource,
  normalizeFestivalStudioScene
} from "@/lib/holiday/canonical-scene";
import {
  HOLIDAY_STUDIO_ARTWORK_MODES,
  HOLIDAY_STUDIO_DENSITIES,
  HOLIDAY_STUDIO_MOTIONS,
  HOLIDAY_STUDIO_PAGE_COVERAGE,
  HOLIDAY_STUDIO_REGIONS,
  HOLIDAY_STUDIO_SOURCE_MODES,
  type HolidayExperienceStudioConfig,
  type HolidayStudioMotifAssignment,
  type HolidayStudioRegion,
  type HolidayTheme
} from "@/lib/holiday/types";

export type FestivalStudioSection =
  | "regions"
  | "motifs"
  | "hero"
  | "characters"
  | "motion"
  | "accessibility"
  | "preview";

const fieldClass =
  "min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none transition focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15";
const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-not-allowed disabled:opacity-45";
const buttonPrimary = `${buttonBase} wx-gradient-action border-transparent text-white`;
const buttonSecondary = `${buttonBase} border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700`;
const builtInAssetVersion = `?v=${BUILT_IN_FESTIVAL_ASSET_VERSION}`;

const regionLabels: Record<HolidayStudioRegion, string> = {
  navigation_rail: "Header Decoration Rail",
  hero_background: "Hero Background",
  hero_foreground: "Hero Foreground Decorations",
  page_ambience: "Ambient Effect",
  section_dividers: "Footer Decoration",
  card_corners: "Card Corner Motifs",
  floating_edges: "Feature Effect",
  axo_area: "AXO Accessory & Prop",
  announcement_strip: "Announcement Strip",
  footer_decoration: "Ground & Page-bottom Decoration",
  client_login: "Client Login",
  employee_login: "Employee Login",
  fullscreen_intro: "Optional Full-Screen Intro"
};

const sectionCopy: Record<
  FestivalStudioSection,
  { eyebrow: string; title: string; description: string }
> = {
  regions: {
    eyebrow: "Operational Regions",
    title: "Place festival assets intentionally",
    description:
      "Each surface has its own asset pack, intensity, device visibility, motion and safe fallback."
  },
  motifs: {
    eyebrow: "Motifs & Symbols",
    title: "Use reviewed artwork, not abstract placeholders",
    description:
      "Browse the fixed WriteX library, inspect it at real sizes and assign approved assets to scene layers."
  },
  hero: {
    eyebrow: "Hero Scene",
    title: "Compose around a protected text area",
    description:
      "Hero background and foreground assets stay clear of headings, actions and form surfaces."
  },
  characters: {
    eyebrow: "Characters & Axo",
    title: "Fixed, reviewed character artwork",
    description:
      "Complex characters and Axo props are source-controlled assets with size and placement restrictions."
  },
  motion: {
    eyebrow: "Motion",
    title: "Object-appropriate movement only",
    description:
      "Motions are assigned from each asset's supported list and reduced automatically on small screens."
  },
  accessibility: {
    eyebrow: "Mobile & Accessibility",
    title: "Fallbacks are part of the pack",
    description:
      "Approved static mobile and reduced-motion behaviour is mandatory before activation."
  },
  preview: {
    eyebrow: "Private Preview",
    title: "Review the complete composition safely",
    description:
      "Inspect desktop, tablet, mobile and reduced-motion states without activating a public theme."
  }
};

function cloneStudio(studio: HolidayExperienceStudioConfig) {
  return JSON.parse(JSON.stringify(studio)) as HolidayExperienceStudioConfig;
}

function qualityTone(status: FestivalMotifDefinition["qualityStatus"]) {
  if (
    status === "approved" ||
    status === "approved_with_size_restrictions"
  ) {
    return "success" as const;
  }
  if (status === "rejected" || status === "ambiguous") {
    return "danger" as const;
  }
  return "warning" as const;
}

function VisibilityToggle({
  label,
  checked,
  icon,
  onChange
}: {
  label: string;
  checked: boolean;
  icon: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
        checked
          ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
          : "border-wxBorder bg-wxSurface text-wxIndigo500"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {icon}
      {label}
    </label>
  );
}

function AssetPreview({
  asset,
  onClose
}: {
  asset: FestivalMotifDefinition;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"transparent" | "light" | "dark">(
    "transparent"
  );
  const [zoom, setZoom] = useState(1);
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#070c26]/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="festival-asset-preview-title"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-wxBorder bg-wxSurface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-wxBorder bg-wxSurface/95 p-5 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
              Fixed Asset v1
            </p>
            <h3
              id="festival-asset-preview-title"
              className="mt-1 text-xl font-semibold text-wxIndigo900"
            >
              {asset.name}
            </h3>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder text-wxIndigo600"
            onClick={onClose}
            aria-label="Close asset preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {(["transparent", "light", "dark"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === mode ? buttonPrimary : buttonSecondary}
                  onClick={() => setMode(item)}
                >
                  {humaniseAdminStatus(item)}
                </button>
              ))}
              <label className="ml-auto flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-xs font-semibold text-wxIndigo600">
                Zoom
                <input
                  type="range"
                  min="0.6"
                  max="2"
                  step="0.1"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
            </div>
            <div
              className={`relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-md border border-wxBorder p-10 ${
                mode === "light"
                  ? "bg-white"
                  : mode === "dark"
                    ? "bg-[#090f2f]"
                    : "bg-[linear-gradient(45deg,#e8e9f3_25%,transparent_25%),linear-gradient(-45deg,#e8e9f3_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e8e9f3_75%),linear-gradient(-45deg,transparent_75%,#e8e9f3_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]"
              }`}
            >
              <Image
                src={`${asset.path}${builtInAssetVersion}`}
                alt={asset.intendedObject}
                width={320}
                height={320}
                unoptimized
                style={{ transform: `scale(${zoom})` }}
                className="max-h-80 max-w-full object-contain transition-transform"
              />
            </div>
            <div className="mt-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                Mobile-size check
              </p>
              <div className="mt-2 flex h-24 items-center justify-center rounded bg-wxSurface">
                <Image
                  src={`${asset.path}${builtInAssetVersion}`}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="max-h-16 max-w-16 object-contain"
                />
              </div>
            </div>
          </div>
          <dl className="space-y-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Intended object
              </dt>
              <dd className="mt-1 text-sm text-wxIndigo900">
                {asset.intendedObject}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Quality
              </dt>
              <dd className="mt-1">
                <AdminStatusBadge tone={qualityTone(asset.qualityStatus)}>
                  {humaniseAdminStatus(asset.qualityStatus)}
                </AdminStatusBadge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Review note
              </dt>
              <dd className="mt-1 text-sm leading-6 text-wxIndigo700">
                {asset.reviewNote}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Size restrictions
              </dt>
              <dd className="mt-1 text-sm text-wxIndigo700">
                {asset.sizeRestrictions || "None"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Supported motion
              </dt>
              <dd className="mt-1 text-sm text-wxIndigo700">
                {asset.supportedMotions
                  .map(humaniseAdminStatus)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-wxIndigo500">
                Source
              </dt>
              <dd className="mt-1 break-all text-xs text-wxIndigo700">
                {asset.path}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function FestivalPackStudio({
  theme,
  initialStudio,
  previewSlug,
  festivalSlug,
  lockedRegion,
  regionOptions,
  embedded = false,
  section,
  busy,
  onSave,
  governedAssets = [],
  onPendingStudioChange,
  onOpenPrivatePreview
}: {
  theme?: HolidayTheme;
  initialStudio?: HolidayExperienceStudioConfig;
  previewSlug?: string;
  festivalSlug?: string;
  lockedRegion?: HolidayStudioRegion;
  regionOptions?: HolidayStudioRegion[];
  embedded?: boolean;
  section: FestivalStudioSection;
  busy: boolean;
  onSave: (studio: HolidayExperienceStudioConfig) => Promise<boolean>;
  governedAssets?: FestivalMotifDefinition[];
  onPendingStudioChange?: (
    studio: HolidayExperienceStudioConfig | null
  ) => void;
  onOpenPrivatePreview: () => void;
}) {
  const [studio, setStudio] = useState(() =>
    cloneStudio(initialStudio || theme!.experienceConfig.studio)
  );
  const previewThemeSlug = previewSlug || theme?.slug || "custom-event";
  const previewPalette = theme?.palette || {
    surfaceTint: "#f4f0ff",
    accentSoft: "#ffeaf4"
  };
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedRegion, setSelectedRegion] =
    useState<HolidayStudioRegion>(
      lockedRegion ||
      regionOptions?.[0] ||
      (section === "motion" ? "page_ambience" : "hero_foreground")
    );
  const [previewAsset, setPreviewAsset] =
    useState<FestivalMotifDefinition | null>(null);
  const [previewPack, setPreviewPack] =
    useState<FestivalDecorationPackManifest | null>(null);
  const [showAllFestivals, setShowAllFestivals] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [previousStudio, setPreviousStudio] =
    useState<HolidayExperienceStudioConfig | null>(null);
  const studioRef = useRef(studio);

  const updateStudio = (
    update:
      | HolidayExperienceStudioConfig
      | ((current: HolidayExperienceStudioConfig) => HolidayExperienceStudioConfig)
  ) => {
    const next =
      typeof update === "function" ? update(studioRef.current) : update;
    studioRef.current = next;
    setStudio(next);
    setDirty(true);
    onPendingStudioChange?.(cloneStudio(next));
  };

  const restorePersistedStudio = (persisted: HolidayExperienceStudioConfig) => {
    const restored = cloneStudio(persisted);
    studioRef.current = restored;
    setStudio(restored);
    setDirty(false);
    onPendingStudioChange?.(null);
  };

  const copy = sectionCopy[section];
  const assignmentsByAssetAndRegion = useMemo(
    () =>
      new Map(
        [...studio.motifAssignments]
          .filter((assignment) => assignment.enabled)
          .sort((left, right) =>
            festivalAssignmentSource(left) === "custom" &&
            festivalAssignmentSource(right) !== "custom"
              ? 1
              : -1
          )
          .map((assignment) => [
            `${assignment.region}:${assignment.assetId}`,
            assignment
          ])
      ),
    [studio.motifAssignments]
  );
  const assignmentsByRegion = useMemo(
    () =>
      new Map(
        HOLIDAY_STUDIO_REGIONS.map((region) => [
          region,
          studio.motifAssignments.filter(
            (assignment) => assignment.region === region && assignment.enabled
          )
        ])
      ),
    [studio.motifAssignments]
  );
  const library = useMemo(() => {
    const term = search.trim().toLowerCase();
    const builtInFestivalAxo: FestivalMotifDefinition | null =
      section === "characters" && festivalSlug
        ? {
            id: `festival-axo-${festivalSlug}`,
            name: `${festivalSlug.replaceAll("-", " ")} AXO styling`,
            category: "axo_accessories",
            intendedObject: "Approved festival styling for the dedicated AXO website region",
            intendedFestivals: [festivalSlug],
            path: `/festival-assets/${festivalSlug}/axo/outfit-overlay.svg`,
            presentation: "axo",
            visualStyle: "soft_dimensional",
            supportedMotions: ["static", "axo_interaction"],
            qualityStatus: "approved",
            sizeRestrictions: "Use only with the full AXO figure in the dedicated website region.",
            culturalReviewRequired: true,
            religiousApprovalRequired: false,
            auditClassification: "keep",
            reviewNote: "Uses the governed source-controlled festival AXO overlay."
          }
        : null;
    const sourceLibrary = builtInFestivalAxo
      ? [...FESTIVAL_MOTIF_LIBRARY, ...governedAssets, builtInFestivalAxo]
      : [...FESTIVAL_MOTIF_LIBRARY, ...governedAssets];
    return sourceLibrary.filter((asset) => {
      const filteredRegion = lockedRegion || (regionOptions ? selectedRegion : null);
      const festivalMatch =
        showAllFestivals ||
        !festivalSlug ||
        asset.intendedFestivals.includes(festivalSlug);
      const categoryMatch = category === "all" || asset.category === category;
      const characterMatch =
        section !== "characters" ||
        ["christmas", "axo_accessories"].includes(asset.category);
      const regionMatch = !filteredRegion || (() => {
        if (filteredRegion === "navigation_rail") {
          return ["garland", "toran", "border", "corner", "cluster"].includes(asset.presentation);
        }
        if (["footer_decoration", "floating_edges", "hero_foreground", "section_dividers"].includes(filteredRegion)) {
          return ["single", "cluster", "border", "corner", "scene", "overlay"].includes(asset.presentation);
        }
        if (filteredRegion === "axo_area") return asset.presentation === "axo";
        return true;
      })();
      const searchMatch =
        !term ||
        asset.name.toLowerCase().includes(term) ||
        asset.intendedObject.toLowerCase().includes(term) ||
        asset.intendedFestivals.some((item) =>
          item.toLowerCase().includes(term)
        );
      return festivalMatch && categoryMatch && characterMatch && regionMatch && searchMatch;
    });
  }, [category, festivalSlug, governedAssets, lockedRegion, regionOptions, search, section, selectedRegion, showAllFestivals]);
  const completePacks = useMemo(
    () => [
      ...decorationPacksForFestival(festivalSlug || ""),
      ...governedDecorationPacksForFestival(governedAssets, festivalSlug || "")
    ].filter((pack) => {
      if (section === "motion") {
        return (
          (pack.type === "ambient_effect" || pack.type === "feature_effect") &&
          pack.targetRegion === selectedRegion
        );
      }
      return pack.targetRegion === selectedRegion;
    }),
    [festivalSlug, governedAssets, section, selectedRegion]
  );

  const updateRegion = (
    region: HolidayStudioRegion,
    patch: Partial<HolidayExperienceStudioConfig["regions"][HolidayStudioRegion]>
  ) => {
    updateStudio((current) => ({
      ...current,
      regions: {
        ...current.regions,
        [region]: { ...current.regions[region], ...patch }
      }
    }));
    setDirty(true);
  };

  const assignAsset = async (
    asset: FestivalMotifDefinition,
    sourceMode: "custom" | "recommended" = "custom"
  ) => {
    if (
      asset.qualityStatus !== "approved" &&
      asset.qualityStatus !== "approved_with_size_restrictions"
    ) {
      return;
    }
    const existing = studio.motifAssignments.find(
      (item) =>
        item.assetId === asset.id &&
        item.region === selectedRegion &&
        festivalAssignmentSource(item) === sourceMode
    );
    const preferredMotion =
      asset.supportedMotions.find((motion) => motion !== "static") ||
      asset.supportedMotions[0] ||
      "static";
    const assignmentsWithoutInactiveFallbacks = studio.motifAssignments.filter(
      (item) =>
        item.region !== selectedRegion ||
        festivalAssignmentSource(item) === sourceMode
    );
    const nextStudio: HolidayExperienceStudioConfig = normalizeFestivalStudioScene(existing
      ? (() => {
          const remaining = assignmentsWithoutInactiveFallbacks.filter(
            (item) => item.id !== existing.id
          );
          const regionStillUsed = remaining.some(
            (item) => item.enabled && item.region === selectedRegion
          );
          return {
            ...studio,
            regions: {
              ...studio.regions,
              [selectedRegion]: {
                ...studio.regions[selectedRegion],
                enabled: regionStillUsed
              }
            },
            motifAssignments: remaining
          };
        })()
      : {
          ...studio,
          activeMotions:
            preferredMotion === "static"
              ? studio.activeMotions
              : [...new Set([...studio.activeMotions, preferredMotion])],
          regions: {
            ...studio.regions,
            [selectedRegion]: {
              ...studio.regions[selectedRegion],
              enabled: true,
              assetPackId:
                studio.regions[selectedRegion].assetPackId ||
                `${festivalSlug || "festival"}-${selectedRegion}`,
              intensity: "medium",
              motion: preferredMotion,
              visibility: { desktop: true, tablet: true, mobile: true },
              safeFallback: "default_writex"
            }
          },
          motifAssignments: [
            ...assignmentsWithoutInactiveFallbacks,
            {
              id: `${selectedRegion}-${asset.id}`,
              assetId: asset.id,
              sourceMode,
              ...(asset.libraryAssetId
                ? { libraryAssetId: asset.libraryAssetId }
                : {}),
              ...(asset.assetVersionId
                ? { assetVersionId: asset.assetVersionId }
                : {}),
              region: selectedRegion,
              enabled: true,
              size: "medium",
              density: studio.density,
              motion: preferredMotion,
              layer: studio.motifAssignments.length + 1,
              visibility: { desktop: true, tablet: true, mobile: true },
              religiousArtworkApproved:
                !asset.religiousApprovalRequired ||
                studio.religiousArtworkApproved
            }
          ]
        });
    setPreviousStudio(cloneStudio(studio));
    updateStudio(nextStudio);
    setDirty(true);
    const saved = await onSave(nextStudio);
    if (saved) {
      setDirty(false);
      onPendingStudioChange?.(null);
    } else {
      restorePersistedStudio(studio);
    }
  };

  const clearFestivalRegion = async () => {
    const remainingAssignments = studio.motifAssignments.filter(
      (assignment) => assignment.region !== selectedRegion
    );
    const remainingMotions = synchroniseDecorationPackMotions(
      studio,
      remainingAssignments
    );
    const nextStudio = normalizeFestivalStudioScene({
      ...studio,
      motifAssignments: remainingAssignments,
      activeMotions: remainingMotions,
      motionSourceMode: remainingMotions.length > 0 ? studio.motionSourceMode || "custom" : "none",
      regions: {
        ...studio.regions,
        [selectedRegion]: {
          ...studio.regions[selectedRegion],
          enabled: false,
          assetPackId: "built-in:default"
        }
      }
    });
    setPreviousStudio(cloneStudio(studio));
    updateStudio(nextStudio);
    const saved = await onSave(nextStudio);
    if (saved) {
      setDirty(false);
      onPendingStudioChange?.(null);
    } else {
      restorePersistedStudio(studio);
    }
  };

  const assignCompletePack = async (
    pack: FestivalDecorationPackManifest,
    sourceMode: "custom" | "recommended" = "custom"
  ) => {
    if (pack.targetRegion !== selectedRegion) return;
    const currentStudio = cloneStudio(studio);
    const nextStudio = normalizeFestivalStudioScene(
      applyDecorationPackToStudio(currentStudio, pack, sourceMode)
    );
    setPreviousStudio(currentStudio);
    updateStudio(nextStudio);
    const saved = await onSave(nextStudio);
    if (saved) {
      setDirty(false);
      onPendingStudioChange?.(null);
    } else {
      restorePersistedStudio(currentStudio);
    }
  };

  const applyRecommendedForRegion = async () => {
    const recommended = completePacks.find((pack) => pack.recommended);
    if (recommended) await assignCompletePack(recommended, "recommended");
  };

  const restorePreviousSceneChange = async () => {
    if (!previousStudio) return;
    const restoredStudio = cloneStudio(previousStudio);
    const currentStudio = cloneStudio(studio);
    updateStudio(restoredStudio);
    setDirty(true);
    const saved = await onSave(restoredStudio);
    if (saved) {
      setPreviousStudio(currentStudio);
      setDirty(false);
      onPendingStudioChange?.(null);
    } else {
      restorePersistedStudio(currentStudio);
    }
  };

  const updateAssignment = (
    assignmentId: string,
    patch: Partial<HolidayStudioMotifAssignment>
  ) => {
    updateStudio((current) => ({
      ...current,
      motifAssignments: current.motifAssignments.map((item) =>
        item.id === assignmentId ? { ...item, ...patch } : item
      )
    }));
    setDirty(true);
  };

  const moveAssignment = (assignmentId: string, direction: -1 | 1) => {
    updateStudio((current) => {
      const ordered = [...current.motifAssignments].sort(
        (a, b) => a.layer - b.layer
      );
      const index = ordered.findIndex((item) => item.id === assignmentId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ordered.length) return current;
      const currentLayer = ordered[index].layer;
      ordered[index] = { ...ordered[index], layer: ordered[target].layer };
      ordered[target] = { ...ordered[target], layer: currentLayer };
      return { ...current, motifAssignments: ordered };
    });
    setDirty(true);
  };

  const save = async () => {
    const saved = await onSave(studio);
    if (saved) {
      setDirty(false);
      onPendingStudioChange?.(null);
    }
  };

  const activeCompletePack = completePacks.find((pack) =>
    pack.components.some((component) =>
      studio.motifAssignments.some(
        (assignment) =>
          assignment.enabled &&
          assignment.region === selectedRegion &&
          (component.assetVersionId
            ? assignment.assetVersionId === component.assetVersionId
            : assignment.decorationPackId === pack.id)
      )
    )
  ) || null;
  const activeCompletePackId = activeCompletePack?.id;
  const completePackPanel = (
    <section className="mt-6" aria-label="Complete festival decoration packs">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-wxViolet700">
            Complete packs
          </p>
          <h3 className="mt-1 text-base font-semibold text-wxIndigo900">
            {regionLabels[selectedRegion]}
          </h3>
          <p className="mt-1 text-xs leading-5 text-wxIndigo500">
            Complete packs use fixed component positions, responsive rules and one approved version.
          </p>
        </div>
        {activeCompletePack ? (
          <AdminStatusBadge tone="success">
            Active in draft: {activeCompletePack.displayName}
          </AdminStatusBadge>
        ) : null}
      </div>
      {completePacks.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {completePacks.map((pack) => {
            const selected = activeCompletePackId === pack.id;
            return (
              <article key={pack.id} className="rounded-md border border-wxBorder bg-wxSurface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <AdminStatusBadge tone="success">
                      Type: {humaniseAdminStatus(pack.type)}
                    </AdminStatusBadge>
                    <h4 className="mt-3 text-sm font-semibold text-wxIndigo900">
                      {pack.displayName}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                      {pack.components.length} fixed component{pack.components.length === 1 ? "" : "s"} · v{pack.version} · mobile {humaniseAdminStatus(pack.mobilePlacement)}
                    </p>
                  </div>
                  {selected ? <AdminStatusBadge tone="success">Selected</AdminStatusBadge> : null}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
                  {pack.components.slice(0, 3).map((item) => {
                    const motif = FESTIVAL_MOTIF_LIBRARY.find((candidate) => candidate.id === item.assetId);
                    const previewPath = item.previewPath || motif?.path;
                    return previewPath ? (
                      <div key={item.id} className="relative aspect-square overflow-hidden rounded-md bg-wxSurface">
                        <Image src={`${previewPath}${item.previewPath ? "" : builtInAssetVersion}`} alt="" fill unoptimized sizes="96px" className="object-contain p-2" />
                      </div>
                    ) : null;
                  })}
                </div>
                <div className={`mt-4 grid gap-2 ${selected ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  <button type="button" className={buttonSecondary} onClick={() => setPreviewPack(pack)}>
                    <Eye className="h-4 w-4" /> Preview Complete Pack
                  </button>
                  <button type="button" className={selected ? buttonSecondary : buttonPrimary} disabled={busy} onClick={() => void assignCompletePack(pack, "custom")}>
                    {selected ? <RotateCcw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {selected ? "Reapply Pack" : "Use Complete Pack"}
                  </button>
                  {selected ? (
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={busy}
                      onClick={() => void clearFestivalRegion()}
                    >
                      <X className="h-4 w-4" /> Remove Pack
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Source Required</p>
          <p className="mt-1 leading-6">
            No complete reviewed pack is available for this festival and region. The normal WriteX fallback remains selected; loose motifs are not promoted automatically.
          </p>
        </div>
      )}
    </section>
  );

  const normalRegionSelector =
    regionOptions && regionOptions.length > 1 ? (
      <div
        className="mt-6 grid gap-2 sm:grid-cols-2"
        role="tablist"
        aria-label={section === "motion" ? "Festival effect type" : "Decoration region"}
      >
        {regionOptions.map((region) => (
          <button
            key={region}
            type="button"
            role="tab"
            aria-selected={selectedRegion === region}
            onClick={() => setSelectedRegion(region)}
            className={`min-h-11 rounded-md border px-4 text-sm font-semibold ${
              selectedRegion === region
                ? "border-wxViolet700 bg-wxViolet700 text-white"
                : "border-wxBorder bg-wxSurface text-wxIndigo700"
            }`}
          >
            {regionLabels[region]}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <section className={embedded ? "border-t border-wxBorder pt-5" : "rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft md:p-6"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-wxIndigo500">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonSecondary}
            onClick={onOpenPrivatePreview}
          >
            <Eye className="h-4 w-4" />
            Private Preview
          </button>
          {previousStudio ? (
            <button
              type="button"
              className={buttonSecondary}
              disabled={busy}
              onClick={() => void restorePreviousSceneChange()}
            >
              <RotateCcw className="h-4 w-4" />
              Restore Previous
            </button>
          ) : null}
          <button
            type="button"
            className={buttonPrimary}
            disabled={busy || !dirty}
            onClick={() => void save()}
          >
            <Check className="h-4 w-4" />
            Save Studio
          </button>
        </div>
      </div>

      {section === "regions" ? (
        <div className="mt-6">
          <div className="grid gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-wxIndigo600">
              Source mode
              <select
                value={studio.sourceMode}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    sourceMode: event.target
                      .value as HolidayExperienceStudioConfig["sourceMode"]
                  }));
                  setDirty(true);
                }}
                className={`${fieldClass} mt-1`}
              >
                {HOLIDAY_STUDIO_SOURCE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {humaniseAdminStatus(mode)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-wxIndigo600">
              Artwork mode
              <select
                value={studio.artworkMode}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    artworkMode: event.target
                      .value as HolidayExperienceStudioConfig["artworkMode"]
                  }));
                  setDirty(true);
                }}
                className={`${fieldClass} mt-1`}
              >
                {HOLIDAY_STUDIO_ARTWORK_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {humaniseAdminStatus(mode)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-wxIndigo600">
              Density
              <select
                value={studio.density}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    density: event.target
                      .value as HolidayExperienceStudioConfig["density"]
                  }));
                  setDirty(true);
                }}
                className={`${fieldClass} mt-1`}
              >
                {HOLIDAY_STUDIO_DENSITIES.map((density) => (
                  <option key={density} value={density}>
                    {humaniseAdminStatus(density)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-wxIndigo600">
              Page coverage
              <select
                value={studio.pageCoverage}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    pageCoverage: event.target
                      .value as HolidayExperienceStudioConfig["pageCoverage"]
                  }));
                  setDirty(true);
                }}
                className={`${fieldClass} mt-1`}
              >
                {HOLIDAY_STUDIO_PAGE_COVERAGE.map((coverage) => (
                  <option key={coverage} value={coverage}>
                    {humaniseAdminStatus(coverage)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-wxIndigo600 md:col-span-2">
              Included routes
              <input
                value={studio.includedRoutes.join(", ")}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    includedRoutes: event.target.value
                      .split(",")
                      .map((route) => route.trim())
                      .filter(Boolean)
                  }));
                  setDirty(true);
                }}
                className={`${fieldClass} mt-1`}
                placeholder="/, /about-us, /pricing"
              />
            </label>
            <label className="text-xs font-semibold text-wxIndigo600 md:col-span-2">
              Excluded routes
              <input
                value={studio.excludedRoutes.join(", ")}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    excludedRoutes: event.target.value
                      .split(",")
                      .map((route) => route.trim())
                      .filter(Boolean)
                  }));
                  setDirty(true);
                }}
                className={`${fieldClass} mt-1`}
                placeholder="/admin, /client"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-wxBorder bg-wxSurface p-3 text-sm font-semibold text-wxIndigo700 md:col-span-2 xl:col-span-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={studio.religiousArtworkApproved}
                onChange={(event) => {
                  updateStudio((current) => ({
                    ...current,
                    religiousArtworkApproved: event.target.checked
                  }));
                  setDirty(true);
                }}
              />
              <span>
                Religious artwork has explicit management approval
                <span className="mt-1 block text-xs font-normal leading-5 text-wxIndigo500">
                  Required before artwork marked as religious can be activated.
                  Decorative cultural motifs do not imply approval of religious
                  figures.
                </span>
              </span>
            </label>
            {studio.artworkMode === "religious_approval_required" &&
            !studio.religiousArtworkApproved ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950 md:col-span-2 xl:col-span-4">
                Activation is blocked until the explicit religious-artwork
                approval is recorded.
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {HOLIDAY_STUDIO_REGIONS.map((region) => {
            const config = studio.regions[region];
            return (
              <article
                key={region}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-wxIndigo900">
                      {regionLabels[region]}
                    </h3>
                    <p className="mt-1 text-xs text-wxIndigo500">
                      Fallback: {humaniseAdminStatus(config.safeFallback)}
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-wxIndigo700">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) =>
                        updateRegion(region, {
                          enabled: event.target.checked
                        })
                      }
                    />
                    Enabled
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-wxIndigo600">
                    Asset pack
                    <input
                      value={config.assetPackId}
                      onChange={(event) =>
                        updateRegion(region, {
                          assetPackId: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                            .replace(/-+/g, "-")
                        })
                      }
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <label className="text-xs font-semibold text-wxIndigo600">
                    Intensity
                    <select
                      value={config.intensity}
                      onChange={(event) =>
                        updateRegion(region, {
                          intensity: event.target.value as
                            | "low"
                            | "medium"
                            | "high"
                        })
                      }
                      className={`${fieldClass} mt-1`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-wxIndigo600">
                    Motion
                    <select
                      value={config.motion}
                      onChange={(event) =>
                        updateRegion(region, {
                          motion: event.target
                            .value as HolidayExperienceStudioConfig["regions"][HolidayStudioRegion]["motion"]
                        })
                      }
                      className={`${fieldClass} mt-1`}
                    >
                      {HOLIDAY_STUDIO_MOTIONS.map((motion) => (
                        <option key={motion} value={motion}>
                          {humaniseAdminStatus(motion)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-wxIndigo600">
                    Safe fallback
                    <select
                      value={config.safeFallback}
                      onChange={(event) =>
                        updateRegion(region, {
                          safeFallback: event.target.value as
                            | "omit"
                            | "static_approved"
                            | "default_writex"
                        })
                      }
                      className={`${fieldClass} mt-1`}
                    >
                      <option value="omit">Omit asset</option>
                      <option value="static_approved">Static approved asset</option>
                      <option value="default_writex">Default WriteX</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <VisibilityToggle
                    label="Desktop"
                    checked={config.visibility.desktop}
                    icon={<Monitor className="h-3.5 w-3.5" />}
                    onChange={(checked) =>
                      updateRegion(region, {
                        visibility: {
                          ...config.visibility,
                          desktop: checked
                        }
                      })
                    }
                  />
                  <VisibilityToggle
                    label="Tablet"
                    checked={config.visibility.tablet}
                    icon={<Tablet className="h-3.5 w-3.5" />}
                    onChange={(checked) =>
                      updateRegion(region, {
                        visibility: {
                          ...config.visibility,
                          tablet: checked
                        }
                      })
                    }
                  />
                  <VisibilityToggle
                    label="Mobile"
                    checked={config.visibility.mobile}
                    icon={<Smartphone className="h-3.5 w-3.5" />}
                    onChange={(checked) =>
                      updateRegion(region, {
                        visibility: {
                          ...config.visibility,
                          mobile: checked
                        }
                      })
                    }
                  />
                </div>
              </article>
            );
          })}
          </div>
        </div>
      ) : null}

      {section === "motifs" || section === "characters" ? (
        <>
        {normalRegionSelector}
        {completePackPanel}
        <details className="mt-6 rounded-md border border-wxBorder bg-wxSurfaceSoft">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-wxIndigo700">
            Advanced Pack Builder - individual motifs
          </summary>
        <div className="border-t border-wxBorder p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_260px]">
            <label className="relative">
              <span className="sr-only">Search motif library</span>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-wxMuted" />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${fieldClass} pl-10`}
                placeholder="Search by object or festival"
              />
            </label>
            {lockedRegion ? (
              <div className={`${fieldClass} flex items-center`}>
                Add to: {regionLabels[lockedRegion]}
              </div>
            ) : <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={fieldClass}
              aria-label="Motif category"
            >
              <option value="all">All motif categories</option>
              {FESTIVAL_MOTIF_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {humaniseAdminStatus(item)}
                </option>
              ))}
            </select>}
            <select
              value={selectedRegion}
              onChange={(event) =>
                setSelectedRegion(event.target.value as HolidayStudioRegion)
              }
              className={fieldClass}
              aria-label="Assignment region"
            >
              {(lockedRegion ? [lockedRegion] : regionOptions || HOLIDAY_STUDIO_REGIONS).map((region) => (
                <option key={region} value={region}>
                  Add to: {regionLabels[region]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-wxIndigo600">
              {showAllFestivals
                ? "Advanced search: all approved festival assets"
                : `Recommended for ${festivalSlug?.replaceAll("-", " ") || "the selected festival"}`}
            </p>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-wxIndigo700">
              <input type="checkbox" checked={showAllFestivals} onChange={(event) => setShowAllFestivals(event.target.checked)} />
              Show all approved assets
            </label>
          </div>
          <div className="mt-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            {(() => {
              const activeAssignments = studio.motifAssignments.filter(
                (assignment) =>
                  assignment.region === selectedRegion && assignment.enabled
              );
              const sourceLabel = activeAssignments.some(
                (assignment) => festivalAssignmentSource(assignment) === "custom"
              )
                ? "Custom Festival Asset"
                : activeAssignments.some(
                      (assignment) =>
                        festivalAssignmentSource(assignment) === "recommended"
                    )
                  ? "Recommended Festival Asset"
                  : "Normal WriteX Website";
              return (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-wxIndigo500">Active selection</dt>
                      <dd className="mt-1 font-semibold text-wxIndigo900">
                        {activeAssignments
                          .map(
                            (assignment) =>
                              library.find((asset) => asset.id === assignment.assetId)
                                ?.name || assignment.assetId
                          )
                          .join(", ") || "No festival decoration"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-wxIndigo500">Source</dt>
                      <dd className="mt-1 font-semibold text-wxIndigo900">{sourceLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-wxIndigo500">Region</dt>
                      <dd className="mt-1 font-semibold text-wxIndigo900">
                        {regionLabels[selectedRegion]} · {activeAssignments.length > 0 ? "Enabled in Draft" : "Disabled"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className={buttonSecondary} onClick={() => void applyRecommendedForRegion()}>
                      Use Recommended
                    </button>
                    <button type="button" className={buttonSecondary} onClick={() => searchRef.current?.focus()}>
                      Choose Another
                    </button>
                    <button type="button" className={buttonSecondary} disabled={activeAssignments.length === 0} onClick={() => void clearFestivalRegion()}>
                      Remove Festival Decoration
                    </button>
                    <button type="button" className={buttonSecondary} disabled={!previousStudio} onClick={() => void restorePreviousSceneChange()}>
                      <RotateCcw className="h-4 w-4" /> Restore Previous
                    </button>
                    <button type="button" className={buttonSecondary} onClick={() => void clearFestivalRegion()}>
                      Use Normal WriteX Default
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {library.map((asset) => {
              const assignment = assignmentsByAssetAndRegion.get(
                `${selectedRegion}:${asset.id}`
              );
              const publishable =
                asset.qualityStatus === "approved" ||
                asset.qualityStatus === "approved_with_size_restrictions";
              return (
                <article
                  key={asset.id}
                  className="overflow-hidden rounded-md border border-wxBorder bg-wxSurface"
                >
                  <button
                    type="button"
                    className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#eeeff7_25%,transparent_25%),linear-gradient(-45deg,#eeeff7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eeeff7_75%),linear-gradient(-45deg,transparent_75%,#eeeff7_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] p-6"
                    onClick={() => setPreviewAsset(asset)}
                  >
                    <Image
                      src={`${asset.path}${builtInAssetVersion}`}
                      alt={asset.intendedObject}
                      width={220}
                      height={180}
                      unoptimized
                      className="max-h-44 max-w-full object-contain"
                    />
                    <span className="absolute bottom-2 right-2 inline-flex h-8 items-center gap-1 rounded-md border border-white/80 bg-white/90 px-2 text-xs font-semibold text-wxIndigo700 shadow">
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </span>
                  </button>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <AdminStatusBadge tone="neutral">
                          Type: {selectedRegion === "navigation_rail" ? "Header Motif" : selectedRegion === "axo_area" ? "AXO Accessory" : "Ground Motif"}
                        </AdminStatusBadge>
                        <h3 className="text-sm font-semibold text-wxIndigo900">
                          {asset.name}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                          {asset.intendedObject}
                        </p>
                      </div>
                      <AdminStatusBadge tone={qualityTone(asset.qualityStatus)}>
                        {humaniseAdminStatus(asset.qualityStatus)}
                      </AdminStatusBadge>
                    </div>
                    <button
                      type="button"
                      disabled={!publishable}
                      className={`mt-4 w-full ${
                        assignment ? buttonSecondary : buttonPrimary
                      }`}
                      onClick={() => void assignAsset(asset, "custom")}
                    >
                      {assignment ? (
                        <>
                          <X className="h-4 w-4" />
                          Remove from scene
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Add Motif to {regionLabels[selectedRegion]}
                        </>
                      )}
                    </button>
                    {assignment ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-wxBorder pt-3">
                        <select
                          value={assignment.size}
                          onChange={(event) =>
                            updateAssignment(assignment.id, {
                              size: event.target.value as
                                | "small"
                                | "medium"
                                | "large"
                            })
                          }
                          className={fieldClass}
                          aria-label={`${asset.name} size`}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                        <select
                          value={assignment.motion}
                          onChange={(event) =>
                            updateAssignment(assignment.id, {
                              motion: event.target
                                .value as HolidayStudioMotifAssignment["motion"]
                            })
                          }
                          className={fieldClass}
                          aria-label={`${asset.name} motion`}
                        >
                          {asset.supportedMotions.map((motion) => (
                            <option key={motion} value={motion}>
                              {humaniseAdminStatus(motion)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={buttonSecondary}
                          onClick={() => moveAssignment(assignment.id, -1)}
                          title="Move one layer forward"
                        >
                          <ChevronUp className="h-4 w-4" />
                          Forward
                        </button>
                        <button
                          type="button"
                          className={buttonSecondary}
                          onClick={() => moveAssignment(assignment.id, 1)}
                          title="Move one layer backward"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Back
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        </details>
        </>
      ) : null}

      {section === "hero" ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="space-y-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            {(["hero_background", "hero_foreground"] as const).map((region) => {
              const config = studio.regions[region];
              return (
                <div key={region} className="rounded-md border border-wxBorder bg-wxSurface p-4">
                  <h3 className="text-sm font-semibold text-wxIndigo900">
                    {regionLabels[region]}
                  </h3>
                  <label className="mt-3 block text-xs font-semibold text-wxIndigo600">
                    Intensity
                    <select
                      value={config.intensity}
                      className={`${fieldClass} mt-1`}
                      onChange={(event) =>
                        updateRegion(region, {
                          intensity: event.target.value as
                            | "low"
                            | "medium"
                            | "high"
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
          <div
            className="relative min-h-[430px] overflow-hidden rounded-md border border-wxBorder p-8"
            style={{
              background: `linear-gradient(135deg, ${previewPalette.surfaceTint}, ${previewPalette.accentSoft})`
            }}
          >
            <Image
              src={`/festival-assets/${previewThemeSlug}/hero/corner-accent.svg${builtInAssetVersion}`}
              alt=""
              width={640}
              height={640}
              unoptimized
              className="absolute right-0 top-0 h-full w-auto max-w-[65%] object-contain opacity-85"
            />
            <div className="relative z-10 max-w-[58%] rounded-md border-2 border-dashed border-wxViolet700/45 bg-white/80 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                Protected Text Area
              </p>
              <div className="mt-4 h-8 w-4/5 rounded bg-wxIndigo900/90" />
              <div className="mt-3 h-4 w-full rounded bg-wxIndigo500/25" />
              <div className="mt-2 h-4 w-4/5 rounded bg-wxIndigo500/25" />
              <div className="mt-5 h-10 w-36 rounded-md wx-gradient-action" />
            </div>
            <p className="absolute bottom-4 left-5 text-xs font-semibold text-wxIndigo600">
              Decorations remain outside this safe text and CTA zone.
            </p>
          </div>
        </div>
      ) : null}

      {section === "motion" ? (
        <>
        {normalRegionSelector}
        {completePackPanel}
        <details className="mt-6 rounded-md border border-wxBorder bg-wxSurfaceSoft">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-wxIndigo700">
            Advanced Pack Builder - exact motion controls
          </summary>
        <div className="grid gap-5 border-t border-wxBorder p-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {HOLIDAY_STUDIO_MOTIONS.map((motion) => {
              const checked = studio.activeMotions.includes(motion);
              return (
                <label
                  key={motion}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm font-semibold ${
                    checked
                      ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
                      : "border-wxBorder text-wxIndigo600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      updateStudio((current) => ({
                        ...current,
                        activeMotions: event.target.checked
                          ? [...new Set([...current.activeMotions, motion])]
                          : current.activeMotions.filter(
                              (item) => item !== motion
                            ),
                        motionSourceMode: event.target.checked
                          ? "custom"
                          : current.activeMotions
                                .filter((item) => item !== motion)
                                .some((item) => item !== "static")
                            ? current.motionSourceMode || "custom"
                            : "none"
                      }));
                      setDirty(true);
                    }}
                  />
                  {humaniseAdminStatus(motion)}
                </label>
              );
            })}
          </div>
          <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <h3 className="font-semibold text-wxIndigo900">
              Festival-specific controls
            </h3>
            <div className="mt-4 space-y-3">
              {Object.entries(studio.festivalControls).map(([key, value]) =>
                typeof value === "boolean" ? (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurface p-3 text-sm font-semibold text-wxIndigo700"
                  >
                    {humaniseAdminStatus(key)}
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(event) => {
                        updateStudio((current) => ({
                          ...current,
                          festivalControls: {
                            ...current.festivalControls,
                            [key]: event.target.checked
                          }
                        }));
                        setDirty(true);
                      }}
                    />
                  </label>
                ) : (
                  <label
                    key={key}
                    className="block text-sm font-semibold text-wxIndigo700"
                  >
                    {humaniseAdminStatus(key)}
                    <select
                      value={value}
                      className={`${fieldClass} mt-1`}
                      onChange={(event) => {
                        updateStudio((current) => ({
                          ...current,
                          festivalControls: {
                            ...current.festivalControls,
                            [key]: event.target.value
                          }
                        }));
                        setDirty(true);
                      }}
                    >
                      <option value="off">Off</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                )
              )}
            </div>
          </div>
        </div>
        </details>
        </>
      ) : null}

      {section === "accessibility" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Approved assets only", studio.qualityGate.approvedAssetsOnly],
            [
              "Ambiguity review required",
              studio.qualityGate.ambiguityReviewRequired
            ],
            [
              "Mobile fallback required",
              studio.qualityGate.mobileFallbackRequired
            ],
            [
              "Reduced-motion fallback required",
              studio.qualityGate.reducedMotionFallbackRequired
            ]
          ].map(([label, enabled]) => (
            <article
              key={String(label)}
              className="rounded-md border border-emerald-200 bg-emerald-50 p-4"
            >
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <h3 className="mt-3 text-sm font-semibold text-emerald-950">
                {label}
              </h3>
              <p className="mt-1 text-xs text-emerald-800">
                {enabled ? "Enforced" : "Not configured"}
              </p>
            </article>
          ))}
          <div className="md:col-span-2 xl:col-span-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <h3 className="font-semibold text-wxIndigo900">Device policy</h3>
            <p className="mt-2 text-sm leading-6 text-wxIndigo600">
              Rich motion is desktop-led. Mobile uses simplified approved assets;
              reduced-motion removes travel, falling, burst and flashing effects;
              sound stays user-started and disabled on login screens by default.
            </p>
          </div>
        </div>
      ) : null}

      {section === "preview" ? (
        <div className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Desktop", "1440 x 900", "aspect-[16/9]"],
              ["Tablet", "768 x 1024", "aspect-[3/4]"],
              ["Mobile", "390 x 844", "aspect-[9/16]"]
            ].map(([label, size, ratio]) => (
              <article
                key={label}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-wxIndigo900">
                    {label}
                  </h3>
                  <span className="text-xs text-wxIndigo500">{size}</span>
                </div>
                <div
                  className={`relative mt-3 max-h-64 overflow-hidden rounded border border-wxBorder bg-wxSurface ${ratio}`}
                >
                  <Image
                    src={`/festival-assets/${previewThemeSlug}/overlays/login-corners.svg${builtInAssetVersion}`}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-x-3 top-3 h-6 rounded bg-white/90 shadow" />
                  <div className="absolute left-4 top-14 h-4 w-2/3 rounded bg-wxIndigo900/80" />
                  <div className="absolute left-4 top-21 h-3 w-1/2 rounded bg-wxIndigo500/25" />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
            <div>
              <p className="text-sm font-semibold text-wxIndigo900">
                Reduced-motion fallback
              </p>
              <p className="mt-1 text-xs text-wxIndigo500">
                Static approved assets, no travel, bursts, snowfall or gift drops.
              </p>
            </div>
            <button
              type="button"
              className={buttonPrimary}
              onClick={onOpenPrivatePreview}
            >
              <Eye className="h-4 w-4" />
              Open Full Private Preview
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-md border border-wxBorder">
            <div className="border-b border-wxBorder bg-wxSurfaceSoft px-4 py-3">
              <h3 className="text-sm font-semibold text-wxIndigo900">
                Pack completeness matrix
              </h3>
              <p className="mt-1 text-xs text-wxIndigo500">
                Every operational region is accounted for before activation.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-wxBorder text-left text-sm">
                <thead className="bg-wxSurfaceSoft text-xs uppercase text-wxIndigo500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Region</th>
                    <th className="px-4 py-3 font-semibold">Pack</th>
                    <th className="px-4 py-3 font-semibold">Assets</th>
                    <th className="px-4 py-3 font-semibold">Fallback</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wxBorder bg-wxSurface">
                  {HOLIDAY_STUDIO_REGIONS.map((region) => {
                    const regionConfig = studio.regions[region];
                    const assigned = assignmentsByRegion.get(region) || [];
                    const ready =
                      !regionConfig.enabled ||
                      (Boolean(regionConfig.assetPackId) &&
                        Boolean(regionConfig.safeFallback));
                    return (
                      <tr key={region}>
                        <td className="px-4 py-3 font-semibold text-wxIndigo900">
                          {regionLabels[region]}
                        </td>
                        <td className="px-4 py-3 text-wxIndigo600">
                          {regionConfig.enabled
                            ? regionConfig.assetPackId
                            : "Intentionally disabled"}
                        </td>
                        <td className="px-4 py-3 text-wxIndigo600">
                          {assigned.length}
                        </td>
                        <td className="px-4 py-3 text-wxIndigo600">
                          {humaniseAdminStatus(regionConfig.safeFallback)}
                        </td>
                        <td className="px-4 py-3">
                          <AdminStatusBadge
                            tone={ready ? "success" : "danger"}
                          >
                            {ready ? "Ready" : "Incomplete"}
                          </AdminStatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {previewAsset ? (
        <AssetPreview
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      ) : null}
      {previewPack ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#070c26]/75 p-4" role="dialog" aria-modal="true" aria-labelledby="complete-pack-preview-title">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-wxBorder bg-wxSurface shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-wxBorder bg-wxSurface p-5">
              <div>
                <AdminStatusBadge tone="success">Type: {humaniseAdminStatus(previewPack.type)}</AdminStatusBadge>
                <h3 id="complete-pack-preview-title" className="mt-2 text-xl font-semibold text-wxIndigo900">{previewPack.displayName}</h3>
                <p className="mt-1 text-sm text-wxIndigo500">Exact approved manifest v{previewPack.version} · {previewPack.components.length} fixed components</p>
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder" onClick={() => setPreviewPack(null)} aria-label="Close complete pack preview"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              <div className="relative min-h-72 overflow-hidden rounded-md border border-wxBorder bg-[linear-gradient(135deg,#fff7ed,#f4f0ff)] dark:bg-[linear-gradient(135deg,#111735,#241a46)]" data-pack-preview-type={previewPack.type}>
                {previewPack.components.map((item) => {
                  const motif = FESTIVAL_MOTIF_LIBRARY.find((candidate) => candidate.id === item.assetId);
                  const previewPath = item.previewPath || motif?.path;
                  return previewPath ? (
                    <span key={item.id} className="wx-festival-pack-preview-component absolute" data-slot={item.slot}>
                      <Image src={`${previewPath}${item.previewPath ? "" : builtInAssetVersion}`} alt={motif?.intendedObject || previewPack.displayName} fill unoptimized sizes="360px" className="object-contain" />
                    </span>
                  ) : null;
                })}
                <div className="absolute inset-x-[28%] top-1/2 h-24 -translate-y-1/2 rounded-md border border-white/60 bg-white/55 shadow-lg backdrop-blur-sm dark:bg-[#111735]/60" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-wxBorder p-3"><p className="text-xs font-semibold uppercase text-wxIndigo500">Desktop</p><p className="mt-1 text-sm font-semibold text-wxIndigo900">{humaniseAdminStatus(previewPack.desktopPlacement)}</p></div>
                <div className="rounded-md border border-wxBorder p-3"><p className="text-xs font-semibold uppercase text-wxIndigo500">Mobile</p><p className="mt-1 text-sm font-semibold text-wxIndigo900">{humaniseAdminStatus(previewPack.mobilePlacement)}</p></div>
                <div className="rounded-md border border-wxBorder p-3"><p className="text-xs font-semibold uppercase text-wxIndigo500">Reduced motion</p><p className="mt-1 text-sm font-semibold text-wxIndigo900">Static approved fallback</p></div>
              </div>
              <button type="button" className={`${buttonPrimary} mt-5`} onClick={() => { const pack = previewPack; setPreviewPack(null); void assignCompletePack(pack, "custom"); }}><Sparkles className="h-4 w-4" /> Use Complete Pack</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
