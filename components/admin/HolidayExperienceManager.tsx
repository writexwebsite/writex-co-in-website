"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CirclePause,
  CirclePlay,
  Copy,
  Eye,
  ImageUp,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2
} from "lucide-react";
import {
  AdminPanel,
  AdminStatus,
  AdminStatusBadge
} from "@/components/admin/AdminPrimitives";
import type {
  HolidayExperienceSnapshot,
  HolidayTheme
} from "@/lib/holiday/types";
import {
  HOLIDAY_EXPERIENCE_LEVELS,
  HOLIDAY_ANIMATION_INTENSITIES,
  HOLIDAY_ANIMATION_PRESETS,
  HOLIDAY_DECORATION_DENSITIES,
  HOLIDAY_FOOTER_PRESETS,
  HOLIDAY_HEADER_PRESETS,
  HOLIDAY_HEADER_FESTIVAL_ICONS,
  HOLIDAY_HEADER_ORNAMENT_DENSITIES,
  HOLIDAY_HEADER_ORNAMENT_MOTIONS,
  HOLIDAY_HEADER_ORNAMENT_PACK_MODES,
  HOLIDAY_HEADER_ORNAMENT_POSITIONS,
  HOLIDAY_HEADER_ORNAMENT_TYPES,
  HOLIDAY_HERO_PRESETS,
  HOLIDAY_INNER_PAGE_PRESETS,
  HOLIDAY_MOTION_LEVELS,
  HOLIDAY_PAGE_COVERAGE,
  HOLIDAY_PALETTE_MATCH_MODES,
  HOLIDAY_PARTICLE_PRESETS,
  HOLIDAY_PUBLIC_ARTWORK_MODES,
  HOLIDAY_THEME_SOURCE_MODES,
  HOLIDAY_THEME_CATEGORIES,
  type HolidayExperienceLevel,
  type HolidayHeaderOrnamentConfig,
  type HolidayHeaderOrnamentItem,
  type HolidayPaletteMatchMode,
  type HolidayThemeCategory
} from "@/lib/holiday/types";

type View = "dashboard" | "library";
type ThemeFilter =
  | "all"
  | "active"
  | "scheduled"
  | "draft"
  | "archived"
  | "login-uploaded"
  | "website-generated";
type HeaderOrnamentBooleanKey =
  | "enabled"
  | "animationEnabled"
  | "mobileSimplified"
  | "garlandEnabled"
  | "textBadgeEnabled"
  | "approvedCulturalArtworkEnabled";
type HeaderOrnamentItemBooleanKey =
  | "enabled"
  | "mobileVisible"
  | "culturalAssetApproved";

const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = `${buttonBase} border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700`;
const buttonPrimary = `${buttonBase} wx-gradient-action border-transparent text-white`;
const buttonDanger = `${buttonBase} border-red-200 bg-red-50 text-red-700 hover:border-red-400`;

function adminActionError(response: Response, message: string) {
  const referenceId = response.headers.get("x-correlation-id");
  return referenceId ? `${message} Reference ID: ${referenceId}.` : message;
}

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

const experienceLevelLabels: Record<HolidayExperienceLevel, string> = {
  accent_only: "Accent Only",
  standard: "Standard",
  enhanced: "Enhanced"
};

const paletteMatchModeLabels: Record<HolidayPaletteMatchMode, string> = {
  match_uploaded: "Match Uploaded Theme",
  balanced_writex: "Balanced WriteX Match",
  minimal_accent: "Minimal Accent"
};

