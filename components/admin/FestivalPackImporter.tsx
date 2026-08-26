"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  ChevronRight,
  Eye,
  FileArchive,
  FileWarning,
  ImageIcon,
  Monitor,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Tablet,
  Upload,
  Volume2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FESTIVAL_PACK_MAPPING_LABELS,
  FESTIVAL_PACK_MAPPING_LOCATIONS,
  FESTIVAL_PACK_MODES,
  FESTIVAL_PACK_RESPONSIVE_VARIANTS,
  type FestivalPackMapping,
  type FestivalPackMappingLocation,
  type FestivalPackRecord,
  type FestivalPackResponsiveVariant,
  type FestivalPackSnapshot
} from "@/lib/holiday/festival-pack-types";
import {
  HOLIDAY_EXPERIENCE_LEVELS,
  HOLIDAY_THEME_CATEGORIES
} from "@/lib/holiday/types";
import {
  AdminEmptyState,
  AdminPanel,
  AdminStatus,
  AdminStatusBadge,
  humaniseAdminStatus
} from "./AdminPrimitives";

const workflow = [
  "Upload ZIP",
  "Validate",
  "Classify",
  "Map assets",
  "Preview",
  "Approve",
  "Activate or schedule"
] as const;

const categoryLabels: Record<string, string> = {
  national_holiday: "National Holiday",
  religious_festival: "Religious Festival",
  cultural_festival: "Cultural Festival",
  global_observance: "Global Observance",
  company_event: "Company Event",
  recruitment_campaign: "Recruitment Campaign",
  business_season: "Business Season",
  internal_milestone: "Internal Milestone",
  custom_one_time_event: "Custom One-time Event"
};

const modeLabels = {
  standard_writex: "Standard WriteX Festival Package",
  legacy_designer: "Legacy Designer Package",
  auto_detected: "Auto-Detected Package",
  manual_mapping: "Manual Asset Mapping"
};

function responseData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { ok?: boolean; data?: T };
  return record.ok ? record.data || null : null;
}

function messageFrom(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: { message?: string } }).error;
  return error?.message || fallback;
}

