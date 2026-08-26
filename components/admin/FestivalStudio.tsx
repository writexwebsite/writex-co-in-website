"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  CircleHelp,
  Eye,
  History,
  ImagePlus,
  Library,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Upload
} from "lucide-react";
import {
  festivalSlugForPack,
  variantNameForPack,
  variantSlugForPack
} from "@/lib/holiday/festival-pack-types";
import { governedFestivalMotifs } from "@/lib/holiday/governed-motifs";
import {
  applyDecorationPackToStudio,
  applyRecommendedDecorationPacks,
  governedDecorationPacksForFestival
} from "@/lib/holiday/decoration-packs";
import type { FestivalMotifDefinition } from "@/lib/holiday/motif-library";
import type { HolidayExperienceStudioConfig } from "@/lib/holiday/types";
import {
  FESTIVAL_STUDIO_SLOT_LABELS,
  type FestivalHeroSurface,
  type FestivalStudioConfiguration,
  type FestivalStudioSlot,
  type FestivalStudioSnapshot
} from "@/lib/holiday/festival-studio-types";
import {
  AdminPanel,
  AdminStatus,
  AdminStatusBadge
} from "./AdminPrimitives";
import { FestivalAssetLibrary } from "./FestivalAssetLibrary";
import { FestivalPackImporter } from "./FestivalPackImporter";
import { FestivalPackStudio } from "./FestivalPackStudio";

type StudioSection = "overview" | "configure" | "preview" | "schedule" | "history";
type AdvancedTool = "none" | "import" | "asset-library";
type DecorationBuilderSection = "header" | "ground" | "axo" | "effects" | "sound";

function recommendedFestivalStudio(
  current: HolidayExperienceStudioConfig,
  festivalSlug: string,
  governedAssets: FestivalMotifDefinition[] = []
): HolidayExperienceStudioConfig {
  const isChristmas = festivalSlug === "christmas";
  const isHoli = festivalSlug === "holi";
  const isDiwali = festivalSlug === "diwali";
  const withBuiltInPacks = applyRecommendedDecorationPacks(
    {
      ...current,
      motifAssignments: current.motifAssignments.filter(
        (item) => !["hero_background", "hero_foreground"].includes(item.region)
      )
    },
    festivalSlug
  );
  const builtInRegions = new Set(
    withBuiltInPacks.motifAssignments
      .filter((item) => item.decorationPackId)
      .map((item) => item.region)
  );
  const withRecommendedPacks = governedDecorationPacksForFestival(
    governedAssets,
    festivalSlug
  )
    .filter((pack) => !builtInRegions.has(pack.targetRegion))
    .reduce(
      (studio, pack) =>
        applyDecorationPackToStudio(studio, pack, "recommended"),
      withBuiltInPacks
    );
  return {
    ...withRecommendedPacks,
    density: "festive",
    activeMotions: withRecommendedPacks.activeMotions.length > 0
      ? withRecommendedPacks.activeMotions
      : isChristmas
        ? ["snowfall"]
        : isHoli
          ? ["colour_burst"]
          : isDiwali
            ? ["twinkling", "firework_sky"]
            : [],
    motionSourceMode: withRecommendedPacks.activeMotions.length > 0 ? "recommended" : "none",
    regions: {
      ...withRecommendedPacks.regions,
      hero_background: { ...withRecommendedPacks.regions.hero_background, enabled: false },
      hero_foreground: { ...withRecommendedPacks.regions.hero_foreground, enabled: false }
    },
    festivalControls: {
      ...current.festivalControls,
      snowfallEnabled: isChristmas,
      reindeerJourneyEnabled: isChristmas,
      giftDropEnabled: false,
      fireworksEnabled: isDiwali,
      gulalEnabled: isHoli,
      pichkariEnabled: isHoli,
      colourBurstIntensity: isHoli ? "medium" : "off",
      edgeSplashEnabled: false,
      axoInteractionEnabled: true
    }
  };
}

type ExactPreview = {
  themeId: string;
  packId: string;
  snapshotId: string;
  configurationHash: string;
  festivalSlug: string;
  festivalName: string;
  variantSlug: string;
  variantName: string;
  variantVersion: number;
  targetSurfaces: FestivalHeroSurface[];
  createdAt: string;
  expiresAt: string;
};

type ActivationIntent = {
  packId: string;
  variantName: string;
  currentName: string;
  surfaces: FestivalHeroSurface[];
  preview: ExactPreview;
};

const surfaceLabels: Record<FestivalHeroSurface, string> = {
  websiteHero: "Website Hero",
  clientLoginHero: "Client Login Hero",
  employeeLoginHero: "Employee Login Hero"
};

const assetGroups: Array<{
  title: string;
  description: string;
  slots: FestivalStudioSlot[];
}> = [
  {
    title: "Website Decorations",
    description: "Header artwork remains independent from full Hero assets.",
    slots: ["header"]
  },
  {
    title: "AXO and Characters",
    description: "Only approved AXO character or motion assets appear here.",
    slots: ["axo"]
  },
  {
    title: "Motion and Sound",
    description: "Optional audio and motion settings keep visitor controls intact.",
    slots: ["sound"]
  }
];

function packSupportedSurfaces(
  pack: FestivalStudioSnapshot["packLibrary"]["packs"][number]
) {
  const locations = new Set(
    pack.files.flatMap((file) =>
      file.approvedMappings.map((mapping) => mapping.location)
    )
  );
  return [
    locations.has("homepage_hero") ? "websiteHero" : null,
    locations.has("client_login_hero") || locations.has("client_login_background")
      ? "clientLoginHero"
      : null,
    locations.has("employee_login_hero") ||
    locations.has("employee_login_background")
      ? "employeeLoginHero"
      : null
  ].filter((surface): surface is FestivalHeroSurface => Boolean(surface));
}

function assetPurposeMatchesSlot(
  purpose: string,
  slot: FestivalStudioSlot
) {
  if (slot === "clientLoginHero") {
    return ["client_login_background", "client_employee_login"].includes(purpose);
  }
  if (slot === "employeeLoginHero") {
    return ["employee_login_background", "client_employee_login"].includes(purpose);
  }
  if (slot === "websiteHero") return purpose === "homepage_hero_artwork";
  if (slot === "header") return purpose === "header_decoration";
  if (slot === "axo") return purpose === "axo_reference";
  if (slot === "background") return purpose === "homepage_background";
  return purpose === "audio";
}

const slotUpload: Record<
  FestivalStudioSlot,
  { role: string; purpose: string; placement: string; accept: string }
