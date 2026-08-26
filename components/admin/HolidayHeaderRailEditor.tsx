"use client";

import {
  ArrowDown,
  ArrowUp,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
  Tablet
} from "lucide-react";
import { useMemo, useState } from "react";
import { FestivalHeaderRail } from "@/components/holiday/FestivalHeaderRail";
import { resolveExperiencePack } from "@/lib/holiday/packs";
import {
  HOLIDAY_HEADER_ORNAMENT_DENSITIES,
  HOLIDAY_HEADER_ORNAMENT_PACK_MODES,
  HOLIDAY_HEADER_ORNAMENT_POSITIONS,
  HOLIDAY_HEADER_RAIL_HORIZONTAL_PLACEMENTS,
  HOLIDAY_HEADER_RAIL_LENGTH_PRESETS,
  HOLIDAY_HEADER_RAIL_VERTICAL_PLACEMENTS,
  type HolidayHeaderOrnamentConfig,
  type HolidayHeaderOrnamentItem,
  type HolidayTheme
} from "@/lib/holiday/types";

type PreviewDevice = "desktop" | "tablet" | "mobile";
type PreviewColourMode = "light" | "dark";

const fieldClass =
  "min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900 outline-none transition focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15";
const buttonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wxViolet700 disabled:cursor-not-allowed disabled:opacity-45";
const buttonPrimary = `${buttonBase} wx-gradient-action border-transparent text-white`;
const buttonSecondary = `${buttonBase} border-wxBorder bg-wxSurface text-wxIndigo700 hover:border-wxViolet700`;

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-wxViolet700"
      />
      {label}
    </label>
  );
}

