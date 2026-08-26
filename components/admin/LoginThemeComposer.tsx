"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Eye,
  Monitor,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import { useMemo, useState } from "react";
import { AdminStatusBadge } from "@/components/admin/AdminPrimitives";
import {
  defaultHolidayLoginComposition,
  LOGIN_HERO_RESPONSIVE_WIDTHS,
  loginCompositionActivationErrors
} from "@/lib/holiday/login-theme";
import {
  LOGIN_HERO_ASPECT_RATIO_FAMILIES,
  LOGIN_HERO_VARIANTS
} from "@/lib/holiday/login-hero";
import { DESIGNER_LOGIN_PACKS } from "@/lib/holiday/designer-login-packs";
import type {
  HolidayExperienceSnapshot,
  HolidayLoginChannel,
  HolidayLoginCompositionConfig,
  HolidayLoginHeroBreakpoint,
  HolidayLoginSourceMode,
  HolidayTheme
} from "@/lib/holiday/types";

type ComposerTab =
  | "overview"
  | "hero"
  | "form"
  | "background"
  | "variants"
  | "client"
  | "employee"
  | "preview"
  | "activation"
  | "versions";

const tabs: Array<{ id: ComposerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "hero", label: "Hero" },
  { id: "form", label: "Form Skin" },
  { id: "background", label: "Background" },
  { id: "variants", label: "Light / Dark Variants" },
  { id: "client", label: "Client Login" },
  { id: "employee", label: "Employee Login" },
  { id: "preview", label: "Preview" },
  { id: "activation", label: "Schedule & Activation" },
  { id: "versions", label: "Versions & Audit" }
];

const fieldClass =
  "min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none transition focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15";
const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-not-allowed disabled:opacity-45";
const primaryButton = `${buttonBase} wx-gradient-action border-transparent text-white`;
const secondaryButton = `${buttonBase} border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700`;
const dangerButton = `${buttonBase} border-red-200 bg-red-50 text-red-700 hover:border-red-400`;

const cropDevices: Array<{
  id: HolidayLoginHeroBreakpoint;
  label: string;
}> = [
  { id: "desktopWide", label: "Desktop Wide" },
  { id: "desktopSplit", label: "Desktop Split" },
  { id: "tablet", label: "Tablet" },
  { id: "mobileBanner", label: "Mobile Banner" },
  { id: "mobilePortrait", label: "Mobile Portrait" }
];

const previewWidths = [1440, 1024, 768, 390, 360] as const;

function humanMode(mode: string) {
  return mode
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 text-sm font-semibold text-wxIndigo900">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-xs text-wxIndigo500">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-wxViolet700"
      />
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700">
      {label}
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-wxIndigo500">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-9 cursor-pointer border-0 bg-transparent p-0"
          aria-label={`${label} colour`}
        />
      </span>
    </label>
  );
}