> = {
  clientLoginHero: {
    role: "login_desktop",
    purpose: "client_login_background",
    placement: "client_login_desktop",
    accept: "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
  },
  employeeLoginHero: {
    role: "login_desktop",
    purpose: "employee_login_background",
    placement: "employee_login_desktop",
    accept: "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
  },
  websiteHero: {
    role: "hero_art",
    purpose: "homepage_hero_artwork",
    placement: "homepage_hero",
    accept: "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
  },
  header: {
    role: "header",
    purpose: "header_decoration",
    placement: "header_decoration_rail",
    accept: "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
  },
  axo: {
    role: "axo",
    purpose: "axo_reference",
    placement: "axo_theme_reference",
    accept: "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
  },
  background: {
    role: "decorative_overlay",
    purpose: "homepage_background",
    placement: "homepage_background",
    accept: "image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
  },
  sound: {
    role: "audio",
    purpose: "audio",
    placement: "audio",
    accept: "audio/mpeg,audio/wav,audio/ogg,audio/mp4"
  }
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function assetPreviewUrl(assetId: string) {
  return `/api/admin/website-experience/assets?assetId=${encodeURIComponent(assetId)}`;
}

function statusTone(status: string) {
  if (["active", "assigned"].includes(status)) return "success" as const;
  if (["blocked", "failed", "invalid_legacy_assignment"].includes(status)) return "danger" as const;
  if (["draft", "missing"].includes(status)) return "warning" as const;
  return "neutral" as const;
}

export function FestivalStudio({
  initialSnapshot,
  initialSection = "overview",
  initialTool = "none",
  initialFestivalSlug
}: {
  initialSnapshot: FestivalStudioSnapshot;
  initialSection?: StudioSection;
  initialTool?: AdvancedTool;
  initialFestivalSlug?: string;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [section, setSection] = useState<StudioSection>(initialSection);
  const [tool, setTool] = useState<AdvancedTool>(initialTool);
  const [selectedId, setSelectedId] = useState(
    initialSnapshot.configurations.find(
      (configuration) => configuration.festivalSlug === initialFestivalSlug
    )?.id ||
      initialSnapshot.activeConfiguration?.id ||
      initialSnapshot.configurations[0]?.id ||
      ""
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approval, setApproval] = useState(false);
  const [religiousApproval, setReligiousApproval] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [exactPreview, setExactPreview] = useState<ExactPreview | null>(null);
  const [activationIntent, setActivationIntent] =
    useState<ActivationIntent | null>(null);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [statusConfirmation, setStatusConfirmation] = useState<
    "turn-off" | "restore" | "restore-previous" | null
  >(null);
  const [decorationSection, setDecorationSection] =
    useState<DecorationBuilderSection>("header");
  const [sceneEditorRevision, setSceneEditorRevision] = useState(0);
  const [pendingSceneStudio, setPendingSceneStudio] =
    useState<HolidayExperienceStudioConfig | null>(null);

  const selected =
    snapshot.configurations.find((item) => item.id === selectedId) ||
    snapshot.configurations[0] ||
    null;
  const [draft, setDraft] = useState(() => ({
    packId: selected?.selectedVariantPackId || "",
    clientLoginEnabled: selected?.clientLoginEnabled ?? true,
    employeeLoginEnabled: selected?.employeeLoginEnabled ?? true,
    websiteEnabled: selected?.websiteEnabled ?? true,
    axoEnabled: selected?.axoEnabled ?? true,
    soundEnabled: selected?.soundEnabled ?? false,
    motionEnabled: selected?.motionConfig.enabled ?? true,
    motionLevel: selected?.motionConfig.level || ("subtle" as const),
    protectedBrandPlacement:
      selected?.protectedLoginBrand.placement || ("safe_auto" as const),
    protectedBrandSize:
      selected?.protectedLoginBrand.size || ("standard" as const),
    protectedBrandLightContrast:
      selected?.protectedLoginBrand.lightContrast || ("soft_glass" as const),
    protectedBrandDarkContrast:
      selected?.protectedLoginBrand.darkContrast || ("soft_glass" as const),
    startAt: localDateTime(selected?.startAt || null),
    endAt: localDateTime(selected?.endAt || null),
    repeatYearly: selected?.repeatYearly ?? true
  }));

  function invalidatePreviewApproval() {
    setExactPreview(null);
    setApproval(false);
  }

  function updateDraft(updater: (value: typeof draft) => typeof draft) {
    setDraft(updater);
    invalidatePreviewApproval();
  }

  const variants = useMemo(
    () =>
      selected
        ? snapshot.packLibrary.packs.filter(
            (pack) => festivalSlugForPack(pack) === selected.festivalSlug
          )
        : [],
    [selected, snapshot.packLibrary.packs]
  );
  const selectedPack = variants.find((pack) => pack.id === draft.packId) || null;
  const exactPreviewIsCurrent = Boolean(
    selectedPack && exactPreview?.packId === selectedPack.id
  );
  const activeSurfaceVariants = snapshot.activeSnapshot?.surfaceVariants || {};
  const selectedVariantName = selectedPack
    ? variantNameForPack(selectedPack)
    : "Original theme configuration";
  const activeVariantNames = Object.values(activeSurfaceVariants)
    .map((item) => item?.variantName)
    .filter((value): value is string => Boolean(value));
  const currentActiveName =
    activeVariantNames[0] ||
    snapshot.activeSnapshot?.variantName ||
    "Normal WriteX Theme";
  const availableAssets = useMemo(
    () =>
      snapshot.assetLibrary.assets.filter(
        (asset) =>
          asset.currentVersionId &&
          !["archived", "trash", "deletion_pending", "deleted"].includes(
            asset.lifecycleState
          )
      ),
    [snapshot.assetLibrary.assets]
  );
  const governedSceneAssets = useMemo(
    () =>
      selected
        ? governedFestivalMotifs(
            snapshot.assetLibrary.assets,
            selected.festivalSlug
          )
        : [],
    [selected, snapshot.assetLibrary.assets]
  );

  function slotIsEnabled(slot: FestivalStudioSlot) {
    if (slot === "clientLoginHero") return draft.clientLoginEnabled;
    if (slot === "employeeLoginHero") return draft.employeeLoginEnabled;
    if (["websiteHero", "header", "background"].includes(slot)) return draft.websiteEnabled;
    if (slot === "axo") return draft.axoEnabled;
    return draft.soundEnabled;
  }

  function setSlotEnabled(slot: FestivalStudioSlot, enabled: boolean) {
    const key =
      slot === "clientLoginHero"
        ? "clientLoginEnabled"
        : slot === "employeeLoginHero"
          ? "employeeLoginEnabled"
          : ["websiteHero", "header", "background"].includes(slot)
            ? "websiteEnabled"
            : slot === "axo"
              ? "axoEnabled"
              : "soundEnabled";
    updateDraft((value) => ({ ...value, [key]: enabled }));
  }

  function chooseConfiguration(config: FestivalStudioConfiguration) {
    const compatible = snapshot.packLibrary.packs.filter(
      (pack) => festivalSlugForPack(pack) === config.festivalSlug
    );
    const group = snapshot.packLibrary.heroGroups.find(
      (item) => item.festivalSlug === config.festivalSlug
    );
    const nextPack =
      compatible.find((pack) => pack.id === config.selectedVariantPackId) ||
      compatible.find(
        (pack) => variantSlugForPack(pack) === group?.defaultVariantSlug
      ) ||
      compatible.find((pack) =>
        ["approved", "active", "previous", "scheduled"].includes(pack.state)
      ) ||
      compatible[0];
    setSelectedId(config.id);
    setPendingSceneStudio(null);
    const url = new URL(window.location.href);
    url.searchParams.set("festival", config.festivalSlug);
    url.searchParams.set("section", "configure");
    window.history.replaceState(null, "", url);
    setDraft({
      packId: nextPack?.id || "",
      clientLoginEnabled: config.clientLoginEnabled,
      employeeLoginEnabled: config.employeeLoginEnabled,
      websiteEnabled: config.websiteEnabled,
      axoEnabled: config.axoEnabled,
      soundEnabled: config.soundEnabled,
      motionEnabled: config.motionConfig.enabled,
      motionLevel: config.motionConfig.level,
      protectedBrandPlacement: config.protectedLoginBrand.placement,
      protectedBrandSize: config.protectedLoginBrand.size,
      protectedBrandLightContrast: config.protectedLoginBrand.lightContrast,
      protectedBrandDarkContrast: config.protectedLoginBrand.darkContrast,
      startAt: localDateTime(config.startAt),
      endAt: localDateTime(config.endAt),
      repeatYearly: config.repeatYearly
    });
    setApproval(false);
    setReligiousApproval(false);
    setExactPreview(null);
    setSection("configure");
  }

  async function request(body: Record<string, unknown>) {
    setBusy(String(body.action || "request"));
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/admin/website-experience/festival-studio",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: {
              snapshot?: FestivalStudioSnapshot;
              preview?: ExactPreview;
              active?: unknown;
            };
            error?: { message?: string; code?: string };
          }
        | null;
      if (!response.ok || !payload?.ok) {
        const reference = response.headers.get("x-correlation-id");
        throw new Error(`${payload?.error?.message || "The Festival Studio action failed."}${reference ? ` Reference: ${reference}` : ""}`);
      }
      if (payload.data?.snapshot) {
        setSnapshot(payload.data.snapshot);
        if (!["preview", "preview_exact"].includes(String(body.action || ""))) {
          invalidatePreviewApproval();
        }
      }
      return payload.data;
    } catch (requestError) {
      const requestMessage =
        requestError instanceof Error
          ? requestError.message
          : "The Festival Studio action failed.";
      if (
        /preview (?:has expired|before activation)|changed after preview/i.test(
          requestMessage
        )
      ) {
        invalidatePreviewApproval();
        setSection("preview");
      }
      setError(
        requestMessage
      );
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function saveConfiguration() {
    if (!selected) return false;
    if (pendingSceneStudio) {
      const sceneResult = await request({
        action: "save_scene",
        configurationId: selected.id,
        expectedVersion: selected.version,
        studio: pendingSceneStudio
      });
      if (!sceneResult) return false;
      setPendingSceneStudio(null);
      setSceneEditorRevision((value) => value + 1);
    }
    const result = await request({
      action: "save",
      configurationId: selected.id,
      selectedVariantPackId: draft.packId || null,
      clientLoginEnabled: draft.clientLoginEnabled,
      employeeLoginEnabled: draft.employeeLoginEnabled,
      websiteEnabled: draft.websiteEnabled,
      axoEnabled: draft.axoEnabled,
      soundEnabled: draft.soundEnabled,
      motionEnabled: draft.motionEnabled,
      motionLevel: draft.motionLevel,
      protectedLoginBrand: {
        placement: draft.protectedBrandPlacement,
        size: draft.protectedBrandSize,
        lightContrast: draft.protectedBrandLightContrast,
        darkContrast: draft.protectedBrandDarkContrast
      },
      startAt: isoOrNull(draft.startAt),
      endAt: isoOrNull(draft.endAt),
      repeatYearly: draft.repeatYearly
    });
    if (result) {
      setMessage("Festival settings saved. Asset assignments remain intact.");
      return true;
    }
    return false;
  }

  async function assignAsset(slot: FestivalStudioSlot, assetId: string | null) {
    if (!selected) return;
    const result = await request({
      action: "assign_asset",
      configurationId: selected.id,
      slot,
      assetId
    });
    if (result) {
      setMessage(
        assetId
          ? `${FESTIVAL_STUDIO_SLOT_LABELS[slot]} assigned for private preview.`
          : `${FESTIVAL_STUDIO_SLOT_LABELS[slot]} restored to the WriteX default.`
      );
    }
  }

  async function uploadAsset(slot: FestivalStudioSlot, file: File) {
    if (!selected) return;
    const selectedPack = variants.find((pack) => pack.id === draft.packId);
    const uploadThemeId = selectedPack?.themeId || selected.themeId;
    if (!uploadThemeId) {
      setError("Choose and save a festival variant before uploading assets.");
      return;
    }
    const contract = slotUpload[slot];
    setBusy(`upload-${slot}`);
    setError(null);
    try {
      if (draft.packId !== (selected.selectedVariantPackId || "")) {
        const saved = await saveConfiguration();
        if (!saved) return;
      }
      const form = new FormData();
      form.set("file", file);
      form.set("themeId", uploadThemeId);
      form.set("role", contract.role);
      form.set("variant", `studio-${slot.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
      form.set("purpose", contract.purpose);
      form.set("placements", JSON.stringify([contract.placement]));
      form.set("embeddedUiState", "no_embedded_ui");
      const response = await fetch("/api/admin/website-experience/assets", {
        method: "POST",
        credentials: "same-origin",
        body: form
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            data?: { assetId?: string };
            error?: { message?: string; code?: string };
          }
        | null;
      if (!response.ok || !payload?.ok || !payload.data?.assetId) {
        const reference = response.headers.get("x-correlation-id");
        throw new Error(`${payload?.error?.message || "The upload could not be completed."}${reference ? ` Reference: ${reference}` : ""}`);
      }
      await assignAsset(slot, payload.data.assetId);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The upload could not be completed."
      );
    } finally {
      setBusy(null);
    }
  }

  async function openPreview(path: string) {
    if (!selected) return;
    if (selectedPack) {
      await openSelectedVariantPreview(
        selectedPack,
        path,
        packSupportedSurfaces(selectedPack)
      );
      return;
    }
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    const result = await request({ action: "preview", configurationId: selected.id });
    if (result) {
      const previewUrl = `${path}${path.includes("?") ? "&" : "?"}festivalPreview=${encodeURIComponent(selected.updatedAt)}`;
      if (previewWindow) {
        previewWindow.location.replace(previewUrl);
      } else {
        window.location.assign(previewUrl);
      }
    } else {
      previewWindow?.close();
    }
  }

  async function applyRecommendedSetup() {
    if (!selected) return;
    const studio = recommendedFestivalStudio(
      selected.studioConfig,
      selected.festivalSlug,
      governedSceneAssets
    );
    const result = await request({
      action: "save_scene",
      configurationId: selected.id,
      expectedVersion: selected.version,
      studio
    });
    if (!result) return;
    const refreshed = result.snapshot?.configurations.find(
      (configuration) => configuration.id === selected.id
    );
    setDraft((value) => ({
      ...value,
      websiteEnabled: refreshed?.websiteEnabled ?? true,
      axoEnabled: refreshed?.axoEnabled ?? true,
      soundEnabled: false,
      motionEnabled: refreshed?.motionConfig.enabled ?? true,
      motionLevel: refreshed?.motionConfig.level || "subtle"
    }));
    setSceneEditorRevision((value) => value + 1);
    setDecorationSection("header");
    setMessage("Recommended festival setup added to the private draft. Every visible section remains editable; sound stays off by default.");
  }

  async function createExactPreview(
    pack: (typeof variants)[number],
    surfaces: FestivalHeroSurface[]
  ) {
    if (!selected) return null;
    const supported = packSupportedSurfaces(pack);
    const exactSurfaces = [...new Set(surfaces)].filter((surface) =>
      supported.includes(surface)
    );
    if (exactSurfaces.length === 0) {
      setError(`${variantNameForPack(pack)} has no compatible Hero for that surface.`);
      return null;
    }
    setDraft((value) => ({ ...value, packId: pack.id }));
    const result = await request({
      action: "preview_exact",
      configurationId: selected.id,
      selectedVariantPackId: pack.id,
      targetSurfaces: exactSurfaces
    });
    if (!result?.preview) return null;
    setExactPreview(result.preview);
    return result.preview;
  }

  async function openSelectedVariantPreview(
    pack: (typeof variants)[number],
    path: string,
    surfaces: FestivalHeroSurface[]
  ) {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    const preview = await createExactPreview(pack, surfaces);
    if (!preview) {
      previewWindow?.close();
      return;
    }
    const previewUrl = `${path}${path.includes("?") ? "&" : "?"}festivalPreviewSnapshot=${encodeURIComponent(preview.snapshotId)}`;
    if (previewWindow) {
      previewWindow.location.replace(previewUrl);
    } else {
      window.location.assign(previewUrl);
    }
    setMessage(
      `${preview.variantName} exact Preview Snapshot ${preview.snapshotId.slice(0, 8).toUpperCase()} opened.`
    );
  }

  async function prepareDirectActivation(
    pack: (typeof variants)[number],
    surfaces: FestivalHeroSurface[]
  ) {
    const preview = await createExactPreview(pack, surfaces);
    if (!preview) return;
    setActivationIntent({
      packId: pack.id,
      variantName: variantNameForPack(pack),
      currentName: currentActiveName,
      surfaces: preview.targetSurfaces,
      preview
    });
  }

  async function confirmDirectActivation() {
    if (!activationIntent) return;
    const result = await request({
      action: "activate_snapshot",
      previewSnapshotId: activationIntent.preview.snapshotId,
      targetSurfaces: activationIntent.surfaces,
      visualApprovalConfirmed: true,
      religiousArtworkConfirmed: religiousApproval
    });
    if (!result) return;
    const previous = activationIntent.currentName;
    setMessage(
      `${activationIntent.variantName} is now active. ${previous} remains available in history.`
    );
    setActivationIntent(null);
    setApproval(false);
  }

  async function restorePreviousHero(surface: FestivalHeroSurface) {
    const result = await request({ action: "restore_previous_hero", surface });
    if (result) setMessage(`Previous ${surfaceLabels[surface]} restored from its exact snapshot.`);
  }

  async function activate(schedule: boolean) {
    if (!selected || !approval) return;
    if (!schedule && selectedPack) {
      const preview = exactPreview?.packId === selectedPack.id
        ? exactPreview
        : null;
      if (!preview) {
        setApproval(false);
        setError("Create and review a fresh private preview before activation.");
        return;
      }
      const result = await request({
        action: "activate_snapshot",
        previewSnapshotId: preview.snapshotId,
        targetSurfaces: preview.targetSurfaces,
        visualApprovalConfirmed: true,
        religiousArtworkConfirmed: religiousApproval
      });
      if (result) setMessage(`${preview.variantName} exact preview activated.`);
      return;
    }
    const result = await request(
      schedule
        ? {
            action: "schedule",
            configurationId: selected.id,
            visualApprovalConfirmed: true,
            religiousArtworkConfirmed: religiousApproval,
            startAt: isoOrNull(draft.startAt),
            endAt: isoOrNull(draft.endAt),
            repeatYearly: draft.repeatYearly
          }
        : {
            action: "activate",
            configurationId: selected.id,
            visualApprovalConfirmed: true,
            religiousArtworkConfirmed: religiousApproval
          }
    );
    if (result) setMessage(schedule ? "Festival scheduled." : "Festival activated.");
  }

  const tabs: Array<{ id: StudioSection; label: string; icon: typeof Sparkles }> = [
    { id: "overview", label: "Overview", icon: Sparkles },
    { id: "configure", label: "Configure", icon: ImagePlus },
    { id: "preview", label: "Preview & Activate", icon: Eye },
    { id: "schedule", label: "Schedule", icon: CalendarClock },
    { id: "history", label: "History", icon: History }
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto border-b border-wxBorder" role="tablist" aria-label="Festival Studio sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={section === tab.id}
              onClick={() => setSection(tab.id)}
              className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition ${
                section === tab.id
                  ? "border-wxViolet700 text-wxViolet700"
                  : "border-transparent text-wxIndigo500 hover:text-wxIndigo900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {!snapshot.simplifiedNoticeDismissed ? (
        <section className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-5 text-wxIndigo900" aria-labelledby="festival-simplified-title">
          <h2 id="festival-simplified-title" className="text-lg font-semibold">Festival Studio has been simplified.</h2>
          <p className="mt-2 text-sm leading-6">Select a Festival, select a Design, use Recommended Setup, preview, then apply. Every visual customisation remains available.</p>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { setSection("configure"); document.getElementById("recommended-setup")?.scrollIntoView({ behavior: "smooth" }); }} className="wx-gradient-action inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-white">Show Me How</button><button type="button" onClick={() => setSection("configure")} className="inline-flex min-h-10 items-center rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold">Open Festival Studio</button><button type="button" onClick={() => void request({ action: "dismiss_simplified_notice" })} className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-wxIndigo600">Dismiss</button></div>
        </section>
      ) : null}

      {message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900" role="status">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {selected ? (
        <div className="grid gap-4 rounded-md border border-wxBorder bg-wxSurface px-5 py-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxIndigo500">
              Current Active Hero
            </p>
            <p className="mt-1 text-base font-semibold text-wxIndigo900">
              {currentActiveName}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxIndigo500">
              Selected Design
            </p>
            <p className="mt-1 text-base font-semibold text-wxIndigo900">
              {selectedVariantName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <AdminStatusBadge
              tone={
                selectedPack &&
                Object.values(activeSurfaceVariants).some(
                  (item) => item?.packId === selectedPack.id
                )
                  ? "success"
                  : selectedPack
                    ? "warning"
                    : "neutral"
              }
            >
              {selectedPack &&
              Object.values(activeSurfaceVariants).some(
                (item) => item?.packId === selectedPack.id
              )
                ? "Active"
                : selectedPack
                  ? "Selected but not active"
                  : "WriteX default"}
            </AdminStatusBadge>
            {snapshot.activeSnapshot?.previousSnapshotId && snapshot.activeSnapshot.targetSurfaces[0] ? (
              <button
                type="button"
                onClick={() => void restorePreviousHero(snapshot.activeSnapshot!.targetSurfaces[0])}
                disabled={!snapshot.permissions.canActivate || Boolean(busy)}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-wxBorder px-3 text-xs font-semibold text-wxViolet700 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore Previous Hero
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {section === "overview" ? (
        <div className="space-y-6">
          <div id="festival-status" className="flex scroll-mt-28 flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowFullResetConfirm(true)}
              disabled={!snapshot.permissions.canActivate || Boolean(busy)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Full Festival Reset
            </button>
            <button type="button" onClick={() => setSection("configure")} className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"><ImagePlus className="h-4 w-4" /> Create or Configure Festival</button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <AdminPanel title="Active" description="The festival currently visible to public visitors.">
              {snapshot.activeConfiguration ? (
                <div>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xl font-semibold text-wxIndigo900">{snapshot.activeConfiguration.festivalName}</p><p className="mt-1 text-sm text-wxIndigo500">{snapshot.activeConfiguration.selectedVariantSlug || "Default variant"}</p></div><AdminStatus status="active" /></div>
                  <dl className="mt-4 divide-y divide-wxBorder text-sm">
                    {[
                      ["Website", snapshot.activeConfiguration.websiteEnabled ? "Enabled" : "Default"],
                      ["Client Login", snapshot.activeConfiguration.clientLoginEnabled ? "Enabled" : "Default"],
                      ["Employee Login", snapshot.activeConfiguration.employeeLoginEnabled ? "Enabled" : "Default"],
                      ["Axo", snapshot.activeConfiguration.axoEnabled ? "Enabled" : "Default"],
                      ["Sound", snapshot.activeConfiguration.soundEnabled ? "Enabled" : "Silent"]
                    ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-2"><dt className="text-wxIndigo500">{label}</dt><dd className="font-semibold text-wxIndigo800">{value}</dd></div>)}
                  </dl>
                  <p className="mt-3 text-xs text-wxIndigo500">{snapshot.activeConfiguration.startAt ? new Date(snapshot.activeConfiguration.startAt).toLocaleString() : "Manual start"} - {snapshot.activeConfiguration.endAt ? new Date(snapshot.activeConfiguration.endAt).toLocaleString() : "No fixed end"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setSelectedId(snapshot.activeConfiguration!.id); setSection("preview"); }} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><Eye className="h-4 w-4" /> Preview</button>
                    <button type="button" onClick={() => chooseConfiguration(snapshot.activeConfiguration!)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><Save className="h-4 w-4" /> Edit</button>
                    <button id="turn-off-festival" type="button" onClick={() => setStatusConfirmation("turn-off")} disabled={!snapshot.permissions.canActivate || Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><Pause className="h-4 w-4" /> Turn Off Festival</button>
                    {snapshot.previousPublicSnapshot ? <button id="restore-previous-public-theme" type="button" onClick={() => setStatusConfirmation("restore-previous")} disabled={!snapshot.permissions.canActivate || Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><History className="h-4 w-4" /> Restore Previous Public Theme</button> : null}
                    <button id="restore-normal-website" type="button" onClick={() => setStatusConfirmation("restore")} disabled={!snapshot.permissions.canActivate || Boolean(busy)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><RotateCcw className="h-4 w-4" /> Restore Normal Website</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-wxIndigo500">Default WriteX experience is active.</p>
              )}
            </AdminPanel>
            <AdminPanel title="Upcoming" description="Scheduled festival configurations.">
              {snapshot.upcomingConfigurations.length ? <div className="divide-y divide-wxBorder">{snapshot.upcomingConfigurations.map((configuration) => <button type="button" key={configuration.id} onClick={() => chooseConfiguration(configuration)} className="block w-full py-3 text-left first:pt-0"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-wxIndigo900">{configuration.festivalName}</p><AdminStatus status={configuration.activationStatus} /></div><p className="mt-1 text-xs text-wxIndigo500">{configuration.selectedVariantSlug || "Default variant"} · {configuration.startAt ? new Date(configuration.startAt).toLocaleString() : "Schedule incomplete"}</p></button>)}</div> : <p className="text-sm text-wxIndigo500">No festival is scheduled.</p>}
            </AdminPanel>
            <AdminPanel title="Library" description="Festival configurations ready to edit.">
              <p className="text-3xl font-semibold text-wxIndigo900">{snapshot.configurations.length}</p>
              <button type="button" onClick={() => setSection("configure")} className="mt-3 text-sm font-semibold text-wxViolet700">Open library</button>
            </AdminPanel>
          </div>
          <AdminPanel title="Festival Library" description="Choose one festival to edit its variant, assets, schedule and activation state.">
            <div className="divide-y divide-wxBorder">
              {snapshot.configurations.map((configuration) => (
                <button
                  key={configuration.id}
                  type="button"
                  onClick={() => chooseConfiguration(configuration)}
                  className="block w-full px-1 py-4 text-left transition hover:bg-wxSurfaceSoft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-wxIndigo900">{configuration.festivalName}</p>
                      <p className="mt-1 text-xs text-wxIndigo500">{snapshot.packLibrary.packs.filter((pack) => festivalSlugForPack(pack) === configuration.festivalSlug).length} variants · {configuration.selectedVariantSlug || "Default variant"}</p>
                    </div>
                    <AdminStatus status={configuration.activationStatus} />
                  </div>
                  <p className="mt-4 text-xs text-wxIndigo500">Updated {new Date(configuration.updatedAt).toLocaleString()}</p>
                </button>
              ))}
            </div>
          </AdminPanel>
        </div>
      ) : null}

      {section === "configure" && selected ? (
        <div className="space-y-6">
          <AdminPanel title="1. Select Festival" description="Choose the festival and approved design variant, then set its timing.">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-semibold text-wxIndigo700">
                Festival
                <select
                  value={selected.id}
                  onChange={(event) => {
                    const config = snapshot.configurations.find((item) => item.id === event.target.value);
                    if (config) chooseConfiguration(config);
                  }}
                  className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                >
                  {snapshot.configurations.map((configuration) => <option key={configuration.id} value={configuration.id}>{configuration.festivalName}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-wxIndigo700">
                Design variant
                <select value={draft.packId} onChange={(event) => updateDraft((value) => ({ ...value, packId: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3">
                  <option value="">Original theme configuration</option>
                  {variants.map((pack) => <option key={pack.id} value={pack.id}>{variantNameForPack(pack)} - {pack.state}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 sm:grid-cols-3">
              <div><p className="text-xs font-semibold uppercase text-wxIndigo500">Festival</p><p className="mt-1 font-semibold text-wxIndigo900">{selected.festivalName}</p></div>
              <div><p className="text-xs font-semibold uppercase text-wxIndigo500">Selected Design</p><p className="mt-1 font-semibold text-wxIndigo900">{selectedVariantName}</p></div>
              <div><p className="text-xs font-semibold uppercase text-wxIndigo500">Ownership</p><p className="mt-1 font-semibold text-wxIndigo900">{selectedPack ? selected.festivalName : draft.packId ? "Incompatible selection" : selected.festivalName}</p></div>
              {draft.packId && !selectedPack ? (
                <button type="button" onClick={() => chooseConfiguration(selected)} className="sm:col-span-3 min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxViolet700">
                  Reset to {selected.festivalName} Default
                </button>
              ) : null}
            </div>
            {variants.length ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-wxIndigo700">Visual variants</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {variants.map((pack) => {
                    const previewAsset = pack.files.find((file) => file.assetVersionId && file.mimeType?.startsWith("image/"));
                    const selectedVariant = draft.packId === pack.id;
                    const activeSurfaces = Object.entries(activeSurfaceVariants)
                      .filter(([, item]) => item?.packId === pack.id)
                      .map(([surface]) => surfaceLabels[surface as FestivalHeroSurface]);
                    const supportedSurfaces = packSupportedSurfaces(pack);
                    const isApproved = ["approved", "active", "previous", "scheduled"].includes(pack.state);
                    const canonicalPackState = pack.state === "active" && activeSurfaces.length === 0
                      ? "approved"
                      : pack.state;
                    return (
                      <div
                        key={pack.id}
                        className={`overflow-hidden rounded-md border bg-wxSurface transition ${selectedVariant ? "border-wxViolet700 ring-2 ring-wxViolet700/15" : "border-wxBorder hover:border-wxViolet700"}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            updateDraft((value) => ({ ...value, packId: pack.id }));
                            setExactPreview(null);
                          }}
                          className="block w-full text-left"
                        >
                          <div className="relative aspect-[16/9] bg-wxSurfaceSoft">
                          {previewAsset?.assetVersionId ? <Image src={assetPreviewUrl(previewAsset.assetVersionId)} alt="" fill unoptimized sizes="(min-width:1280px) 260px, 50vw" className="object-cover" /> : <div className="flex h-full items-center justify-center"><ImagePlus className="h-6 w-6 text-wxIndigo300" /></div>}
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-wxIndigo900">{variantNameForPack(pack)}</p>
                              {selectedVariant ? <Check className="h-4 w-4 shrink-0 text-wxViolet700" /> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {activeSurfaces.length ? <AdminStatusBadge tone="success">Active</AdminStatusBadge> : null}
                              {selectedVariant ? <AdminStatusBadge tone="warning">Selected</AdminStatusBadge> : null}
                              {activeSurfaces.length === 0 ? (
                                <AdminStatusBadge tone={isApproved ? "success" : "neutral"}>
                                  {canonicalPackState.replaceAll("_", " ")}
                                </AdminStatusBadge>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-wxIndigo500">
                              {supportedSurfaces.length
                                ? supportedSurfaces.map((surface) => surfaceLabels[surface]).join(" · ")
                                : "No compatible Hero surface mapped"}
                            </p>
                          </div>
                        </button>
                        <div className="grid grid-cols-2 gap-2 border-t border-wxBorder p-3">
                          <button
                            type="button"
                            onClick={() => void openSelectedVariantPreview(
                              pack,
                              supportedSurfaces.includes("clientLoginHero")
                                ? "/client-login"
                                : supportedSurfaces.includes("employeeLoginHero")
                                  ? "/employee-login"
                                  : "/",
                              supportedSurfaces
                            )}
                            disabled={!isApproved || Boolean(busy) || supportedSurfaces.length === 0}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-wxBorder px-2 text-xs font-semibold text-wxIndigo700 disabled:opacity-50"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => void prepareDirectActivation(pack, supportedSurfaces)}
                            disabled={!snapshot.permissions.canActivate || !isApproved || Boolean(busy) || supportedSurfaces.length === 0}
                            className="wx-gradient-action inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {activeSurfaces.length ? "Change Hero" : "Use This Hero"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-semibold text-wxIndigo700">Starts<input type="datetime-local" value={draft.startAt} onChange={(event) => updateDraft((value) => ({ ...value, startAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label>
              <label className="text-sm font-semibold text-wxIndigo700">Ends<input type="datetime-local" value={draft.endAt} onChange={(event) => updateDraft((value) => ({ ...value, endAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label>
              <label className="mt-7 flex min-h-11 items-center gap-3 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700"><input type="checkbox" checked={draft.repeatYearly} onChange={(event) => updateDraft((value) => ({ ...value, repeatYearly: event.target.checked }))} /> Repeat yearly</label>
            </div>
          </AdminPanel>

          <section id="recommended-setup" className="scroll-mt-28 rounded-lg border border-wxViolet700/25 bg-wxSurface p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase text-wxViolet700">Fast, safe setup</p>
            <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><h2 className="text-xl font-semibold text-wxIndigo900">Use Recommended Festival Setup</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-wxIndigo500">Adds the approved Header, Ground, AXO and scene recommendations with balanced responsive fallbacks. Sound remains off and user-started. You can customise every section afterwards.</p></div>
              <button type="button" onClick={() => void applyRecommendedSetup()} disabled={!snapshot.permissions.canEdit || Boolean(busy)} className="wx-gradient-action inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" /> Use Recommended Festival Setup</button>
            </div>
          </section>

          <AdminPanel title="2. Decorate Website" description="Add festival decorations, AXO styling and celebration effects to the website. Your selected Login design is already configured.">
            <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="tablist" aria-label="Website decoration areas">
              {([
                ["header", "Decorate Header"],
                ["ground", "Decorate Ground & Page Bottom"],
                ["axo", "Decorate AXO"],
                ["effects", "Festival Scene Effects"],
                ["sound", "Sound"]
              ] as Array<[DecorationBuilderSection, string]>).map(([value, label]) => (
                <button key={value} type="button" role="tab" aria-selected={decorationSection === value} onClick={() => setDecorationSection(value)} className={`min-h-11 rounded-md border px-3 text-sm font-semibold ${decorationSection === value ? "border-wxViolet700 bg-wxViolet700 text-white" : "border-wxBorder bg-wxSurface text-wxIndigo700"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mb-4 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3 text-sm text-wxIndigo600">
              <span className="font-semibold text-wxIndigo900">Draft Preview - Not Public.</span>{" "}
              Changes remain private until Preview and final Apply or Schedule.
            </div>
            {decorationSection === "sound" ? (
              <section id="festival-sound" className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-5">
                <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold text-wxIndigo900">Festival Sound</h3><p className="mt-1 text-sm leading-6 text-wxIndigo500">Sound is off by default and can only start after a visitor presses Play. Login screens remain silent.</p></div><AdminStatusBadge tone={draft.soundEnabled ? "warning" : "success"}>{draft.soundEnabled ? "Available - user started" : "Off by default"}</AdminStatusBadge></div>
                <label className="mt-5 flex min-h-12 items-center justify-between gap-4 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700">Make approved festive ambience available<input type="checkbox" checked={draft.soundEnabled} onChange={(event) => updateDraft((value) => ({ ...value, soundEnabled: event.target.checked }))} disabled={!snapshot.permissions.canEdit} /></label>
                <p className="mt-3 text-xs leading-5 text-wxIndigo500">Public controls: Play, Mute and low-volume adjustment. Disabling the festival stops playback.</p>
              </section>
            ) : <div id={decorationSection === "header" ? "decorate-header" : decorationSection === "ground" ? "decorate-ground" : decorationSection === "axo" ? "decorate-axo" : "festival-effects"} className="scroll-mt-28">
            <FestivalPackStudio
              key={`${selected.id}:${decorationSection}:${sceneEditorRevision}`}
              initialStudio={selected.studioConfig}
              previewSlug={selected.festivalSlug}
              festivalSlug={selected.festivalSlug}
              embedded
              section={decorationSection === "axo" ? "characters" : decorationSection === "effects" ? "motion" : "motifs"}
              lockedRegion={decorationSection === "header" ? "navigation_rail" : decorationSection === "axo" ? "axo_area" : undefined}
              regionOptions={
                decorationSection === "ground"
                  ? ["footer_decoration", "section_dividers"]
                  : decorationSection === "effects"
                    ? ["page_ambience", "floating_edges"]
                    : undefined
              }
              busy={Boolean(busy)}
              onSave={async (studio) => {
                const result = await request({ action: "save_scene", configurationId: selected.id, expectedVersion: selected.version, studio });
                if (!result) return false;
                const refreshed = result.snapshot?.configurations.find(
                  (configuration) => configuration.id === selected.id
                );
                if (refreshed) {
                  setDraft((value) => ({
                    ...value,
                    websiteEnabled: refreshed.websiteEnabled,
                    axoEnabled: refreshed.axoEnabled,
                    motionEnabled: refreshed.motionConfig.enabled,
                    motionLevel: refreshed.motionConfig.level
                  }));
                }
                setMessage("Visual scene saved to the canonical festival draft.");
                return true;
              }}
              governedAssets={governedSceneAssets}
              onPendingStudioChange={(studio) => {
                setPendingSceneStudio(studio);
                if (studio) invalidatePreviewApproval();
              }}
              onOpenPrivatePreview={() => setSection("preview")}
            />
            </div>}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-wxBorder pt-4">
              <p className="text-xs text-wxIndigo500">Raw asset mappings, versions, upload replacement and fallback recovery are optional technical controls.</p>
              <button id="advanced-customisation" type="button" onClick={() => setShowDiagnostics((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700"><ChevronDown className={`h-4 w-4 transition ${showDiagnostics ? "rotate-180" : ""}`} />{showDiagnostics ? "Hide Advanced Customisation" : "Advanced Customisation"}</button>
            </div>
          </AdminPanel>

          {showDiagnostics ? <AdminPanel title="Advanced Customisation" description="Version-level mapping, upload replacement, technical metadata and recovery controls.">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-wxViolet700/25 bg-violet-50 p-4"><div><p className="font-semibold text-wxIndigo900">Advanced Festival Management</p><p className="mt-1 text-xs leading-5 text-wxIndigo500">Add a future event or scoped variant from one clean designer 8K Hero. Existing packs remain unchanged.</p></div><a href="/admin/website-experience/designer-hero-packs" className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"><ImagePlus className="h-4 w-4"/> Add New Event Pack</a></div>
            <div className="space-y-7">
              {assetGroups.map((group) => (
                <section key={group.title} aria-labelledby={`asset-group-${group.title.replaceAll(" ", "-").toLowerCase()}`}>
                  <div className="border-b border-wxBorder pb-3">
                    <h3 id={`asset-group-${group.title.replaceAll(" ", "-").toLowerCase()}`} className="text-sm font-semibold text-wxIndigo900">{group.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-wxIndigo500">{group.description}</p>
                  </div>
                  <div className="divide-y divide-wxBorder">
              {group.slots.map((slot) => {
                const asset = selected.assets[slot];
                const diagnostic = selected.diagnostics.find((item) => item.slot === slot);
                const compatible = availableAssets.filter((item) =>
                  assetPurposeMatchesSlot(item.purpose, slot)
                );
                return (
                  <div key={slot} className="grid gap-4 py-5 first:pt-0 last:pb-0 md:grid-cols-[88px_minmax(0,1fr)_minmax(220px,0.8fr)_auto] md:items-center">
                    <div className="relative h-20 w-20 overflow-hidden rounded-md border border-wxBorder bg-wxSurfaceSoft">
                      {asset && asset.mimeType.startsWith("image/") ? <Image src={assetPreviewUrl(asset.id)} alt="" fill unoptimized sizes="80px" className="object-contain" /> : <div className="flex h-full items-center justify-center"><Library className="h-5 w-5 text-wxIndigo400" /></div>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-wxIndigo900">{FESTIVAL_STUDIO_SLOT_LABELS[slot]}</p>{diagnostic ? <AdminStatusBadge tone={statusTone(diagnostic.status)}>{diagnostic.status.replaceAll("_", " ")}</AdminStatusBadge> : null}</div>
                      <p className="mt-1 truncate text-sm text-wxIndigo500">{asset?.safeFileName || "Using WriteX default"}</p>
                      <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-wxIndigo600"><input type="checkbox" checked={slotIsEnabled(slot)} disabled readOnly /> Canonical scene state</label>
                    </div>
                    <select
                      aria-label={`Choose ${FESTIVAL_STUDIO_SLOT_LABELS[slot]}`}
                      value={asset?.id || ""}
                      disabled={!snapshot.permissions.canEdit || Boolean(busy)}
                      onChange={(event) => void assignAsset(slot, event.target.value || null)}
                      className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"
                    >
                      <option value="">Use WriteX default</option>
                      {compatible.map((item) => <option key={item.currentVersionId!} value={item.currentVersionId!}>{item.displayName} (v{item.currentVersionNumber})</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxViolet700 hover:border-wxViolet700">
                        <Upload className="h-4 w-4" />
                        {busy === `upload-${slot}` ? "Uploading" : asset ? "Replace" : "Upload"}
                        <input type="file" hidden accept={slotUpload[slot].accept} disabled={!snapshot.permissions.canEdit || Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(slot, file); event.currentTarget.value = ""; }} />
                      </label>
                      {asset ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await request({ action: "restore_previous_asset", configurationId: selected.id, slot });
                            if (result) setMessage(`${FESTIVAL_STUDIO_SLOT_LABELS[slot]} restored to its previous assignment.`);
                          }}
                          disabled={!snapshot.permissions.canEdit || Boolean(busy)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700"
                        >
                          <RotateCcw className="h-4 w-4" /> Previous
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
                  </div>
                </section>
              ))}
            </div>
          </AdminPanel> : null}

          <AdminPanel title="3. Behaviour" description="Choose where the theme applies. Safe defaults remain available for every disabled or missing slot.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["clientLoginEnabled", "Client Login"],
                ["employeeLoginEnabled", "Employee Login"],
                ["websiteEnabled", "Public Website"],
                ["axoEnabled", "Festival AXO"],
                ["soundEnabled", "Optional Sound"],
                ["motionEnabled", "Motion"]
              ].map(([key, label]) => (
                <label key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 text-sm font-semibold text-wxIndigo700">
                  {label}
                  <input
                    type="checkbox"
                    checked={Boolean(draft[key as keyof typeof draft])}
                    onChange={(event) => updateDraft((value) => ({ ...value, [key]: event.target.checked }))}
                    disabled={
                      !snapshot.permissions.canEdit ||
                      ["websiteEnabled", "axoEnabled", "motionEnabled"].includes(key)
                    }
                  />
                </label>
              ))}
            </div>
            <section className="mt-6 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4" aria-labelledby="official-login-branding-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="official-login-branding-title" className="text-sm font-semibold text-wxIndigo900">Official WriteX Branding</h3>
                  <p className="mt-1 text-xs leading-5 text-wxIndigo500">This protected layer stays outside festival artwork and cannot be replaced by an imported pack.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge tone="success">Logo: Protected / Always Visible</AdminStatusBadge>
                  <AdminStatusBadge tone="success">Tagline: Protected / Always Visible</AdminStatusBadge>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-semibold text-wxIndigo700">Placement preset<select value={draft.protectedBrandPlacement} onChange={(event) => updateDraft((value) => ({ ...value, protectedBrandPlacement: event.target.value as typeof value.protectedBrandPlacement }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="safe_auto">Automatic Safe Area</option><option value="upper_left">Upper Left</option><option value="compact_top">Compact Top</option></select></label>
                <label className="text-sm font-semibold text-wxIndigo700">Brand size<select value={draft.protectedBrandSize} onChange={(event) => updateDraft((value) => ({ ...value, protectedBrandSize: event.target.value as typeof value.protectedBrandSize }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="standard">Standard</option><option value="compact">Compact</option></select></label>
                <label className="text-sm font-semibold text-wxIndigo700">Light contrast<select value={draft.protectedBrandLightContrast} onChange={(event) => updateDraft((value) => ({ ...value, protectedBrandLightContrast: event.target.value as typeof value.protectedBrandLightContrast }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="soft_glass">Soft Glass</option><option value="text_shadow">Text Shadow</option></select></label>
                <label className="text-sm font-semibold text-wxIndigo700">Dark contrast<select value={draft.protectedBrandDarkContrast} onChange={(event) => updateDraft((value) => ({ ...value, protectedBrandDarkContrast: event.target.value as typeof value.protectedBrandDarkContrast }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="soft_glass">Soft Glass</option><option value="text_shadow">Text Shadow</option></select></label>
              </div>
              <button type="button" onClick={() => setSection("preview")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxViolet700"><Eye className="h-4 w-4" /> Preview Protected Branding</button>
            </section>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void saveConfiguration()} disabled={!snapshot.permissions.canEdit || Boolean(busy)} className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save Draft</button>
              <button type="button" onClick={() => setSection("preview")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxViolet700"><Eye className="h-4 w-4" /> Preview & Activate</button>
            </div>
          </AdminPanel>

          {/* Legacy Hero activation toolbar removed: canonical scene controls above own activation. 
            <div className="hidden" aria-hidden="true">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxIndigo500">Selected</p>
                  <p className="mt-1 truncate text-base font-semibold text-wxIndigo900">{selectedVariantName}</p>
                  <p className="mt-1 text-xs text-wxIndigo500">
                    {selectedSupportedSurfaces.length
                      ? selectedSupportedSurfaces.map((surface) => surfaceLabels[surface]).join(" · ")
                      : "Manual mapping required"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openSelectedVariantPreview(
                      selectedPack,
                      selectedSupportedSurfaces.includes("clientLoginHero")
                        ? "/client-login"
                        : selectedSupportedSurfaces.includes("employeeLoginHero")
                          ? "/employee-login"
                          : "/",
                      selectedSupportedSurfaces
                    )}
                    disabled={Boolean(busy) || selectedSupportedSurfaces.length === 0}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxIndigo700 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" /> Preview Selected Hero
                  </button>
                  {(["websiteHero", "clientLoginHero", "employeeLoginHero"] as FestivalHeroSurface[]).map((surface) => {
                    const supported = selectedSupportedSurfaces.includes(surface);
                    return (
                    <button
                      key={surface}
                      type="button"
                      onClick={() => void prepareDirectActivation(selectedPack, [surface])}
                      disabled={!snapshot.permissions.canActivate || Boolean(busy) || !supported}
                      title={supported ? `Use ${selectedVariantName} as ${surfaceLabels[surface]}` : `${surfaceLabels[surface]} is not included in this approved pack.`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxViolet700 disabled:opacity-50"
                    >
                      {surface === "websiteHero" ? <Globe2 className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                      Use as {surfaceLabels[surface]}
                    </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => void prepareDirectActivation(selectedPack, ["clientLoginHero", "employeeLoginHero"])}
                    disabled={
                      !snapshot.permissions.canActivate ||
                      Boolean(busy) ||
                      !selectedSupportedSurfaces.includes("clientLoginHero") ||
                      !selectedSupportedSurfaces.includes("employeeLoginHero")
                    }
                    title={
                      selectedSupportedSurfaces.includes("clientLoginHero") && selectedSupportedSurfaces.includes("employeeLoginHero")
                        ? `Apply ${selectedVariantName} to both login screens`
                        : "Both login Hero assets are required for this action."
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxViolet700 disabled:opacity-50"
                  >
                    Apply to Client + Employee
                  </button>
                  {selectedEnabledSurfaces.length ? (
                    <button
                      type="button"
                      onClick={() => void prepareDirectActivation(selectedPack, selectedEnabledSurfaces)}
                      disabled={!snapshot.permissions.canActivate || Boolean(busy)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold text-wxViolet700 disabled:opacity-50"
                    >
                      Apply to All Selected Surfaces
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void prepareDirectActivation(
                      selectedPack,
                      selectedEnabledSurfaces.length
                        ? selectedEnabledSurfaces
                        : selectedSupportedSurfaces
                    )}
                    disabled={!snapshot.permissions.canActivate || Boolean(busy) || selectedSupportedSurfaces.length === 0}
                    className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Use This Hero <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          */}

          <button type="button" onClick={() => setShowDiagnostics((value) => !value)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-wxIndigo600"><CircleHelp className="h-4 w-4" /> Why is this not showing?<ChevronDown className={`h-4 w-4 transition ${showDiagnostics ? "rotate-180" : ""}`} /></button>
          {showDiagnostics ? (
            <div className="rounded-md border border-wxBorder bg-wxSurface px-5">
              {selected.diagnostics
                .filter((diagnostic) => ["header", "axo", "sound"].includes(diagnostic.slot))
                .map((diagnostic) => (
                <div key={diagnostic.slot} className="flex flex-col gap-2 border-b border-wxBorder py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-semibold text-wxIndigo900">{FESTIVAL_STUDIO_SLOT_LABELS[diagnostic.slot]}</p><p className="mt-1 text-sm text-wxIndigo500">{diagnostic.explanation}</p></div>
                  <div className="flex items-center gap-2"><AdminStatusBadge tone={statusTone(diagnostic.status)}>{diagnostic.status.replaceAll("_", " ")}</AdminStatusBadge>{diagnostic.fix ? <button type="button" onClick={() => { if (diagnostic.fix === "enable") setSlotEnabled(diagnostic.slot, true); else if (diagnostic.fix === "activate") setSection("preview"); else setMessage(`Choose or upload a safe ${FESTIVAL_STUDIO_SLOT_LABELS[diagnostic.slot]} above.`); }} className="inline-flex min-h-9 items-center rounded-md border border-wxBorder px-3 text-xs font-semibold text-wxViolet700">Fix</button> : null}</div>
                </div>
              ))}
            </div>
          ) : null}

          {snapshot.permissions.canEdit ? (
            <details className="rounded-md border border-wxBorder bg-wxSurface px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-wxIndigo700">Advanced Settings</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-wxIndigo700">Motion tuning<select value={draft.motionLevel} onChange={(event) => updateDraft((value) => ({ ...value, motionLevel: event.target.value as typeof value.motionLevel }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"><option value="none">None</option><option value="subtle">Subtle</option><option value="standard">Standard</option></select></label>
                <div><p className="text-sm font-semibold text-wxIndigo700">Asset controls</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setTool(tool === "import" ? "none" : "import")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><Upload className="h-4 w-4" /> Manual Mapping / ZIP Import</button><button type="button" onClick={() => setTool(tool === "asset-library" ? "none" : "asset-library")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-3 text-sm font-semibold"><Library className="h-4 w-4" /> Crop, Breakpoints & Versions</button></div></div>
              </div>
            </details>
          ) : null}
          {snapshot.permissions.canEdit && tool === "import" ? <FestivalPackImporter initialSnapshot={snapshot.packLibrary} /> : null}
          {snapshot.permissions.canEdit && tool === "asset-library" ? <FestivalAssetLibrary initialSnapshot={snapshot.assetLibrary} /> : null}
        </div>
      ) : null}

      {(section === "preview" || section === "schedule") && selected ? (
        <AdminPanel title={section === "schedule" ? "Schedule Festival" : "Preview & Activate"} description="Review the real pages in private mode. Activation requires one explicit final visual approval.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Homepage", "/", Monitor],
              ["Client Desktop", "/client-login", Monitor],
              ["Client Mobile", "/client-login?previewViewport=mobile", Smartphone],
              ["Employee Desktop", "/employee-login", Monitor],
              ["Employee Mobile", "/employee-login?previewViewport=mobile", Smartphone]
            ].map(([label, path, Icon]) => (
              <button key={String(label)} type="button" onClick={() => void openPreview(String(path))} disabled={Boolean(busy)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700 hover:border-wxViolet700"><Icon className="h-4 w-4" />{String(label)}</button>
            ))}
          </div>
          {selectedPack ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
              <div>
                <p className="text-sm font-semibold text-wxIndigo900">
                  {exactPreviewIsCurrent
                    ? "Fresh Preview Ready"
                    : "Fresh Preview Required"}
                </p>
                <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                  {exactPreviewIsCurrent && exactPreview
                    ? `Snapshot ${exactPreview.snapshotId.slice(0, 8).toUpperCase()} matches the selected design. Any further edit will require another preview.`
                    : "Open and review a new private preview. Activation remains locked after any draft, scene, asset or responsive-setting change."}
                </p>
              </div>
              <button type="button" onClick={() => void openPreview("/")} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxViolet700 px-4 text-sm font-semibold text-wxViolet700 disabled:opacity-50"><Eye className="h-4 w-4" /> Refresh Private Preview</button>
            </div>
          ) : null}
          {section === "schedule" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-wxIndigo700">Starts<input type="datetime-local" value={draft.startAt} onChange={(event) => updateDraft((value) => ({ ...value, startAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label>
              <label className="text-sm font-semibold text-wxIndigo700">Ends<input type="datetime-local" value={draft.endAt} onChange={(event) => updateDraft((value) => ({ ...value, endAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label>
            </div>
          ) : null}
          <div className="mt-6 space-y-3 border-t border-wxBorder pt-5">
            <label className="flex items-start gap-3 text-sm text-wxIndigo700"><input type="checkbox" className="mt-1" checked={approval} onChange={(event) => setApproval(event.target.checked)} disabled={Boolean(selectedPack) && !exactPreviewIsCurrent} /> I reviewed the Homepage, Client Login, Employee Login, mobile fallback and default restoration.</label>
            <label className="flex items-start gap-3 text-sm text-wxIndigo700"><input type="checkbox" className="mt-1" checked={religiousApproval} onChange={(event) => setReligiousApproval(event.target.checked)} /> Cultural or religious artwork, where present, is approved for this festival.</label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void activate(section === "schedule")} disabled={!snapshot.permissions.canActivate || !approval || Boolean(busy) || (section !== "schedule" && Boolean(selectedPack) && !exactPreviewIsCurrent) || (section === "schedule" && (!draft.startAt || !draft.endAt))} className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" />{section === "schedule" ? "Approve & Schedule" : "Approve & Activate"}</button>
            {selected.activationStatus === "active" ? <button type="button" onClick={async () => { const result = await request({ action: "end", configurationId: selected.id }); if (result) setMessage("Festival ended and login defaults restored."); }} disabled={!snapshot.permissions.canActivate || Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"><Pause className="h-4 w-4" /> End Festival</button> : null}
            <button type="button" onClick={async () => { const result = await request({ action: "restore_default" }); if (result) setMessage("Default WriteX experience restored."); }} disabled={!snapshot.permissions.canActivate || Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"><RotateCcw className="h-4 w-4" /> Restore Default Hero</button>
          </div>
        </AdminPanel>
      ) : null}

      {section === "history" ? (
        <AdminPanel title="Configuration History" description="Every migrated, assigned, approved, activated and restored configuration version remains auditable.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-wxBorder text-xs uppercase text-wxIndigo500"><th className="px-3 py-3">Festival</th><th className="px-3 py-3">Version</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">State</th><th className="px-3 py-3">Changed by</th><th className="px-3 py-3">Time</th></tr></thead>
              <tbody>{snapshot.history.map((entry) => { const config = snapshot.configurations.find((item) => item.id === entry.configurationId); return <tr key={entry.id} className="border-b border-wxBorder last:border-0"><td className="px-3 py-3 font-semibold text-wxIndigo900">{config?.festivalName || "Festival"}</td><td className="px-3 py-3">v{entry.version}</td><td className="px-3 py-3">{entry.action.replaceAll("_", " ")}</td><td className="px-3 py-3"><AdminStatus status={entry.state} /></td><td className="px-3 py-3">{entry.changedBy || "System migration"}</td><td className="px-3 py-3">{new Date(entry.createdAt).toLocaleString()}</td></tr>; })}</tbody>
            </table>
          </div>
        </AdminPanel>
      ) : null}

      {activationIntent ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-indigo-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="replace-active-hero-title">
          <div className="w-full max-w-xl rounded-md border border-wxBorder bg-wxSurface p-6 shadow-[0_28px_90px_rgba(15,23,42,0.38)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">Exact Preview Snapshot</p>
            <h2 id="replace-active-hero-title" className="mt-2 text-xl font-semibold text-wxIndigo900">Replace Active Hero?</h2>
            <dl className="mt-5 divide-y divide-wxBorder rounded-md border border-wxBorder px-4 text-sm">
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3"><dt className="text-wxIndigo500">Current</dt><dd className="font-semibold text-wxIndigo900">{activationIntent.currentName}</dd></div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3"><dt className="text-wxIndigo500">New</dt><dd className="font-semibold text-wxIndigo900">{activationIntent.variantName}</dd></div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3"><dt className="text-wxIndigo500">Apply to</dt><dd className="font-semibold text-wxIndigo900">{activationIntent.surfaces.map((surface) => surfaceLabels[surface]).join(", ")}</dd></div>
              <div className="grid grid-cols-[7rem_1fr] gap-3 py-3"><dt className="text-wxIndigo500">Snapshot</dt><dd className="font-mono text-xs font-semibold text-wxIndigo700">{activationIntent.preview.snapshotId.slice(0, 12).toUpperCase()}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-wxIndigo500">Only the listed Hero surfaces will change. AXO, header decorations, sound, motion and every unlisted surface remain unchanged.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setActivationIntent(null)} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700">Cancel</button>
              <button type="button" onClick={() => void confirmDirectActivation()} disabled={Boolean(busy)} className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50"><Play className="h-4 w-4" /> Confirm and Activate</button>
            </div>
          </div>
        </div>
      ) : null}

      {statusConfirmation ? (
        <div className="fixed inset-0 z-[124] flex items-center justify-center bg-indigo-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="festival-status-confirm-title">
          <div className="w-full max-w-xl rounded-md border border-wxBorder bg-wxSurface p-6 shadow-[0_28px_90px_rgba(15,23,42,0.38)]">
            <p className="text-xs font-semibold uppercase text-wxViolet700">Festival safety confirmation</p>
            <h2 id="festival-status-confirm-title" className="mt-2 text-xl font-semibold text-wxIndigo900">{statusConfirmation === "turn-off" ? "Turn Off Festival?" : statusConfirmation === "restore-previous" ? "Restore Previous Public Theme?" : "Restore Normal WriteX Website?"}</h2>
            <p className="mt-3 text-sm leading-6 text-wxIndigo500">{statusConfirmation === "turn-off" ? "The public festival will end immediately. Its selected design, decorations, AXO, effects and sound settings remain saved for later activation." : statusConfirmation === "restore-previous" ? `Replace the current public festival with the exact immutable ${snapshot.previousPublicSnapshot?.festivalName || "previous festival"} snapshot (${snapshot.previousPublicSnapshot?.variantName || "previous design"})? The current public snapshot will remain available in history.` : "This emergency reset clears every active or scheduled festival surface, restores default Header, AXO and login screens, and stops effects and sound. Approved assets, saved configurations, versions and history remain available."}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setStatusConfirmation(null)} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700">Cancel</button>
              <button type="button" onClick={async () => {
                const result = statusConfirmation === "turn-off" && snapshot.activeConfiguration
                  ? await request({ action: "end", configurationId: snapshot.activeConfiguration.id })
                  : statusConfirmation === "restore-previous"
                    ? await request({ action: "restore_previous_public_snapshot" })
                    : await request({ action: "full_reset" });
                if (!result) return;
                const completed = statusConfirmation;
                setStatusConfirmation(null);
                setMessage(completed === "turn-off" ? "Festival turned off. Its saved configuration remains available." : completed === "restore-previous" ? "The exact previous public festival snapshot was restored. The replaced snapshot remains available in history." : "Normal WriteX website restored across every festival surface.");
              }} disabled={Boolean(busy)} className="wx-gradient-action inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50">{statusConfirmation === "turn-off" ? <Pause className="h-4 w-4" /> : statusConfirmation === "restore-previous" ? <History className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}{statusConfirmation === "turn-off" ? "Confirm Turn Off" : statusConfirmation === "restore-previous" ? "Confirm Exact Restore" : "Confirm Restore"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {showFullResetConfirm ? (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-indigo-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="full-festival-reset-title">
          <div className="w-full max-w-xl rounded-md border border-red-200 bg-wxSurface p-6 shadow-[0_28px_90px_rgba(15,23,42,0.38)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">Super Admin safety control</p>
            <h2 id="full-festival-reset-title" className="mt-2 text-xl font-semibold text-wxIndigo900">Reset all festival experiences?</h2>
            <p className="mt-3 text-sm leading-6 text-wxIndigo500">This disables every active or scheduled festival, all Hero surfaces, festival AXO, sound and motion, and restores the normal WriteX website and login screens. Approved assets, versions and history are preserved.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setShowFullResetConfirm(false)} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  const result = await request({ action: "full_reset" });
                  if (!result) return;
                  setShowFullResetConfirm(false);
                  setExactPreview(null);
                  setActivationIntent(null);
                  setMessage("Full Festival Reset completed. The normal WriteX experience is active.");
                }}
                disabled={Boolean(busy)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> Confirm Full Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3 text-xs text-wxIndigo500">
        <span>One canonical Festival Studio configuration controls every public asset slot.</span>
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600" /> Public state remains unchanged until final activation.</span>
      </div>
    </div>
  );
}
