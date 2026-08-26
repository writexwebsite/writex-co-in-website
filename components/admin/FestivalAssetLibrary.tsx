"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeftRight,
  Check,
  Clock3,
  Copy,
  Eye,
  History,
  ImagePlus,
  Link2,
  RotateCcw,
  Trash2,
  Unlink,
  Upload
} from "lucide-react";
import {
  FESTIVAL_ASSET_PLACEMENT_LABELS,
  FESTIVAL_ASSET_PLACEMENTS,
  FESTIVAL_ASSET_PURPOSE_LABELS,
  FESTIVAL_ASSET_PURPOSES,
  defaultPlacementsForPurpose,
  type FestivalAssetLibrarySnapshot,
  type FestivalAssetPlacement,
  type FestivalAssetPurpose,
  type FestivalLibraryAsset
} from "@/lib/holiday/asset-governance-types";
import {
  AdminPanel,
  AdminStatus,
  AdminStatusBadge,
  humaniseAdminStatus
} from "./AdminPrimitives";
import {
  FESTIVAL_AXO_DEFAULT_PLACEMENT,
  type FestivalAxoPlacement
} from "@/lib/holiday/festival-review-standard";

const tabs = [
  "All Assets",
  "Reference Images",
  "Homepage Assets",
  "Header Assets",
  "Login Screens",
  "Axo Assets",
  "Audio",
  "Archived",
  "Trash",
  "Version History"
] as const;

const placementGroups: Array<{
  label: string;
  placements: FestivalAssetPlacement[];
}> = [
  {
    label: "Public website",
    placements: [
      "homepage_hero",
      "homepage_background",
      "homepage_section_background",
      "homepage_theme_source",
      "header_decoration_rail",
      "hero_foreground",
      "hero_background",
      "inner_page_accent",
      "footer_accent",
      "announcement_banner"
    ]
  },
  {
    label: "Login screens",
    placements: [
      "client_login_desktop",
      "client_login_mobile",
      "employee_login_desktop",
      "employee_login_mobile",
      "admin_login_desktop",
      "admin_login_mobile"
    ]
  },
  {
    label: "Other",
    placements: [
      "axo_theme_reference",
      "palette_source",
      "motif_interpretation_source",
      "private_reference",
      "audio"
    ]
  }
];

function previewUrl(versionId: string) {
  return `/api/admin/website-experience/assets?assetId=${encodeURIComponent(versionId)}`;
}