function humanise(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function HolidayHeaderRailEditor({
  theme,
  busy,
  onSave
}: {
  theme: HolidayTheme;
  busy: boolean;
  onSave: (
    config: HolidayHeaderOrnamentConfig,
    applyToHeader: boolean
  ) => Promise<boolean>;
}) {
  const [config, setConfig] = useState(
    theme.experienceConfig.headerOrnaments
  );
  const [applyToHeader, setApplyToHeader] = useState(theme.applyToHeader);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [colourMode, setColourMode] =
    useState<PreviewColourMode>("light");
  const [stickyPreview, setStickyPreview] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const assetUrls = useMemo(
    () =>
      Object.fromEntries(
        theme.assets
          .filter(
            (asset) =>
              asset.status === "active" &&
              asset.reviewStatus === "approved"
          )
          .map((asset) => [
            asset.variant,
            `/api/admin/website-experience/assets?assetId=${encodeURIComponent(
              asset.id
            )}`
          ])
      ),
    [theme.assets]
  );

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

  const previewConfig: HolidayHeaderOrnamentConfig = {
    ...config,
    enabled: applyToHeader && config.enabled,
    animationEnabled: reducedMotion ? false : config.animationEnabled,
    motionLevel: reducedMotion ? "off" : config.motionLevel
  };

  const previewWidth =
    device === "desktop"
      ? "100%"
      : device === "tablet"
        ? "48rem"
        : "24.375rem";

  const restoreDefault = async () => {
    const next = resolveExperiencePack(theme.slug, null).headerOrnaments;
    setConfig(next);
    setApplyToHeader(true);
    await onSave(next, true);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Toggle
          checked={applyToHeader}
          onChange={setApplyToHeader}
          label="Header Decorations"
        />
        <Toggle
          checked={config.railEnabled}
          onChange={(checked) => updateConfig({ railEnabled: checked })}
          label="Decoration Rail"
        />
        <Toggle
          checked={config.animationEnabled}
          onChange={(checked) =>
            updateConfig({ animationEnabled: checked })
          }
          label="Motion"
        />
        <Toggle
          checked={config.mobileSimplified}
          onChange={(checked) =>
            updateConfig({ mobileSimplified: checked })
          }
          label="Mobile Simplification"
        />
        <Toggle
          checked={config.garlandEnabled}
          onChange={(checked) => updateConfig({ garlandEnabled: checked })}
          label="Garland"
        />
        <Toggle
          checked={config.bellsEnabled}
          onChange={(checked) => updateConfig({ bellsEnabled: checked })}
          label="Bells"
        />
        <Toggle
          checked={config.lanternsEnabled}
          onChange={(checked) => updateConfig({ lanternsEnabled: checked })}
          label="Lanterns"
        />
        <Toggle
          checked={config.streamersEnabled}
          onChange={(checked) =>
            updateConfig({ streamersEnabled: checked })
          }
          label="Streamers"
        />
        <Toggle
          checked={config.textBadgeEnabled}
          onChange={(checked) =>
            updateConfig({ textBadgeEnabled: checked })
          }
          label="Text Badge"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Header pack
          <select
            value={config.mode}
            onChange={(event) =>
              updateConfig({
                mode: event.target
                  .value as HolidayHeaderOrnamentConfig["mode"]
              })
            }
            className={fieldClass}
          >
            {HOLIDAY_HEADER_ORNAMENT_PACK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {humanise(mode)}
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
            className={fieldClass}
          >
            {HOLIDAY_HEADER_ORNAMENT_DENSITIES.map((density) => (
              <option key={density} value={density}>
                {humanise(density)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Horizontal placement
          <select
            value={config.horizontalPlacement}
            onChange={(event) =>
              updateConfig({
                horizontalPlacement: event.target
                  .value as HolidayHeaderOrnamentConfig["horizontalPlacement"]
              })
            }
            className={fieldClass}
          >
            {HOLIDAY_HEADER_RAIL_HORIZONTAL_PLACEMENTS.map((placement) => (
              <option key={placement} value={placement}>
                {humanise(placement)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Vertical position
          <select
            value={config.verticalPlacement}
            onChange={(event) =>
              updateConfig({
                verticalPlacement: event.target
                  .value as HolidayHeaderOrnamentConfig["verticalPlacement"]
              })
            }
            className={fieldClass}
          >
            {HOLIDAY_HEADER_RAIL_VERTICAL_PLACEMENTS.map((placement) => (
              <option key={placement} value={placement}>
                {humanise(placement)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-wxIndigo600">
          Hanging length
          <select
            value={config.hangingLengthPreset}
            onChange={(event) =>
              updateConfig({
                hangingLengthPreset: event.target
                  .value as HolidayHeaderOrnamentConfig["hangingLengthPreset"]
              })
            }
            className={fieldClass}
          >
            {HOLIDAY_HEADER_RAIL_LENGTH_PRESETS.map((length) => (
              <option key={length} value={length}>
                {humanise(length)}
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
            className={fieldClass}
          />
        </label>
      </div>

      <div className="rounded-md border border-wxBorder bg-wxSurfaceSoft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-wxIndigo900">
              Header rail preview
            </h3>
            <p className="mt-1 text-xs text-wxIndigo500">
              Safe-zone overlays are visible only in Admin preview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["desktop", Monitor],
              ["tablet", Tablet],
              ["mobile", Smartphone]
            ] as const).map(([value, Icon]) => (
              <button
                key={value}
                type="button"
                className={buttonSecondary}
                data-state={device === value ? "selected" : "default"}
                aria-pressed={device === value}
                onClick={() => setDevice(value)}
              >
                <Icon className="h-4 w-4" />
                {humanise(value)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Toggle
            checked={stickyPreview}
            onChange={setStickyPreview}
            label="Sticky compact"
          />
          <Toggle
            checked={reducedMotion}
            onChange={setReducedMotion}
            label="Reduced motion"
          />
          <label className="grid min-w-40 gap-1 text-xs font-semibold text-wxIndigo600">
            Colour mode
            <select
              value={colourMode}
              onChange={(event) =>
                setColourMode(event.target.value as PreviewColourMode)
              }
              className={fieldClass}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-wxBorder bg-wxBg p-3">
          <div
            className="mx-auto overflow-hidden rounded-md border border-wxBorder shadow-soft transition-[width]"
            style={{ maxWidth: previewWidth }}
            data-theme={colourMode}
          >
            <div className="relative flex min-h-16 items-center justify-between gap-3 bg-[var(--wx-header)] px-4">
              <div className="wx-admin-header-safe-zone h-8 w-28">
                Logo safe zone
              </div>
              <div className="hidden flex-1 items-center justify-center gap-2 sm:flex">
                <span className="wx-admin-header-safe-zone h-8 w-1/2">
                  Navigation safe zone
                </span>
              </div>
              <div className="wx-admin-header-safe-zone h-8 w-28">
                Actions safe zone
              </div>
            </div>
            <FestivalHeaderRail
              festivalSlug={theme.slug}
              config={previewConfig}
              assets={assetUrls}
              compact={stickyPreview}
              previewDevice={device}
            />
            <div className="min-h-24 bg-[var(--wx-bg)] px-4 py-5">
              <div className="h-4 w-1/3 rounded bg-wxIndigo900/80" />
              <div className="mt-3 h-2.5 w-2/3 rounded bg-wxIndigo500/25" />
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-md border border-wxBorder bg-wxSurface">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-wxIndigo900">
          Advanced ornament controls
        </summary>
        <div className="grid gap-3 border-t border-wxBorder p-4">
          {config.items.length ? (
            config.items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-md border border-wxBorder bg-wxSurfaceSoft p-3 lg:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_7rem_auto]"
              >
                <Toggle
                  checked={item.enabled}
                  onChange={(checked) =>
                    updateItem(index, { enabled: checked })
                  }
                  label={`${index + 1}. ${humanise(item.type)}`}
                />
                <label className="grid gap-1 text-xs font-semibold text-wxIndigo600">
                  Alignment
                  <select
                    value={item.position}
                    onChange={(event) =>
                      updateItem(index, {
                        position: event.target
                          .value as HolidayHeaderOrnamentItem["position"]
                      })
                    }
                    className={fieldClass}
                  >
                    {HOLIDAY_HEADER_ORNAMENT_POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {humanise(position)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-wxIndigo600">
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
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-wxIndigo600">
                  Mobile
                  <select
                    value={item.mobileVisible ? "show" : "hide"}
                    onChange={(event) =>
                      updateItem(index, {
                        mobileVisible: event.target.value === "show"
                      })
                    }
                    className={fieldClass}
                  >
                    <option value="show">Show</option>
                    <option value="hide">Hide</option>
                  </select>
                </label>
                <div className="flex items-end gap-1">
                  <button
                    type="button"
                    className={buttonSecondary}
                    aria-label={`Move ${humanise(item.type)} up`}
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={buttonSecondary}
                    aria-label={`Move ${humanise(item.type)} down`}
                    disabled={index === config.items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-wxIndigo500">
              This pack has no individual ornaments. Choose a festival pack or
              upload an approved header decoration.
            </p>
          )}
        </div>
      </details>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className={buttonSecondary}
          disabled={busy}
          onClick={() => void restoreDefault()}
        >
          <RotateCcw className="h-4 w-4" />
          Restore Header Default
        </button>
        <button
          type="button"
          className={buttonPrimary}
          disabled={busy}
          onClick={() => void onSave(config, applyToHeader)}
        >
          <Save className="h-4 w-4" />
          Save Header Controls
        </button>
      </div>
    </div>
  );
}