function categoryLabel(category: HolidayThemeCategory) {
  return category === "system_default"
    ? "System default"
    : categoryLabels[category];
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function completeness(theme: HolidayTheme) {
  return theme.assetAvailability
    .map((state) =>
      state
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    )
    .join(", ");
}

function HeaderOrnamentEditor({
  initialConfig,
  assetVariants
}: {
  initialConfig: HolidayHeaderOrnamentConfig;
  assetVariants: string[];
}) {
  const [config, setConfig] =
    useState<HolidayHeaderOrnamentConfig>(initialConfig);

  const updateConfig = (
    patch: Partial<Omit<HolidayHeaderOrnamentConfig, "items">>
  ) => setConfig((current) => ({ ...current, ...patch }));

  const updateItem = (
    index: number,
    patch: Partial<HolidayHeaderOrnamentItem>
  ) =>
    setConfig((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));

  const moveItem = (index: number, direction: -1 | 1) =>
    setConfig((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...current, items };
    });

  const addItem = () =>
    setConfig((current) => {
      if (current.items.length >= 12) return current;
      const suffix = `${Date.now()}`.slice(-8);
      const item: HolidayHeaderOrnamentItem = {
        id: `custom-${suffix}`,
        type: "medallion",
        enabled: true,
        position: "right_center",
        hangingLength: 24,
        scale: 1,
        motion: "sway",
        mobileVisible: false,
        colour: "#5516F2",
        secondaryColour: "#F05A28",
        culturalAssetApproved: false,
        assetVariant: null,
        icon: "custom",
        text: null,
        language: null,
        mobileFallbackText: null
      };
      return {
        ...current,
        ornamentCount: Math.min(12, Math.max(current.ornamentCount, current.items.length + 1)),
        items: [...current.items, item]
      };
    });

  return (
    <fieldset className="grid gap-4 rounded-md border border-wxBorder bg-wxSurface p-4">
      <legend className="px-1 text-sm font-semibold text-wxIndigo700">
        Hanging header ornament system
      </legend>
      <input
        type="hidden"
        name="headerOrnamentsJson"
        value={JSON.stringify(config)}
      />
      <p className="text-sm leading-6 text-wxIndigo500">
        Compose a sticky-header-safe festival pack. Uploaded ornaments must be
        approved transparent PNG, WebP or sanitised SVG assets using an
        ornament variant.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Pack mode
          <select
            value={config.mode}
            onChange={(event) =>
              updateConfig({
                mode: event.target
                  .value as HolidayHeaderOrnamentConfig["mode"]
              })
            }
            className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
          >
            {HOLIDAY_HEADER_ORNAMENT_PACK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Density
          <select
            value={config.density}
            onChange={(event) =>
              updateConfig({
                density: event.target
                  .value as HolidayHeaderOrnamentConfig["density"]
              })
            }
            className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
          >
            {HOLIDAY_HEADER_ORNAMENT_DENSITIES.map((density) => (
              <option key={density} value={density}>
                {density}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Motion level
          <select
            value={config.motionLevel}
            onChange={(event) =>
              updateConfig({
                motionLevel: event.target
                  .value as HolidayHeaderOrnamentConfig["motionLevel"]
              })
            }
            className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
          >
            {HOLIDAY_MOTION_LEVELS.map((motion) => (
              <option key={motion} value={motion}>
                {motion}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Visible ornament limit
          <input
            type="number"
            min={0}
            max={12}
            value={config.ornamentCount}
            onChange={(event) =>
              updateConfig({
                ornamentCount: Math.min(
                  12,
                  Math.max(0, Number(event.target.value))
                )
              })
            }
            className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className={buttonSecondary}
            onClick={addItem}
            disabled={config.items.length >= 12}
          >
            <Plus className="h-4 w-4" />
            Add ornament
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["enabled", "Header ornaments enabled", config.enabled],
          ["animationEnabled", "Animation enabled", config.animationEnabled],
          ["mobileSimplified", "Mobile simplification", config.mobileSimplified],
          ["garlandEnabled", "Garland band enabled", config.garlandEnabled],
          ["textBadgeEnabled", "Text badges enabled", config.textBadgeEnabled],
          [
            "approvedCulturalArtworkEnabled",
            "Approved cultural artwork",
            config.approvedCulturalArtworkEnabled
          ]
        ] satisfies Array<
          [HeaderOrnamentBooleanKey, string, boolean]
        >).map(([key, label, checked]) => (
          <label
            key={String(key)}
            className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm text-wxIndigo700"
          >
            <input
              type="checkbox"
              checked={Boolean(checked)}
              onChange={(event) =>
                updateConfig({ [key]: event.target.checked })
              }
            />
            {String(label)}
          </label>
        ))}
      </div>
      <div className="grid gap-3">
        {config.items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-wxIndigo900">
                {index + 1}. {item.id}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className={buttonSecondary}
                  aria-label={`Move ${item.id} up`}
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={buttonSecondary}
                  aria-label={`Move ${item.id} down`}
                  onClick={() => moveItem(index, 1)}
                  disabled={index === config.items.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={buttonDanger}
                  onClick={() =>
                    setConfig((current) => ({
                      ...current,
                      ornamentCount: Math.min(
                        current.ornamentCount,
                        Math.max(0, current.items.length - 1)
                      ),
                      items: current.items.filter(
                        (_, itemIndex) => itemIndex !== index
                      )
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Type
                <select
                  value={item.type}
                  onChange={(event) =>
                    updateItem(index, {
                      type: event.target
                        .value as HolidayHeaderOrnamentItem["type"]
                    })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                >
                  {HOLIDAY_HEADER_ORNAMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Safe header position
                <select
                  value={item.position}
                  onChange={(event) =>
                    updateItem(index, {
                      position: event.target
                        .value as HolidayHeaderOrnamentItem["position"]
                    })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                >
                  {HOLIDAY_HEADER_ORNAMENT_POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {position.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Hanging length
                <input
                  type="number"
                  min={6}
                  max={48}
                  value={item.hangingLength}
                  onChange={(event) =>
                    updateItem(index, {
                      hangingLength: Number(event.target.value)
                    })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Scale
                <input
                  type="number"
                  min={0.6}
                  max={1.4}
                  step={0.05}
                  value={item.scale}
                  onChange={(event) =>
                    updateItem(index, { scale: Number(event.target.value) })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Motion
                <select
                  value={item.motion}
                  onChange={(event) =>
                    updateItem(index, {
                      motion: event.target
                        .value as HolidayHeaderOrnamentItem["motion"]
                    })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                >
                  {HOLIDAY_HEADER_ORNAMENT_MOTIONS.map((motion) => (
                    <option key={motion} value={motion}>
                      {motion}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Festival icon
                <select
                  value={item.icon || ""}
                  onChange={(event) =>
                    updateItem(index, {
                      icon:
                        (event.target.value as HolidayHeaderOrnamentItem["icon"]) ||
                        null
                    })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                >
                  <option value="">None</option>
                  {HOLIDAY_HEADER_FESTIVAL_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Approved custom asset
                <select
                  value={item.assetVariant || ""}
                  onChange={(event) =>
                    updateItem(index, {
                      assetVariant: event.target.value || null
                    })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                >
                  <option value="">Built-in ornament</option>
                  {assetVariants.map((variant) => (
                    <option key={variant} value={variant}>
                      {variant}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Text badge
                <input
                  value={item.text || ""}
                  maxLength={64}
                  onChange={(event) =>
                    updateItem(index, { text: event.target.value || null })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Language
                <input
                  value={item.language || ""}
                  maxLength={32}
                  onChange={(event) =>
                    updateItem(index, { language: event.target.value || null })
                  }
                  className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Primary colour
                <input
                  type="color"
                  value={item.colour}
                  onChange={(event) =>
                    updateItem(index, { colour: event.target.value })
                  }
                  className="h-10 w-full rounded-md border border-wxBorder bg-wxSurface p-1"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                Secondary colour
                <input
                  type="color"
                  value={item.secondaryColour}
                  onChange={(event) =>
                    updateItem(index, { secondaryColour: event.target.value })
                  }
                  className="h-10 w-full rounded-md border border-wxBorder bg-wxSurface p-1"
                />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ["enabled", "Visible", item.enabled],
                ["mobileVisible", "Visible on mobile", item.mobileVisible],
                [
                  "culturalAssetApproved",
                  "Cultural artwork approved",
                  item.culturalAssetApproved
                ]
              ] satisfies Array<
                [HeaderOrnamentItemBooleanKey, string, boolean]
              >).map(([key, label, checked]) => (
                <label
                  key={String(key)}
                  className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked)}
                    onChange={(event) =>
                      updateItem(index, { [key]: event.target.checked })
                    }
                  />
                  {String(label)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function PaletteReview({ theme }: { theme: HolidayTheme }) {
  const detected = theme.detectedPalette;
  const colours = detected
    ? [
        ["Primary", detected.primary, "Primary holiday accent"],
        ["Secondary", detected.secondary, "Supporting accent"],
        ["Accent", detected.accent, "CTA and decorative highlight"],
        ["Background", detected.backgroundTint, "Soft section tint"],
        ["Surface", detected.surfaceTint, "Cards and login surfaces"],
        ["Border", detected.borderHighlight, "Selected borders"],
        ["CTA", detected.cta, "Action suggestion"],
        ["Text", detected.textOnPrimary, "Accessible accent text"]
      ]
    : [];

  return (
    <section className="rounded-md border border-wxBorder bg-wxSurface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-wxIndigo900">
            Detected Theme Palette
          </h4>
          <p className="mt-1 text-xs leading-5 text-wxIndigo500">
            Uploading login artwork creates a private proposal. Activation stays
            blocked until the palette is reviewed and approved.
          </p>
        </div>
        <AdminStatusBadge
          tone={
            theme.paletteDetectionStatus === "approved"
              ? "success"
              : theme.paletteDetectionStatus === "not_started"
                ? "neutral"
                : "warning"
          }
        >
          {theme.paletteDetectionStatus.replaceAll("_", " ")}
        </AdminStatusBadge>
      </div>
      {theme.paletteDetectionMessage ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {theme.paletteDetectionMessage}
        </p>
      ) : null}
      {detected ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {colours.map(([label, colour, usage]) => (
              <div
                key={label}
                className="flex min-w-0 items-center gap-3 rounded-md border border-wxBorder px-3 py-2"
              >
                <span
                  aria-hidden
                  className="h-9 w-9 shrink-0 rounded-md border border-black/10"
                  style={{ backgroundColor: colour }}
                />
                <span className="min-w-0">
                  <strong className="block text-xs text-wxIndigo800">
                    {label}
                  </strong>
                  <span className="block font-mono text-[11px] uppercase text-wxIndigo600">
                    {colour}
                  </span>
                  <span className="block truncate text-[10px] text-wxIndigo500">
                    {usage}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            {[
              ["Primary contrast", detected.contrast.primaryTextRatio],
              ["CTA contrast", detected.contrast.ctaTextRatio],
              ["Surface contrast", detected.contrast.surfaceTextRatio]
            ].map(([label, ratio]) => (
              <div
                key={String(label)}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 py-2"
              >
                <span className="text-wxIndigo500">{String(label)}</span>
                <strong className="ml-2 text-wxIndigo900">
                  {Number(ratio).toFixed(2)}:1
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Desktop login", "16 / 9"],
              ["Mobile login", "9 / 14"],
              ["Homepage", "16 / 9"],
              ["Header", "5 / 1"],
              ["Axo accent", "1 / 1"]
            ].map(([label, ratio]) => (
              <div
                key={label}
                className="grid min-h-24 content-end rounded-md border p-3"
                style={{
                  aspectRatio: ratio,
                  borderColor: detected.borderHighlight,
                  color: detected.textOnPrimary,
                  background: `linear-gradient(145deg, ${detected.primary}, ${detected.secondary}, ${detected.accent})`
                }}
              >
                <strong className="text-xs">{label}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-wxIndigo500">
          Upload desktop, mobile or background login artwork to detect a palette.
        </p>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3">
      <div>
        <p className="font-semibold text-wxIndigo900">{label}</p>
        <p className="mt-1 text-xs leading-5 text-wxIndigo500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 ${
          checked ? "bg-wxViolet700" : "bg-wxIndigo200"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export function HolidayExperienceManager({
  initialSnapshot,
  initialPreviewThemeId,
  view
}: {
  initialSnapshot: HolidayExperienceSnapshot;
  initialPreviewThemeId: string | null;
  view: View;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [previewThemeId, setPreviewThemeId] = useState(initialPreviewThemeId);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ThemeFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const firstSelectableTheme =
    initialSnapshot.themes.find(
      (theme) => theme.slug !== "default" && theme.status !== "archived"
    )?.id || "";
  const [loginThemeSelection, setLoginThemeSelection] = useState<
    Record<"client" | "employee" | "admin", string>
  >({
    client:
      initialSnapshot.loginControls.find((item) => item.channel === "client")
        ?.themeId || firstSelectableTheme,
    employee:
      initialSnapshot.loginControls.find((item) => item.channel === "employee")
        ?.themeId || firstSelectableTheme,
    admin:
      initialSnapshot.loginControls.find((item) => item.channel === "admin")
        ?.themeId || firstSelectableTheme
  });

  const mutate = async (
    action: Record<string, unknown>,
    label: string,
    options: { open?: string } = {}
  ) => {
    let succeeded = false;
    setBusy(label);
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
          previewThemeId?: string;
          previewThemeName?: string;
          previewCleared?: boolean;
        };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok) {
        throw new Error(
          adminActionError(
            response,
            body.error?.message || "The action could not be completed."
          )
        );
      }
      if (action.action === "preview") {
        const id = String(action.themeId || "");
        setPreviewThemeId(id);
        setNotice(`Private preview enabled for ${body.data?.previewThemeName || "theme"}.`);
        if (options.open) window.open(options.open, "_blank", "noopener,noreferrer");
      } else if (action.action === "clear_preview") {
        setPreviewThemeId(null);
        setNotice("Private preview ended.");
      } else if (body.data?.settings) {
        setSnapshot(body.data);
        setNotice(label);
      }
      succeeded = true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action failed safely.");
    } finally {
      setBusy(null);
    }
    return succeeded;
  };

  const uploadAsset = async (
    event: FormEvent<HTMLFormElement>,
    themeId: string
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(`upload-${themeId}`);
    setError(null);
    setNotice(null);
    try {
      const data = new FormData(form);
      const role = String(data.get("role") || "");
      data.set("themeId", themeId);
      const response = await fetch("/api/admin/website-experience/assets", {
        method: "POST",
        credentials: "same-origin",
        body: data
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { snapshot?: HolidayExperienceSnapshot };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok || !body.data?.snapshot) {
        throw new Error(
          adminActionError(
            response,
            body.error?.message || "The asset could not be uploaded."
          )
        );
      }
      setSnapshot(body.data.snapshot);
      setNotice(
        ["reference_image", "hero_art"].includes(role)
          ? "Private festival reference uploaded. Review the detected palette, choose interpreted motifs, and approve before preview."
          : ["login_desktop", "login_mobile", "login_background"].includes(role)
          ? "Private login artwork uploaded. Review and approve the asset and its detected palette before activation."
          : "Private holiday asset uploaded for Super Admin approval."
      );
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The upload failed safely.");
    } finally {
      setBusy(null);
    }
  };

  const removeAsset = async (assetId: string) => {
    setBusy(`remove-${assetId}`);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/website-experience/assets", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId })
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { snapshot?: HolidayExperienceSnapshot };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok || !body.data?.snapshot) {
        throw new Error(
          adminActionError(
            response,
            body.error?.message || "The asset could not be removed."
          )
        );
      }
      setSnapshot(body.data.snapshot);
      setNotice("Private holiday asset removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The removal failed safely.");
    } finally {
      setBusy(null);
    }
  };

  const reviewAsset = async (
    assetId: string,
    decision: "approved" | "rejected"
  ) => {
    setBusy(`review-${assetId}`);
    setError(null);
    setNotice(null);
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
              : null
        })
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { snapshot?: HolidayExperienceSnapshot };
        error?: { message?: string };
      };
      if (!response.ok || !body.ok || !body.data?.snapshot) {
        throw new Error(
          adminActionError(
            response,
            body.error?.message || "The asset review could not be saved."
          )
        );
      }
      setSnapshot(body.data.snapshot);
      setNotice(
        decision === "approved"
          ? "Asset approved and available to the selected theme."
          : "Asset rejected and archived safely."
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The asset review failed safely."
      );
    } finally {
      setBusy(null);
    }
  };

  const saveTheme = async (
    event: FormEvent<HTMLFormElement>,
    theme: HolidayTheme
  ) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const startValue = String(data.get("startAt") || "");
    const endValue = String(data.get("endAt") || "");
    const selectedRoutes = String(data.get("selectedRoutes") || "")
      .split(/[\n,]/)
      .map((route) => route.trim())
      .filter(Boolean);
    const palette = {
      accent: String(data.get("paletteAccent") || theme.palette.accent),
      accentSoft: String(
        data.get("paletteAccentSoft") || theme.palette.accentSoft
      ),
      accentWarm: String(
        data.get("paletteAccentWarm") || theme.palette.accentWarm
      ),
      textOnAccent: String(
        data.get("paletteTextOnAccent") || theme.palette.textOnAccent
      ),
      surfaceTint: String(
        data.get("paletteSurfaceTint") || theme.palette.surfaceTint
      ),
      secondary: theme.palette.secondary,
      backgroundTint: theme.palette.backgroundTint,
      borderHighlight: theme.palette.borderHighlight,
      ctaAccent: theme.palette.ctaAccent,
      decorativeHighlights: theme.palette.decorativeHighlights
    };
    const headerOrnaments = JSON.parse(
      String(data.get("headerOrnamentsJson") || "{}")
    ) as HolidayHeaderOrnamentConfig;
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    if (submitter?.value === "accept_detected_palette") {
      await mutate(
        {
          action: "accept_detected_palette",
          themeId: theme.id,
          paletteMatchMode: String(
            data.get("paletteMatchMode") || "balanced_writex"
          )
        },
        `${theme.name} detected palette approved.`
      );
      return;
    }
    if (submitter?.value === "approve_manual_palette") {
      await mutate(
        {
          action: "approve_manual_palette",
          themeId: theme.id,
          palette,
          paletteMatchMode: String(
            data.get("paletteMatchMode") || "balanced_writex"
          )
        },
        `${theme.name} adjusted palette approved.`
      );
      return;
    }
    await mutate(
      {
        action: "update",
        themeId: theme.id,
        name: String(data.get("name") || ""),
        description: String(data.get("description") || ""),
        festivalType: String(data.get("festivalType") || "custom_one_time_event"),
        experienceLevel: String(data.get("experienceLevel") || "standard"),
        status: String(data.get("status") || "draft"),
        mode: String(data.get("mode") || "manual"),
        startAt: startValue ? new Date(startValue).toISOString() : null,
        endAt: endValue ? new Date(endValue).toISOString() : null,
        timezone: String(data.get("timezone") || "Asia/Kolkata"),
        repeatYearly: data.get("repeatYearly") === "on",
        priority: Number(data.get("priority") || 50),
        isEnabled: data.get("isEnabled") === "on",
        scope: String(data.get("scope") || "entire_public"),
        applyToHeader: data.get("applyToHeader") === "on",
        applyToFooter: data.get("applyToFooter") === "on",
        applyToHomepage: data.get("applyToHomepage") === "on",
        applyToLoginScreens: data.get("applyToLoginScreens") === "on",
        applyToClientLogin: data.get("applyToClientLogin") === "on",
        applyToEmployeeLogin: data.get("applyToEmployeeLogin") === "on",
        applyToAdminLogin: data.get("applyToAdminLogin") === "on",
        applyMatchingWebsitePalette:
          data.get("applyMatchingWebsitePalette") === "on",
        applyAxoTheme: data.get("applyAxoTheme") === "on",
        applyToSelectedRoutes: data.get("applyToSelectedRoutes") === "on",
        selectedRoutes,
        palette,
        paletteMatchMode: String(
          data.get("paletteMatchMode") || "balanced_writex"
        ),
        experienceConfig: {
          ...theme.experienceConfig,
          version: 1,
          headerPreset: String(
            data.get("headerPreset") || theme.experienceConfig.headerPreset
          ),
          heroPreset: String(
            data.get("heroPreset") || theme.experienceConfig.heroPreset
          ),
          innerPagePreset: String(
            data.get("innerPagePreset") ||
              theme.experienceConfig.innerPagePreset
          ),
          footerPreset: String(
            data.get("footerPreset") || theme.experienceConfig.footerPreset
          ),
          particlePreset: String(
            data.get("particlePreset") || theme.experienceConfig.particlePreset
          ),
          animationPreset: String(
            data.get("animationPreset") ||
              theme.experienceConfig.animationPreset
          ),
          animationEnabled: data.get("animationEnabled") === "on",
          animationIntensity: String(
            data.get("animationIntensity") ||
              theme.experienceConfig.animationIntensity
          ),
          desktopOnly: data.get("animationDesktopOnly") === "on",
          mobileSimplified: data.get("mobileSimplified") === "on",
          culturallySensitiveArtwork:
            data.get("culturallySensitiveArtwork") === "on",
          copyReviewStatus: String(
            data.get("copyReviewStatus") ||
              theme.experienceConfig.copyReviewStatus
          ),
          approvalStatus: String(
            data.get("approvalStatus") ||
              theme.experienceConfig.approvalStatus
          ),
          headerOrnaments,
          interpretation: {
            ...theme.experienceConfig.interpretation,
            sourceMode: String(
              data.get("themeSourceMode") ||
                theme.experienceConfig.interpretation.sourceMode
            ),
            publicArtworkMode: String(
              data.get("publicArtworkMode") ||
                theme.experienceConfig.interpretation.publicArtworkMode
            ),
            headerDensity: String(
              data.get("headerDensity") ||
                theme.experienceConfig.interpretation.headerDensity
            ),
            pageCoverage: String(
              data.get("pageCoverage") ||
                theme.experienceConfig.interpretation.pageCoverage
            ),
            motion: String(
              data.get("festiveMotion") ||
                theme.experienceConfig.interpretation.motion
            ),
            regions: {
              header: data.get("festiveRegionHeader") === "on",
              hero: data.get("festiveRegionHero") === "on",
              innerPages: data.get("festiveRegionInnerPages") === "on",
              footer: data.get("festiveRegionFooter") === "on",
              login: data.get("festiveRegionLogin") === "on",
              axo: data.get("festiveRegionAxo") === "on"
            },
            motifs: {
              garlands: data.get("festiveMotifGarlands") === "on",
              bells: data.get("festiveMotifBells") === "on",
              paperFans: data.get("festiveMotifPaperFans") === "on",
              leafVines: data.get("festiveMotifLeafVines") === "on",
              diyaGlow: data.get("festiveMotifDiyaGlow") === "on",
              warmParticles:
                data.get("festiveMotifWarmParticles") === "on",
              lightStrings: data.get("festiveMotifLightStrings") === "on",
              lanterns: data.get("festiveMotifLanterns") === "on",
              stars: data.get("festiveMotifStars") === "on",
              snow: data.get("festiveMotifSnow") === "on",
              colourBursts: data.get("festiveMotifColourBursts") === "on",
              fireworks: data.get("festiveMotifFireworks") === "on",
              confetti: data.get("festiveMotifConfetti") === "on",
              alpana: data.get("festiveMotifAlpana") === "on",
              ribbons: data.get("festiveMotifRibbons") === "on",
              kites: data.get("festiveMotifKites") === "on",
              moonLanterns: data.get("festiveMotifMoonLanterns") === "on",
              floralCorners: data.get("festiveMotifFloralCorners") === "on",
              harvest: data.get("festiveMotifHarvest") === "on",
              silhouettes: data.get("festiveMotifSilhouettes") === "on",
              dholAccent: data.get("festiveMotifDholAccent") === "on"
            }
          },
          sound: {
            ...theme.experienceConfig.sound,
            available: data.get("soundAvailable") === "on",
            enabled: data.get("soundEnabled") === "on",
            defaultState: String(
              data.get("soundDefaultState") ||
                theme.experienceConfig.sound.defaultState
            ),
            loop: data.get("soundLoop") === "on",
            volume: Math.min(
              0.5,
              Math.max(0, Number(data.get("soundVolume") || 0))
            ),
            desktopOnly: data.get("soundDesktopOnly") === "on",
            mobileEnabled: data.get("soundMobileEnabled") === "on",
            stopOnRouteExit: data.get("soundStopOnExit") === "on",
            stopOnThemeEnd: data.get("soundStopOnThemeEnd") === "on",
            showUserControl: data.get("soundShowUserControl") === "on",
            startMode: "user_interaction",
            rememberPreference: data.get("soundRememberPreference") === "on",
            culturallyReviewed: data.get("soundCulturallyReviewed") === "on"
          }
        },
        announcementBarEnabled: data.get("announcementBarEnabled") === "on",
        announcementBarText: String(data.get("announcementBarText") || "") || null,
        announcementBarCtaLabel:
          String(data.get("announcementBarCtaLabel") || "") || null,
        announcementBarCtaHref:
          String(data.get("announcementBarCtaHref") || "") || null
      },
      `${theme.name} settings saved.`
    );
  };

  const createTheme = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const created = await mutate(
      {
        action: "create",
        name: String(data.get("name") || ""),
        description: String(data.get("description") || ""),
        festivalType: String(
          data.get("festivalType") || "custom_one_time_event"
        ),
        experienceLevel: String(data.get("experienceLevel") || "standard")
      },
      "New event theme created as a safe draft."
    );
    if (!created) return;
    form.reset();
    setShowCreate(false);
  };

  const visibleThemes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return snapshot.themes.filter((theme) => {
      if (
        query &&
        !`${theme.name} ${categoryLabel(theme.festivalType)} ${theme.description}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      if (filter === "all") return true;
      if (["active", "scheduled", "draft", "archived"].includes(filter)) {
        return theme.status === filter;
      }
      if (filter === "login-uploaded") {
        return theme.assets.some(
          (asset) =>
            asset.status === "active" &&
            ["login_desktop", "login_mobile", "login_background"].includes(
              asset.role
            )
        );
      }
      if (filter === "website-generated") return theme.builtIn;
      return true;
    });
  }, [filter, search, snapshot.themes]);

  const activeTheme = snapshot.activeTheme;
  const previewTheme = snapshot.themes.find(
    (theme) => theme.id === previewThemeId
  );

  if (view === "dashboard") {
    return (
      <div className="grid gap-6">
        {(notice || error) && (
          <div
            role={error ? "alert" : "status"}
            className={`rounded-md border px-4 py-3 text-sm font-medium ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Active theme", activeTheme?.name || "Default WriteX"],
            [
              "Next scheduled",
              snapshot.nextScheduledTheme?.name || "No scheduled theme"
            ],
            [
              "Auto mode",
              snapshot.settings.autoScheduleEnabled ? "Enabled" : "Disabled"
            ],
            ["Fallback", snapshot.settings.defaultThemeSlug]
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wxIndigo500">
                {label}
              </p>
              <p className="mt-3 text-xl font-semibold text-wxIndigo900">
                {value}
              </p>
            </article>
          ))}
        </div>

        <AdminPanel
          title="Master controls"
          description="Simple global controls. Emergency disable and Restore Default both remove holiday styling immediately."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <ToggleRow
              label="Holiday Mode"
              description="Allow one approved holiday theme to affect eligible routes."
              checked={snapshot.settings.holidayModeEnabled}
              disabled={Boolean(busy)}
              onChange={(enabled) =>
                mutate({ action: "set_master", enabled }, `Holiday Mode ${enabled ? "enabled" : "disabled"}.`)
              }
            />
            <ToggleRow
              label="Auto Schedule"
              description="Resolve scheduled themes in Asia/Kolkata by priority and activation time."
              checked={snapshot.settings.autoScheduleEnabled}
              disabled={Boolean(busy)}
              onChange={(enabled) =>
                mutate({ action: "set_auto", enabled }, `Auto Schedule ${enabled ? "enabled" : "disabled"}.`)
              }
            />
            <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-4 py-3">
              <div>
                <p className="font-semibold text-wxIndigo900">Preview Mode</p>
                <p className="mt-1 text-xs text-wxIndigo500">
                  {previewTheme
                    ? `${previewTheme.name} is private to this Super Admin session.`
                    : "Choose a theme in the library to start a private preview."}
                </p>
              </div>
              {previewTheme ? (
                <button
                  type="button"
                  className={buttonSecondary}
                  disabled={Boolean(busy)}
                  onClick={() => mutate({ action: "clear_preview" }, "Preview ended.")}
                >
                  <Eye className="h-4 w-4" />
                  Turn off
                </button>
              ) : (
                <a
                  href="/admin/website-experience/holiday-themes"
                  className={buttonSecondary}
                >
                  <Eye className="h-4 w-4" />
                  Choose theme
                </a>
              )}
            </div>
            <div className="flex min-h-20 flex-wrap items-center justify-end gap-2 rounded-md border border-red-100 bg-red-50/55 px-4 py-3">
              <button
                type="button"
                className={buttonSecondary}
                disabled={Boolean(busy)}
                onClick={() =>
                  mutate({ action: "restore_default" }, "Default WriteX theme restored.")
                }
              >
                <RotateCcw className="h-4 w-4" />
                Restore Default
              </button>
              <button
                type="button"
                className={buttonDanger}
                disabled={Boolean(busy)}
                onClick={() =>
                  mutate({ action: "emergency_disable" }, "Emergency disable completed.")
                }
              >
                <ShieldAlert className="h-4 w-4" />
                Disable All
              </button>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Login theme control"
          description="Client, Employee and Admin login screens are independent from the public website palette. Admin Login remains default unless explicitly activated."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            {snapshot.loginControls.map((control) => {
              const label =
                control.channel === "client"
                  ? "Client Login"
                  : control.channel === "employee"
                    ? "Employee Login"
                    : "Admin Login";
              const previewRoute =
                control.channel === "client"
                  ? "/client-login"
                  : control.channel === "employee"
                    ? "/employee-login"
                    : "/admin/login";
              return (
                <section
                  key={control.channel}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-wxIndigo900">{label}</h3>
                      <p className="mt-1 text-xs text-wxIndigo500">
                        {control.mode === "default"
                          ? "Approved default login screen"
                          : "Holiday login theme"}
                      </p>
                    </div>
                    <AdminStatus status={control.state} />
                  </div>
                  <label className="mt-4 grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                    Holiday theme
                    <select
                      value={loginThemeSelection[control.channel]}
                      onChange={(event) =>
                        setLoginThemeSelection((current) => ({
                          ...current,
                          [control.channel]: event.target.value
                        }))
                      }
                      className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                    >
                      {snapshot.themes
                        .filter(
                          (theme) =>
                            theme.slug !== "default" &&
                            theme.status !== "archived"
                        )
                        .map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonPrimary}
                      disabled={
                        Boolean(busy) ||
                        !loginThemeSelection[control.channel]
                      }
                      onClick={() =>
                        mutate(
                          {
                            action: "set_login_channel",
                            channel: control.channel,
                            mode: "holiday",
                            state: "theme_active",
                            themeId: loginThemeSelection[control.channel]
                          },
                          `${label} holiday theme activated.`
                        )
                      }
                    >
                      <Power className="h-4 w-4" />
                      Activate
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={
                        Boolean(busy) ||
                        !loginThemeSelection[control.channel]
                      }
                      onClick={() =>
                        mutate(
                          {
                            action: "preview",
                            themeId: loginThemeSelection[control.channel]
                          },
                          `${label} preview opened.`,
                          { open: previewRoute }
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        mutate(
                          {
                            action: "set_login_channel",
                            channel: control.channel,
                            mode: "holiday",
                            state: "theme_paused",
                            themeId:
                              control.themeId ||
                              loginThemeSelection[control.channel] ||
                              null
                          },
                          `${label} holiday theme paused.`
                        )
                      }
                    >
                      <CirclePause className="h-4 w-4" />
                      Pause
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        mutate(
                          {
                            action: "set_login_channel",
                            channel: control.channel,
                            mode: "default",
                            state: "default_active",
                            themeId: null
                          },
                          `${label} restored to default.`
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore Default
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
          <form
            className="mt-4 grid gap-3 rounded-md border border-wxBorder bg-wxSurface p-4 md:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const start = String(data.get("loginStartAt") || "");
              const end = String(data.get("loginEndAt") || "");
              void mutate(
                {
                  action: "schedule_login_theme",
                  channel: "both",
                  themeId: loginThemeSelection.client,
                  startAt: start ? new Date(start).toISOString() : null,
                  endAt: end ? new Date(end).toISOString() : null
                },
                "Client and Employee login theme scheduled."
              );
            }}
          >
            <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
              Start
              <input
                name="loginStartAt"
                type="datetime-local"
                required
                className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
              End
              <input
                name="loginEndAt"
                type="datetime-local"
                required
                className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              className={`${buttonSecondary} self-end`}
              disabled={Boolean(busy) || !loginThemeSelection.client}
            >
              <CalendarClock className="h-4 w-4" />
              Schedule Both
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonSecondary}
              disabled={Boolean(busy) || !loginThemeSelection.client}
              onClick={() =>
                mutate(
                  {
                    action: "apply_login_theme_both",
                    themeId: loginThemeSelection.client
                  },
                  "Holiday login theme applied to Client and Employee."
                )
              }
            >
              Apply Theme Login to Client and Employee
            </button>
            <button
              type="button"
              className={buttonSecondary}
              disabled={Boolean(busy)}
              onClick={() =>
                mutate(
                  { action: "disable_login_theme" },
                  "Current login themes paused."
                )
              }
            >
              Disable Current Login Theme
            </button>
            <button
              type="button"
              className={buttonSecondary}
              disabled={Boolean(busy)}
              onClick={() =>
                mutate(
                  { action: "restore_login_defaults" },
                  "All login screens restored to default."
                )
              }
            >
              Restore All Login Screens
            </button>
            <button
              type="button"
              className={buttonDanger}
              disabled={Boolean(busy)}
              onClick={() =>
                mutate(
                  { action: "emergency_reset_logins" },
                  "Emergency login reset completed."
                )
              }
            >
              <ShieldAlert className="h-4 w-4" />
              Emergency Reset Login Screens
            </button>
          </div>
        </AdminPanel>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminPanel
            title="Current experience"
            description="The resolver exposes only one theme publicly. Preview never changes this status."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Public state", activeTheme ? "active" : "default"],
                ["Page scope", activeTheme?.scope || "entire_public"],
                [
                  "Last switched",
                  snapshot.settings.lastSwitchedAt
                    ? new Date(snapshot.settings.lastSwitchedAt).toLocaleString("en-IN")
                    : "Not switched"
                ],
                ["Asset state", activeTheme ? completeness(activeTheme) : "Complete"]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-wxIndigo400">
                    {label}
                  </p>
                  <p className="mt-2 font-semibold text-wxIndigo800">{value}</p>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel
            title="Readiness alerts"
            description="Missing optional assets use tested built-in fallbacks and do not break pages."
          >
            {snapshot.assetWarnings.length ? (
              <ul className="grid gap-2 text-sm leading-6 text-wxIndigo600">
                {snapshot.assetWarnings.slice(0, 6).map((warning) => (
                  <li key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    {warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                No active-theme asset warning is present.
              </p>
            )}
          </AdminPanel>
        </div>

        <AdminPanel
          title="Recent experience audit"
          description="Activation, scheduling, assets, fallback and emergency actions are recorded without secrets."
        >
          <div className="grid gap-2">
            {snapshot.audits.length ? (
              snapshot.audits.slice(0, 12).map((audit) => (
                <div
                  key={audit.id}
                  className="grid gap-2 rounded-md border border-wxBorder px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-wxIndigo800">
                      {audit.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-wxIndigo500">
                      {audit.themeName || "Global controls"} ·{" "}
                      {audit.actorName || "Automatic resolver"} ·{" "}
                      {audit.affectedScope || "Global"}
                    </p>
                  </div>
                  <time className="text-xs text-wxIndigo400">
                    {new Date(audit.createdAt).toLocaleString("en-IN")}
                  </time>
                </div>
              ))
            ) : (
              <p className="text-sm text-wxIndigo500">No theme action has been recorded yet.</p>
            )}
          </div>
        </AdminPanel>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {(notice || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-md border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}
      <AdminPanel
        title="Theme library"
        description="Starter templates and custom events share one controlled system. New themes are safe drafts and require no code deployment."
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search themes</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search themes"
              className="min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface pl-10 pr-3 text-sm text-wxIndigo900"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as ThemeFilter)}
            className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
            aria-label="Filter themes"
          >
            <option value="all">All themes</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="login-uploaded">Login theme uploaded</option>
            <option value="website-generated">Website theme generated</option>
          </select>
          <button
            type="button"
            className={buttonPrimary}
            disabled={Boolean(busy)}
            aria-expanded={showCreate}
            onClick={() => setShowCreate((current) => !current)}
          >
            <Plus className="h-4 w-4" />
            Create event theme
          </button>
        </div>
        {showCreate ? (
          <form
            onSubmit={createTheme}
            className="mt-4 grid gap-4 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                Theme name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="WriteX milestone"
                  className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                Category
                <select
                  name="festivalType"
                  defaultValue="custom_one_time_event"
                  className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal"
                >
                  {HOLIDAY_THEME_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                Theme level
                <select
                  name="experienceLevel"
                  defaultValue="standard"
                  className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal"
                >
                  {HOLIDAY_EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {experienceLevelLabels[level]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
              Description
              <textarea
                name="description"
                maxLength={500}
                rows={2}
                placeholder="Describe the event and intended visual treatment."
                className="rounded-md border border-wxBorder bg-wxSurface px-3 py-2 font-normal"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className={buttonPrimary}
                disabled={Boolean(busy)}
              >
                <Plus className="h-4 w-4" />
                Create safe draft
              </button>
              <button
                type="button"
                className={buttonSecondary}
                disabled={Boolean(busy)}
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </AdminPanel>

      <div className="grid gap-5">
        {visibleThemes.map((theme) => (
          <article
            key={theme.id}
            data-state={
              theme.status === "active" || previewThemeId === theme.id
                ? "selected"
                : "default"
            }
            className="wx-interactive-state overflow-hidden rounded-lg border shadow-soft"
            style={{
              borderTopColor: theme.palette.accent,
              borderTopWidth: 3
            }}
          >
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-wxIndigo900">
                    {theme.name}
                  </h2>
                  <AdminStatus status={theme.status} />
                  {theme.builtIn ? (
                    <AdminStatusBadge tone="info">Starter template</AdminStatusBadge>
                  ) : null}
                  {previewThemeId === theme.id ? (
                    <AdminStatusBadge tone="warning">Private preview</AdminStatusBadge>
                  ) : null}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-wxIndigo500">
                  {theme.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-wxIndigo500">
                  <span>Scope: {theme.scope.replaceAll("_", " ")}</span>
                  <span>Category: {categoryLabel(theme.festivalType)}</span>
                  <span>
                    Level: {experienceLevelLabels[theme.experienceLevel]}
                  </span>
                  <span>Priority: {theme.priority}</span>
                  <span>Assets: {completeness(theme)}</span>
                  <span>Mode: {theme.mode}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                <button
                  type="button"
                  className={buttonSecondary}
                  disabled={Boolean(busy) || theme.status === "archived"}
                  onClick={() =>
                    mutate(
                      { action: "preview", themeId: theme.id },
                      `Preview ${theme.name}`,
                      { open: "/" }
                    )
                  }
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
                {theme.status !== "active" && theme.slug !== "default" ? (
                  <button
                    type="button"
                    className={buttonPrimary}
                    disabled={
                      Boolean(busy) ||
                      theme.status === "archived" ||
                      ["pending_review", "needs_review", "failed"].includes(
                        theme.paletteDetectionStatus
                      )
                    }
                    title={
                      ["pending_review", "needs_review", "failed"].includes(
                        theme.paletteDetectionStatus
                      )
                        ? "Approve the detected palette before activation"
                        : "Activate theme"
                    }
                    onClick={() =>
                      mutate(
                        { action: "activate", themeId: theme.id },
                        `${theme.name} activated.`
                      )
                    }
                  >
                    <Power className="h-4 w-4" />
                    Activate
                  </button>
                ) : null}
                {theme.status === "active" ? (
                  <button
                    type="button"
                    className={buttonSecondary}
                    disabled={Boolean(busy)}
                    onClick={() =>
                      mutate(
                        { action: "deactivate", themeId: theme.id },
                        `${theme.name} deactivated.`
                      )
                    }
                  >
                    <CirclePause className="h-4 w-4" />
                    Deactivate
                  </button>
                ) : null}
                {theme.status === "paused" ? (
                  <button
                    type="button"
                    className={buttonSecondary}
                    disabled={Boolean(busy)}
                    onClick={() =>
                      mutate(
                        { action: "resume", themeId: theme.id },
                        `${theme.name} resumed.`
                      )
                    }
                  >
                    <CirclePlay className="h-4 w-4" />
                    Resume
                  </button>
                ) : null}
                <button
                  type="button"
                  className={buttonSecondary}
                  disabled={Boolean(busy) || theme.status === "archived"}
                  onClick={() =>
                    mutate(
                      { action: "duplicate", themeId: theme.id },
                      `${theme.name} duplicated.`
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                {theme.slug !== "default" && theme.status !== "archived" ? (
                  <button
                    type="button"
                    className={buttonDanger}
                    disabled={Boolean(busy)}
                    onClick={() =>
                      mutate(
                        { action: "archive", themeId: theme.id },
                        `${theme.name} archived.`
                      )
                    }
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                ) : null}
              </div>
            </div>

            <details className="border-t border-wxBorder">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 text-sm font-semibold text-wxViolet700">
                <Sparkles className="h-4 w-4" />
                Open theme details, scheduling and assets
              </summary>
              <div className="grid gap-6 border-t border-wxBorder bg-wxSurfaceSoft/55 p-5 xl:grid-cols-[1.35fr_0.65fr]">
                <form onSubmit={(event) => saveTheme(event, theme)} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Theme name
                      <input name="name" defaultValue={theme.name} required maxLength={100} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Category
                      <select
                        name="festivalType"
                        defaultValue={theme.festivalType}
                        disabled={theme.festivalType === "system_default"}
                        className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal disabled:opacity-70"
                      >
                        {theme.festivalType === "system_default" ? (
                          <option value="system_default">System default</option>
                        ) : null}
                        {HOLIDAY_THEME_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {categoryLabels[category]}
                          </option>
                        ))}
                      </select>
                      {theme.festivalType === "system_default" ? (
                        <input
                          type="hidden"
                          name="festivalType"
                          value="system_default"
                        />
                      ) : null}
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Status
                      <select name="status" defaultValue={["active", "archived"].includes(theme.status) ? "draft" : theme.status} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal">
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="paused">Paused</option>
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                    Description
                    <textarea name="description" defaultValue={theme.description} maxLength={500} rows={2} className="rounded-md border border-wxBorder bg-wxSurface px-3 py-2 font-normal" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Start
                      <input name="startAt" type="datetime-local" defaultValue={localDateTime(theme.startAt)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      End
                      <input name="endAt" type="datetime-local" defaultValue={localDateTime(theme.endAt)} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Timezone
                      <select name="timezone" defaultValue={theme.timezone} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal">
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Priority
                      <input name="priority" type="number" min={0} max={1000} defaultValue={theme.priority} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Mode
                      <select name="mode" defaultValue={theme.mode} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal">
                        <option value="manual">Manual</option>
                        <option value="automatic">Automatic</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Page scope
                      <select name="scope" defaultValue={theme.scope} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal">
                        <option value="entire_public">Entire public website</option>
                        <option value="homepage">Homepage only</option>
                        <option value="header_only">Header only</option>
                        <option value="login_screens">Login screens only</option>
                        <option value="selected_pages">Selected pages</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Theme level
                      <select name="experienceLevel" defaultValue={theme.experienceLevel} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal">
                        {HOLIDAY_EXPERIENCE_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {experienceLevelLabels[level]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Colour matching
                      <select
                        name="paletteMatchMode"
                        defaultValue={theme.paletteMatchMode}
                        className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal"
                      >
                        {HOLIDAY_PALETTE_MATCH_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {paletteMatchModeLabels[mode]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <fieldset className="grid gap-4 rounded-md border border-wxBorder bg-wxSurface p-4">
                    <legend className="px-1 text-sm font-semibold text-wxIndigo700">
                      Reference image interpretation
                    </legend>
                    <p className="text-sm leading-6 text-wxIndigo500">
                      Reference images stay private. WriteX extracts the approved
                      palette and rebuilds the visual language as reusable
                      garlands, bells, fans, vines, diya light and warm
                      particles. A raw image is public only when it is uploaded
                      separately and Explicit Public Banner is selected.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Theme source
                        <select
                          name="themeSourceMode"
                          defaultValue={
                            theme.experienceConfig.interpretation.sourceMode
                          }
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_THEME_SOURCE_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode === "reference_image"
                                ? "Reference Image (interpreted)"
                                : "Asset Composition"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Public artwork
                        <select
                          name="publicArtworkMode"
                          defaultValue={
                            theme.experienceConfig.interpretation
                              .publicArtworkMode
                          }
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_PUBLIC_ARTWORK_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {mode === "interpreted_motifs"
                                ? "Interpreted Motifs"
                                : "Explicit Public Banner"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Header density
                        <select
                          name="headerDensity"
                          defaultValue={
                            theme.experienceConfig.interpretation.headerDensity
                          }
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_DECORATION_DENSITIES.map((density) => (
                            <option key={density} value={density}>
                              {density[0]?.toUpperCase()}
                              {density.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Page coverage
                        <select
                          name="pageCoverage"
                          defaultValue={
                            theme.experienceConfig.interpretation.pageCoverage
                          }
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_PAGE_COVERAGE.map((coverage) => (
                            <option key={coverage} value={coverage}>
                              {coverage.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Motion
                        <select
                          name="festiveMotion"
                          defaultValue={
                            theme.experienceConfig.interpretation.motion
                          }
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_MOTION_LEVELS.map((motion) => (
                            <option key={motion} value={motion}>
                              {motion[0]?.toUpperCase()}
                              {motion.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                          Festive regions
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            [
                              "festiveRegionHeader",
                              "Header",
                              theme.experienceConfig.interpretation.regions
                                .header
                            ],
                            [
                              "festiveRegionHero",
                              "Homepage hero",
                              theme.experienceConfig.interpretation.regions.hero
                            ],
                            [
                              "festiveRegionInnerPages",
                              "Inner pages",
                              theme.experienceConfig.interpretation.regions
                                .innerPages
                            ],
                            [
                              "festiveRegionFooter",
                              "Footer",
                              theme.experienceConfig.interpretation.regions
                                .footer
                            ],
                            [
                              "festiveRegionLogin",
                              "Login screens",
                              theme.experienceConfig.interpretation.regions.login
                            ],
                            [
                              "festiveRegionAxo",
                              "Axo",
                              theme.experienceConfig.interpretation.regions.axo
                            ]
                          ].map(([name, label, checked]) => (
                            <label
                              key={String(name)}
                              className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm text-wxIndigo700"
                            >
                              <input
                                name={String(name)}
                                type="checkbox"
                                defaultChecked={Boolean(checked)}
                              />
                              {String(label)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                          Interpreted motifs
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            [
                              "festiveMotifGarlands",
                              "Marigold garlands",
                              theme.experienceConfig.interpretation.motifs
                                .garlands
                            ],
                            [
                              "festiveMotifBells",
                              "Hanging bells",
                              theme.experienceConfig.interpretation.motifs.bells
                            ],
                            [
                              "festiveMotifPaperFans",
                              "Radial paper fans",
                              theme.experienceConfig.interpretation.motifs
                                .paperFans
                            ],
                            [
                              "festiveMotifLeafVines",
                              "Leafy vines",
                              theme.experienceConfig.interpretation.motifs
                                .leafVines
                            ],
                            [
                              "festiveMotifDiyaGlow",
                              "Diya glow",
                              theme.experienceConfig.interpretation.motifs
                                .diyaGlow
                            ],
                            [
                              "festiveMotifWarmParticles",
                              "Warm particles",
                              theme.experienceConfig.interpretation.motifs
                                .warmParticles
                            ],
                            [
                              "festiveMotifLightStrings",
                              "Festive light strings",
                              theme.experienceConfig.interpretation.motifs
                                .lightStrings
                            ],
                            [
                              "festiveMotifLanterns",
                              "Lantern clusters",
                              theme.experienceConfig.interpretation.motifs
                                .lanterns
                            ],
                            [
                              "festiveMotifStars",
                              "Star field",
                              theme.experienceConfig.interpretation.motifs.stars
                            ],
                            [
                              "festiveMotifSnow",
                              "Snow accents",
                              theme.experienceConfig.interpretation.motifs.snow
                            ],
                            [
                              "festiveMotifColourBursts",
                              "Colour bursts",
                              theme.experienceConfig.interpretation.motifs
                                .colourBursts
                            ],
                            [
                              "festiveMotifFireworks",
                              "Controlled fireworks",
                              theme.experienceConfig.interpretation.motifs
                                .fireworks
                            ],
                            [
                              "festiveMotifConfetti",
                              "Confetti",
                              theme.experienceConfig.interpretation.motifs
                                .confetti
                            ],
                            [
                              "festiveMotifAlpana",
                              "Alpana / regional corner",
                              theme.experienceConfig.interpretation.motifs.alpana
                            ],
                            [
                              "festiveMotifRibbons",
                              "Ribbon wave",
                              theme.experienceConfig.interpretation.motifs.ribbons
                            ],
                            [
                              "festiveMotifKites",
                              "Kite accents",
                              theme.experienceConfig.interpretation.motifs.kites
                            ],
                            [
                              "festiveMotifMoonLanterns",
                              "Moon and lantern layer",
                              theme.experienceConfig.interpretation.motifs
                                .moonLanterns
                            ],
                            [
                              "festiveMotifFloralCorners",
                              "Floral corners",
                              theme.experienceConfig.interpretation.motifs
                                .floralCorners
                            ],
                            [
                              "festiveMotifHarvest",
                              "Harvest accents",
                              theme.experienceConfig.interpretation.motifs.harvest
                            ],
                            [
                              "festiveMotifSilhouettes",
                              "Seasonal silhouettes",
                              theme.experienceConfig.interpretation.motifs
                                .silhouettes
                            ],
                            [
                              "festiveMotifDholAccent",
                              "Dhol / dhaak rhythm accent",
                              theme.experienceConfig.interpretation.motifs
                                .dholAccent
                            ]
                          ].map(([name, label, checked]) => (
                            <label
                              key={String(name)}
                              className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm text-wxIndigo700"
                            >
                              <input
                                name={String(name)}
                                type="checkbox"
                                defaultChecked={Boolean(checked)}
                              />
                              {String(label)}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </fieldset>
                  <HeaderOrnamentEditor
                    key={`${theme.id}-${theme.updatedAt}`}
                    initialConfig={theme.experienceConfig.headerOrnaments}
                    assetVariants={theme.assets
                      .filter(
                        (asset) =>
                          asset.role === "header" &&
                          ["active", "staged"].includes(asset.status) &&
                          asset.variant.startsWith("ornament-")
                      )
                      .map((asset) => asset.variant)}
                  />
                  <fieldset className="grid gap-4 rounded-md border border-wxBorder bg-wxSurface p-4">
                    <legend className="px-1 text-sm font-semibold text-wxIndigo700">
                      Festival experience pack
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Header preset
                        <select
                          name="headerPreset"
                          defaultValue={theme.experienceConfig.headerPreset}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_HEADER_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Hero preset
                        <select
                          name="heroPreset"
                          defaultValue={theme.experienceConfig.heroPreset}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_HERO_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Inner-page preset
                        <select
                          name="innerPagePreset"
                          defaultValue={theme.experienceConfig.innerPagePreset}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_INNER_PAGE_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Footer preset
                        <select
                          name="footerPreset"
                          defaultValue={theme.experienceConfig.footerPreset}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_FOOTER_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Particle preset
                        <select
                          name="particlePreset"
                          defaultValue={theme.experienceConfig.particlePreset}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_PARTICLE_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Animation preset
                        <select
                          name="animationPreset"
                          defaultValue={theme.experienceConfig.animationPreset}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_ANIMATION_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Animation intensity
                        <select
                          name="animationIntensity"
                          defaultValue={theme.experienceConfig.animationIntensity}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          {HOLIDAY_ANIMATION_INTENSITIES.map((intensity) => (
                            <option key={intensity} value={intensity}>
                              {intensity}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        [
                          "animationEnabled",
                          "Animation enabled",
                          theme.experienceConfig.animationEnabled
                        ],
                        [
                          "animationDesktopOnly",
                          "Desktop only",
                          theme.experienceConfig.desktopOnly
                        ],
                        [
                          "mobileSimplified",
                          "Mobile simplified",
                          theme.experienceConfig.mobileSimplified
                        ],
                        [
                          "culturallySensitiveArtwork",
                          "Cultural artwork review required",
                          theme.experienceConfig.culturallySensitiveArtwork
                        ]
                      ].map(([name, label, checked]) => (
                        <label
                          key={String(name)}
                          className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm text-wxIndigo700"
                        >
                          <input
                            name={String(name)}
                            type="checkbox"
                            defaultChecked={Boolean(checked)}
                          />
                          {String(label)}
                        </label>
                      ))}
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Copy review
                        <select
                          name="copyReviewStatus"
                          defaultValue={theme.experienceConfig.copyReviewStatus}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          <option value="approved">Approved</option>
                          <option value="awaiting_review">Awaiting review</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Pack approval
                        <select
                          name="approvalStatus"
                          defaultValue={theme.experienceConfig.approvalStatus}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          <option value="draft">Draft</option>
                          <option value="awaiting_approval">Awaiting approval</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        [
                          "soundAvailable",
                          "Sound available",
                          theme.experienceConfig.sound.available
                        ],
                        [
                          "soundEnabled",
                          "Sound enabled",
                          theme.experienceConfig.sound.enabled
                        ],
                        [
                          "soundLoop",
                          "Loop",
                          theme.experienceConfig.sound.loop
                        ],
                        [
                          "soundDesktopOnly",
                          "Desktop only",
                          theme.experienceConfig.sound.desktopOnly
                        ],
                        [
                          "soundMobileEnabled",
                          "Mobile enabled",
                          theme.experienceConfig.sound.mobileEnabled
                        ],
                        [
                          "soundStopOnExit",
                          "Stop on route exit",
                          theme.experienceConfig.sound.stopOnRouteExit
                        ],
                        [
                          "soundStopOnThemeEnd",
                          "Stop when theme ends",
                          theme.experienceConfig.sound.stopOnThemeEnd
                        ],
                        [
                          "soundShowUserControl",
                          "Show user sound control",
                          theme.experienceConfig.sound.showUserControl
                        ],
                        [
                          "soundRememberPreference",
                          "Remember user preference",
                          theme.experienceConfig.sound.rememberPreference
                        ],
                        [
                          "soundCulturallyReviewed",
                          "Audio reviewed/licensed",
                          theme.experienceConfig.sound.culturallyReviewed
                        ]
                      ].map(([name, label, checked]) => (
                        <label
                          key={String(name)}
                          className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo700"
                        >
                          <input
                            name={String(name)}
                            type="checkbox"
                            defaultChecked={Boolean(checked)}
                          />
                          {String(label)}
                        </label>
                      ))}
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Default sound state
                        <select
                          name="soundDefaultState"
                          defaultValue={theme.experienceConfig.sound.defaultState}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        >
                          <option value="off">Off</option>
                          <option value="muted">Muted</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
                        Maximum volume (0–0.5)
                        <input
                          name="soundVolume"
                          type="number"
                          min={0}
                          max={0.5}
                          step={0.05}
                          defaultValue={theme.experienceConfig.sound.volume}
                          className="min-h-10 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-normal"
                        />
                      </label>
                    </div>
                  </fieldset>
                  <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                    Selected routes (comma or line separated)
                    <textarea name="selectedRoutes" defaultValue={theme.selectedRoutes.join("\n")} rows={2} placeholder="/pricing&#10;/careers" className="rounded-md border border-wxBorder bg-wxSurface px-3 py-2 font-normal" />
                  </label>
                  <PaletteReview theme={theme} />
                  <fieldset className="grid gap-3 rounded-md border border-wxBorder bg-wxSurface p-4">
                    <legend className="px-1 text-sm font-semibold text-wxIndigo700">
                      Approved palette
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        ["paletteAccent", "Primary", theme.palette.accent],
                        ["paletteAccentSoft", "Soft", theme.palette.accentSoft],
                        ["paletteAccentWarm", "Warm", theme.palette.accentWarm],
                        [
                          "paletteTextOnAccent",
                          "Text",
                          theme.palette.textOnAccent
                        ],
                        [
                          "paletteSurfaceTint",
                          "Surface",
                          theme.palette.surfaceTint
                        ]
                      ].map(([name, label, value]) => (
                        <label
                          key={name}
                          className="grid gap-1.5 text-xs font-semibold text-wxIndigo600"
                        >
                          {label}
                          <span className="flex min-h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-2">
                            <input
                              name={name}
                              type="color"
                              defaultValue={value}
                              aria-label={`${label} palette colour`}
                              className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
                            />
                            <span className="font-mono text-[11px] uppercase">
                              {value}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["repeatYearly", "Repeat yearly", theme.repeatYearly],
                      ["isEnabled", "Theme enabled", theme.isEnabled],
                      ["applyToHeader", "Header", theme.applyToHeader],
                      ["applyToFooter", "Footer", theme.applyToFooter],
                      ["applyToHomepage", "Homepage", theme.applyToHomepage],
                      ["applyToLoginScreens", "Login theme master", theme.applyToLoginScreens],
                      ["applyToClientLogin", "Customer Login", theme.applyToClientLogin],
                      ["applyToEmployeeLogin", "Employee Login", theme.applyToEmployeeLogin],
                      ["applyToAdminLogin", "Admin Login", theme.applyToAdminLogin],
                      [
                        "applyMatchingWebsitePalette",
                        "Website palette",
                        theme.applyMatchingWebsitePalette
                      ],
                      ["applyAxoTheme", "Axo theme", theme.applyAxoTheme],
                      ["applyToSelectedRoutes", "Selected routes", theme.applyToSelectedRoutes],
                      ["announcementBarEnabled", "Announcement bar", theme.announcementBarEnabled]
                    ].map(([name, label, checked]) => (
                      <label key={String(name)} className="flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo700">
                        <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} />
                        {String(label)}
                      </label>
                    ))}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Announcement
                      <input name="announcementBarText" defaultValue={theme.announcementBarText || ""} maxLength={180} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      CTA label
                      <input name="announcementBarCtaLabel" defaultValue={theme.announcementBarCtaLabel || ""} maxLength={40} className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      CTA route
                      <input name="announcementBarCtaHref" defaultValue={theme.announcementBarCtaHref || ""} placeholder="/careers" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal" />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      value="save"
                      className={buttonPrimary}
                      disabled={Boolean(busy)}
                    >
                      <CalendarClock className="h-4 w-4" />
                      Save &amp; Schedule
                    </button>
                    <button
                      type="submit"
                      value="accept_detected_palette"
                      className={buttonSecondary}
                      disabled={Boolean(busy) || !theme.detectedPalette}
                    >
                      <Sparkles className="h-4 w-4" />
                      Accept Detected Palette
                    </button>
                    <button
                      type="submit"
                      value="approve_manual_palette"
                      className={buttonSecondary}
                      disabled={Boolean(busy)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Approve Adjusted Palette
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        mutate(
                          { action: "detect_palette", themeId: theme.id },
                          `${theme.name} palette regenerated.`
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Regenerate Palette
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        mutate(
                          { action: "reset_safe_palette", themeId: theme.id },
                          `${theme.name} reset to the safe WriteX palette.`
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Safe Palette
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={Boolean(busy) || previewThemeId !== theme.id}
                      onClick={() =>
                        mutate(
                          { action: "clear_preview" },
                          "Private preview cancelled."
                        )
                      }
                    >
                      <CirclePause className="h-4 w-4" />
                      Cancel Preview
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      disabled={Boolean(busy)}
                      onClick={() =>
                        mutate(
                          { action: "restore_default" },
                          "Default WriteX theme restored."
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore Default
                    </button>
                  </div>
                </form>

                <div>
                  <h3 className="font-semibold text-wxIndigo900">Private assets</h3>
                  <p className="mt-1 text-sm leading-6 text-wxIndigo500">
                    PNG, JPG, WebP or strictly sanitised static SVG up to 5 MB.
                    MP3, OGG and WAV ambience is limited to 12 MB. Every upload
                    is staged for Super Admin approval. HTML, JavaScript, active
                    SVG and executable packages are rejected. Header ornaments
                    require a transparent PNG/WebP of at least 256 by 256 pixels
                    or a sanitised SVG.
                  </p>
                  {(() => {
                    const referenceAsset =
                      theme.assets.find(
                        (asset) =>
                          asset.role === "reference_image" &&
                          ["active", "staged"].includes(asset.status)
                      ) ||
                      (theme.experienceConfig.interpretation.sourceMode ===
                      "reference_image"
                        ? theme.assets.find(
                            (asset) =>
                              asset.role === "hero_art" &&
                              ["active", "staged"].includes(asset.status)
                          )
                        : null);
                    if (!referenceAsset) return null;
                    return (
                      <div className="mt-4 overflow-hidden rounded-md border border-wxBorder bg-wxSurface">
                        <div className="border-b border-wxBorder px-4 py-3">
                          <p className="text-sm font-semibold text-wxIndigo900">
                            Private festival reference
                          </p>
                          <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                            Admin-only source. It informs palette and motifs and
                            is not returned by the public theme API.
                          </p>
                        </div>
                        <div className="relative aspect-[16/8] bg-wxSurfaceSoft">
                          <Image
                            src={`/api/admin/website-experience/assets?assetId=${encodeURIComponent(referenceAsset.id)}`}
                            alt={`${theme.name} private reference`}
                            fill
                            unoptimized
                            sizes="(min-width: 1280px) 28rem, 90vw"
                            className="object-contain"
                          />
                        </div>
                      </div>
                    );
                  })()}
                  <form
                    onSubmit={(event) => uploadAsset(event, theme.id)}
                    className="mt-4 grid gap-3 rounded-md border border-wxBorder bg-wxSurface p-4"
                  >
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Asset role
                      <select name="role" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal">
                        <option value="reference_image">Festival reference image (private)</option>
                        <option value="login_desktop">Login desktop</option>
                        <option value="login_mobile">Login mobile</option>
                        <option value="login_background">Shared login background</option>
                        <option value="hero_art">Explicit public banner artwork</option>
                        <option value="decorative_overlay">Decorative overlay</option>
                        <option value="particle_overlay">Particle overlay</option>
                        <option value="logo_overlay">Logo-safe overlay</option>
                        <option value="axo">Axo costume / pose</option>
                        <option value="axo_animation">Axo animation asset</option>
                        <option value="header">Header ornament</option>
                        <option value="supporting">Supporting decoration</option>
                        <option value="mobile_fallback">Mobile fallback</option>
                        <option value="reduced_motion">Reduced-motion fallback</option>
                        <option value="audio">Festive ambience audio</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Asset variant
                      <input
                        name="variant"
                        defaultValue="default"
                        pattern="[a-z0-9][a-z0-9-]*"
                        maxLength={40}
                        required
                        className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 font-normal"
                      />
                      <span className="text-xs font-normal leading-5 text-wxIndigo500">
                        Use ornament-name for uploaded header ornaments.
                        Primary sound may use primary or default; fallback sound
                        may use fallback.
                      </span>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-wxIndigo700">
                      Media file
                      <input name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/svg+xml,audio/mpeg,audio/ogg,audio/wav,audio/x-wav" className="min-h-11 rounded-md border border-wxBorder bg-wxSurface px-3 py-2 font-normal" />
                    </label>
                    <button type="submit" className={buttonSecondary} disabled={Boolean(busy)}>
                      <ImageUp className="h-4 w-4" />
                      Upload privately
                    </button>
                  </form>
                  <ul className="mt-3 grid gap-2">
                    {theme.assets
                      .filter((asset) =>
                        ["active", "staged"].includes(asset.status)
                      )
                      .map((asset) => (
                        <li
                          key={asset.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-xs text-wxIndigo600"
                        >
                          <span className="min-w-0">
                            <strong>{asset.role.replaceAll("_", " ")}</strong>
                            <span className="ml-1 text-wxIndigo400">
                              ({asset.variant})
                            </span>
                            <span className="mt-1 block truncate">{asset.safeFileName}</span>
                            <span className="mt-1 block font-semibold uppercase tracking-[0.08em]">
                              {asset.status === "staged"
                                ? "staged"
                                : asset.reviewStatus.replaceAll("_", " ")}
                            </span>
                            {asset.role === "audio" ? (
                              <audio
                                controls
                                preload="metadata"
                                className="mt-2 h-9 max-w-full"
                                src={`/api/admin/website-experience/assets?assetId=${encodeURIComponent(asset.id)}`}
                              >
                                Audio preview is not supported by this browser.
                              </audio>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            {asset.status === "staged" ? (
                              <>
                                <button
                                  type="button"
                                  className="inline-flex min-h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 font-semibold text-emerald-800"
                                  disabled={Boolean(busy)}
                                  onClick={() => reviewAsset(asset.id, "approved")}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex min-h-9 items-center rounded-md border border-red-200 bg-red-50 px-2 font-semibold text-red-700"
                                  disabled={Boolean(busy)}
                                  onClick={() => reviewAsset(asset.id, "rejected")}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Archive ${asset.role.replaceAll("_", " ")} asset`}
                              title="Archive private asset"
                              disabled={Boolean(busy)}
                              onClick={() => removeAsset(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </span>
                        </li>
                      ))}
                  </ul>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      ["/", "Homepage / Axo"],
                      ["/trust-centre", "Trust Centre"],
                      ["/client-login", "Customer Login"],
                      ["/employee-login", "Employee Login"],
                      ["/pricing", "Inner page / header"],
                      ["/contact", "Footer / inner page"]
                    ].map(([href, label]) => (
                      <button
                        key={href}
                        type="button"
                        className={buttonSecondary}
                        disabled={Boolean(busy)}
                        onClick={() =>
                          mutate(
                            { action: "preview", themeId: theme.id },
                            `Preview ${theme.name}`,
                            { open: href }
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