function isVisibleInTab(asset: FestivalLibraryAsset, tab: (typeof tabs)[number]) {
  const placements = asset.assignments
    .filter((assignment) => assignment.state === "active")
    .map((assignment) => assignment.placement);
  if (tab === "All Assets") return asset.lifecycleState !== "deleted";
  if (tab === "Reference Images")
    return (
      asset.purpose === "design_reference_only" ||
      placements.includes("private_reference")
    );
  if (tab === "Homepage Assets")
    return placements.some((placement) => placement.startsWith("homepage_"));
  if (tab === "Header Assets")
    return placements.includes("header_decoration_rail");
  if (tab === "Login Screens")
    return placements.some((placement) => placement.includes("_login_"));
  if (tab === "Axo Assets")
    return placements.includes("axo_theme_reference");
  if (tab === "Audio") return asset.assetType === "audio";
  if (tab === "Archived") return asset.lifecycleState === "archived";
  if (tab === "Trash")
    return ["trash", "deletion_pending"].includes(asset.lifecycleState);
  return asset.versions.length > 1;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type FestivalReviewCategory =
  | "header"
  | "ground"
  | "axo"
  | "ambient"
  | "feature";

function reviewedAxoPlacement(
  anchor: string,
  coordinateSpace: FestivalAxoPlacement["coordinateSpace"]
): FestivalAxoPlacement {
  const anchorType = anchor === "left-hand-prop"
    ? "left_hand"
    : anchor === "head-accessory"
      ? "head"
      : anchor === "body-accessory"
        ? "chest_safe"
        : "right_hand";
  const anchorPoint = anchorType === "left_hand"
    ? { x: 0.135, y: 0.705 }
    : anchorType === "head"
      ? { x: 0.5, y: 0.16 }
      : anchorType === "chest_safe"
        ? { x: 0.5, y: 0.46 }
        : { x: 0.865, y: 0.705 };
  return {
    ...FESTIVAL_AXO_DEFAULT_PLACEMENT,
    coordinateSpace,
    anchorType,
    anchorPoint,
    gripPoint: coordinateSpace === "axo_bounds"
      ? anchorPoint
      : anchorType === "head"
        ? { x: 0.5, y: 0.82 }
        : { x: 0.5, y: 0.28 },
    transforms: coordinateSpace === "axo_bounds"
      ? {
          desktop: { offsetXPercent: 0, offsetYPercent: 0, scale: 1, rotationDeg: 0, zIndex: 3 },
          tablet: { offsetXPercent: 0, offsetYPercent: 0, scale: 1, rotationDeg: 0, zIndex: 3 },
          mobile: { offsetXPercent: 0, offsetYPercent: 0, scale: 1, rotationDeg: 0, zIndex: 3 }
        }
      : FESTIVAL_AXO_DEFAULT_PLACEMENT.transforms
  };
}

function reviewCategoryForSelectedAsset(
  asset: FestivalLibraryAsset
): FestivalReviewCategory | null {
  const version =
    asset.versions.find((item) => item.id === asset.currentVersionId) ||
    asset.versions.find((item) => item.current) ||
    asset.versions[0];
  const category = String(version?.assetCategory || "").toLowerCase();

  if (category === "header") return "header";
  if (category === "ground") return "ground";
  if (category === "axo") return "axo";
  if (category === "ambient") return "ambient";
  if (category === "feature") return "feature";
  if (asset.purpose === "header_decoration") return "header";
  if (asset.purpose === "footer_decoration") return "ground";
  if (asset.purpose === "axo_reference") return "axo";
  return null;
}

export function FestivalAssetLibrary({
  initialSnapshot
}: {
  initialSnapshot: FestivalAssetLibrarySnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("All Assets");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSnapshot.assets[0]?.id || null
  );
  const [themeId, setThemeId] = useState(initialSnapshot.themes[0]?.id || "");
  const [purpose, setPurpose] =
    useState<FestivalAssetPurpose>("design_reference_only");
  const [displayName, setDisplayName] = useState("");
  const [reviewCategory, setReviewCategory] = useState<
    "header" | "ground" | "axo" | "ambient" | "feature"
  >("header");
  const [provenance, setProvenance] = useState(
    "WriteX source-controlled UAT asset created for private Festival Studio validation."
  );
  const [axoAnchor, setAxoAnchor] = useState("right-hand-prop");
  const [axoCoordinateSpace, setAxoCoordinateSpace] = useState<
    FestivalAxoPlacement["coordinateSpace"]
  >("anchor_box");
  const [placements, setPlacements] = useState<FestivalAssetPlacement[]>([
    "private_reference"
  ]);
  const [assignPlacements, setAssignPlacements] = useState<
    FestivalAssetPlacement[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [replacementMode, setReplacementMode] = useState<
    "replace_everywhere" | "replace_selected" | "keep_both"
  >("replace_everywhere");
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>(
    []
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [retentionOverride, setRetentionOverride] = useState(false);
  const uploadForm = useRef<HTMLFormElement>(null);
  const replacementForm = useRef<HTMLFormElement>(null);

  const selected =
    snapshot.assets.find((asset) => asset.id === selectedId) || null;
  const visibleAssets = useMemo(
    () =>
      snapshot.assets.filter((asset) => isVisibleInTab(asset, activeTab)),
    [activeTab, snapshot.assets]
  );

  async function refreshFromResponse(response: Response) {
    const payload = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          data?: { library?: FestivalAssetLibrarySnapshot };
          error?: { message?: string };
        }
      | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || "The asset action failed.");
    }
    const next = payload.data?.library;
    if (next) setSnapshot(next);
    return payload;
  }

  async function runAction(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/asset-library",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      await refreshFromResponse(response);
      setNotice("Asset Library updated.");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The asset action failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadAsset(form: HTMLFormElement, replacing: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData(form);
      const replacementCategory =
        replacing && selected
          ? reviewCategoryForSelectedAsset(selected) || reviewCategory
          : reviewCategory;
      const replacementPurpose =
        replacing && selected ? selected.purpose : purpose;
      const replacementPlacements =
        replacing && selected
          ? Array.from(
              new Set([
                ...selected.assignments
                  .filter((assignment) => assignment.state === "active")
                  .map((assignment) => assignment.placement),
                ...defaultPlacementsForPurpose(selected.purpose)
              ])
            )
          : placements;
      data.set("themeId", themeId);
      data.set(
        "role",
        replacementPurpose === "audio"
          ? "audio"
          : replacementCategory === "header"
            ? "header"
            : replacementCategory === "ground"
              ? "footer"
              : replacementCategory === "axo"
                ? "axo"
                : replacementCategory === "ambient"
                  ? "particle_overlay"
                  : "decorative_overlay"
      );
      data.set("variant", replacing ? `version-${Date.now()}` : "library");
      data.set("purpose", replacementPurpose);
      data.set("placements", JSON.stringify(replacementPlacements));
      data.set(
        "displayName",
        replacing && selected ? selected.displayName : displayName
      );
      data.set("reviewCategory", replacementCategory);
      data.set("provenance", provenance);
      data.set("visualReviewRequired", "true");
      data.set("supportedRegions", JSON.stringify(
        replacementCategory === "header"
          ? ["navigation_rail"]
          : replacementCategory === "ground"
            ? ["footer_decoration", "section_dividers", "floating_edges"]
            : replacementCategory === "axo"
              ? ["axo_area"]
              : []
      ));
      data.set("presentation", replacementCategory === "header" ? "border" : replacementCategory === "axo" ? "axo" : "overlay");
      data.set("supportedMotions", JSON.stringify(
        replacementCategory === "axo"
          ? ["static", "axo_interaction"]
          : replacementCategory === "ambient"
            ? ["static", "floating"]
            : replacementCategory === "feature"
              ? ["static", "twinkling"]
              : ["static", "gentle_wind"]
      ));
      if (replacementCategory === "axo") {
        data.set("axoAnchor", axoAnchor);
        data.set(
          "axoPlacement",
          JSON.stringify(reviewedAxoPlacement(axoAnchor, axoCoordinateSpace))
        );
      }
      if (replacing && selected) {
        data.set("libraryAssetId", selected.id);
        data.set("replacementMode", replacementMode);
        data.set(
          "selectedAssignmentIds",
          JSON.stringify(selectedAssignmentIds)
        );
      }
      const response = await fetch(
        "/api/admin/website-experience/assets",
        { method: "POST", body: data }
      );
      const payload = await refreshFromResponse(response);
      const libraryAssetId =
        payload?.data &&
        "libraryAssetId" in payload.data &&
        typeof payload.data.libraryAssetId === "string"
          ? payload.data.libraryAssetId
          : null;
      if (libraryAssetId) setSelectedId(libraryAssetId);
      setNotice(
        replacing
          ? "New version uploaded. Review it before replacement becomes active."
          : "Asset uploaded privately. Public placements remain pending until review."
      );
      form.reset();
      setDisplayName("");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The upload failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function reviewCurrentVersion() {
    const current = selected?.versions[0];
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/assets",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assetId: current.id,
            decision: "approved",
            clarityConfirmed: true,
            isFallback: false,
            reason: "Approved from Festival Asset Library."
          })
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "Approval failed.");
      }
      const refresh = await fetch(
        "/api/admin/website-experience/asset-library",
        { cache: "no-store" }
      );
      await refreshFromResponse(refresh);
      setNotice("Version approved and its selected placements activated.");
    } catch (reviewError) {
      setError(
        reviewError instanceof Error ? reviewError.message : "Approval failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function permanentDelete() {
    if (!selected) return;
    if (deleteConfirmation !== "PERMANENTLY DELETE FESTIVAL ASSET") {
      setError("Enter the exact permanent-deletion confirmation phrase.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/admin/website-experience/asset-library",
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            libraryAssetId: selected.id,
            confirmation: deleteConfirmation,
            retentionOverride
          })
        }
      );
      await refreshFromResponse(response);
      setNotice("Authorised permanent deletion completed.");
      setSelectedId(null);
      setDeleteConfirmation("");
      setRetentionOverride(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Permanent deletion failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPanel
        title="Upload to Asset Library"
        description="The default is private reference-only. Files are not published unless a placement is explicitly chosen and the version is approved."
      >
        <form
          ref={uploadForm}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void uploadAsset(event.currentTarget, false);
          }}
        >
          <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
            Theme
            <select
              value={themeId}
              onChange={(event) => setThemeId(event.target.value)}
              className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
            >
              {snapshot.themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
            Human-readable name
            <input
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              minLength={3}
              maxLength={80}
              placeholder="Diwali Starlight Header Rail"
              className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
            How should this image be used?
            <select
              value={purpose}
              onChange={(event) => {
                const next = event.target.value as FestivalAssetPurpose;
                setPurpose(next);
                setPlacements(defaultPlacementsForPurpose(next));
                if (next === "header_decoration") setReviewCategory("header");
                if (next === "footer_decoration") setReviewCategory("ground");
                if (next === "axo_reference") setReviewCategory("axo");
              }}
              className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
            >
              {FESTIVAL_ASSET_PURPOSES.map((value) => (
                <option key={value} value={value}>
                  {FESTIVAL_ASSET_PURPOSE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
            Visual review category
            <select
              value={reviewCategory}
              onChange={(event) => setReviewCategory(event.target.value as typeof reviewCategory)}
              className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
            >
              <option value="header">Header</option>
              <option value="ground">Ground / page bottom</option>
              <option value="axo">AXO accessory</option>
              <option value="ambient">Ambient effect</option>
              <option value="feature">Feature effect</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
            Private asset
            <input
              name="file"
              type="file"
              required
              accept={purpose === "audio" ? "audio/*" : "image/*"}
              className="min-h-11 rounded-md border border-dashed border-wxBorder bg-wxSurfaceSoft px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !themeId}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-md wx-gradient-action px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Upload for Visual Review
          </button>
          <label className="grid gap-2 text-sm font-semibold text-wxIndigo700 md:col-span-2">
            Provenance and creation method
            <input
              name="provenance"
              value={provenance}
              onChange={(event) => setProvenance(event.target.value)}
              required
              minLength={3}
              maxLength={240}
              className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
            />
          </label>
          {reviewCategory === "axo" ? (
            <>
              <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
                AXO anchor
                <select
                  value={axoAnchor}
                  onChange={(event) => setAxoAnchor(event.target.value)}
                  className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
                >
                  <option value="right-hand-prop">Right hand prop</option>
                  <option value="left-hand-prop">Left hand prop</option>
                  <option value="head-accessory">Head accessory</option>
                  <option value="body-accessory">Body accessory</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-wxIndigo700">
                Artwork framing
                <select
                  value={axoCoordinateSpace}
                  onChange={(event) => setAxoCoordinateSpace(
                    event.target.value as FestivalAxoPlacement["coordinateSpace"]
                  )}
                  className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3"
                >
                  <option value="anchor_box">Prop or accessory only</option>
                  <option value="axo_bounds">Full AXO-size canvas</option>
                </select>
              </label>
            </>
          ) : null}
          <div className="flex items-end">
            <a
              href="/admin/website-experience/festival-assets/review?batch=uat"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder px-4 text-sm font-semibold text-wxIndigo700"
            >
              <Eye className="h-4 w-4" /> Open Visual Review
            </a>
          </div>
        </form>
        {(purpose === "multiple_locations" ||
          purpose === "library_unassigned") && (
          <div className="mt-5 grid gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 md:grid-cols-3">
            {placementGroups.map((group) => (
              <fieldset key={group.label}>
                <legend className="text-xs font-semibold uppercase text-wxIndigo500">
                  {group.label}
                </legend>
                <div className="mt-3 space-y-2">
                  {group.placements.map((placement) => (
                    <label
                      key={placement}
                      className="flex items-start gap-2 text-sm text-wxIndigo700"
                    >
                      <input
                        type="checkbox"
                        checked={placements.includes(placement)}
                        onChange={(event) =>
                          setPlacements((current) =>
                            event.target.checked
                              ? [...new Set([...current, placement])]
                              : current.filter((item) => item !== placement)
                          )
                        }
                      />
                      {FESTIVAL_ASSET_PLACEMENT_LABELS[placement]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </AdminPanel>

      <div
        role="tablist"
        aria-label="Festival asset categories"
        className="flex gap-2 overflow-x-auto border-b border-wxBorder pb-3"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-md border px-3 py-2 text-sm font-semibold ${
              activeTab === tab
                ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
                : "border-wxBorder bg-wxSurface text-wxIndigo600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
        <section>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleAssets.map((asset) => {
              const current = asset.versions.find((version) => version.current);
              const active = selectedId === asset.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(asset.id);
                    setThemeId(asset.ownerThemeId || snapshot.themes[0]?.id || "");
                    setAssignPlacements([]);
                  }}
                  className={`overflow-hidden rounded-lg border bg-wxSurface text-left shadow-soft transition ${
                    active
                      ? "border-wxViolet700 ring-2 ring-violet-200"
                      : "border-wxBorder hover:border-wxViolet700"
                  }`}
                >
                  <div className="relative aspect-[16/9] bg-wxSurfaceSoft">
                    {current && asset.assetType === "image" ? (
                      <Image
                        src={previewUrl(current.id)}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-wxIndigo400">
                        <ImagePlus className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="break-words text-sm font-semibold text-wxIndigo900">
                        {asset.displayName}
                      </p>
                      <AdminStatus status={asset.lifecycleState} />
                    </div>
                    {asset.integrityState !== "healthy" ? (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        Integrity: {humaniseAdminStatus(asset.integrityState)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-wxIndigo500">
                      {FESTIVAL_ASSET_PURPOSE_LABELS[asset.purpose]}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-wxIndigo500">
                      <span>v{asset.currentVersionNumber || 1}</span>
                      <span>{asset.usageCount} active uses</span>
                      <span>{new Date(asset.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {visibleAssets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-wxBorder bg-wxSurface p-8 text-center text-sm text-wxIndigo500">
              No assets match this library view.
            </div>
          ) : null}
        </section>

        <aside className="self-start rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft xl:sticky xl:top-24">
          {selected ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase text-wxIndigo500">
                  Asset detail
                </p>
                <h2 className="mt-1 text-xl font-semibold text-wxIndigo900">
                  {selected.displayName}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminStatus status={selected.lifecycleState} />
                  <AdminStatusBadge
                    tone={selected.integrityState === "healthy" ? "success" : "warning"}
                  >
                    Integrity: {humaniseAdminStatus(selected.integrityState)}
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="info">
                    v{selected.currentVersionNumber || 1}
                  </AdminStatusBadge>
                  <AdminStatusBadge>
                    {selected.usageCount} active uses
                  </AdminStatusBadge>
                </div>
                {selected.integrityNote ? (
                  <p className="mt-3 text-sm text-wxIndigo600">
                    {selected.integrityNote}
                  </p>
                ) : null}
              </div>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-wxIndigo900">
                  <Link2 className="h-4 w-4" />
                  Used In
                </h3>
                <div className="mt-3 space-y-2">
                  {selected.assignments
                    .filter((assignment) => assignment.state === "active")
                    .map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-wxIndigo800">
                            {FESTIVAL_ASSET_PLACEMENT_LABELS[assignment.placement]}
                          </p>
                          <p className="mt-1 text-xs text-wxIndigo500">
                            {assignment.themeName} · v{assignment.versionNumber}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction({
                              action: "remove_assignment",
                              assignmentId: assignment.id
                            })
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-wxBorder text-wxIndigo600"
                          aria-label={`Remove ${FESTIVAL_ASSET_PLACEMENT_LABELS[assignment.placement]} assignment`}
                          title="Remove only this assignment"
                        >
                          <Unlink className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  {selected.usageCount === 0 ? (
                    <p className="rounded-md border border-dashed border-wxBorder p-3 text-sm text-wxIndigo500">
                      Not assigned to any active location.
                    </p>
                  ) : null}
                </div>
              </section>

              {selected.lifecycleState === "active" ? (
                <section>
                  <h3 className="text-sm font-semibold text-wxIndigo900">
                    Assign Asset
                  </h3>
                  <select
                    value={themeId}
                    onChange={(event) => setThemeId(event.target.value)}
                    className="mt-3 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"
                  >
                    {snapshot.themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-md border border-wxBorder p-3">
                    {FESTIVAL_ASSET_PLACEMENTS.map((placement) => (
                      <label
                        key={placement}
                        className="flex gap-2 text-sm text-wxIndigo700"
                      >
                        <input
                          type="checkbox"
                          checked={assignPlacements.includes(placement)}
                          onChange={(event) =>
                            setAssignPlacements((current) =>
                              event.target.checked
                                ? [...new Set([...current, placement])]
                                : current.filter((item) => item !== placement)
                            )
                          }
                        />
                        {FESTIVAL_ASSET_PLACEMENT_LABELS[placement]}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={busy || !themeId || assignPlacements.length === 0}
                    onClick={() =>
                      void runAction({
                        action: "assign",
                        libraryAssetId: selected.id,
                        themeId,
                        placements: assignPlacements
                      })
                    }
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md wx-gradient-action px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Apply selected placements
                  </button>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction({
                          action: "copy_login",
                          themeId,
                          direction: "client_to_employee"
                        })
                      }
                      className="rounded-md border border-wxBorder p-2 text-xs font-semibold text-wxIndigo700"
                    >
                      Client → Employee
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction({
                          action: "copy_login",
                          themeId,
                          direction: "employee_to_client"
                        })
                      }
                      className="rounded-md border border-wxBorder p-2 text-xs font-semibold text-wxIndigo700"
                    >
                      Employee → Client
                    </button>
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-wxIndigo900">
                  <History className="h-4 w-4" />
                  Version History
                </h3>
                <div className="mt-3 space-y-2">
                  {selected.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-wxBorder p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-wxIndigo800">
                          Version {version.versionNumber}
                          {version.current ? " · Current" : ""}
                        </p>
                        <p className="mt-1 text-xs text-wxIndigo500">
                          {humaniseAdminStatus(version.state)} ·{" "}
                          {formatBytes(version.fileSize)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={previewUrl(version.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-wxBorder"
                          aria-label={`Preview version ${version.versionNumber}`}
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        {!version.current &&
                        version.reviewStatus === "approved" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void runAction({
                                action: "restore_version",
                                libraryAssetId: selected.id,
                                versionAssetId: version.id
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-wxBorder"
                            aria-label={`Restore version ${version.versionNumber}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                {selected.versions.some(
                  (version) => version.reviewStatus !== "approved"
                ) && selected.versions[0]?.assetMetadata?.existingVersionAssetId ? (
                  <a
                    href="/admin/website-experience/festival-assets/review?batch=uat"
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-wxViolet700 bg-violet-50 px-3 text-sm font-semibold text-wxViolet700"
                  >
                    <Eye className="h-4 w-4" /> Review exact version
                  </a>
                ) : selected.versions.some(
                  (version) => version.reviewStatus !== "approved"
                ) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reviewCurrentVersion()}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800"
                  >
                    <Check className="h-4 w-4" />
                    Approve latest version
                  </button>
                ) : null}
              </section>

              {selected.lifecycleState === "active" ? (
                <form
                  ref={replacementForm}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void uploadAsset(event.currentTarget, true);
                  }}
                >
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-wxIndigo900">
                    <ArrowLeftRight className="h-4 w-4" />
                    Replace Asset
                  </h3>
                  <input
                    name="file"
                    type="file"
                    required
                    accept={selected.assetType === "audio" ? "audio/*" : "image/*"}
                    className="mt-3 w-full rounded-md border border-dashed border-wxBorder p-2 text-sm"
                  />
                  <select
                    value={replacementMode}
                    onChange={(event) =>
                      setReplacementMode(
                        event.target.value as typeof replacementMode
                      )
                    }
                    className="mt-3 min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"
                  >
                    <option value="replace_everywhere">Replace Everywhere</option>
                    <option value="replace_selected">
                      Replace Only Selected Assignments
                    </option>
                    <option value="keep_both">Keep Both as Separate Assets</option>
                  </select>
                  {replacementMode === "replace_selected" ? (
                    <div className="mt-3 space-y-2">
                      {selected.assignments
                        .filter((assignment) => assignment.state === "active")
                        .map((assignment) => (
                          <label
                            key={assignment.id}
                            className="flex gap-2 text-xs text-wxIndigo700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignmentIds.includes(
                                assignment.id
                              )}
                              onChange={(event) =>
                                setSelectedAssignmentIds((current) =>
                                  event.target.checked
                                    ? [...current, assignment.id]
                                    : current.filter(
                                        (id) => id !== assignment.id
                                      )
                                )
                              }
                            />
                            {FESTIVAL_ASSET_PLACEMENT_LABELS[assignment.placement]}
                          </label>
                        ))}
                    </div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-wxViolet700 px-3 text-sm font-semibold text-wxViolet700"
                  >
                    <Copy className="h-4 w-4" />
                    Upload new version
                  </button>
                </form>
              ) : null}

              <section>
                <h3 className="text-sm font-semibold text-wxIndigo900">
                  Lifecycle
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {selected.lifecycleState === "active" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction({
                            action: "archive",
                            libraryAssetId: selected.id
                          })
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-wxBorder text-sm font-semibold text-wxIndigo700"
                      >
                        <Archive className="h-4 w-4" /> Archive
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction({
                            action: "trash",
                            libraryAssetId: selected.id
                          })
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 text-sm font-semibold text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Move to Trash
                      </button>
                    </>
                  ) : null}
                  {selected.lifecycleState === "archived" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction({
                            action: "restore",
                            libraryAssetId: selected.id
                          })
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-wxBorder text-sm font-semibold text-wxIndigo700"
                      >
                        <RotateCcw className="h-4 w-4" /> Restore
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction({
                            action: "trash",
                            libraryAssetId: selected.id
                          })
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 text-sm font-semibold text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Move to Trash
                      </button>
                    </>
                  ) : null}
                  {selected.lifecycleState === "trash" ? (
                    <div className="col-span-full grid gap-3 rounded-md border border-red-200 bg-red-50 p-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction({
                            action: "restore_trash",
                            libraryAssetId: selected.id
                          })
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-wxBorder text-sm font-semibold text-wxIndigo700"
                      >
                        <RotateCcw className="h-4 w-4" /> Restore
                      </button>
                      <label className="grid gap-1 text-xs font-semibold text-red-950">
                        Type PERMANENTLY DELETE FESTIVAL ASSET
                        <input
                          value={deleteConfirmation}
                          onChange={(event) =>
                            setDeleteConfirmation(event.target.value)
                          }
                          className="min-h-10 rounded-md border border-red-200 bg-white px-3 font-normal text-wxIndigo900"
                          autoComplete="off"
                        />
                      </label>
                      <label className="flex items-start gap-2 text-xs text-red-950">
                        <input
                          type="checkbox"
                          checked={retentionOverride}
                          onChange={(event) =>
                            setRetentionOverride(event.target.checked)
                          }
                          className="mt-0.5"
                        />
                        I authorise deletion before the retention date. Leave
                        unchecked when the retention period has elapsed.
                      </label>
                      <button
                        type="button"
                        disabled={
                          busy ||
                          selected.usageCount > 0 ||
                          deleteConfirmation !==
                            "PERMANENTLY DELETE FESTIVAL ASSET"
                        }
                        onClick={() => void permanentDelete()}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-300 bg-red-50 text-sm font-semibold text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" /> Permanently Delete
                      </button>
                    </div>
                  ) : null}
                </div>
                {selected.usageCount > 0 ? (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    This asset is in use. Remove or replace its assignments before
                    permanent deletion. Archive keeps current historical use;
                    Trash detaches it from every active placement.
                  </p>
                ) : null}
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-wxIndigo900">
                  <Clock3 className="h-4 w-4" />
                  Audit history
                </h3>
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                  {selected.audit.map((event) => (
                    <div
                      key={event.id}
                      className="border-l-2 border-wxBorder pl-3 text-xs"
                    >
                      <p className="font-semibold text-wxIndigo700">
                        {humaniseAdminStatus(event.action)}
                      </p>
                      <p className="mt-1 text-wxIndigo500">
                        {event.actorName || "System"} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <p className="text-sm text-wxIndigo500">
              Select an asset to see its usage, versions and safe lifecycle
              actions.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