export function LoginThemeComposer({
  snapshot,
  selectedThemeId,
  onThemeChange,
  busy,
  onAction,
  onPreview
}: {
  snapshot: HolidayExperienceSnapshot;
  selectedThemeId: string;
  onThemeChange: (themeId: string) => void;
  busy: boolean;
  onAction: (
    action: Record<string, unknown>,
    notice: string
  ) => Promise<HolidayExperienceSnapshot | null>;
  onPreview: (theme: HolidayTheme) => Promise<void>;
}) {
  const [tab, setTab] = useState<ComposerTab>("overview");
  const [channel, setChannel] = useState<HolidayLoginChannel>("client");
  const [cropDevice, setCropDevice] =
    useState<HolidayLoginHeroBreakpoint>("desktopSplit");
  const [previewAppearance, setPreviewAppearance] = useState<"light" | "dark">(
    "light"
  );
  const control = snapshot.loginControls.find(
    (item) => item.channel === channel
  );
  const [draft, setDraft] = useState<HolidayLoginCompositionConfig>(
    control?.compositionConfig || defaultHolidayLoginComposition()
  );
  const themes = useMemo(
    () =>
      snapshot.themes.filter(
        (theme) => theme.slug !== "default" && theme.status !== "archived"
      ),
    [snapshot.themes]
  );
  const selectedTheme =
    themes.find((theme) => theme.id === selectedThemeId) || null;
  const selectedPack =
    DESIGNER_LOGIN_PACKS.find((pack) => pack.id === draft.source.packId) ||
    null;
  const errors = loginCompositionActivationErrors(draft);
  const selectedCrop = draft.hero.crops[cropDevice];

  const patch = (next: Partial<HolidayLoginCompositionConfig>) =>
    setDraft((current) => ({ ...current, ...next }));
  const selectSourceMode = (mode: HolidayLoginSourceMode) =>
    setDraft((current) => ({
      ...current,
      applyMode:
        mode === "designer_complete_pack"
          ? "full_natural_background"
          : mode === "default_login"
          ? "default"
          : current.applyMode === "default"
            ? "full_composition"
            : current.applyMode,
      layout:
        mode === "designer_complete_pack"
          ? {
              ...current.layout,
              desktopColumns: "58_42",
              formMaxWidthPx: 600,
              formAnchor: "center",
              compositionBalance: 58
            }
          : current.layout,
      background:
        mode === "designer_complete_pack"
          ? {
              ...current.background,
              strategy: "clean_ambient_surface",
              blendStrength: 0.62,
              seamSmoothing: 0.92,
              formSideAmbienceIntensity: 0.32,
              extendedBrightness: 1,
              extendedBlurPx: 0,
              highlightGlow: 0.08,
              overlayGrain: false,
              contrastProtection: 0.9,
              edgeFadeWidthPercent: 14
            }
          : current.background,
      source: {
        ...current.source,
        mode,
        packId:
          mode === "designer_complete_pack"
            ? current.source.packId || DESIGNER_LOGIN_PACKS[0]?.id || null
            : null
      }
    }));

  const save = async (
    intent: "save_draft" | "validate" | "approve" | "activate"
  ) => {
    await onAction(
      {
        action: "update_login_composition",
        channel,
        themeId: selectedThemeId || null,
        intent,
        compositionConfig: draft
      },
      intent === "activate"
        ? `${humanMode(channel)} Login theme activated with one functional form.`
        : intent === "approve"
          ? `${humanMode(channel)} Login composition approved.`
          : intent === "validate"
            ? `${humanMode(channel)} Login composition passed validation.`
            : `${humanMode(channel)} Login composition draft saved.`
    );
  };

  const patchHero = (
    next: Partial<HolidayLoginCompositionConfig["hero"]>
  ) => patch({ hero: { ...draft.hero, ...next } });
  const patchCrop = (
    device: HolidayLoginHeroBreakpoint,
    next: Partial<
      HolidayLoginCompositionConfig["hero"]["crops"][HolidayLoginHeroBreakpoint]
    >
  ) =>
    patchHero({
      crops: {
        ...draft.hero.crops,
        [device]: { ...draft.hero.crops[device], ...next }
      }
    });
  const resetCrop = (device: HolidayLoginHeroBreakpoint) => {
    const fallback = defaultHolidayLoginComposition().hero.crops[device];
    patchCrop(device, fallback);
  };
  const patchSkin = (
    next: Partial<HolidayLoginCompositionConfig["formSkin"]>
  ) => patch({ formSkin: { ...draft.formSkin, ...next } });
  const patchVariant = (
    mode: "light" | "dark",
    key: keyof HolidayLoginCompositionConfig["formSkin"]["light"],
    value: string
  ) =>
    patchSkin({
      [mode]: { ...draft.formSkin[mode], [key]: value }
    });
  const openResponsivePreview = async ({
    width,
    route
  }: {
    width: number;
    route: "/client-login" | "/employee-login";
  }) => {
    if (!selectedTheme) return;
    const height = width <= 390 ? 780 : width <= 768 ? 900 : 860;
    const previewWindow = window.open(
      "about:blank",
      `wx-login-preview-${width}`,
      `popup=yes,width=${width},height=${height},resizable=yes,scrollbars=yes`
    );
    await onPreview(selectedTheme);
    const target = `${route}?loginPreview=${width}&appearance=${previewAppearance}`;
    if (previewWindow) {
      previewWindow.location.href = target;
      previewWindow.focus();
    } else {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface shadow-soft">
      <div className="border-b border-wxBorder p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-wxViolet700">
              Login Theme Composer
            </p>
            <h2 className="mt-2 text-xl font-semibold text-wxIndigo900">
              One real form, independently themed
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-wxIndigo500">
              Master artwork is isolated to the hero rail. Card, inputs and
              actions below always style the real authentication form.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:w-[34rem]">
            <label className="text-sm font-semibold text-wxIndigo700">
              Theme
              <select
                value={selectedThemeId}
                onChange={(event) => onThemeChange(event.target.value)}
                className={`${fieldClass} mt-1`}
              >
                <option value="">Choose approved theme</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Editing surface
              <select
                value={channel}
                onChange={(event) => {
                  const nextChannel = event.target.value as HolidayLoginChannel;
                  const nextControl = snapshot.loginControls.find(
                    (item) => item.channel === nextChannel
                  );
                  setChannel(nextChannel);
                  setDraft(
                    nextControl?.compositionConfig ||
                      defaultHolidayLoginComposition()
                  );
                }}
                className={`${fieldClass} mt-1`}
              >
                <option value="client">Client Login</option>
                <option value="employee">Employee Login</option>
                <option value="admin">Admin Login</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="border-b border-wxBorder px-3 py-2">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold transition ${
                tab === item.id
                  ? "bg-wxViolet700 text-white"
                  : "text-wxIndigo600 hover:bg-wxSurfaceSoft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-6">
        {tab === "overview" ? (
          <div className="space-y-5">
            <section className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="text-sm font-semibold text-wxIndigo700">
                  Login Theme Source
                  <select
                    value={draft.source.mode}
                    onChange={(event) =>
                      selectSourceMode(
                        event.target.value as HolidayLoginSourceMode
                      )
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="designer_complete_pack">
                      Designer Complete Theme Pack
                    </option>
                    <option value="standard_festival_theme">
                      Standard Festival Theme
                    </option>
                    <option value="custom_hero">Custom Hero</option>
                    <option value="default_login">Default Login</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-wxIndigo700">
                  Imported pack
                  <select
                    value={draft.source.packId || ""}
                    disabled={draft.source.mode !== "designer_complete_pack"}
                    onChange={(event) =>
                      patch({
                        source: {
                          ...draft.source,
                          packId: event.target.value || null
                        }
                      })
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Choose validated pack</option>
                    {DESIGNER_LOGIN_PACKS.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} v{pack.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-wxIndigo700">
                  Mobile composition
                  <select
                    value={draft.source.mobileMode}
                    onChange={(event) =>
                      patch({
                        source: {
                          ...draft.source,
                          mobileMode: event.target
                            .value as HolidayLoginCompositionConfig["source"]["mobileMode"]
                        }
                      })
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="form_only">Form Only</option>
                    <option value="compact_hero_form">
                      Compact Hero + Form
                    </option>
                    <option value="background_form">Background + Form</option>
                  </select>
                </label>
              </div>
              <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-semibold text-wxIndigo700">
                <input
                  type="checkbox"
                  checked={draft.source.usePackageLogo}
                  disabled={draft.source.mode !== "designer_complete_pack"}
                  onChange={(event) =>
                    patch({
                      source: {
                        ...draft.source,
                        usePackageLogo: event.target.checked
                      }
                    })
                  }
                />
                Use the validated package logo inside the real form card
              </label>
              {selectedPack ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminStatusBadge tone="success">
                    3 responsive 8K backgrounds found
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="success">
                    Package logo found
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="success">
                    Form styling found
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="success">
                    Approved reference artwork active
                  </AdminStatusBadge>
                  <AdminStatusBadge tone="info">
                    Pack v{selectedPack.version}
                  </AdminStatusBadge>
                </div>
              ) : null}
            </section>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Current surface", humanMode(channel)],
                ["Source", humanMode(draft.source.mode)],
                ["Apply mode", humanMode(draft.applyMode)],
                ["Theme", selectedTheme?.name || "Default WriteX"],
                ["Version", `v${control?.versionNumber || 1}`],
                ["Approval", humanMode(control?.approvalState || "approved")],
                ["Hero classification", humanMode(draft.hero.embeddedUiState)],
                ["Light / dark", humanMode(draft.appearanceMode)],
                ["Last changed by", control?.lastChangedBy || "System"]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-wxIndigo900">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "hero" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-wxIndigo700">
                Hero layout
                <select
                  value={draft.hero.fitMode}
                  onChange={(event) =>
                    patchHero({
                      fitMode: event.target
                        .value as HolidayLoginCompositionConfig["hero"]["fitMode"]
                    })
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="smart_crop">Smart Crop (Recommended)</option>
                  <option value="fill_panel">Fill Panel</option>
                  <option value="fit_entire_artwork">
                    Fit Entire Artwork
                  </option>
                  <option value="custom_crop">Custom Crop</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-wxIndigo700">
                Embedded login UI classification
                <select
                  value={draft.hero.embeddedUiState}
                  onChange={(event) =>
                    patchHero({
                      embeddedUiState: event.target
                        .value as HolidayLoginCompositionConfig["hero"]["embeddedUiState"],
                      safeCropApproved:
                        event.target.value === "contains_embedded_ui"
                          ? false
                          : draft.hero.safeCropApproved
                    })
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
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700">
                <input
                  type="checkbox"
                  checked={draft.hero.safeCropApproved}
                  onChange={(event) =>
                    patchHero({ safeCropApproved: event.target.checked })
                  }
                />
                Safe hero crop reviewed and approved
              </label>
              <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
                <p className="text-sm font-semibold text-wxIndigo900">
                  Art-directed responsive pipeline
                </p>
                <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                  The original remains private. Public delivery negotiates AVIF,
                  WebP or JPEG at {LOGIN_HERO_RESPONSIVE_WIDTHS.join(", ")} px.
                </p>
                <p className="mt-2 text-xs leading-5 text-wxIndigo500">
                  Generated ratio families:{" "}
                  {LOGIN_HERO_ASPECT_RATIO_FAMILIES.join(", ")}.
                </p>
              </div>
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  patchHero({
                    derivativeVersion: draft.hero.derivativeVersion + 1
                  })
                }
              >
                <RotateCcw className="h-4 w-4" />
                Regenerate Derivatives
              </button>
            </div>
            <div>
              <div
                className="flex gap-2 overflow-x-auto pb-3"
                aria-label="Crop device"
              >
                {cropDevices.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    aria-pressed={cropDevice === device.id}
                    className={
                      cropDevice === device.id
                        ? primaryButton
                        : secondaryButton
                    }
                    onClick={() => setCropDevice(device.id)}
                  >
                    {device.label}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3">
                <div>
                  <p className="text-sm font-semibold text-wxIndigo900">
                    {LOGIN_HERO_VARIANTS[cropDevice].label}
                  </p>
                  <p className="mt-1 text-xs text-wxIndigo500">
                    Independent focal point, zoom, crop and safe areas.
                  </p>
                </div>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => resetCrop(cropDevice)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RangeControl
                  label="Horizontal focal point"
                  value={selectedCrop.focalX}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(value) =>
                    patchCrop(cropDevice, { focalX: value })
                  }
                />
                <RangeControl
                  label="Vertical focal point"
                  value={selectedCrop.focalY}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(value) =>
                    patchCrop(cropDevice, { focalY: value })
                  }
                />
                <RangeControl
                  label="Hero zoom"
                  value={selectedCrop.zoom}
                  min={1}
                  max={2.5}
                  step={0.02}
                  suffix="x"
                  onChange={(value) =>
                    patchCrop(cropDevice, { zoom: value })
                  }
                />
                <label className="text-sm font-semibold text-wxIndigo700">
                  Mobile behavior
                  <select
                    value={draft.hero.mobileMode}
                    onChange={(event) =>
                      patchHero({
                        mobileMode: event.target
                          .value as HolidayLoginCompositionConfig["hero"]["mobileMode"]
                      })
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="form_first">Form First</option>
                    <option value="compact_hero">Compact Hero</option>
                  </select>
                </label>
                {(
                  [
                    ["x", "Crop left"],
                    ["y", "Crop top"],
                    ["width", "Crop width"],
                    ["height", "Crop height"]
                  ] as const
                ).map(([key, label]) => (
                  <RangeControl
                    key={key}
                    label={label}
                    value={selectedCrop.cropRect[key]}
                    min={key === "width" || key === "height" ? 10 : 0}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(value) =>
                      patchCrop(cropDevice, {
                        cropRect: {
                          ...selectedCrop.cropRect,
                          [key]: value
                        }
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "form" ? (
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-wxIndigo700">
                Form skin
                <select
                  value={draft.formSkin.mode}
                  onChange={(event) =>
                    patchSkin({
                      mode: event.target
                        .value as HolidayLoginCompositionConfig["formSkin"]["mode"]
                    })
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="default">Built-in Default Skin</option>
                  <option value="extracted_theme">Extracted Theme Skin</option>
                  <option value="custom">Custom Skin</option>
                </select>
              </label>
              <RangeControl
                label="Card opacity"
                value={draft.formSkin.cardOpacity}
                min={0.72}
                max={1}
                step={0.01}
                onChange={(value) => patchSkin({ cardOpacity: value })}
              />
              <RangeControl
                label="Glass blur"
                value={draft.formSkin.blurPx}
                min={0}
                max={40}
                step={1}
                suffix="px"
                onChange={(value) => patchSkin({ blurPx: value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RangeControl
                label="Corner radius"
                value={draft.formSkin.radiusPx}
                min={8}
                max={32}
                step={1}
                suffix="px"
                onChange={(value) => patchSkin({ radiusPx: value })}
              />
              <RangeControl
                label="Glow strength"
                value={draft.formSkin.glowStrength}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(value) => patchSkin({ glowStrength: value })}
              />
              <ColorControl
                label="Light focus ring"
                value={draft.formSkin.light.focusRing}
                onChange={(value) => patchVariant("light", "focusRing", value)}
              />
              <ColorControl
                label="Primary CTA start"
                value={draft.formSkin.light.ctaStart}
                onChange={(value) => patchVariant("light", "ctaStart", value)}
              />
            </div>
          </div>
        ) : null}

        {tab === "background" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="md:col-span-2 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
              <h3 className="font-semibold text-wxIndigo900">
                Background Composition
              </h3>
              <p className="mt-1 text-sm leading-6 text-wxIndigo500">
                Reconstruct the baked-form region into one natural background,
                then place the single functional form over the clean canvas.
                Designer mockups use Full Natural Background by default.
              </p>
              {draft.source.mode === "designer_complete_pack" ||
              draft.hero.embeddedUiState === "contains_embedded_ui" ? (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                  This asset contains or references a baked form layout. Public
                  rendering excludes that rasterized UI, reconstructs its
                  background region, and renders one real functional form.
                </p>
              ) : null}
            </section>
            <label className="text-sm font-semibold text-wxIndigo700">
              Composition mode
              <select
                value={draft.applyMode}
                onChange={(event) =>
                  patch({
                    applyMode: event.target
                      .value as HolidayLoginCompositionConfig["applyMode"]
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="default">Default</option>
                <option value="split_hero">Split Hero</option>
                <option value="full_natural_background">
                  Full Natural Background (Recommended)
                </option>
                <option value="full_canvas_uniform">
                  Full Canvas Uniform
                </option>
                <option value="full_canvas_floating_form">
                  Full Canvas + Floating Form
                </option>
                <option value="hero_only">Hero Only + Default Surface</option>
                <option value="hero_default_form">
                  Hero Only + Default Form
                </option>
                <option value="hero_themed_form">
                  Hero + Themed Form Skin
                </option>
              </select>
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Form-side background strategy
              <select
                value={draft.background.strategy}
                onChange={(event) =>
                  patch({
                    background: {
                      ...draft.background,
                      strategy: event.target
                        .value as HolidayLoginCompositionConfig["background"]["strategy"]
                    }
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="clean_ambient_surface">Clean Surface</option>
                <option value="soft_gradient_continuation">Soft Gradient</option>
                <option value="auto_best_fit">Ambient Tint</option>
                <option value="blurred_artwork_continuation">
                  Minimal Blur
                </option>
                <option value="extend_hero_background">
                  Extend Hero Background
                </option>
              </select>
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Form anchor
              <select
                value={draft.layout.formAnchor}
                onChange={(event) =>
                  patch({
                    layout: {
                      ...draft.layout,
                      formAnchor: event.target
                        .value as HolidayLoginCompositionConfig["layout"]["formAnchor"]
                    }
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="center">Centre in Form Area</option>
                <option value="right">Right Aligned</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Canvas extension
              <select
                value={draft.layout.canvasExtensionDirection}
                onChange={(event) =>
                  patch({
                    layout: {
                      ...draft.layout,
                      canvasExtensionDirection: event.target
                        .value as HolidayLoginCompositionConfig["layout"]["canvasExtensionDirection"]
                    }
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="right">Extend Toward Form</option>
                <option value="both_sides">Blend Both Sides</option>
              </select>
            </label>
            <label className="flex min-h-12 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700">
              <input
                type="checkbox"
                checked={draft.background.enabled}
                onChange={(event) =>
                  patch({
                    background: {
                      ...draft.background,
                      enabled: event.target.checked
                    }
                  })
                }
              />
              Enable controlled background ambience
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Form background
              <select
                value={draft.background.mode}
                onChange={(event) =>
                  patch({
                    background: {
                      ...draft.background,
                      mode: event.target
                        .value as HolidayLoginCompositionConfig["background"]["mode"]
                    }
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="theme_palette_gradient">Theme Gradient</option>
                <option value="soft_derived_blur">Soft Blur</option>
                <option value="extended_artwork_ambience">
                  Extended Artwork Ambience
                </option>
                <option value="subtle_festival_pattern">
                  Festival Pattern
                </option>
                <option value="uploaded_form_background">
                  Uploaded Background
                </option>
                <option value="default_writex_surface">
                  Default WriteX Surface
                </option>
              </select>
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Pattern
              <select
                value={draft.background.pattern}
                onChange={(event) =>
                  patch({
                    background: {
                      ...draft.background,
                      pattern: event.target
                        .value as HolidayLoginCompositionConfig["background"]["pattern"]
                    }
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="none">None</option>
                <option value="subtle_festival">
                  Subtle Festival Pattern
                </option>
                <option value="soft_facets">Soft Facets</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-wxIndigo700">
              Hero-to-form transition
              <select
                value={draft.layout.transition}
                onChange={(event) =>
                  patch({
                    layout: {
                      ...draft.layout,
                      transition: event.target
                        .value as HolidayLoginCompositionConfig["layout"]["transition"]
                    }
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="soft_blend">Soft Blend</option>
                <option value="straight">Straight</option>
                <option value="curved">Curved</option>
                <option value="none">None</option>
              </select>
            </label>
            <RangeControl
              label="Ambience intensity"
              value={draft.background.intensity}
              min={0}
              max={0.6}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: { ...draft.background, intensity: value }
                })
              }
            />
            <RangeControl
              label="Canvas blend strength"
              value={draft.background.blendStrength}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    blendStrength: value
                  }
                })
              }
            />
            <RangeControl
              label="Seam smoothing"
              value={draft.background.seamSmoothing}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    seamSmoothing: value
                  }
                })
              }
            />
            <RangeControl
              label="Form-side ambience"
              value={draft.background.formSideAmbienceIntensity}
              min={0}
              max={0.7}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    formSideAmbienceIntensity: value
                  }
                })
              }
            />
            <RangeControl
              label="Extended background brightness"
              value={draft.background.extendedBrightness}
              min={0.7}
              max={1.3}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    extendedBrightness: value
                  }
                })
              }
            />
            <RangeControl
              label="Extended background blur"
              value={draft.background.extendedBlurPx}
              min={0}
              max={80}
              step={1}
              suffix="px"
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    extendedBlurPx: value
                  }
                })
              }
            />
            <RangeControl
              label="Highlight glow"
              value={draft.background.highlightGlow}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    highlightGlow: value
                  }
                })
              }
            />
            <RangeControl
              label="Contrast protection"
              value={draft.background.contrastProtection}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    contrastProtection: value
                  }
                })
              }
            />
            <RangeControl
              label="Edge fade width"
              value={draft.background.edgeFadeWidthPercent}
              min={4}
              max={30}
              step={1}
              suffix="%"
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    edgeFadeWidthPercent: value
                  }
                })
              }
            />
            <RangeControl
              label="Composition balance"
              value={draft.layout.compositionBalance}
              min={35}
              max={70}
              step={1}
              suffix="%"
              onChange={(value) =>
                patch({
                  layout: {
                    ...draft.layout,
                    compositionBalance: value
                  }
                })
              }
            />
            <RangeControl
              label="Canvas warmth / coolness"
              value={draft.background.temperature}
              min={-0.5}
              max={0.5}
              step={0.01}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    temperature: value
                  }
                })
              }
            />
            <label className="flex min-h-12 items-center gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700">
              <input
                type="checkbox"
                checked={draft.background.overlayGrain}
                onChange={(event) =>
                  patch({
                    background: {
                      ...draft.background,
                      overlayGrain: event.target.checked
                    }
                  })
                }
              />
              Overlay grain
            </label>
            <RangeControl
              label="Form maximum width"
              value={draft.layout.formMaxWidthPx}
              min={400}
              max={640}
              step={8}
              suffix="px"
              onChange={(value) =>
                patch({
                  layout: { ...draft.layout, formMaxWidthPx: value }
                })
              }
            />
            <label className="text-sm font-semibold text-wxIndigo700">
              Form size preset
              <select
                value={
                  draft.layout.formMaxWidthPx <= 464
                    ? "compact"
                    : draft.layout.formMaxWidthPx <= 552
                      ? "standard"
                      : "large"
                }
                onChange={(event) => {
                  const widths = {
                    compact: 456,
                    standard: 536,
                    large: 600
                  } as const;
                  patch({
                    layout: {
                      ...draft.layout,
                      formMaxWidthPx:
                        widths[event.target.value as keyof typeof widths]
                    }
                  });
                }}
                className={`${fieldClass} mt-1`}
              >
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="large">Large (Desktop Default)</option>
              </select>
            </label>
            <ColorControl
              label="Light ambience start"
              value={draft.background.light.start}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    light: { ...draft.background.light, start: value }
                  }
                })
              }
            />
            <ColorControl
              label="Light ambience end"
              value={draft.background.light.end}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    light: { ...draft.background.light, end: value }
                  }
                })
              }
            />
            <ColorControl
              label="Dark ambience start"
              value={draft.background.dark.start}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    dark: { ...draft.background.dark, start: value }
                  }
                })
              }
            />
            <ColorControl
              label="Dark ambience end"
              value={draft.background.dark.end}
              onChange={(value) =>
                patch({
                  background: {
                    ...draft.background,
                    dark: { ...draft.background.dark, end: value }
                  }
                })
              }
            />
          </div>
        ) : null}

        {tab === "variants" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {(["light", "dark"] as const).map((mode) => (
              <section
                key={mode}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-wxIndigo900">
                    {humanMode(mode)} Mode
                  </h3>
                  <button
                    type="button"
                    className={secondaryButton}
                    onClick={() =>
                      patchSkin({
                        [mode]: {
                          ...draft.formSkin[mode === "light" ? "dark" : "light"]
                        }
                      })
                    }
                  >
                    <Copy className="h-4 w-4" />
                    Copy other
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <ColorControl
                    label="Card"
                    value={draft.formSkin[mode].cardBackground}
                    onChange={(value) =>
                      patchVariant(mode, "cardBackground", value)
                    }
                  />
                  <ColorControl
                    label="Heading"
                    value={draft.formSkin[mode].headingColor}
                    onChange={(value) =>
                      patchVariant(mode, "headingColor", value)
                    }
                  />
                  <ColorControl
                    label="Body"
                    value={draft.formSkin[mode].bodyColor}
                    onChange={(value) => patchVariant(mode, "bodyColor", value)}
                  />
                  <ColorControl
                    label="Input"
                    value={draft.formSkin[mode].inputBackground}
                    onChange={(value) =>
                      patchVariant(mode, "inputBackground", value)
                    }
                  />
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {tab === "client" || tab === "employee" ? (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h3 className="text-lg font-semibold text-wxIndigo900">
                {tab === "client" ? "Client Login" : "Employee Login"} mode
              </h3>
              <p className="mt-1 text-sm leading-6 text-wxIndigo500">
                This changes presentation only. Authentication fields and
                validation remain isolated and unchanged.
              </p>
              <label className="mt-4 block text-sm font-semibold text-wxIndigo700">
                Desktop hero / form ratio
                <select
                  value={draft.layout.desktopColumns}
                  onChange={(event) =>
                    patch({
                      layout: {
                        ...draft.layout,
                        desktopColumns: event.target
                          .value as HolidayLoginCompositionConfig["layout"]["desktopColumns"]
                      }
                    })
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="58_42">Hero Forward 58 / 42</option>
                  <option value="55_45">Balanced 55 / 45</option>
                  <option value="50_50">Equal 50 / 50</option>
                </select>
              </label>
              <label className="mt-4 block text-sm font-semibold text-wxIndigo700">
                Apply mode
                <select
                  value={draft.applyMode}
                  onChange={(event) =>
                    patch({
                      applyMode: event.target
                        .value as HolidayLoginCompositionConfig["applyMode"]
                    })
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="default">Default</option>
                  <option value="split_hero">Split Hero</option>
                  <option value="full_canvas_uniform">
                    Full Canvas Uniform (Recommended)
                  </option>
                  <option value="full_canvas_floating_form">
                    Full Canvas + Floating Form
                  </option>
                  <option value="hero_only">Hero Only</option>
                  <option value="hero_default_form">
                    Hero + Default Form
                  </option>
                  <option value="hero_themed_form">
                    Hero + Themed Form Skin
                  </option>
                  <option value="full_composition">
                    Full Theme Composition
                  </option>
                </select>
              </label>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              <ShieldCheck className="h-5 w-5" />
              <p className="mt-2 text-sm font-semibold">
                Single real form guarantee
              </p>
              <p className="mt-1 text-xs leading-5">
                Every mode keeps exactly one functional form. Hero artwork is
                clipped to the separate visual rail and cannot provide inputs
                or buttons.
              </p>
            </div>
          </div>
        ) : null}

        {tab === "preview" ? (
          <div>
            <div className="mb-4 flex flex-col gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-wxIndigo900">
                  Real activated-page preview
                </p>
                <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                  Opens the real login route in a resizable private preview
                  window at the selected width.
                </p>
              </div>
              <div
                className="inline-flex rounded-md border border-wxBorder bg-wxSurface p-1"
                aria-label="Preview appearance"
              >
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={previewAppearance === mode}
                    className={
                      previewAppearance === mode
                        ? primaryButton
                        : `${buttonBase} border-transparent text-wxIndigo700`
                    }
                    onClick={() => setPreviewAppearance(mode)}
                  >
                    {humanMode(mode)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {previewWidths.map((width) => (
                <div
                  key={width}
                  className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
                >
                  {width <= 390 ? (
                    <Smartphone className="h-5 w-5 text-wxViolet700" />
                  ) : (
                    <Monitor className="h-5 w-5 text-wxViolet700" />
                  )}
                  <p className="mt-3 font-semibold text-wxIndigo900">
                    {width}px
                  </p>
                  <p className="mt-1 text-xs text-wxIndigo500">
                    {width >= 1024
                      ? "Desktop"
                      : width >= 768
                        ? "Tablet"
                        : "Mobile"}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={!selectedTheme}
                      onClick={() =>
                        void openResponsivePreview({
                          width,
                          route: "/client-login"
                        })
                      }
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      className={secondaryButton}
                      disabled={!selectedTheme}
                      onClick={() =>
                        void openResponsivePreview({
                          width,
                          route: "/employee-login"
                        })
                      }
                    >
                      Employee
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {[
                ["Client Login", "/client-login", Monitor],
                ["Employee Login", "/employee-login", Monitor]
              ].map(([label, href, Icon]) => (
              <div
                key={String(label)}
                className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4"
              >
                <Icon className="h-5 w-5 text-wxViolet700" />
                <p className="mt-3 font-semibold text-wxIndigo900">
                  {String(label)}
                </p>
                <p className="mt-1 text-xs leading-5 text-wxIndigo500">
                  Private preview only. Public users remain on the active
                  approved version.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryButton}
                    disabled={!selectedTheme}
                    onClick={() => selectedTheme && void onPreview(selectedTheme)}
                  >
                    <Eye className="h-4 w-4" />
                    Start preview
                  </button>
                  <Link
                    href={String(href)}
                    target="_blank"
                    className={secondaryButton}
                  >
                    Open
                  </Link>
                </div>
              </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "activation" ? (
          <div>
            <div className="mb-5">
              <h3 className="text-base font-semibold text-wxIndigo900">
                Activation quality gates
              </h3>
              <p className="mt-1 text-sm text-wxIndigo500">
                Every item must pass for both light and dark responsive
                previews.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(
                  [
                    ["noEmptyBands", "No unintended empty bands"],
                    ["subjectScaleApproved", "Hero subject is large enough"],
                    ["importantArtworkSafe", "Important artwork remains safe"],
                    ["embeddedFormExcluded", "Embedded fake form is excluded"],
                    [
                      "formBackgroundComplete",
                      "Form background covers the full panel"
                    ],
                    ["noVisibleRepeat", "No visible background repeat"],
                    [
                      "uniformCanvasApproved",
                      "Full-page uniform canvas approved"
                    ],
                    ["noHardSeam", "No hard hero-to-form seam"],
                    ["contrastApproved", "Text and input contrast passes"],
                    [
                      "mobileCompositionApproved",
                      "Mobile composition is complete"
                    ]
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="wx-checkable-state flex min-h-11 items-center gap-3 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-semibold text-wxIndigo700"
                  >
                    <input
                      type="checkbox"
                      checked={draft.quality[key]}
                      onChange={(event) =>
                        patch({
                          quality: {
                            ...draft.quality,
                            [key]: event.target.checked
                          }
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            {errors.length ? (
              <div
                role="alert"
                className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <p className="font-semibold">Activation checks need attention</p>
                <ul className="mt-2 space-y-1">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                <CheckCircle2 className="h-5 w-5" />
                Crop, form readability and single-form checks pass.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButton}
                disabled={busy}
                onClick={() => void save("save_draft")}
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              <button
                type="button"
                className={secondaryButton}
                disabled={busy || errors.length > 0}
                onClick={() => void save("validate")}
              >
                Validate
              </button>
              <button
                type="button"
                className={secondaryButton}
                disabled={busy || errors.length > 0}
                onClick={() => void save("approve")}
              >
                Approve
              </button>
              <button
                type="button"
                className={primaryButton}
                disabled={
                  busy || errors.length > 0 || !selectedThemeId
                }
                onClick={() => void save("activate")}
              >
                Activate Now
              </button>
              <button
                type="button"
                className={dangerButton}
                disabled={busy}
                onClick={() =>
                  void onAction(
                    { action: "restore_login_channel_default", channel },
                    `${humanMode(channel)} Login restored to default.`
                  )
                }
              >
                <RotateCcw className="h-4 w-4" />
                Restore {humanMode(channel)} Default
              </button>
            </div>
          </div>
        ) : null}

        {tab === "versions" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                Current version
              </p>
              <p className="mt-2 text-xl font-semibold text-wxIndigo900">
                v{control?.versionNumber || 1}
              </p>
              <AdminStatusBadge tone="info">
                {humanMode(control?.approvalState || "approved")}
              </AdminStatusBadge>
            </div>
            <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                Previous approved
              </p>
              <p className="mt-2 text-sm font-semibold text-wxIndigo900">
                {control?.previousApprovedConfig
                  ? "Available for rollback"
                  : "No previous version yet"}
              </p>
            </div>
            <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                Audit
              </p>
              <p className="mt-2 text-sm font-semibold text-wxIndigo900">
                {control?.lastChangedBy || "System"}
              </p>
              <p className="mt-1 text-xs text-wxIndigo500">
                {control?.updatedAt
                  ? new Date(control.updatedAt).toLocaleString("en-IN")
                  : "No changes recorded"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  void onAction(
                    {
                      action: "copy_login_composition",
                      from: "client",
                      to: "employee"
                    },
                    "Client composition copied to Employee as a draft."
                  )
                }
              >
                Copy Client to Employee
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={() =>
                  void onAction(
                    {
                      action: "copy_login_composition",
                      from: "employee",
                      to: "client"
                    },
                    "Employee composition copied to Client as a draft."
                  )
                }
              >
                Copy Employee to Client
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
