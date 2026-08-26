"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  Accessibility,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CirclePause,
  CirclePlay,
  ClipboardCheck,
  Copy,
  Eye,
  FileAudio,
  FileImage,
  Flower2,
  Headphones,
  ImageUp,
  Layers3,
  LayoutDashboard,
  LayoutPanelTop,
  Menu,
  Monitor,
  MoreHorizontal,
  Palette,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  UserRound,
  Trash2,
  UploadCloud,
  Volume2,
  WandSparkles,
  X
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  AdminStatusBadge,
  humaniseAdminStatus,
  statusTone
} from "@/components/admin/AdminPrimitives";
import { HolidayHeaderRailEditor } from "@/components/admin/HolidayHeaderRailEditor";
import { LoginThemeComposer } from "@/components/admin/LoginThemeComposer";
import {
  FestivalPackStudio,
  type FestivalStudioSection
} from "@/components/admin/FestivalPackStudio";
import type {
  HolidayAssetRole,
  HolidayExperienceLevel,
  HolidayExperienceStudioConfig,
  HolidayExperienceSnapshot,
  HolidayLoginChannel,
  HolidayTheme,
  HolidayThemeAsset,
  HolidayThemeCategory
} from "@/lib/holiday/types";
import type {
  IntegrationHealthRecord,
  IntegrationHealthStatus
} from "@/lib/integrations/health";

type CommandCentreTab =
  | "overview"
  | "regions"
  | "motifs"
  | "header"
  | "hero"
  | "characters"
  | "motion"
  | "sound"
  | "login"
  | "accessibility"
  | "preview"
  | "schedule";

type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  action: () => Promise<void>;
};

type WizardDraft = {
  themeId: string | null;
  name: string;
  description: string;
  festivalType: Exclude<HolidayThemeCategory, "system_default">;
  experienceLevel: HolidayExperienceLevel;
  startAt: string;
  endAt: string;
  timezone: string;
  repeatYearly: boolean;
  priority: number;
  applyToHeader: boolean;
  applyToFooter: boolean;
  applyToHomepage: boolean;
  applyToClientLogin: boolean;
  applyToEmployeeLogin: boolean;
  applyToAdminLogin: boolean;
  applyMatchingWebsitePalette: boolean;
  applyAxoTheme: boolean;
  soundAvailable: boolean;
  soundEnabled: boolean;
  soundLoop: boolean;
  soundVolume: number;
  mobileSound: boolean;
};

type UploadProgress = {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "failed" | "cancelled";
  message: string | null;
};

const tabs: Array<{
  id: CommandCentreTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "regions", label: "Regions", icon: Layers3 },
  { id: "motifs", label: "Motifs & Symbols", icon: Flower2 },
  { id: "header", label: "Header Scene", icon: WandSparkles },
  { id: "hero", label: "Hero Scene", icon: LayoutPanelTop },
  { id: "characters", label: "Characters & Axo", icon: UserRound },
  { id: "motion", label: "Motion", icon: Sparkles },
  { id: "sound", label: "Sound", icon: Headphones },
  { id: "login", label: "Login Screens", icon: Monitor },
  { id: "accessibility", label: "Mobile & Accessibility", icon: Accessibility },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "schedule", label: "Schedule & Activation", icon: CalendarClock }
];

const categoryLabels: Record<
  Exclude<HolidayThemeCategory, "system_default">,
  string
> = {
  national_holiday: "National holiday",
  religious_festival: "Religious festival",
  cultural_festival: "Cultural festival",
  global_observance: "Global observance",
  company_event: "Company event",
  recruitment_campaign: "Recruitment campaign",
  business_season: "Business season",
  internal_milestone: "Internal milestone",
  custom_one_time_event: "Custom one-time event"
};

const experienceLabels: Record<HolidayExperienceLevel, string> = {
  accent_only: "Accent only",
  standard: "Standard",
  enhanced: "Enhanced"
};

const roleLabels: Record<HolidayAssetRole, string> = {
  reference_image: "Reference image",
  login_desktop: "Login desktop",
  login_mobile: "Login mobile",
  login_background: "Login background",
  hero_art: "Hero asset",
  decorative_overlay: "Decoration",
  particle_overlay: "Particle overlay",
  logo_overlay: "Logo overlay",
  axo: "Axo asset",
  axo_animation: "Axo animation",
  header: "Header decoration",
  homepage_background: "Homepage background",
  inner_page: "Inner-page accent",
  footer: "Footer accent",
  announcement: "Announcement banner",
  supporting: "Supporting asset",
  audio: "Audio",
  mobile_fallback: "Mobile fallback",
  reduced_motion: "Reduced-motion asset"
};

const roleGroups: Array<{
  title: string;
  roles: HolidayAssetRole[];
}> = [
  { title: "Reference Images", roles: ["reference_image"] },
  { title: "Header Decorations", roles: ["header"] },
  { title: "Hero Assets", roles: ["hero_art", "decorative_overlay", "particle_overlay"] },
  {
    title: "Login Screens",
    roles: ["login_desktop", "login_mobile", "login_background"]
  },
  { title: "Axo Assets", roles: ["axo", "axo_animation"] },
  { title: "Audio", roles: ["audio"] },
  {
    title: "Icons and Motifs",
    roles: ["logo_overlay", "supporting", "mobile_fallback", "reduced_motion"]
  }
];

const fieldClass =
  "min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none transition placeholder:text-wxMuted focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15";
const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-not-allowed disabled:opacity-45";
const buttonPrimary = `${buttonBase} wx-gradient-action border-transparent text-white`;
const buttonSecondary = `${buttonBase} border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700`;
const buttonDanger = `${buttonBase} border-red-200 bg-red-50 text-red-700 hover:border-red-400`;
const panelClass =
  "rounded-lg border border-wxBorder bg-wxSurface shadow-soft";

function formatDate(value: string | null, includeTime = true) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Kolkata"
  }).format(date);
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function categoryLabel(category: HolidayThemeCategory) {
  return category === "system_default"
    ? "System default"
    : categoryLabels[category];
}

function humanScope(theme: HolidayTheme) {
  if (theme.scope === "entire_public") return "All public pages";
  if (theme.scope === "homepage") return "Homepage";
  if (theme.scope === "header_only") return "Header only";
  if (theme.scope === "login_screens") return "Login screens";
  return `${theme.selectedRoutes.length} selected page${
    theme.selectedRoutes.length === 1 ? "" : "s"
  }`;
}

function themeReadiness(theme: HolidayTheme) {
  const approvedAssets = theme.assets.filter(
    (asset) => asset.reviewStatus === "approved" && asset.status === "active"
  );
  const required = [
    theme.applyToHeader
      ? approvedAssets.some((asset) => asset.role === "header")
      : true,
    theme.applyToLoginScreens
      ? approvedAssets.some((asset) =>
          ["login_desktop", "login_background"].includes(asset.role)
        )
      : true,
    theme.applyAxoTheme
      ? approvedAssets.some((asset) =>
          ["axo", "axo_animation"].includes(asset.role)
        )
      : true
  ];
  const readyCount = required.filter(Boolean).length;
  return Math.round((readyCount / required.length) * 100);
}

function themeStatus(theme: HolidayTheme) {
  if (
    theme.assetAvailability.includes("login_assets_missing") ||
    theme.assetAvailability.includes("website_assets_missing") ||
    theme.assetAvailability.includes("awaiting_approval")
  ) {
    return theme.status === "active" ? "active" : "incomplete";
  }
  if (theme.status === "draft" && themeReadiness(theme) === 100) return "ready";
  return theme.status;
}

function statusLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "incomplete") return "Incomplete";
  return humaniseAdminStatus(status);
}

function assetPreviewUrl(assetId: string) {
  return `/api/admin/website-experience/assets?assetId=${encodeURIComponent(
    assetId
  )}`;
}

function healthLabel(status: IntegrationHealthStatus) {
  if (status === "connected_healthy") return "Healthy";
  if (status === "not_configured") return "Awaiting Connection";
  if (status === "disabled_configuration") return "Disabled";
  if (status === "configured_unreachable") return "Action Required";
  return "Check Failed";
}

function healthTone(
  status: IntegrationHealthStatus
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "connected_healthy") return "success";
  if (status === "disabled_configuration") return "neutral";
  if (status === "not_configured") return "warning";
  return "danger";
}

function initialWizardDraft(theme?: HolidayTheme | null): WizardDraft {
  return {
    themeId: theme?.id || null,
    name: theme?.name || "",
    description: theme?.description || "",
    festivalType:
      theme && theme.festivalType !== "system_default"
        ? theme.festivalType
        : "custom_one_time_event",
    experienceLevel: theme?.experienceLevel || "standard",
    startAt: localDateTime(theme?.startAt || null),
    endAt: localDateTime(theme?.endAt || null),
    timezone: theme?.timezone || "Asia/Kolkata",
    repeatYearly: theme?.repeatYearly || false,
    priority: theme?.priority ?? 50,
    applyToHeader: theme?.applyToHeader ?? true,
    applyToFooter: theme?.applyToFooter ?? true,
    applyToHomepage: theme?.applyToHomepage ?? true,
    applyToClientLogin: theme?.applyToClientLogin ?? true,
    applyToEmployeeLogin: theme?.applyToEmployeeLogin ?? true,
    applyToAdminLogin: theme?.applyToAdminLogin ?? false,
    applyMatchingWebsitePalette: theme?.applyMatchingWebsitePalette ?? true,
    applyAxoTheme: theme?.applyAxoTheme ?? true,
    soundAvailable: theme?.experienceConfig.sound.available ?? false,
    soundEnabled: theme?.experienceConfig.sound.enabled ?? false,
    soundLoop: theme?.experienceConfig.sound.loop ?? true,
    soundVolume: theme?.experienceConfig.sound.volume ?? 0.35,
    mobileSound: theme?.experienceConfig.sound.mobileEnabled ?? false
  };
}

