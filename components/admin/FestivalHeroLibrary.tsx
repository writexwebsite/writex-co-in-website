"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Eye,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet
} from "lucide-react";
import {
  festivalNameForPack,
  isResponsiveFestivalHeroPack,
  variantNameForPack,
  variantSlugForPack,
  type FestivalHeroGroupRecord,
  type FestivalPackRecord,
  type FestivalPackSnapshot
} from "@/lib/holiday/festival-pack-types";
import { canonicalFestivalEvent } from "@/lib/holiday/festival-event-registry";
import {
  AdminEmptyState,
  AdminPanel,
  AdminStatus,
  AdminStatusBadge
} from "./AdminPrimitives";

type Target = "client" | "employee" | "both";
type PreviewSize = "desktop" | "tablet" | "mobile";
type HeroGroup = FestivalHeroGroupRecord & { packs: FestivalPackRecord[] };

function responseData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { ok?: boolean; data?: T };
  return record.ok ? record.data || null : null;
}

function previewAsset(pack: FestivalPackRecord, variant: PreviewSize) {
  const preferred = pack.files.find(
    (file) =>
      file.kind === "image" &&
      file.responsiveVariant === variant &&
      file.assetVersionId
  );
  const fallback = pack.files.find(
    (file) => file.kind === "image" && file.assetVersionId
  );
  const assetId = preferred?.assetVersionId || fallback?.assetVersionId;
  return assetId
    ? `/api/admin/website-experience/assets?assetId=${encodeURIComponent(assetId)}`
    : null;
}

function targetPayload(target: Target) {
  return {
    clientLoginEnabled: target === "client" || target === "both",
    employeeLoginEnabled: target === "employee" || target === "both"
  };
}

function buildGroups(snapshot: FestivalPackSnapshot): HeroGroup[] {
  const groups = new Map<string, HeroGroup>();
  for (const group of snapshot.heroGroups || []) {
    groups.set(group.festivalSlug, { ...group, packs: [] });
  }
  for (const pack of snapshot.packs.filter(isResponsiveFestivalHeroPack)) {
    const canonical = canonicalFestivalEvent(festivalNameForPack(pack));
    const festivalSlug = canonical.canonicalSlug;
    const current = groups.get(festivalSlug);
    if (current) {
      current.packs.push(pack);
      continue;
    }
    groups.set(festivalSlug, {
      id: `derived-${festivalSlug}`,
      festivalName: canonical.canonicalName,
      festivalSlug,
      sourceStatus: "ready",
      sourceMessage: null,
      defaultVariantSlug: variantSlugForPack(pack),
      variantCount: 1,
      createdAt: pack.importedAt,
      updatedAt: pack.importedAt,
      packs: [pack]
    });
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      variantCount: group.packs.length,
      packs: [...group.packs].sort((left, right) =>
        variantNameForPack(left).localeCompare(variantNameForPack(right), undefined, {
          numeric: true
        })
      )
    }))
    .sort((left, right) =>
      left.festivalName.localeCompare(right.festivalName, undefined, {
        sensitivity: "base",
        numeric: true
      })
    );
}