function filePreviewUrl(assetVersionId: string) {
  return `/api/admin/website-experience/assets?assetId=${encodeURIComponent(assetVersionId)}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function stageFor(pack: FestivalPackRecord) {
  if (pack.state === "active" || pack.state === "scheduled") return 7;
  if (pack.state === "approved" || pack.state === "previous") return 6;
  if (pack.state === "ready_for_review") return 5;
  if (pack.state === "mapping_required") return 4;
  return 3;
}

export function FestivalPackImporter({
  initialSnapshot
}: {
  initialSnapshot: FestivalPackSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedPackId, setSelectedPackId] = useState(
    initialSnapshot.packs[0]?.id || ""
  );
  const [selectedFileId, setSelectedFileId] = useState(
    initialSnapshot.packs[0]?.files[0]?.id || ""
  );
  const [draftMappings, setDraftMappings] = useState<FestivalPackMapping[]>([]);
  const [mappingVariant, setMappingVariant] =
    useState<FestivalPackResponsiveVariant>("default");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewRoute, setPreviewRoute] = useState("/client-login");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [appearance, setAppearance] = useState<"light" | "dark" | "auto">("auto");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const uploadForm = useRef<HTMLFormElement>(null);

  const selectedPack = snapshot.packs.find((pack) => pack.id === selectedPackId) || null;
  const selectedFile = selectedPack?.files.find((file) => file.id === selectedFileId) || null;
  const stage = selectedPack ? stageFor(selectedPack) : 1;
  const previewDimensions = {
    desktop: { width: "100%", height: 680 },
    tablet: { width: 768, height: 760 },
    mobile: { width: 390, height: 760 }
  }[previewWidth];
  const counts = useMemo(() => ({
    packs: snapshot.packs.length,
    ready: snapshot.packs.filter((pack) => pack.completenessFlags.includes("ready_to_activate")).length,
    blocked: snapshot.packs.reduce((sum, pack) => sum + pack.blockedEntryCount, 0),
    manual: snapshot.packs.reduce((sum, pack) => sum + pack.manualMappingCount, 0)
  }), [snapshot]);

  function selectPack(pack: FestivalPackRecord) {
    setSelectedPackId(pack.id);
    const file = pack.files[0];
    setSelectedFileId(file?.id || "");
    setDraftMappings(file?.approvedMappings || []);
    setMappingVariant(file?.responsiveVariant || "default");
    setError("");
    setNotice("");
  }

  function selectFile(fileId: string) {
    const file = selectedPack?.files.find((item) => item.id === fileId);
    setSelectedFileId(fileId);
    setDraftMappings(file?.approvedMappings || []);
    setMappingVariant(file?.responsiveVariant || "default");
  }

  async function readResponse(response: Response) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(messageFrom(payload, "The festival pack action failed."));
    return payload;
  }

  function updateSnapshot(next: FestivalPackSnapshot) {
    setSnapshot(next);
    const active = next.packs.find((pack) => pack.id === selectedPackId) || next.packs[0];
    if (active) {
      setSelectedPackId(active.id);
      const file = active.files.find((item) => item.id === selectedFileId) || active.files[0];
      setSelectedFileId(file?.id || "");
      setDraftMappings(file?.approvedMappings || []);
    }
  }

  async function importPack(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/website-experience/festival-packs", {
        method: "POST",
        body: new FormData(form)
      });
      const payload = await readResponse(response);
      const data = responseData<{ packId: string; snapshot: FestivalPackSnapshot }>(payload);
      if (!data) throw new Error("The imported pack response was incomplete.");
      updateSnapshot(data.snapshot);
      const imported = data.snapshot.packs.find((pack) => pack.id === data.packId);
      if (imported) selectPack(imported);
      setNotice("ZIP stored privately, validated and classified. Review mappings before approval.");
      form.reset();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The ZIP import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function action(body: Record<string, unknown>, success: string) {
    if (!selectedPack) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/website-experience/festival-packs/${selectedPack.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        }
      );
      const payload = await readResponse(response);
      const data = responseData<FestivalPackSnapshot>(payload);
      if (data?.packs) updateSnapshot(data);
      setNotice(success);
      return payload;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The action failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveMappings() {
    if (!selectedFile) return;
    await action(
      { action: "update_mappings", updates: [{ fileId: selectedFile.id, mappings: draftMappings }] },
      "Asset mapping saved and package readiness recalculated."
    );
  }

  async function startPreview() {
    const result = await action({ action: "preview" }, "Private preview is active for this pack.");
    if (result) {
      const url = `${previewRoute}?festivalPackPreview=${encodeURIComponent(selectedPack?.id || "")}&appearance=${appearance}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function toggleMapping(location: FestivalPackMappingLocation) {
    setDraftMappings((current) => {
      const exists = current.some((mapping) => mapping.location === location);
      if (exists) return current.filter((mapping) => mapping.location !== location);
      return [...current, { location, variant: mappingVariant }];
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Imported packs", counts.packs, FileArchive],
          ["Ready for activation", counts.ready, PackageCheck],
          ["Manual decisions", counts.manual, ImageIcon],
          ["Blocked files", counts.blocked, ShieldCheck]
        ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-lg border border-wxBorder bg-wxSurface px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-wxIndigo500">{String(label)}</p>
              <Icon className="h-4 w-4 text-wxViolet700" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-wxIndigo900">{String(value)}</p>
          </div>
        ))}
      </div>

      {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div> : null}
      {notice ? <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}

      <AdminPanel
        title="Import designer ZIP"
        description="The original archive stays private. Images, approved audio and declarative tokens are inspected; scripts and executable content are blocked and never extracted for rendering."
      >
        <form
          ref={uploadForm}
          className="grid gap-4 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void importPack(event.currentTarget);
          }}
        >
          <label className="text-sm font-semibold text-wxIndigo800 lg:col-span-2">
            Designer ZIP
            <input name="package" type="file" accept=".zip,application/zip" required className="mt-2 block w-full rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 py-3 text-sm" />
          </label>
          <label className="text-sm font-semibold text-wxIndigo800 lg:col-span-2">
            Pack name
            <input name="packageName" required maxLength={160} placeholder="Durga Puja 2026" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm" />
          </label>
          <label className="text-sm font-semibold text-wxIndigo800">
            Package mode
            <select name="packageMode" defaultValue="auto_detected" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm">
              {FESTIVAL_PACK_MODES.map((mode) => <option key={mode} value={mode}>{modeLabels[mode]}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-wxIndigo800">
            Category
            <select name="category" defaultValue="cultural_festival" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm">
              {HOLIDAY_THEME_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabels[category] || humaniseAdminStatus(category)}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-wxIndigo800">
            Theme level
            <select name="experienceLevel" defaultValue="standard" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm">
              {HOLIDAY_EXPERIENCE_LEVELS.map((level) => <option key={level} value={level}>{humaniseAdminStatus(level)}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-wxIndigo800">
            Existing theme (optional)
            <select name="themeId" defaultValue="" className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm">
              <option value="">Create a new theme</option>
              {snapshot.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-4 lg:col-span-3">
            {[
              ["clientLoginEnabled", "Client Login"],
              ["employeeLoginEnabled", "Employee Login"],
              ["homepageEnabled", "Homepage"]
            ].map(([name, label]) => (
              <label key={name} className="inline-flex items-center gap-2 text-sm font-medium text-wxIndigo700">
                <input name={name} value="true" type="checkbox" defaultChecked className="h-4 w-4 accent-wxViolet700" />
                {label}
              </label>
            ))}
          </div>
          <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md wx-gradient-action px-5 text-sm font-semibold text-white disabled:opacity-50">
            <Upload className="h-4 w-4" />
            {busy ? "Validating..." : "Upload and Validate"}
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title="Import workflow" description="Every public activation passes through the same seven controlled stages.">
        <ol className="grid gap-2 md:grid-cols-7">
          {workflow.map((label, index) => {
            const complete = index + 1 <= stage;
            return (
              <li key={label} className={`flex min-h-16 items-center gap-2 rounded-md border px-3 text-xs font-semibold ${complete ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-wxBorder bg-wxSurfaceSoft text-wxIndigo500"}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current">{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
      </AdminPanel>

      {snapshot.packs.length === 0 ? (
        <AdminEmptyState title="No festival packs imported" description="Upload a designer ZIP above. The validator will classify safe assets and route uncertain files to manual mapping." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-2" aria-label="Festival packs">
            {snapshot.packs.map((pack) => (
              <button key={pack.id} type="button" onClick={() => selectPack(pack)} className={`w-full rounded-lg border px-4 py-4 text-left transition ${pack.id === selectedPackId ? "border-wxViolet700 bg-violet-50" : "border-wxBorder bg-wxSurface hover:border-wxViolet400"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-wxIndigo900">{pack.packageName}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-wxIndigo400" />
                </div>
                <p className="mt-1 text-xs text-wxIndigo500">Version {pack.packageVersion} · {modeLabels[pack.packageMode]}</p>
                <div className="mt-3"><AdminStatus status={pack.state} /></div>
              </button>
            ))}
          </aside>

          {selectedPack ? (
            <div className="space-y-6">
              <AdminPanel
                title={`${selectedPack.packageName} · Version ${selectedPack.packageVersion}`}
                description={`${selectedPack.sourceEntryCount} files scanned, ${selectedPack.safeAssetCount} safe assets and ${selectedPack.blockedEntryCount} blocked entries. Original ZIP: ${formatBytes(selectedPack.originalZipSize)} in private storage.`}
                action={<AdminStatus status={selectedPack.state} />}
              >
                <div className="flex flex-wrap gap-2">
                  {selectedPack.completenessFlags.map((flag) => (
                    <AdminStatusBadge key={flag} tone={flag === "ready_to_activate" || flag === "complete" ? "success" : flag === "manual_mapping_required" || flag === "flat_mockup_only" ? "warning" : "neutral"}>{humaniseAdminStatus(flag)}</AdminStatusBadge>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-sm"><strong className="block text-wxIndigo900">Client Login</strong>{selectedPack.clientLoginEnabled ? "Enabled" : "Default retained"}</div>
                  <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-sm"><strong className="block text-wxIndigo900">Employee Login</strong>{selectedPack.employeeLoginEnabled ? "Enabled" : "Default retained"}</div>
                  <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-sm"><strong className="block text-wxIndigo900">Homepage</strong>{selectedPack.homepageEnabled ? "Enabled" : "Default retained"}</div>
                </div>
              </AdminPanel>

              <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
                <AdminPanel title="Scanned files" description="Blocked code remains quarantined in the private original ZIP and is never executed.">
                  <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                    {selectedPack.files.map((file) => (
                      <button key={file.id} type="button" onClick={() => selectFile(file.id)} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left ${selectedFileId === file.id ? "border-wxViolet700 bg-violet-50" : "border-wxBorder bg-wxSurfaceSoft"}`}>
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border border-wxBorder bg-white">
                          {file.kind === "image" && file.assetVersionId ? <Image src={filePreviewUrl(file.assetVersionId)} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" /> : file.kind === "audio" ? <Volume2 className="h-5 w-5 text-wxViolet700" /> : file.inspectionStatus === "rejected_unsafe" ? <FileWarning className="h-5 w-5 text-red-600" /> : <FileArchive className="h-5 w-5 text-wxIndigo400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-wxIndigo900">{file.archivePath}</p>
                          <p className="mt-1 text-xs text-wxIndigo500">{humaniseAdminStatus(file.detectedClassification)} · {Math.round(file.confidence * 100)}%</p>
                        </div>
                        <AdminStatus status={file.inspectionStatus} />
                      </button>
                    ))}
                  </div>
                </AdminPanel>

                <AdminPanel title="Asset mapping" description="Assign one validated file to multiple compatible locations. Uncertain files stay private until you decide.">
                  {selectedFile ? (
                    <div>
                      {selectedFile.kind === "image" && selectedFile.assetVersionId ? (
                        <div className="mb-5 flex min-h-44 items-center justify-center overflow-hidden rounded-md border border-wxBorder bg-[linear-gradient(45deg,#f6f3ff_25%,transparent_25%),linear-gradient(-45deg,#f6f3ff_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f6f3ff_75%),linear-gradient(-45deg,transparent_75%,#f6f3ff_75%)] bg-[length:20px_20px]">
                          <Image src={filePreviewUrl(selectedFile.assetVersionId)} alt={`Preview of ${selectedFile.safeFileName}`} width={720} height={420} unoptimized className="max-h-80 w-auto object-contain" />
                        </div>
                      ) : null}
                      <dl className="mb-5 grid gap-3 sm:grid-cols-2 text-sm">
                        <div><dt className="font-semibold text-wxIndigo700">Classification</dt><dd className="text-wxIndigo500">{humaniseAdminStatus(selectedFile.detectedClassification)}</dd></div>
                        <div><dt className="font-semibold text-wxIndigo700">Dimensions</dt><dd className="text-wxIndigo500">{selectedFile.width && selectedFile.height ? `${selectedFile.width} × ${selectedFile.height}` : "Not applicable"}</dd></div>
                        <div className="sm:col-span-2"><dt className="font-semibold text-wxIndigo700">Why</dt><dd className="text-wxIndigo500">{selectedFile.reasons.join(" ")}</dd></div>
                      </dl>
                      <label className="text-sm font-semibold text-wxIndigo800">
                        Responsive or appearance variant
                        <select value={mappingVariant} onChange={(event) => setMappingVariant(event.target.value as FestivalPackResponsiveVariant)} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm">
                          {FESTIVAL_PACK_RESPONSIVE_VARIANTS.map((variant) => <option key={variant} value={variant}>{humaniseAdminStatus(variant)}</option>)}
                        </select>
                      </label>
                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {FESTIVAL_PACK_MAPPING_LOCATIONS.map((location) => {
                          const checked = draftMappings.some((mapping) => mapping.location === location);
                          const disabled = selectedFile.inspectionStatus === "rejected_unsafe" && !["ignore", "reference_only"].includes(location);
                          return (
                            <label key={location} className={`flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm ${checked ? "border-wxViolet700 bg-violet-50 text-wxIndigo900" : "border-wxBorder bg-wxSurfaceSoft text-wxIndigo600"} ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}>
                              <input type="checkbox" checked={checked} disabled={disabled || busy} onChange={() => toggleMapping(location)} className="h-4 w-4 accent-wxViolet700" />
                              {FESTIVAL_PACK_MAPPING_LABELS[location]}
                            </label>
                          );
                        })}
                      </div>
                      <button type="button" disabled={busy || ["approved", "active", "scheduled", "previous", "archived"].includes(selectedPack.state)} onClick={() => void saveMappings()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md wx-gradient-action px-5 text-sm font-semibold text-white disabled:opacity-45"><Save className="h-4 w-4" />Save Mapping</button>
                    </div>
                  ) : <AdminEmptyState title="Select a file" description="Choose a scanned asset to inspect its classification and mapping." />}
                </AdminPanel>
              </div>

              <AdminPanel title="Private responsive preview" description="Preview uses the real WriteX pages and one real functional login form. Nothing here activates the theme publicly.">
                <div className="flex flex-wrap gap-3">
                  <select value={previewRoute} onChange={(event) => setPreviewRoute(event.target.value)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm">
                    <option value="/">Homepage</option>
                    <option value="/client-login">Client Login</option>
                    <option value="/employee-login">Employee Login</option>
                  </select>
                  <div className="inline-flex rounded-md border border-wxBorder bg-wxSurface p-1">
                    {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([value, Icon]) => <button key={value} type="button" title={humaniseAdminStatus(value)} onClick={() => setPreviewWidth(value)} className={`grid h-9 w-10 place-items-center rounded ${previewWidth === value ? "bg-violet-100 text-wxViolet700" : "text-wxIndigo500"}`}><Icon className="h-4 w-4" /></button>)}
                  </div>
                  <select value={appearance} onChange={(event) => setAppearance(event.target.value as typeof appearance)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"><option value="auto">Auto</option><option value="light">Light</option><option value="dark">Dark</option></select>
                  <button type="button" disabled={busy} onClick={() => void startPreview()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxViolet700 bg-violet-50 px-4 text-sm font-semibold text-wxViolet700"><Eye className="h-4 w-4" />Open Private Preview</button>
                </div>
                <div className="mt-5 overflow-auto rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
                  <div className="mx-auto overflow-hidden rounded border border-wxBorder bg-white" style={{ width: previewDimensions.width, maxWidth: "100%", height: previewDimensions.height }}>
                    <iframe title="Festival pack private preview" src={`${previewRoute}?festivalPackPreview=${selectedPack.id}&appearance=${appearance}`} className="h-full w-full" />
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel title="Approval and activation" description="Approval validates the governed assets. Activation or scheduling is a separate deliberate action.">
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={busy || selectedPack.state !== "ready_for_review"} onClick={() => void action({ action: "approve" }, "Festival pack approved. It is still not public until activated or scheduled.")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 disabled:opacity-45"><PackageCheck className="h-4 w-4" />Approve Pack</button>
                  <button type="button" disabled={busy || !["approved", "previous", "scheduled"].includes(selectedPack.state)} onClick={() => void action({ action: "activate" }, "Festival pack activated through the governed theme runtime.")} className="inline-flex min-h-11 items-center gap-2 rounded-md wx-gradient-action px-5 text-sm font-semibold text-white disabled:opacity-45"><Check className="h-4 w-4" />Activate Now</button>
                  <button type="button" disabled={busy || !selectedPack.previousPackId} onClick={() => void action({ action: "restore_previous" }, "Previous approved pack restored.")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 disabled:opacity-45"><RotateCcw className="h-4 w-4" />Restore Previous Pack</button>
                  <button type="button" disabled={busy || ["active", "scheduled"].includes(selectedPack.state)} onClick={() => void action({ action: "archive" }, "Festival pack archived; history and private files are retained.")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-4 text-sm font-semibold text-wxIndigo700 disabled:opacity-45"><Archive className="h-4 w-4" />Archive</button>
                  <button type="button" disabled={busy} onClick={() => void action({ action: "restore_default" }, "Default WriteX experience restored.")} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800"><RefreshCcw className="h-4 w-4" />Restore Default</button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <label className="text-sm font-semibold text-wxIndigo800">Start<input type="datetime-local" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label>
                  <label className="text-sm font-semibold text-wxIndigo800">End<input type="datetime-local" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3" /></label>
                  <label className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-wxIndigo700"><input type="checkbox" checked={repeatYearly} onChange={(event) => setRepeatYearly(event.target.checked)} className="h-4 w-4 accent-wxViolet700" />Repeat yearly</label>
                  <button type="button" disabled={busy || !scheduleStart || !scheduleEnd || !["approved", "previous", "scheduled"].includes(selectedPack.state)} onClick={() => void action({ action: "schedule", startAt: new Date(scheduleStart).toISOString(), endAt: new Date(scheduleEnd).toISOString(), repeatYearly }, "Festival pack schedule saved.")} className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-wxViolet700 bg-violet-50 px-4 text-sm font-semibold text-wxViolet700 disabled:opacity-45"><ChevronRight className="h-4 w-4" />Schedule</button>
                </div>
              </AdminPanel>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