function buildThemeUpdate(
  theme: HolidayTheme,
  draft: WizardDraft,
  patch: Partial<HolidayTheme> = {}
) {
  const startAt = draft.startAt
    ? new Date(draft.startAt).toISOString()
    : theme.startAt;
  const endAt = draft.endAt
    ? new Date(draft.endAt).toISOString()
    : theme.endAt;
  const applyToLoginScreens =
    draft.applyToClientLogin ||
    draft.applyToEmployeeLogin ||
    draft.applyToAdminLogin;
  const sound = {
    ...theme.experienceConfig.sound,
    available: draft.soundAvailable,
    enabled: draft.soundAvailable && draft.soundEnabled,
    loop: draft.soundLoop,
    volume: draft.soundVolume,
    mobileEnabled: draft.mobileSound,
    startMode: "user_interaction" as const
  };
  const experienceConfig = {
    ...theme.experienceConfig,
    sound,
    ...(patch.experienceConfig || {})
  };
  return {
    action: "update",
    themeId: theme.id,
    name: draft.name,
    description: draft.description,
    festivalType: draft.festivalType,
    experienceLevel: draft.experienceLevel,
    status:
      patch.status ||
      (theme.status === "scheduled" ? "scheduled" : theme.status === "paused" ? "paused" : "draft"),
    mode: patch.mode || theme.mode,
    startAt: patch.startAt === null ? null : patch.startAt || startAt || null,
    endAt: patch.endAt === null ? null : patch.endAt || endAt || null,
    timezone: draft.timezone,
    repeatYearly: draft.repeatYearly,
    priority: draft.priority,
    isEnabled: patch.isEnabled ?? theme.isEnabled,
    scope: patch.scope || theme.scope,
    applyToHeader: draft.applyToHeader,
    applyToFooter: draft.applyToFooter,
    applyToHomepage: draft.applyToHomepage,
    applyToLoginScreens,
    applyToClientLogin: draft.applyToClientLogin,
    applyToEmployeeLogin: draft.applyToEmployeeLogin,
    applyToAdminLogin: draft.applyToAdminLogin,
    applyMatchingWebsitePalette: draft.applyMatchingWebsitePalette,
    applyAxoTheme: draft.applyAxoTheme,
    applyToSelectedRoutes: theme.applyToSelectedRoutes,
    selectedRoutes: theme.selectedRoutes,
    palette: patch.palette || theme.palette,
    paletteMatchMode: patch.paletteMatchMode || theme.paletteMatchMode,
    experienceConfig,
    announcementBarEnabled: theme.announcementBarEnabled,
    announcementBarText: theme.announcementBarText,
    announcementBarCtaLabel: theme.announcementBarCtaLabel,
    announcementBarCtaHref: theme.announcementBarCtaHref
  };
}