export function FestivalHeroLibrary({
  initialSnapshot
}: {
  initialSnapshot: FestivalPackSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const groups = useMemo(() => buildGroups(snapshot), [snapshot]);
  const firstReadyGroup = groups.find((group) => group.packs.length > 0) || groups[0];
  const initialPack =
    firstReadyGroup?.packs.find(
      (pack) => variantSlugForPack(pack) === firstReadyGroup.defaultVariantSlug
    ) || firstReadyGroup?.packs[0];
  const [selectedFestivalSlug, setSelectedFestivalSlug] = useState(
    firstReadyGroup?.festivalSlug || ""
  );
  const [selectedId, setSelectedId] = useState(initialPack?.id || "");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [target, setTarget] = useState<Target>("both");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedGroup =
    groups.find((group) => group.festivalSlug === selectedFestivalSlug) ||
    firstReadyGroup ||
    null;
  const selected =
    selectedGroup?.packs.find((pack) => pack.id === selectedId) ||
    selectedGroup?.packs.find(
      (pack) => variantSlugForPack(pack) === selectedGroup.defaultVariantSlug
    ) ||
    selectedGroup?.packs[0] ||
    null;

  function selectFestival(group: HeroGroup) {
    setSelectedFestivalSlug(group.festivalSlug);
    const next =
      group.packs.find(
        (pack) => variantSlugForPack(pack) === group.defaultVariantSlug
      ) || group.packs[0];
    setSelectedId(next?.id || "");
    setNotice("");
    setError("");
  }

  async function action(
    pack: FestivalPackRecord,
    body: Record<string, unknown>,
    success: string
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/website-experience/festival-packs/${pack.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          (payload as { error?: { message?: string } } | null)?.error?.message ||
            "The hero action failed."
        );
      }
      const data = responseData<FestivalPackSnapshot>(payload);
      if (data?.packs) setSnapshot(data);
      setNotice(success);
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "The hero action failed."
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function preview(
    pack: FestivalPackRecord,
    route: "/client-login" | "/employee-login"
  ) {
    if (await action(pack, { action: "preview" }, "Private responsive preview opened.")) {
      window.open(
        `${route}?festivalHeroPreview=${pack.id}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }

  if (groups.length === 0) {
    return (
      <AdminEmptyState
        title="No responsive festival heroes registered"
        description="Import an approved responsive festival hero ZIP. Flat login mockups remain reference-only and cannot appear here."
      />
    );
  }

  const imageUrl = selected ? previewAsset(selected, previewSize) : null;
  const dimensions = {
    desktop: "aspect-video",
    tablet: "aspect-[4/3]",
    mobile: "aspect-[3/2]"
  }[previewSize];

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-2" aria-label="Festival hero groups">
        <p className="px-1 text-xs font-semibold uppercase text-wxIndigo500">
          Festivals
        </p>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => selectFestival(group)}
            className={`w-full rounded-lg border px-4 py-4 text-left ${
              selectedGroup?.festivalSlug === group.festivalSlug
                ? "border-wxViolet700 bg-violet-50"
                : "border-wxBorder bg-wxSurface hover:border-wxViolet400"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-wxIndigo900">{group.festivalName}</p>
                <p className="mt-1 text-xs text-wxIndigo500">
                  {group.variantCount} {group.variantCount === 1 ? "variant" : "variants"}
                </p>
                {canonicalFestivalEvent(group.festivalName).family ? (
                  <p className="mt-1 text-xs text-wxIndigo500">
                    Family: {canonicalFestivalEvent(group.festivalName).family}
                  </p>
                ) : null}
              </div>
              <AdminStatus
                status={
                  group.sourceStatus === "source_required" ? "source required" : "ready"
                }
              />
            </div>
          </button>
        ))}
      </aside>

      {selectedGroup ? (
        <div className="space-y-6">
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              {error}
            </div>
          ) : null}
          {notice ? (
            <div
              role="status"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            >
              {notice}
            </div>
          ) : null}

          <AdminPanel
            title={selectedGroup.festivalName}
            description={
              selectedGroup.sourceStatus === "source_required"
                ? selectedGroup.sourceMessage || "An approved source design is required."
                : "Choose a distinct approved composition. Variants are never merged or activated by import."
            }
            action={<AdminStatus status={selectedGroup.sourceStatus} />}
          >
            {selectedGroup.packs.length > 0 ? (
              <div
                className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3"
                aria-label="Festival variants"
              >
                {selectedGroup.packs.map((pack) => {
                  const thumbnail = previewAsset(pack, "desktop");
                  const active = selected?.id === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => setSelectedId(pack.id)}
                      className={`overflow-hidden rounded-lg border text-left ${
                        active
                          ? "border-wxViolet700 bg-violet-50"
                          : "border-wxBorder bg-wxSurface hover:border-wxViolet400"
                      }`}
                    >
                      <span className="relative block aspect-video bg-wxSurfaceSoft">
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt={`${variantNameForPack(pack)} preview`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="block p-3">
                        <span className="block text-sm font-semibold text-wxIndigo900">
                          {variantNameForPack(pack)}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs text-wxIndigo500">
                          <span>{String(pack.manifest?.sourceSurface || "both")} source</span>
                          <AdminStatus status={pack.state} />
                        </span>
                        <span className="mt-1 block text-xs text-wxIndigo500">
                          Updated {new Date(pack.importedAt).toLocaleDateString()}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <AdminEmptyState
                title="Approved source required"
                description={
                  selectedGroup.sourceMessage ||
                  "Upload an approved designer hero to add variants."
                }
              />
            )}
          </AdminPanel>

          {selected ? (
            <>
              <AdminPanel
                title={variantNameForPack(selected)}
                description="Clean responsive hero only. Axo and legitimate prop branding are retained; the application supplies the sole real form and official form logo."
                action={<AdminStatus status={selected.state} />}
              >
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge tone="success">Single real form</AdminStatusBadge>
                  <AdminStatusBadge tone="success">Axo branding retained</AdminStatusBadge>
                  <AdminStatusBadge tone="success">Default fallback</AdminStatusBadge>
                  <AdminStatusBadge tone="neutral">
                    No public activation by import
                  </AdminStatusBadge>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Responsive preview"
                description="Inspect the exact approved asset for each layout family before opening a private login preview."
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  {([
                    ["desktop", Monitor, "Desktop"],
                    ["tablet", Tablet, "Tablet"],
                    ["mobile", Smartphone, "Mobile"]
                  ] as const).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPreviewSize(value)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                        previewSize === value
                          ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
                          : "border-wxBorder bg-wxSurface text-wxIndigo700"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <div
                  className={`relative mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-wxBorder bg-wxSurfaceSoft ${dimensions}`}
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`${variantNameForPack(selected)} ${previewSize} hero`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void preview(selected, "/client-login")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700"
                  >
                    <Eye className="h-4 w-4" />
                    Client Login Preview
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void preview(selected, "/employee-login")}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700"
                  >
                    <Eye className="h-4 w-4" />
                    Employee Login Preview
                  </button>
                </div>
              </AdminPanel>

              <AdminPanel
                title="Apply hero"
                description="Choose the login surface explicitly. Import and approval never activate a hero automatically."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["client", "employee", "both"] as Target[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTarget(value)}
                      className={`min-h-12 rounded-md border px-4 text-sm font-semibold ${
                        target === value
                          ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
                          : "border-wxBorder bg-wxSurface text-wxIndigo700"
                      }`}
                    >
                      {value === "client"
                        ? "Client Login"
                        : value === "employee"
                          ? "Employee Login"
                          : "Apply to Both"}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !["approved", "previous", "scheduled"].includes(selected.state)
                    }
                    onClick={() =>
                      void action(
                        selected,
                        { action: "activate", targets: targetPayload(target) },
                        "Responsive festival variant activated for the selected login target."
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-md wx-gradient-action px-5 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    <Check className="h-4 w-4" />
                    Activate Now
                  </button>
                  <button
                    type="button"
                    disabled={busy || !selected.previousPackId}
                    onClick={() =>
                      void action(
                        selected,
                        { action: "restore_previous" },
                        "Previous approved hero restored."
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 disabled:opacity-45"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore Previous
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void action(
                        selected,
                        { action: "restore_default" },
                        "Default WriteX hero restored."
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore Default Hero
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <label className="text-sm font-semibold text-wxIndigo800">
                    Start
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(event) => setStartAt(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                    />
                  </label>
                  <label className="text-sm font-semibold text-wxIndigo800">
                    End
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(event) => setEndAt(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
                    />
                  </label>
                  <label className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-wxIndigo700">
                    <input
                      type="checkbox"
                      checked={repeatYearly}
                      onChange={(event) => setRepeatYearly(event.target.checked)}
                      className="h-4 w-4 accent-wxViolet700"
                    />
                    Repeat yearly
                  </label>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !startAt ||
                      !endAt ||
                      !["approved", "previous", "scheduled"].includes(selected.state)
                    }
                    onClick={() =>
                      void action(
                        selected,
                        {
                          action: "schedule",
                          startAt: new Date(startAt).toISOString(),
                          endAt: new Date(endAt).toISOString(),
                          repeatYearly,
                          targets: targetPayload(target)
                        },
                        "Responsive festival variant schedule saved."
                      )
                    }
                    className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxViolet700 bg-violet-50 px-4 text-sm font-semibold text-wxViolet700 disabled:opacity-45"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Schedule
                  </button>
                </div>
              </AdminPanel>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