function Detail({
  label,
  value,
  emphasis = false
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm ${
          emphasis ? "font-semibold text-wxIndigo900" : "text-wxIndigo700"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-wxIndigo900">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-wxIndigo500">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-wxBorder transition peer-checked:bg-wxViolet700 peer-focus-visible:ring-2 peer-focus-visible:ring-wxViolet700/30" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-wxBorder bg-wxSurfaceSoft px-5 py-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxViolet700">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-wxIndigo900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-wxIndigo500">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
  wide = false
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#090c2a]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-lg border border-wxBorder bg-wxSurface shadow-2xl sm:rounded-lg ${
          wide ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-wxBorder px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-wxIndigo900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-5 text-wxIndigo500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700"
            aria-label={`Close ${title}`}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  state,
  busy,
  onClose
}: {
  state: ConfirmState;
  busy: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={state.title} description={state.description} onClose={onClose}>
      <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
        <button type="button" className={buttonSecondary} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={state.tone === "danger" ? buttonDanger : buttonPrimary}
          disabled={busy}
          onClick={async () => {
            await state.action();
            onClose();
          }}
        >
          {busy ? "Working..." : state.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function UploadDropzone({
  theme,
  defaultRole,
  onUploaded
}: {
  theme: HolidayTheme;
  defaultRole?: HolidayAssetRole;
  onUploaded: (snapshot: HolidayExperienceSnapshot) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [role, setRole] = useState<HolidayAssetRole>(
    defaultRole || "reference_image"
  );
  const [variant, setVariant] = useState("default");
  const [embeddedUiState, setEmbeddedUiState] = useState<
    "needs_review" | "contains_embedded_ui" | "no_embedded_ui"
  >("needs_review");
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadProgress | null>(null);

  const validateFile = (file: File) => {
    const audio = role === "audio";
    const allowed = audio
      ? ["audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"]
      : [
          "image/png",
          "image/jpeg",
          "image/avif",
          "image/webp",
          "image/svg+xml"
        ];
    const limit = audio ? 12 * 1024 * 1024 : 40 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      return audio
        ? "Use an MP3, OGG or WAV audio file."
        : "Use PNG, JPG, AVIF, WebP or a sanitised SVG image.";
    }
    if (file.size > limit) {
      return audio
        ? "Audio files must be 12 MB or smaller."
        : "Master images must be 40 MB or smaller.";
    }
    return null;
  };

  const uploadFile = (file: File) => {
    const validation = validateFile(file);
    const id = crypto.randomUUID();
    if (validation) {
      setUpload({
        id,
        fileName: file.name,
        progress: 0,
        status: "failed",
        message: validation
      });
      return;
    }
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    setUpload({
      id,
      fileName: file.name,
      progress: 0,
      status: "uploading",
      message: null
    });
    xhr.open("POST", "/api/admin/website-experience/assets");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setUpload((current) =>
        current
          ? {
              ...current,
              progress: Math.min(
                99,
                Math.round((event.loaded / event.total) * 100)
              )
            }
          : current
      );
    };
    xhr.onerror = () =>
      setUpload((current) =>
        current
          ? {
              ...current,
              status: "failed",
              message: "Upload failed before the server could respond."
            }
          : current
      );
    xhr.onabort = () =>
      setUpload((current) =>
        current
          ? {
              ...current,
              status: "cancelled",
              message: "Upload cancelled."
            }
          : current
      );
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          ok: boolean;
          data?: { snapshot?: HolidayExperienceSnapshot };
          error?: { message?: string };
        };
        if (xhr.status < 200 || xhr.status >= 300 || !body.ok || !body.data?.snapshot) {
          const reference = xhr.getResponseHeader("x-correlation-id");
          throw new Error(
            `${body.error?.message || "The asset could not be uploaded."}${
              reference ? ` Reference ID: ${reference}.` : ""
            }`
          );
        }
        onUploaded(body.data.snapshot);
        setUpload((current) =>
          current
            ? {
                ...current,
                progress: 100,
                status: "complete",
                message: "Stored privately and awaiting approval."
              }
            : current
        );
      } catch (error) {
        setUpload((current) =>
          current
            ? {
                ...current,
                status: "failed",
                message:
                  error instanceof Error
                    ? error.message
                    : "The upload failed safely."
              }
            : current
        );
      }
    };
    const body = new FormData();
    body.set("themeId", theme.id);
    body.set("role", role);
    body.set("variant", variant || "default");
    if (role.startsWith("login_")) {
      body.set("embeddedUiState", embeddedUiState);
    }
    body.set("file", file);
    xhr.send(body);
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.item(0);
    if (file) uploadFile(file);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-wxIndigo700">
          Asset type
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as HolidayAssetRole)}
            className={`${fieldClass} mt-1`}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-wxIndigo700">
          Variant
          <input
            value={variant}
            onChange={(event) =>
              setVariant(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-")
              )
            }
            className={`${fieldClass} mt-1`}
            placeholder="default"
          />
        </label>
      </div>
      {role.startsWith("login_") ? (
        <label className="block text-sm font-semibold text-wxIndigo700">
          Embedded login UI
          <select
            value={embeddedUiState}
            onChange={(event) =>
              setEmbeddedUiState(
                event.target.value as
                  | "needs_review"
                  | "contains_embedded_ui"
                  | "no_embedded_ui"
              )
            }
            className={`${fieldClass} mt-1`}
          >
            <option value="needs_review">Needs Review</option>
            <option value="contains_embedded_ui">
              Contains Embedded Login UI
            </option>
            <option value="no_embedded_ui">
              Does Not Contain Embedded Login UI
            </option>
          </select>
          <span className="mt-1 block text-xs font-normal leading-5 text-wxIndigo500">
            Artwork containing fields or buttons is restricted to the safe
            hero rail and cannot replace the functional form.
          </span>
        </label>
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-36 w-full flex-col items-center justify-center rounded-md border border-dashed px-5 py-6 text-center transition ${
          dragging
            ? "border-wxViolet700 bg-violet-50/70"
            : "border-wxBorder bg-wxSurfaceSoft hover:border-wxViolet700"
        }`}
      >
        <UploadCloud className="h-7 w-7 text-wxViolet700" />
        <span className="mt-3 text-sm font-semibold text-wxIndigo900">
          Drop one file here or choose from your device
        </span>
        <span className="mt-1 text-xs leading-5 text-wxIndigo500">
          Master artwork up to 40 MB and 8K. Responsive AVIF, WebP and JPEG
          delivery is generated automatically.
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={
          role === "audio"
            ? ".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
            : ".png,.jpg,.jpeg,.avif,.webp,.svg,image/png,image/jpeg,image/avif,image/webp,image/svg+xml"
        }
        onChange={(event) => handleFiles(event.target.files)}
      />
      {upload ? (
        <div
          className="rounded-md border border-wxBorder bg-wxSurface p-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-wxIndigo900">
              {upload.fileName}
            </span>
            <span className="shrink-0 text-xs text-wxIndigo500">
              {upload.status === "uploading"
                ? `${upload.progress}%`
                : humaniseAdminStatus(upload.status)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wxSurfaceSoft">
            <div
              className={`h-full rounded-full transition-all ${
                upload.status === "failed"
                  ? "bg-red-500"
                  : upload.status === "cancelled"
                    ? "bg-amber-500"
                    : "wx-gradient-action"
              }`}
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          {upload.message ? (
            <p
              className={`mt-2 text-xs ${
                upload.status === "failed" ? "text-red-700" : "text-wxIndigo500"
              }`}
            >
              {upload.message}
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            {upload.status === "uploading" ? (
              <button
                type="button"
                className="text-xs font-semibold text-red-700"
                onClick={() => xhrRef.current?.abort()}
              >
                Cancel upload
              </button>
            ) : null}
            {upload.status === "failed" ? (
              <button
                type="button"
                className="text-xs font-semibold text-wxViolet700"
                onClick={() => inputRef.current?.click()}
              >
                Choose another file
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AssetCard({
  asset,
  theme,
  busy,
  onReview,
  onRemove
}: {
  asset: HolidayThemeAsset;
  theme: HolidayTheme;
  busy: boolean;
  onReview: (
    assetId: string,
    decision:
      | "approved"
      | "approved_with_size_restrictions"
      | "ambiguous"
      | "needs_replacement"
      | "rejected"
  ) => void;
  onRemove: (asset: HolidayThemeAsset, theme: HolidayTheme) => void;
}) {
  const image = asset.mimeType.startsWith("image/");
  const audio = asset.role === "audio";
  return (
    <article className="overflow-hidden rounded-md border border-wxBorder bg-wxSurface">
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-wxSurfaceSoft">
        {image ? (
          <Image
            src={assetPreviewUrl(asset.id)}
            alt={`${roleLabels[asset.role]} preview`}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-contain"
            unoptimized
          />
        ) : audio ? (
          <div className="w-full px-4">
            <FileAudio className="mx-auto h-10 w-10 text-wxViolet700" />
            <audio
              className="mt-3 w-full"
              controls
              preload="metadata"
              src={assetPreviewUrl(asset.id)}
            />
          </div>
        ) : (
          <FileImage className="h-10 w-10 text-wxViolet700" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-wxIndigo900">
              {roleLabels[asset.role]}
            </h4>
            <p className="mt-1 truncate text-xs text-wxIndigo500">
              {asset.safeFileName}
            </p>
          </div>
          <AdminStatusBadge
            tone={
              ["approved", "approved_with_size_restrictions"].includes(
                asset.qualityStatus
              )
                ? "success"
                : ["rejected", "ambiguous", "needs_replacement"].includes(
                      asset.qualityStatus
                    )
                  ? "danger"
                  : "warning"
            }
          >
            {humaniseAdminStatus(asset.qualityStatus)}
          </AdminStatusBadge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-wxBorder pt-3">
          <Detail label="Event" value={theme.name} />
          <Detail
            label="Size"
            value={`${(asset.fileSize / 1024 / 1024).toFixed(2)} MB`}
          />
          <Detail label="Variant" value={asset.variant} />
          <Detail label="Version" value={`v${asset.versionNumber}`} />
          <Detail
            label="Object"
            value={asset.intendedObject || roleLabels[asset.role]}
          />
          <Detail
            label="Festival"
            value={asset.intendedFestival || theme.name}
          />
          <Detail
            label="Style"
            value={asset.visualStyle || "Founder uploaded"}
          />
          <Detail label="Uploaded" value={formatDate(asset.createdAt, false)} />
        </dl>
        {image ? (
          <details className="mt-4 rounded-md border border-wxBorder bg-wxSurfaceSoft">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-wxIndigo700">
              Quality previews: transparent, light, dark and mobile
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-wxBorder p-3 sm:grid-cols-4">
              {[
                ["Transparent", "bg-[linear-gradient(45deg,#e8e9f3_25%,transparent_25%),linear-gradient(-45deg,#e8e9f3_25%,transparent_25%)] bg-[length:12px_12px]"],
                ["Light", "bg-white"],
                ["Dark", "bg-[#090f2f]"],
                ["Mobile", "bg-wxSurface"]
              ].map(([label, background], index) => (
                <div key={label}>
                  <div
                    className={`relative flex h-24 items-center justify-center overflow-hidden rounded border border-wxBorder p-2 ${background}`}
                  >
                    <Image
                      src={assetPreviewUrl(asset.id)}
                      alt=""
                      width={index === 3 ? 48 : 96}
                      height={index === 3 ? 48 : 96}
                      unoptimized
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <p className="mt-1 text-center text-[10px] font-semibold text-wxIndigo500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {asset.status === "replaced" ? (
            <button
              type="button"
              className={buttonSecondary}
              disabled={busy}
              onClick={() => onReview(asset.id, "approved")}
            >
              <RotateCcw className="h-4 w-4" />
              Restore This Version
            </button>
          ) : asset.reviewStatus === "pending_review" ? (
            <>
              <button
                type="button"
                className={buttonPrimary}
                disabled={busy}
                onClick={() => onReview(asset.id, "approved")}
              >
                <Check className="h-4 w-4" />
                Approve Asset
              </button>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => onReview(asset.id, "ambiguous")}
              >
                Mark Ambiguous
              </button>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => onReview(asset.id, "needs_replacement")}
              >
                Request Replacement
              </button>
              <button
                type="button"
                className={buttonSecondary}
                disabled={busy}
                onClick={() => onReview(asset.id, "rejected")}
              >
                Reject Asset
              </button>
            </>
          ) : null}
          <a
            href={assetPreviewUrl(asset.id)}
            target="_blank"
            rel="noreferrer"
            className={buttonSecondary}
          >
            <Eye className="h-4 w-4" />
            Open
          </a>
          <button
            type="button"
            className={buttonDanger}
            disabled={busy}
            onClick={() => onRemove(asset, theme)}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function PreviewWorkspace({
  theme,
  onClose
}: {
  theme: HolidayTheme;
  onClose: () => void;
}) {
  const [page, setPage] = useState("/");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [motion, setMotion] = useState(true);
  return (
    <Modal
      title={`Private preview: ${theme.name}`}
      description="This preview is limited to the current authenticated Admin session."
      onClose={onClose}
      wide
    >
      <div className="flex flex-wrap items-end gap-3 border-b border-wxBorder bg-wxSurfaceSoft p-4">
        <label className="min-w-52 flex-1 text-sm font-semibold text-wxIndigo700">
          Preview page
          <select
            value={page}
            onChange={(event) => setPage(event.target.value)}
            className={`${fieldClass} mt-1`}
          >
            <option value="/">Homepage</option>
            <option value="/about-us">About Us</option>
            <option value="/trust-centre">Trust Centre</option>
            <option value="/client-login">Client Login</option>
            <option value="/employee-login">Employee Login</option>
            <option value="/admin/login">Admin Login</option>
          </select>
        </label>
        <div className="inline-flex rounded-md border border-wxBorder bg-wxSurface p-1">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`inline-flex h-9 w-10 items-center justify-center rounded ${
              device === "desktop"
                ? "bg-wxViolet700 text-white"
                : "text-wxIndigo600"
            }`}
            aria-label="Desktop preview"
            title="Desktop"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`inline-flex h-9 w-10 items-center justify-center rounded ${
              device === "mobile"
                ? "bg-wxViolet700 text-white"
                : "text-wxIndigo600"
            }`}
            aria-label="Mobile preview"
            title="Mobile"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700">
          <input
            type="checkbox"
            checked={motion}
            onChange={(event) => setMotion(event.target.checked)}
          />
          Motion
        </label>
        <a href={page} target="_blank" rel="noreferrer" className={buttonSecondary}>
          Open in new tab
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      <div
        className="min-h-[480px] bg-[#11142f] p-4 sm:p-6"
        data-reduced-motion={!motion || undefined}
      >
        <div
          className={`mx-auto h-[65vh] overflow-hidden rounded-md bg-white shadow-2xl transition-all ${
            device === "mobile" ? "max-w-[390px]" : "max-w-full"
          }`}
        >
          <iframe
            key={`${page}-${device}-${motion}`}
            title={`${theme.name} ${device} preview`}
            src={page}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </Modal>
  );
}

function ThemeWizard({
  initialTheme,
  snapshot,
  busy,
  onClose,
  onAction,
  onSnapshot
}: {
  initialTheme: HolidayTheme | null;
  snapshot: HolidayExperienceSnapshot;
  busy: boolean;
  onClose: () => void;
  onAction: (
    action: Record<string, unknown>,
    notice: string
  ) => Promise<HolidayExperienceSnapshot | null>;
  onSnapshot: (snapshot: HolidayExperienceSnapshot) => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(
    initialWizardDraft(initialTheme)
  );
  const [validation, setValidation] = useState<string | null>(null);
  const persistedTheme =
    snapshot.themes.find((theme) => theme.id === draft.themeId) ||
    initialTheme ||
    null;

  const update = <K extends keyof WizardDraft>(
    key: K,
    value: WizardDraft[K]
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const validateStep = () => {
    if (step === 1) {
      if (draft.name.trim().length < 2) return "Enter a clear theme name.";
      if (draft.description.trim().length > 500)
        return "Keep the description within 500 characters.";
      if (draft.startAt && draft.endAt && draft.endAt <= draft.startAt)
        return "The end date must be after the start date.";
    }
    if (step > 1 && !persistedTheme)
      return "Save Event Details before configuring this experience.";
    return null;
  };

  const saveCurrentStep = async (goNext: boolean) => {
    const error = validateStep();
    setValidation(error);
    if (error) return;
    let theme = persistedTheme;
    if (!theme) {
      const before = new Set(snapshot.themes.map((item) => item.id));
      const next = await onAction(
        {
          action: "create",
          name: draft.name.trim(),
          description: draft.description.trim(),
          festivalType: draft.festivalType,
          experienceLevel: draft.experienceLevel
        },
        `${draft.name.trim()} draft created.`
      );
      theme = next?.themes.find((item) => !before.has(item.id)) || null;
      if (!theme) {
        setValidation("The draft was saved, but it could not be reopened.");
        return;
      }
      setDraft((current) => ({ ...current, themeId: theme?.id || null }));
    }
    if (theme) {
      const next = await onAction(
        buildThemeUpdate(theme, { ...draft, themeId: theme.id }),
        `Step ${step} saved for ${draft.name.trim()}.`
      );
      if (!next) return;
    }
    if (goNext) setStep((current) => Math.min(4, current + 1));
  };

  const ready = persistedTheme ? themeReadiness(persistedTheme) : 0;
  const approved =
    persistedTheme?.experienceConfig.approvalStatus === "approved";
  const paletteBlocked = persistedTheme
    ? ["pending_review", "needs_review", "failed"].includes(
        persistedTheme.paletteDetectionStatus
      )
    : false;

  return (
    <Modal
      title={initialTheme ? `Edit ${initialTheme.name}` : "Create New Theme"}
      description="A guided, save-as-you-go workflow. Uploaded files remain private until approved."
      onClose={onClose}
      wide
    >
      <div className="border-b border-wxBorder bg-wxSurfaceSoft px-5 py-4">
        <ol className="grid grid-cols-4 gap-2" aria-label="Theme creation progress">
          {[
            "Event Details",
            "Visual Experience",
            "Login and Sound",
            "Preview and Publish"
          ].map((label, index) => {
            const number = index + 1;
            const active = number === step;
            const complete = number < step;
            return (
              <li key={label} className="min-w-0">
                <button
                  type="button"
                  disabled={!draft.themeId && number > 1}
                  onClick={() => setStep(number)}
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-xs font-semibold transition sm:px-3 ${
                    active
                      ? "border-wxViolet700 bg-violet-50 text-wxViolet700"
                      : complete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-wxBorder bg-wxSurface text-wxIndigo500"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      active
                        ? "bg-wxViolet700 text-white"
                        : complete
                          ? "bg-emerald-600 text-white"
                          : "bg-wxSurfaceSoft text-wxIndigo500"
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : number}
                  </span>
                  <span className="hidden truncate sm:block">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="p-5 sm:p-6">
        {validation ? (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {validation}
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-wxViolet700">
                Step 1 of 4
              </p>
              <h3 className="mt-1 text-xl font-semibold text-wxIndigo900">
                Event Details
              </h3>
              <p className="mt-1 text-sm text-wxIndigo500">
                Define what the experience is and when it should be eligible.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-wxIndigo700">
                Theme name <span className="text-red-600">Required</span>
                <input
                  value={draft.name}
                  onChange={(event) => update("name", event.target.value)}
                  className={`${fieldClass} mt-1`}
                  maxLength={100}
                  placeholder="Durga Puja 2026"
                />
              </label>
              <label className="text-sm font-semibold text-wxIndigo700">
                Category <span className="text-red-600">Required</span>
                <select
                  value={draft.festivalType}
                  onChange={(event) =>
                    update(
                      "festivalType",
                      event.target.value as WizardDraft["festivalType"]
                    )
                  }
                  className={`${fieldClass} mt-1`}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-wxIndigo700 md:col-span-2">
                Purpose and notes <span className="text-wxMuted">Optional</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => update("description", event.target.value)}
                  className={`${fieldClass} mt-1 min-h-24 py-3`}
                  maxLength={500}
                  placeholder="A short internal description for this experience."
                />
              </label>
              <label className="text-sm font-semibold text-wxIndigo700">
                Starts <span className="text-wxMuted">Optional for draft</span>
                <input
                  type="datetime-local"
                  value={draft.startAt}
                  onChange={(event) => update("startAt", event.target.value)}
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-semibold text-wxIndigo700">
                Ends <span className="text-wxMuted">Optional for draft</span>
                <input
                  type="datetime-local"
                  value={draft.endAt}
                  onChange={(event) => update("endAt", event.target.value)}
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-semibold text-wxIndigo700">
                Timezone
                <select
                  value={draft.timezone}
                  onChange={(event) => update("timezone", event.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="Asia/Kolkata">India Standard Time</option>
                  <option value="UTC">UTC</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-wxIndigo700">
                Priority
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={draft.priority}
                  onChange={(event) =>
                    update("priority", Number(event.target.value))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
            </div>
            <div className="mt-4">
              <Toggle
                checked={draft.repeatYearly}
                onChange={(checked) => update("repeatYearly", checked)}
                label="Repeat yearly"
                description="Reuse this schedule each year. Dates can still be reviewed before activation."
              />
            </div>
          </div>
        ) : null}

        {step === 2 && persistedTheme ? (
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-wxViolet700">
                Step 2 of 4
              </p>
              <h3 className="mt-1 text-xl font-semibold text-wxIndigo900">
                Visual Experience
              </h3>
              <p className="mt-1 text-sm text-wxIndigo500">
                Choose scope and intensity, then upload the visual pack.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-wxIndigo700">
                  Theme level
                  <select
                    value={draft.experienceLevel}
                    onChange={(event) =>
                      update(
                        "experienceLevel",
                        event.target.value as HolidayExperienceLevel
                      )
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    {Object.entries(experienceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Toggle
                  checked={draft.applyToHeader}
                  onChange={(checked) => update("applyToHeader", checked)}
                  label="Header decorations"
                />
                <Toggle
                  checked={draft.applyToHomepage}
                  onChange={(checked) => update("applyToHomepage", checked)}
                  label="Homepage treatment"
                />
                <Toggle
                  checked={draft.applyToFooter}
                  onChange={(checked) => update("applyToFooter", checked)}
                  label="Footer accents"
                />
                <Toggle
                  checked={draft.applyAxoTheme}
                  onChange={(checked) => update("applyAxoTheme", checked)}
                  label="Axo styling"
                />
                <Toggle
                  checked={draft.applyMatchingWebsitePalette}
                  onChange={(checked) =>
                    update("applyMatchingWebsitePalette", checked)
                  }
                  label="Website-wide matching accents"
                  description="Use the approved festival palette while preserving WriteX contrast rules."
                />
              </div>
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <h4 className="font-semibold text-wxIndigo900">
                  Upload visual assets
                </h4>
                <p className="mt-1 text-sm text-wxIndigo500">
                  Files are assigned to {persistedTheme.name} and remain private
                  until approved.
                </p>
                <div className="mt-4">
                  <UploadDropzone
                    theme={persistedTheme}
                    onUploaded={onSnapshot}
                  />
                </div>
              </div>
            </div>
            {paletteBlocked ? (
              <div className="mt-5 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Detected palette needs approval
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Review the palette in Header & Preview before activation.
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => {
                    void onAction(
                      {
                        action: "accept_detected_palette",
                        themeId: persistedTheme.id,
                        paletteMatchMode: persistedTheme.paletteMatchMode
                      },
                      `${persistedTheme.name} palette approved.`
                    );
                  }}
                >
                  <Palette className="h-4 w-4" />
                  Approve detected palette
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 && persistedTheme ? (
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-wxViolet700">
                Step 3 of 4
              </p>
              <h3 className="mt-1 text-xl font-semibold text-wxIndigo900">
                Login and Sound
              </h3>
              <p className="mt-1 text-sm text-wxIndigo500">
                Login screens stay silent by default; visitors must start audio.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-wxIndigo900">Login screens</h4>
                <Toggle
                  checked={draft.applyToClientLogin}
                  onChange={(checked) => update("applyToClientLogin", checked)}
                  label="Client Login"
                />
                <Toggle
                  checked={draft.applyToEmployeeLogin}
                  onChange={(checked) =>
                    update("applyToEmployeeLogin", checked)
                  }
                  label="Employee Login"
                />
                <Toggle
                  checked={draft.applyToAdminLogin}
                  onChange={(checked) => update("applyToAdminLogin", checked)}
                  label="Admin Login"
                  description="Off by default for operational safety."
                />
                <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                  <h4 className="font-semibold text-wxIndigo900">
                    Login artwork
                  </h4>
                  <div className="mt-3">
                    <UploadDropzone
                      theme={persistedTheme}
                      defaultRole="login_desktop"
                      onUploaded={onSnapshot}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-wxIndigo900">
                  Festive ambience
                </h4>
                <Toggle
                  checked={draft.soundAvailable}
                  onChange={(checked) => update("soundAvailable", checked)}
                  label="Sound available"
                  description="Makes the user-started ambience control available."
                />
                <Toggle
                  checked={draft.soundEnabled}
                  onChange={(checked) => update("soundEnabled", checked)}
                  label="Enable sound control"
                  description="Audio never starts automatically."
                />
                <Toggle
                  checked={draft.soundLoop}
                  onChange={(checked) => update("soundLoop", checked)}
                  label="Loop ambience"
                />
                <Toggle
                  checked={draft.mobileSound}
                  onChange={(checked) => update("mobileSound", checked)}
                  label="Allow sound on mobile"
                />
                <label className="block rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-sm font-semibold text-wxIndigo900">
                  Default volume: {Math.round(draft.soundVolume * 100)}%
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={draft.soundVolume}
                    onChange={(event) =>
                      update("soundVolume", Number(event.target.value))
                    }
                    className="mt-3 w-full accent-[var(--wx-violet)]"
                  />
                </label>
                <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                  <h4 className="font-semibold text-wxIndigo900">Audio file</h4>
                  <div className="mt-3">
                    <UploadDropzone
                      theme={persistedTheme}
                      defaultRole="audio"
                      onUploaded={onSnapshot}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 && persistedTheme ? (
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-wxViolet700">
                Step 4 of 4
              </p>
              <h3 className="mt-1 text-xl font-semibold text-wxIndigo900">
                Preview and Publish
              </h3>
              <p className="mt-1 text-sm text-wxIndigo500">
                Review the complete experience before scheduling or activating it.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                  Asset completeness
                </p>
                <p className="mt-2 text-2xl font-semibold text-wxIndigo900">
                  {ready}%
                </p>
              </div>
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                  Accessibility
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  Safe defaults enabled
                </p>
              </div>
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                  Palette
                </p>
                <p className="mt-2 text-sm font-semibold text-wxIndigo900">
                  {paletteBlocked ? "Approval required" : "Ready"}
                </p>
              </div>
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                  Approval
                </p>
                <p className="mt-2 text-sm font-semibold text-wxIndigo900">
                  {humaniseAdminStatus(
                    persistedTheme.experienceConfig.approvalStatus
                  )}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 rounded-md border border-wxBorder bg-wxSurface p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Event" value={draft.name} emphasis />
              <Detail label="Category" value={categoryLabels[draft.festivalType]} />
              <Detail
                label="Schedule"
                value={
                  draft.startAt && draft.endAt
                    ? `${formatDate(new Date(draft.startAt).toISOString())} to ${formatDate(
                        new Date(draft.endAt).toISOString()
                      )}`
                    : "Manual activation"
                }
              />
              <Detail
                label="Experience"
                value={experienceLabels[draft.experienceLevel]}
              />
              <Detail
                label="Client Login"
                value={draft.applyToClientLogin ? "Included" : "Default"}
              />
              <Detail
                label="Employee Login"
                value={draft.applyToEmployeeLogin ? "Included" : "Default"}
              />
              <Detail
                label="Sound"
                value={
                  draft.soundAvailable
                    ? `Available at ${Math.round(draft.soundVolume * 100)}%`
                    : "Not included"
                }
              />
              <Detail
                label="Website accents"
                value={draft.applyMatchingWebsitePalette ? "Matched" : "Default"}
              />
            </dl>
            <div className="mt-5 rounded-md border border-violet-200 bg-violet-50/70 p-4">
              <p className="text-sm font-semibold text-wxIndigo900">
                Final safety gate
              </p>
              <p className="mt-1 text-sm leading-6 text-wxIndigo500">
                Preview is private. Activation remains blocked until the pack and
                any detected palette are approved.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!approved ? (
                  <button
                    type="button"
                    className={buttonSecondary}
                    onClick={() => {
                      void onAction(
                        buildThemeUpdate(
                          persistedTheme,
                          draft,
                          {
                            experienceConfig: {
                              ...persistedTheme.experienceConfig,
                              approvalStatus: "approved"
                            }
                          }
                        ),
                        `${persistedTheme.name} experience pack approved.`
                      );
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Approve experience pack
                  </button>
                ) : null}
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => {
                    void onAction(
                      { action: "preview", themeId: persistedTheme.id },
                      `Private preview enabled for ${persistedTheme.name}.`
                    );
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Enable private preview
                </button>
                {draft.startAt && draft.endAt ? (
                  <button
                    type="button"
                    className={buttonPrimary}
                    disabled={!approved || paletteBlocked}
                    onClick={async () => {
                      const result = await onAction(
                        buildThemeUpdate(persistedTheme, draft, {
                          status: "scheduled",
                          mode: "automatic",
                          startAt: new Date(draft.startAt).toISOString(),
                          endAt: new Date(draft.endAt).toISOString()
                        }),
                        `${persistedTheme.name} scheduled.`
                      );
                      if (result) onClose();
                    }}
                  >
                    <CalendarClock className="h-4 w-4" />
                    Schedule
                  </button>
                ) : (
                  <button
                    type="button"
                    className={buttonPrimary}
                    disabled={!approved || paletteBlocked}
                    onClick={async () => {
                      const result = await onAction(
                        { action: "activate", themeId: persistedTheme.id },
                        `${persistedTheme.name} activated.`
                      );
                      if (result) onClose();
                    }}
                  >
                    <CirclePlay className="h-4 w-4" />
                    Activate
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-wxBorder bg-wxSurfaceSoft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className={buttonSecondary}
          disabled={step === 1}
          onClick={() => setStep((current) => Math.max(1, current - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={buttonSecondary}
            disabled={busy}
            onClick={() => void saveCurrentStep(false)}
          >
            {busy ? "Saving..." : "Save draft"}
          </button>
          {step < 4 ? (
            <button
              type="button"
              className={buttonPrimary}
              disabled={busy}
              onClick={() => void saveCurrentStep(true)}
            >
              Save and continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" className={buttonSecondary} onClick={onClose}>
              Close review
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function HolidayThemeCommandCentre({
  initialSnapshot,
  initialPreviewThemeId,
  initialHealth,
  initialTab = "overview"
}: {
  initialSnapshot: HolidayExperienceSnapshot;
  initialPreviewThemeId: string | null;
  initialHealth: IntegrationHealthRecord[];
  initialTab?: CommandCentreTab;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [previewThemeId, setPreviewThemeId] = useState(initialPreviewThemeId);
  const [activeTab, setActiveTab] = useState<CommandCentreTab>(initialTab);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [wizardTheme, setWizardTheme] = useState<HolidayTheme | null | "new">(
    null
  );
  const [uploadThemeId, setUploadThemeId] = useState(
    initialSnapshot.themes.find(
      (theme) => theme.slug !== "default" && theme.status !== "archived"
    )?.id || ""
  );
  const [previewTheme, setPreviewTheme] = useState<HolidayTheme | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [libraryMenu, setLibraryMenu] = useState<string | null>(null);
  const [loginTheme, setLoginTheme] = useState(
    initialSnapshot.activeTheme?.id ||
      initialSnapshot.themes.find(
        (theme) => theme.slug !== "default" && theme.status !== "archived"
      )?.id ||
      ""
  );
  const [soundThemeId, setSoundThemeId] = useState(
    initialSnapshot.activeTheme?.id ||
      initialSnapshot.themes.find(
        (theme) => theme.slug !== "default" && theme.status !== "archived"
      )?.id ||
      ""
  );

  const editableThemes = useMemo(
    () =>
      snapshot.themes.filter(
        (theme) => theme.slug !== "default" && theme.status !== "archived"
      ),
    [snapshot.themes]
  );
  const soundTheme =
    snapshot.themes.find((theme) => theme.id === soundThemeId) || null;
  const uploadTheme =
    snapshot.themes.find((theme) => theme.id === uploadThemeId) || null;
  const studioTheme =
    (activeTab === "motifs" ? uploadTheme : soundTheme) ||
    editableThemes[0] ||
    null;
  const active = snapshot.activeTheme;
  const upcoming = snapshot.nextScheduledTheme;
  const activeStudioSection = (
    [
      "regions",
      "hero",
      "characters",
      "motion",
      "accessibility",
      "preview"
    ] as CommandCentreTab[]
  ).includes(activeTab)
    ? (activeTab as FestivalStudioSection)
    : null;

  const saveStudio = async (studio: HolidayExperienceStudioConfig) => {
    if (!studioTheme || studioTheme.status === "active") {
      setError(
        studioTheme?.status === "active"
          ? "Pause the active theme before editing its Festival Studio."
          : "Choose a theme before editing the Festival Studio."
      );
      return false;
    }
    const result = await performAction(
      buildThemeUpdate(studioTheme, initialWizardDraft(studioTheme), {
        status: studioTheme.status,
        mode: studioTheme.mode,
        experienceConfig: {
          ...studioTheme.experienceConfig,
          studio
        }
      }),
      `${studioTheme.name} Festival Studio saved and audited.`
    );
    return Boolean(result);
  };

  const performAction = async (
    action: Record<string, unknown>,
    successNotice: string
  ): Promise<HolidayExperienceSnapshot | null> => {
    setBusy(String(action.action || "action"));
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/website-experience", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action)
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: HolidayExperienceSnapshot & {
          previewThemeName?: string;
          previewCleared?: boolean;
        };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok) {
        const reference = response.headers.get("x-correlation-id");
        throw new Error(
          `${body.error?.message || "The action could not be completed."}${
            reference ? ` Reference ID: ${reference}.` : ""
          }`
        );
      }
      if (action.action === "preview") {
        setPreviewThemeId(String(action.themeId || ""));
        setNotice(successNotice);
        return snapshot;
      }
      if (action.action === "clear_preview") {
        setPreviewThemeId(null);
        setNotice(successNotice);
        return snapshot;
      }
      if (body.data?.settings) {
        setSnapshot(body.data);
        setNotice(successNotice);
        return body.data;
      }
      setNotice(successNotice);
      return snapshot;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The action failed safely."
      );
      return null;
    } finally {
      setBusy(null);
    }
  };

  const reviewAsset = async (
    assetId: string,
    decision:
      | "approved"
      | "approved_with_size_restrictions"
      | "ambiguous"
      | "needs_replacement"
      | "rejected"
  ) => {
    const approving =
      decision === "approved" ||
      decision === "approved_with_size_restrictions";
    if (
      approving &&
      !window.confirm(
        "I confirm that this asset clearly represents the intended object and does not resemble an unrelated shape."
      )
    ) {
      return;
    }
    setBusy(`asset-${assetId}`);
    setError(null);
    try {
      const response = await fetch("/api/admin/website-experience/assets", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId,
          decision,
          reason:
            decision === "rejected"
              ? "Rejected during Super Admin asset review."
              : decision === "ambiguous"
                ? "The intended object is not immediately recognisable."
                : decision === "needs_replacement"
                  ? "A professionally illustrated replacement is required."
                  : null,
          clarityConfirmed: approving
        })
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { snapshot?: HolidayExperienceSnapshot };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok || !body.data?.snapshot) {
        throw new Error(
          body.error?.message || "The asset review could not be saved."
        );
      }
      setSnapshot(body.data.snapshot);
      setNotice(
        approving
          ? "Asset approved and available to its assigned theme."
          : decision === "rejected"
            ? "Asset rejected and archived safely."
            : decision === "ambiguous"
              ? "Asset marked ambiguous and blocked from activation."
              : "Replacement requested; the asset remains blocked."
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The asset review failed safely."
      );
    } finally {
      setBusy(null);
    }
  };

  const removeAsset = async (asset: HolidayThemeAsset, theme: HolidayTheme) => {
    setConfirm({
      title: `Remove ${roleLabels[asset.role]}?`,
      description: `This removes the private asset from ${theme.name}. The theme remains available and will fall back safely.`,
      confirmLabel: "Remove asset",
      tone: "danger",
      action: async () => {
        setBusy(`asset-${asset.id}`);
        setError(null);
        try {
          const response = await fetch(
            "/api/admin/website-experience/assets",
            {
              method: "DELETE",
              credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ assetId: asset.id })
            }
          );
          const body = (await response.json()) as {
            ok: boolean;
            data?: { snapshot?: HolidayExperienceSnapshot };
            error?: { message?: string };
          };
          if (!response.ok || !body.ok || !body.data?.snapshot) {
            throw new Error(
              body.error?.message || "The asset could not be removed."
            );
          }
          setSnapshot(body.data.snapshot);
          setNotice("Private asset removed. Safe fallback remains active.");
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "The removal failed safely."
          );
        } finally {
          setBusy(null);
        }
      }
    });
  };

  const enablePreview = async (theme: HolidayTheme, openWorkspace = true) => {
    const result = await performAction(
      { action: "preview", themeId: theme.id },
      `Private preview enabled for ${theme.name}.`
    );
    if (result && openWorkspace) setPreviewTheme(theme);
  };

  const filteredThemes = snapshot.themes.filter((theme) => {
    if (theme.slug === "default") return false;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      theme.name.toLowerCase().includes(term) ||
      categoryLabel(theme.festivalType).toLowerCase().includes(term);
    const status = themeStatus(theme);
    const matchesStatus =
      statusFilter === "all" ||
      status === statusFilter ||
      theme.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allAssets = snapshot.themes.flatMap((theme) =>
    theme.assets.map((asset) => ({ asset, theme }))
  );
  const healthByKey = new Map(initialHealth.map((item) => [item.key, item]));
  const databaseHealth = healthByKey.get("database");
  const websiteHealth = healthByKey.get("website");
  const schedulerHealth: IntegrationHealthRecord = {
    key: "website",
    name: "Scheduler",
    status: !snapshot.settings.autoScheduleEnabled
      ? "disabled_configuration"
      : databaseHealth?.status === "connected_healthy"
        ? "connected_healthy"
        : databaseHealth?.status || "status_check_failed",
    detail: !snapshot.settings.autoScheduleEnabled
      ? "Automatic scheduling is disabled."
      : "Automatic scheduling is enabled and uses the application database.",
    checkedAt: new Date().toISOString(),
    href: "/admin/website-experience"
  };
  const previewHealth: IntegrationHealthRecord = {
    key: "website",
    name: "Preview service",
    status: websiteHealth?.status || "status_check_failed",
    detail: previewThemeId
      ? "A private Admin preview is currently active."
      : "Private Admin-session preview is ready.",
    checkedAt: new Date().toISOString(),
    href: "/admin/website-experience"
  };
  const healthRows = [
    healthByKey.get("holiday_storage"),
    healthByKey.get("holiday_audio_upload"),
    healthByKey.get("holiday_audio_playback"),
    healthByKey.get("s3"),
    healthByKey.get("ses"),
    schedulerHealth,
    previewHealth
  ].filter(Boolean) as IntegrationHealthRecord[];

  const nextAction = (() => {
    if (snapshot.settings.emergencyDisabled) {
      return {
        title: "Restore the default experience",
        detail:
          "Holiday effects are emergency-disabled. Review the cause before re-enabling.",
        tab: "overview" as const
      };
    }
    const pendingAssets = allAssets.filter(
      ({ asset }) => asset.reviewStatus === "pending_review"
    ).length;
    if (pendingAssets > 0) {
      return {
        title: `Review ${pendingAssets} uploaded asset${
          pendingAssets === 1 ? "" : "s"
        }`,
        detail:
          "Approval is required before these files can appear in a live experience.",
        tab: "motifs" as const
      };
    }
    const incomplete = snapshot.themes.find(
      (theme) =>
        theme.slug !== "default" &&
        theme.status !== "archived" &&
        themeStatus(theme) === "incomplete"
    );
    if (incomplete) {
      return {
        title: `Complete ${incomplete.name}`,
        detail:
          "The draft needs visual or login assets before it can be safely activated.",
        tab: "schedule" as const
      };
    }
    if (!active && upcoming) {
      return {
        title: `Preview ${upcoming.name}`,
        detail: "The next scheduled experience is ready for a final visual check.",
        tab: "schedule" as const
      };
    }
    if (!active) {
      return {
        title: "Create or schedule an experience",
        detail: "The default WriteX presentation is active.",
        tab: "schedule" as const
      };
    }
    return {
      title: `Monitor ${active.name}`,
      detail: "The active experience is healthy. Review its end date and sound state.",
      tab: "overview" as const
    };
  })();

  return (
    <div className="space-y-5">
      <div className="sticky top-[72px] z-30 -mx-3 overflow-x-auto border-y border-wxBorder bg-wxSurface/95 px-3 py-2 backdrop-blur md:static md:mx-0 md:rounded-lg md:border">
        <nav className="flex min-w-max gap-1" aria-label="Holiday theme management">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 ${
                  selected
                    ? "bg-wxViolet700 text-white"
                    : "text-wxIndigo600 hover:bg-wxSurfaceSoft"
                }`}
                aria-current={selected ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {notice ? (
        <div
          className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {error ? (
        <div
          className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {previewThemeId ? (
        <div className="flex flex-col gap-3 rounded-md border border-violet-200 bg-violet-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-wxIndigo900">
            Private preview is active for this Admin session.
          </p>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() =>
              void performAction(
                { action: "clear_preview" },
                "Private preview ended."
              )
            }
          >
            End preview
          </button>
        </div>
      ) : null}

      {activeStudioSection ? (
        <div className="space-y-5">
          <section className={`${panelClass} p-4`}>
            <label className="block max-w-sm text-sm font-semibold text-wxIndigo700">
              Festival experience pack
              <select
                value={soundThemeId}
                onChange={(event) => setSoundThemeId(event.target.value)}
                className={`${fieldClass} mt-1`}
              >
                <option value="">Choose a theme</option>
                {editableThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
          {studioTheme ? (
            <FestivalPackStudio
              key={`${studioTheme.id}:${studioTheme.updatedAt}:${activeStudioSection}`}
              theme={studioTheme}
              section={activeStudioSection}
              busy={Boolean(busy) || studioTheme.status === "active"}
              onSave={saveStudio}
              onOpenPrivatePreview={() =>
                void enablePreview(studioTheme)
              }
            />
          ) : (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="Choose a festival pack"
              description="Select a draft or paused theme before editing its Festival Studio."
            />
          )}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <section className="rounded-lg border border-violet-200 bg-[linear-gradient(115deg,rgba(79,30,220,.08),rgba(232,56,116,.05),rgba(255,255,255,.85))] p-5 shadow-soft md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Next recommended action
                </p>
                <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
                  {nextAction.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-wxIndigo500">
                  {nextAction.detail}
                </p>
              </div>
              <button
                type="button"
                className={buttonPrimary}
                onClick={() => setActiveTab(nextAction.tab)}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
            <section className={`${panelClass} overflow-hidden`}>
              <div className="flex flex-col gap-4 border-b border-wxBorder p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                      Active Experience
                    </p>
                    <AdminStatusBadge
                      tone={
                        active && snapshot.settings.holidayModeEnabled
                          ? "success"
                          : "neutral"
                      }
                    >
                      {active && snapshot.settings.holidayModeEnabled
                        ? "Live"
                        : "Default WriteX"}
                    </AdminStatusBadge>
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-wxIndigo900">
                    {active?.name || "Default WriteX Experience"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-wxIndigo500">
                    {active?.description ||
                      "No festival treatment is currently visible to public visitors."}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-wxViolet700 text-white">
                  {active ? (
                    <Sparkles className="h-6 w-6" />
                  ) : (
                    <RotateCcw className="h-6 w-6" />
                  )}
                </div>
              </div>
              <dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 md:p-6">
                <Detail label="Starts" value={formatDate(active?.startAt || null)} />
                <Detail label="Ends" value={formatDate(active?.endAt || null)} />
                <Detail
                  label="Website palette"
                  value={
                    active?.applyMatchingWebsitePalette ? "Active" : "Default"
                  }
                />
                <Detail
                  label="Client Login"
                  value={
                    snapshot.loginControls.find(
                      (item) => item.channel === "client"
                    )?.state
                      ? humaniseAdminStatus(
                          snapshot.loginControls.find(
                            (item) => item.channel === "client"
                          )?.state || "default_active"
                        )
                      : "Default"
                  }
                />
                <Detail
                  label="Employee Login"
                  value={humaniseAdminStatus(
                    snapshot.loginControls.find(
                      (item) => item.channel === "employee"
                    )?.state || "default_active"
                  )}
                />
                <Detail
                  label="Header decorations"
                  value={active?.applyToHeader ? "Active" : "Off"}
                />
                <Detail
                  label="Axo"
                  value={active?.applyAxoTheme ? "Festive" : "Default"}
                />
                <Detail
                  label="Sound"
                  value={
                    active?.experienceConfig.sound.enabled
                      ? "Available by user action"
                      : "Off"
                  }
                />
                <Detail
                  label="Last changed"
                  value={`${snapshot.settings.lastSwitchedBy || "System"} · ${formatDate(
                    snapshot.settings.lastSwitchedAt
                  )}`}
                />
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-wxBorder bg-wxSurfaceSoft p-4">
                {active ? (
                  <>
                    <button
                      type="button"
                      className={buttonPrimary}
                      onClick={() => void enablePreview(active)}
                    >
                      <Eye className="h-4 w-4" />
                      Preview Active Theme
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={() =>
                        setConfirm({
                          title: `Pause ${active.name}?`,
                          description:
                            "Visitors will return to the safe default experience. The theme can be resumed later.",
                          confirmLabel: "Pause theme",
                          tone: "primary",
                          action: async () => {
                            await performAction(
                              { action: "pause", themeId: active.id },
                              `${active.name} paused.`
                            );
                          }
                        })
                      }
                    >
                      <CirclePause className="h-4 w-4" />
                      Pause Theme
                    </button>
                    <button
                      type="button"
                      className={buttonDanger}
                      onClick={() =>
                        setConfirm({
                          title: `End ${active.name}?`,
                          description:
                            "This ends the current experience and restores the default website presentation.",
                          confirmLabel: "End theme",
                          tone: "danger",
                          action: async () => {
                            await performAction(
                              { action: "end_early", themeId: active.id },
                              `${active.name} ended.`
                            );
                          }
                        })
                      }
                    >
                      End Theme
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() =>
                    setConfirm({
                      title: "Restore the default WriteX experience?",
                      description:
                        "Holiday styling, manual overrides and the active theme will be cleared safely.",
                      confirmLabel: "Restore default",
                      tone: "primary",
                      action: async () => {
                        await performAction(
                          { action: "restore_default" },
                          "Default WriteX experience restored."
                        );
                      }
                    })
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore Default
                </button>
              </div>
            </section>

            <section className={`${panelClass} overflow-hidden`}>
              <div className="border-b border-wxBorder p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Upcoming Theme
                </p>
                <h2 className="mt-2 text-lg font-semibold text-wxIndigo900">
                  {upcoming?.name || "Nothing scheduled"}
                </h2>
              </div>
              {upcoming ? (
                <>
                  <dl className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1">
                    <Detail
                      label="Activation"
                      value={formatDate(upcoming.startAt)}
                    />
                    <Detail label="Scope" value={humanScope(upcoming)} />
                    <Detail
                      label="Asset completeness"
                      value={`${themeReadiness(upcoming)}%`}
                    />
                    <Detail
                      label="Sound"
                      value={
                        upcoming.experienceConfig.sound.available
                          ? "Available"
                          : "Not included"
                      }
                    />
                    <Detail
                      label="Approval"
                      value={humaniseAdminStatus(
                        upcoming.experienceConfig.approvalStatus
                      )}
                    />
                  </dl>
                  <div className="flex flex-wrap gap-2 border-t border-wxBorder bg-wxSurfaceSoft p-4">
                    <button
                      type="button"
                      className={buttonPrimary}
                      onClick={() => void enablePreview(upcoming)}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={() => setWizardTheme(upcoming)}
                    >
                      Edit Schedule
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={() =>
                        void performAction(
                          { action: "pause", themeId: upcoming.id },
                          `${upcoming.name} schedule paused.`
                        )
                      }
                    >
                      Pause Schedule
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <EmptyState
                    icon={<CalendarClock className="h-5 w-5" />}
                    title="No upcoming experience"
                    description="Create a draft or schedule an approved theme when you are ready."
                    action={
                      <button
                        type="button"
                        className={buttonPrimary}
                        onClick={() => setWizardTheme("new")}
                      >
                        <Plus className="h-4 w-4" />
                        Create Theme
                      </button>
                    }
                  />
                </div>
              )}
            </section>
          </div>

          <section className={`${panelClass} p-5 md:p-6`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  System Health
                </p>
                <h2 className="mt-2 text-lg font-semibold text-wxIndigo900">
                  Festival experience services
                </h2>
                <p className="mt-1 text-sm text-wxIndigo500">
                  Operational status without exposing infrastructure credentials.
                </p>
              </div>
              <a href="/admin/system-health" className={buttonSecondary}>
                Full system health
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {healthRows.map((record, index) => (
                <article
                  key={`${record.name}-${index}`}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                  title={record.detail}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-wxIndigo900">
                      {record.name}
                    </p>
                    <AdminStatusBadge tone={healthTone(record.status)}>
                      {healthLabel(record.status)}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-wxIndigo500">
                    {record.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-red-800">
                  <ShieldAlert className="h-5 w-5" />
                  <h2 className="font-semibold">Emergency control</h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700">
                  Immediately remove all holiday effects and return every public
                  surface to the default WriteX experience.
                </p>
              </div>
              <button
                type="button"
                className={buttonDanger}
                onClick={() =>
                  setConfirm({
                    title: "Disable all holiday effects?",
                    description:
                      "This is an emergency action. It pauses active themes, clears overrides and restores safe defaults.",
                    confirmLabel: "Disable all effects",
                    tone: "danger",
                    action: async () => {
                      await performAction(
                        { action: "emergency_disable" },
                        "All holiday effects disabled."
                      );
                    }
                  })
                }
              >
                <Power className="h-4 w-4" />
                Disable All Holiday Effects
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "schedule" ? (
        <div className="space-y-5">
          <section className={`${panelClass} p-5 md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Theme Library
                </p>
                <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
                  Build, review and schedule experiences
                </h2>
                <p className="mt-1 text-sm text-wxIndigo500">
                  One clear primary action per theme, with advanced actions kept in
                  the menu.
                </p>
              </div>
              <button
                type="button"
                className={buttonPrimary}
                onClick={() => setWizardTheme("new")}
              >
                <Plus className="h-4 w-4" />
                Create New Theme
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
              <label className="relative">
                <span className="sr-only">Search themes</span>
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxMuted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${fieldClass} pl-10`}
                  placeholder="Search themes or categories"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={fieldClass}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="ready">Ready</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="incomplete">Incomplete</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </section>

          {filteredThemes.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredThemes.map((theme) => {
                const previewAsset = theme.assets.find(
                  (asset) =>
                    asset.status === "active" &&
                    asset.reviewStatus === "approved" &&
                    asset.mimeType.startsWith("image/")
                );
                const status = themeStatus(theme);
                const canActivate =
                  theme.experienceConfig.approvalStatus === "approved" &&
                  !["pending_review", "needs_review", "failed"].includes(
                    theme.paletteDetectionStatus
                  );
                return (
                  <article
                    key={theme.id}
                    className={`${panelClass} overflow-hidden`}
                  >
                    <div className="grid sm:grid-cols-[180px_1fr]">
                      <div className="relative min-h-44 overflow-hidden bg-wxSurfaceSoft">
                        {previewAsset ? (
                          <Image
                            src={assetPreviewUrl(previewAsset.id)}
                            alt={`${theme.name} thumbnail`}
                            fill
                            sizes="180px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${theme.palette.accentSoft}, ${theme.palette.accentWarm})`
                            }}
                          >
                            <Sparkles
                              className="h-10 w-10"
                              style={{ color: theme.palette.accent }}
                            />
                          </div>
                        )}
                        <div className="absolute left-3 top-3">
                          <AdminStatusBadge tone={statusTone(status)}>
                            {statusLabel(status)}
                          </AdminStatusBadge>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxViolet700">
                              {categoryLabel(theme.festivalType)}
                            </p>
                            <h3 className="mt-1 truncate text-lg font-semibold text-wxIndigo900">
                              {theme.name}
                            </h3>
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder text-wxIndigo700 hover:border-wxViolet700"
                              onClick={() =>
                                setLibraryMenu((current) =>
                                  current === theme.id ? null : theme.id
                                )
                              }
                              aria-label={`More actions for ${theme.name}`}
                              aria-expanded={libraryMenu === theme.id}
                              title="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {libraryMenu === theme.id ? (
                              <div className="absolute right-0 top-11 z-20 w-52 rounded-md border border-wxBorder bg-wxSurface p-1.5 shadow-xl">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-wxIndigo700 hover:bg-wxSurfaceSoft"
                                  onClick={() => {
                                    if (theme.status === "active") {
                                      setConfirm({
                                        title: `Pause ${theme.name} before editing?`,
                                        description:
                                          "Active themes cannot be edited in place. Pausing first protects visitors from partially saved changes.",
                                        confirmLabel: "Pause and edit",
                                        tone: "primary",
                                        action: async () => {
                                          const next = await performAction(
                                            {
                                              action: "pause",
                                              themeId: theme.id
                                            },
                                            `${theme.name} paused for editing.`
                                          );
                                          const paused = next?.themes.find(
                                            (item) => item.id === theme.id
                                          );
                                          if (paused) setWizardTheme(paused);
                                        }
                                      });
                                    } else {
                                      setWizardTheme(theme);
                                    }
                                    setLibraryMenu(null);
                                  }}
                                >
                                  <Menu className="h-4 w-4" />
                                  Edit or schedule
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-wxIndigo700 hover:bg-wxSurfaceSoft"
                                  onClick={() => {
                                    void performAction(
                                      { action: "duplicate", themeId: theme.id },
                                      `${theme.name} duplicated as a draft.`
                                    );
                                    setLibraryMenu(null);
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-wxIndigo700 hover:bg-wxSurfaceSoft"
                                  onClick={() => {
                                    setActiveTab("overview");
                                    setLibraryMenu(null);
                                  }}
                                >
                                  <ClipboardCheck className="h-4 w-4" />
                                  View audit
                                </button>
                                {theme.status !== "archived" ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setConfirm({
                                        title: `Archive ${theme.name}?`,
                                        description:
                                          "The theme will leave the active library but its audit history will be preserved.",
                                        confirmLabel: "Archive theme",
                                        tone: "danger",
                                        action: async () => {
                                          await performAction(
                                            {
                                              action: "archive",
                                              themeId: theme.id
                                            },
                                            `${theme.name} archived.`
                                          );
                                        }
                                      });
                                      setLibraryMenu(null);
                                    }}
                                  >
                                    <Archive className="h-4 w-4" />
                                    Archive
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3">
                          <Detail
                            label="Schedule"
                            value={
                              theme.startAt
                                ? formatDate(theme.startAt, false)
                                : "Manual"
                            }
                          />
                          <Detail
                            label="Intensity"
                            value={experienceLabels[theme.experienceLevel]}
                          />
                          <Detail
                            label="Assets"
                            value={`${themeReadiness(theme)}% complete`}
                          />
                          <Detail
                            label="Login"
                            value={theme.applyToLoginScreens ? "Included" : "Default"}
                          />
                          <Detail
                            label="Sound"
                            value={
                              theme.experienceConfig.sound.available
                                ? "Available"
                                : "Not included"
                            }
                          />
                          <Detail label="Scope" value={humanScope(theme)} />
                        </dl>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-wxBorder bg-wxSurfaceSoft p-4">
                      <p className="text-xs text-wxIndigo500">
                        Updated {formatDate(theme.updatedAt, false)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={buttonSecondary}
                          onClick={() => void enablePreview(theme)}
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                        {theme.status === "paused" ? (
                          <button
                            type="button"
                            className={buttonPrimary}
                            onClick={() =>
                              void performAction(
                                { action: "resume", themeId: theme.id },
                                `${theme.name} resumed.`
                              )
                            }
                          >
                            <CirclePlay className="h-4 w-4" />
                            Resume
                          </button>
                        ) : theme.status !== "active" ? (
                          <button
                            type="button"
                            className={buttonPrimary}
                            disabled={!canActivate}
                            title={
                              canActivate
                                ? "Activate"
                                : "Approve the experience pack and palette first"
                            }
                            onClick={() =>
                              setConfirm({
                                title: `Activate ${theme.name}?`,
                                description:
                                  "This becomes the public holiday experience. Any current theme will be paused safely.",
                                confirmLabel: "Activate theme",
                                tone: "primary",
                                action: async () => {
                                  await performAction(
                                    { action: "activate", themeId: theme.id },
                                    `${theme.name} activated.`
                                  );
                                }
                              })
                            }
                          >
                            <CirclePlay className="h-4 w-4" />
                            Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={buttonDanger}
                            onClick={() =>
                              setConfirm({
                                title: `End ${theme.name}?`,
                                description:
                                  "This restores the default public experience.",
                                confirmLabel: "End theme",
                                tone: "danger",
                                action: async () => {
                                  await performAction(
                                    { action: "end_early", themeId: theme.id },
                                    `${theme.name} ended.`
                                  );
                                }
                              })
                            }
                          >
                            End Theme
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No themes match this view"
              description="Adjust the search or status filter. Existing themes have not been changed."
            />
          )}
        </div>
      ) : null}

      {activeTab === "motifs" ? (
        <div className="space-y-5">
          {uploadTheme ? (
            <FestivalPackStudio
              key={`${uploadTheme.id}:${uploadTheme.updatedAt}:motifs`}
              theme={uploadTheme}
              section="motifs"
              busy={Boolean(busy) || uploadTheme.status === "active"}
              onSave={saveStudio}
              onOpenPrivatePreview={() => void enablePreview(uploadTheme)}
            />
          ) : null}
          <section className={`${panelClass} p-5 md:p-6`}>
            <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Festival Asset Library
                </p>
                <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
                  Private, approved experience media
                </h2>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">
                  The full Asset Library separates files from placements and
                  preserves replacement history. Use this Studio view for
                  theme composition.
                </p>
                <Link
                  href="/admin/website-experience/festival-assets"
                  className={`${buttonPrimary} mt-4`}
                >
                  <Layers3 className="h-4 w-4" />
                  Open Asset Library
                </Link>
                <label className="mt-4 block text-sm font-semibold text-wxIndigo700">
                  Assign upload to theme
                  <select
                    value={uploadThemeId}
                    onChange={(event) => setUploadThemeId(event.target.value)}
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Choose a theme</option>
                    {editableThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                {uploadTheme ? (
                  <UploadDropzone
                    theme={uploadTheme}
                    onUploaded={(next) => {
                      setSnapshot(next);
                      setNotice(
                        `Asset uploaded privately to ${uploadTheme.name}.`
                      );
                    }}
                  />
                ) : (
                  <EmptyState
                    icon={<ImageUp className="h-5 w-5" />}
                    title="Choose an event"
                    description="Asset assignment is explicit; cross-event sharing is intentionally blocked."
                  />
                )}
              </div>
            </div>
          </section>

          {roleGroups.map((group) => {
            const assets = allAssets.filter(({ asset }) =>
              group.roles.includes(asset.role)
            );
            return (
              <section key={group.title} className={`${panelClass} p-5 md:p-6`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-wxIndigo900">
                    {group.title}
                  </h2>
                  <AdminStatusBadge tone={assets.length ? "info" : "neutral"}>
                    {assets.length} asset{assets.length === 1 ? "" : "s"}
                  </AdminStatusBadge>
                </div>
                <div className="mt-5">
                  {assets.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {assets.map(({ asset, theme }) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          theme={theme}
                          busy={Boolean(busy)}
                          onReview={(assetId, decision) =>
                            void reviewAsset(assetId, decision)
                          }
                          onRemove={(selectedAsset, selectedTheme) =>
                            void removeAsset(selectedAsset, selectedTheme)
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={
                        group.roles.includes("audio") ? (
                          <FileAudio className="h-5 w-5" />
                        ) : (
                          <FileImage className="h-5 w-5" />
                        )
                      }
                      title={`No ${group.title.toLowerCase()} uploaded`}
                      description="Use the upload panel above after selecting an event."
                    />
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {activeTab === "login" || activeTab === "sound" ? (
        <div className="space-y-5">
          {activeTab === "login" ? (
            <LoginThemeComposer
              snapshot={snapshot}
              selectedThemeId={loginTheme}
              onThemeChange={setLoginTheme}
              busy={Boolean(busy)}
              onAction={performAction}
              onPreview={(theme) => enablePreview(theme, false)}
            />
          ) : null}
          <section className="hidden" aria-hidden>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Login Screen Experience
                </p>
                <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
                  One theme, independent channel control
                </h2>
                <p className="mt-1 text-sm text-wxIndigo500">
                  Client and employee experiences can be applied together. Admin
                  Login remains independently controlled.
                </p>
              </div>
              <label className="w-full max-w-sm text-sm font-semibold text-wxIndigo700">
                Theme to apply
                <select
                  value={loginTheme}
                  onChange={(event) => setLoginTheme(event.target.value)}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Choose approved theme</option>
                  {editableThemes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {(["client", "employee", "admin"] as HolidayLoginChannel[]).map(
                (channel) => {
                  const control = snapshot.loginControls.find(
                    (item) => item.channel === channel
                  );
                  const theme = snapshot.themes.find(
                    (item) => item.id === control?.themeId
                  );
                  return (
                    <article
                      key={channel}
                      className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-wxIndigo900">
                            {channel === "client"
                              ? "Client Login"
                              : channel === "employee"
                                ? "Employee Login"
                                : "Admin Login"}
                          </p>
                          <p className="mt-1 text-xs text-wxIndigo500">
                            {theme?.name || "Default WriteX"}
                          </p>
                        </div>
                        <AdminStatusBadge
                          tone={
                            control?.state === "theme_active"
                              ? "success"
                              : control?.state === "asset_failed"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {humaniseAdminStatus(
                            control?.state || "default_active"
                          )}
                        </AdminStatusBadge>
                      </div>
                      <dl className="mt-4 grid gap-3 border-t border-wxBorder pt-4">
                        <Detail
                          label="Mode"
                          value={
                            control?.mode === "holiday"
                              ? "Holiday theme"
                              : "Default"
                          }
                        />
                        <Detail
                          label="Updated"
                          value={formatDate(control?.updatedAt || null)}
                        />
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={buttonPrimary}
                          disabled={!loginTheme}
                          onClick={() =>
                            void performAction(
                              {
                                action: "set_login_channel",
                                channel,
                                mode: "holiday",
                                state: "theme_active",
                                themeId: loginTheme
                              },
                              `${humaniseAdminStatus(channel)} Login theme applied.`
                            )
                          }
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          className={buttonSecondary}
                          onClick={() =>
                            void performAction(
                              {
                                action: "set_login_channel",
                                channel,
                                mode: "default",
                                state: "default_active",
                                themeId: null
                              },
                              `${humaniseAdminStatus(channel)} Login restored.`
                            )
                          }
                        >
                          Restore
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-wxBorder pt-5">
              <button
                type="button"
                className={buttonPrimary}
                disabled={!loginTheme}
                onClick={() =>
                  void performAction(
                    { action: "apply_login_theme_both", themeId: loginTheme },
                    "Theme applied to Client and Employee Login."
                  )
                }
              >
                Apply to Client + Employee
              </button>
              <button
                type="button"
                className={buttonSecondary}
                onClick={() =>
                  void performAction(
                    { action: "restore_login_defaults" },
                    "All login screens restored to default."
                  )
                }
              >
                Restore All Login Defaults
              </button>
              <button
                type="button"
                className={buttonDanger}
                onClick={() =>
                  setConfirm({
                    title: "Emergency reset all login themes?",
                    description:
                      "Every login channel will immediately return to the default WriteX presentation.",
                    confirmLabel: "Reset all login themes",
                    tone: "danger",
                    action: async () => {
                      await performAction(
                        { action: "emergency_reset_logins" },
                        "Emergency login reset completed."
                      );
                    }
                  })
                }
              >
                Emergency Reset
              </button>
            </div>
          </section>

          <section className={`${panelClass} p-5 md:p-6`}>
            <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Sound Control
                </p>
                <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
                  User-started festive ambience
                </h2>
                <p className="mt-2 text-sm leading-6 text-wxIndigo500">
                  Login screens remain silent by default. Theme deactivation stops
                  audio and restores the default experience.
                </p>
                <label className="mt-4 block text-sm font-semibold text-wxIndigo700">
                  Theme
                  <select
                    value={soundThemeId}
                    onChange={(event) => setSoundThemeId(event.target.value)}
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Choose a theme</option>
                    {editableThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {soundTheme ? (
                <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                  {(() => {
                    const audio = soundTheme.assets.find(
                      (asset) =>
                        asset.role === "audio" &&
                        asset.status === "active" &&
                        asset.reviewStatus === "approved"
                    );
                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-wxIndigo900">
                              {audio?.safeFileName || "No approved audio"}
                            </p>
                            <p className="mt-1 text-xs text-wxIndigo500">
                              {audio?.durationSeconds
                                ? `${Math.round(audio.durationSeconds)} seconds`
                                : "Duration unavailable"}
                            </p>
                          </div>
                          <AdminStatusBadge
                            tone={
                              soundTheme.experienceConfig.sound.enabled
                                ? "success"
                                : "neutral"
                            }
                          >
                            {soundTheme.experienceConfig.sound.enabled
                              ? "Available"
                              : "Off"}
                          </AdminStatusBadge>
                        </div>
                        {audio ? (
                          <audio
                            controls
                            preload="metadata"
                            loop={soundTheme.experienceConfig.sound.loop}
                            src={assetPreviewUrl(audio.id)}
                            className="mt-4 w-full"
                          />
                        ) : null}
                        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-wxBorder pt-4 sm:grid-cols-4">
                          <Detail
                            label="Volume"
                            value={`${Math.round(
                              soundTheme.experienceConfig.sound.volume * 100
                            )}%`}
                          />
                          <Detail
                            label="Loop"
                            value={
                              soundTheme.experienceConfig.sound.loop ? "On" : "Off"
                            }
                          />
                          <Detail
                            label="Mobile"
                            value={
                              soundTheme.experienceConfig.sound.mobileEnabled
                                ? "Allowed"
                                : "Off"
                            }
                          />
                          <Detail label="Start" value="User action only" />
                        </dl>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={buttonSecondary}
                            disabled={soundTheme.status === "active"}
                            title={
                              soundTheme.status === "active"
                                ? "Pause the active theme before editing sound"
                                : "Edit sound settings"
                            }
                            onClick={() => setWizardTheme(soundTheme)}
                          >
                            <Volume2 className="h-4 w-4" />
                            Edit Sound
                          </button>
                          <button
                            type="button"
                            className={buttonSecondary}
                            onClick={() => {
                              setUploadThemeId(soundTheme.id);
                              setActiveTab("motifs");
                            }}
                          >
                            <UploadCloud className="h-4 w-4" />
                            Replace Audio
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <EmptyState
                  icon={<Headphones className="h-5 w-5" />}
                  title="Choose a theme"
                  description="Select an event to review its sound file and playback rules."
                />
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "header" ? (
        <div className="space-y-5">
          <section className={`${panelClass} p-5 md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
                  Visual Header Editor
                </p>
                <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
                  Festival accents without raw configuration
                </h2>
                <p className="mt-1 text-sm text-wxIndigo500">
                  Use the guided editor for normal work. Advanced configuration
                  remains contained in the existing rollback manager.
                </p>
              </div>
              <button
                type="button"
                className={buttonPrimary}
                disabled={!soundTheme}
                onClick={() => soundTheme && void enablePreview(soundTheme)}
              >
                <Eye className="h-4 w-4" />
                Open Immersive Preview
              </button>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-wxIndigo700">
                  Theme
                  <select
                    value={soundThemeId}
                    onChange={(event) => setSoundThemeId(event.target.value)}
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Choose a theme</option>
                    {editableThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
                {soundTheme ? (
                  <>
                    <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                      <p className="text-sm font-semibold text-wxIndigo900">
                        Header treatment
                      </p>
                      <dl className="mt-3 grid gap-3">
                        <Detail
                          label="Preset"
                          value={humaniseAdminStatus(
                            soundTheme.experienceConfig.headerPreset
                          )}
                        />
                        <Detail
                          label="Ornaments"
                          value={
                            soundTheme.experienceConfig.headerOrnaments.enabled
                              ? `${soundTheme.experienceConfig.headerOrnaments.ornamentCount} enabled`
                              : "Off"
                          }
                        />
                        <Detail
                          label="Density"
                          value={humaniseAdminStatus(
                            soundTheme.experienceConfig.headerOrnaments.density
                          )}
                        />
                        <Detail
                          label="Motion"
                          value={humaniseAdminStatus(
                            soundTheme.experienceConfig.headerOrnaments.motionLevel
                          )}
                        />
                        <Detail
                          label="Mobile"
                          value={
                            soundTheme.experienceConfig.headerOrnaments
                              .mobileSimplified
                              ? "Simplified"
                              : "Full"
                          }
                        />
                      </dl>
                    </div>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={soundTheme.status === "active"}
                      onClick={() => setWizardTheme(soundTheme)}
                    >
                      <WandSparkles className="h-4 w-4" />
                      Edit Visual Experience
                    </button>
                  </>
                ) : null}
              </div>
              {soundTheme ? (
                <div
                  className="relative min-h-80 overflow-hidden rounded-md border border-wxBorder p-5"
                  style={{
                    background: `linear-gradient(135deg, ${soundTheme.palette.surfaceTint}, ${soundTheme.palette.accentSoft})`
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-2"
                    style={{
                      background: `linear-gradient(90deg, ${soundTheme.palette.accent}, ${soundTheme.palette.accentWarm})`
                    }}
                  />
                  <div className="relative mt-3 rounded-md border border-white/60 bg-white/85 p-4 shadow-soft backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div className="h-7 w-28 rounded bg-wxIndigo900/90" />
                      <div className="flex gap-3">
                        <div className="h-4 w-12 rounded bg-wxIndigo500/20" />
                        <div className="h-4 w-12 rounded bg-wxIndigo500/20" />
                        <div className="h-4 w-12 rounded bg-wxIndigo500/20" />
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-5 max-w-xl">
                    <AdminStatusBadge tone="info">
                      {soundTheme.name}
                    </AdminStatusBadge>
                    <div className="mt-4 h-8 w-3/4 rounded bg-wxIndigo900/90" />
                    <div className="mt-3 h-4 w-full rounded bg-wxIndigo500/25" />
                    <div className="mt-2 h-4 w-4/5 rounded bg-wxIndigo500/25" />
                    <div
                      className="mt-5 h-10 w-36 rounded-md"
                      style={{
                        background: `linear-gradient(90deg, ${soundTheme.palette.accent}, ${soundTheme.palette.accentWarm})`
                      }}
                    />
                  </div>
                  <div className="absolute bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-white/85 text-wxViolet700 shadow-soft">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Palette className="h-5 w-5" />}
                  title="Choose a theme"
                  description="Review a safe desktop composition before opening the immersive preview."
                />
              )}
            </div>
            {soundTheme ? (
              <div className="mt-6 border-t border-wxBorder pt-6">
                <HolidayHeaderRailEditor
                  key={`${soundTheme.id}:${soundTheme.updatedAt}`}
                  theme={soundTheme}
                  busy={Boolean(busy)}
                  onSave={async (headerOrnaments, applyToHeader) => {
                    const draft = {
                      ...initialWizardDraft(soundTheme),
                      applyToHeader
                    };
                    const next = await performAction(
                      buildThemeUpdate(soundTheme, draft, {
                        status: soundTheme.status,
                        mode: soundTheme.mode,
                        experienceConfig: {
                          ...soundTheme.experienceConfig,
                          headerOrnaments
                        }
                      }),
                      `${soundTheme.name} header controls saved and audited.`
                    );
                    return Boolean(next);
                  }}
                />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {wizardTheme ? (
        <ThemeWizard
          initialTheme={wizardTheme === "new" ? null : wizardTheme}
          snapshot={snapshot}
          busy={Boolean(busy)}
          onClose={() => setWizardTheme(null)}
          onAction={performAction}
          onSnapshot={(next) => {
            setSnapshot(next);
            setNotice("Asset uploaded privately and assigned to this draft.");
          }}
        />
      ) : null}
      {previewTheme ? (
        <PreviewWorkspace
          theme={previewTheme}
          onClose={() => setPreviewTheme(null)}
        />
      ) : null}
      {confirm ? (
        <ConfirmDialog
          state={confirm}
          busy={Boolean(busy)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
