import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { millisecondsUntilNextBoundary, resolveTheme, resolveThemeForHour } from "../../lib/theme/resolveTheme";
import { readThemeCookie } from "../../lib/theme/themeCookie";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readProjectFile(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

test("auto resolves light during configured day and dark overnight", () => {
  assert.equal(resolveThemeForHour(10), "light");
  assert.equal(resolveThemeForHour(22), "dark");
  assert.equal(resolveThemeForHour(6), "dark");
});

test("manual modes override local hour", () => {
  assert.equal(resolveTheme("light", 22, true), "light");
  assert.equal(resolveTheme("dark", 10, false), "dark");
});

test("invalid local time falls back safely", () => {
  assert.equal(resolveTheme("auto", Number.NaN, true), "dark");
  assert.equal(resolveTheme("auto", Number.NaN, false), "light");
});

test("theme cookie accepts only supported values", () => {
  assert.equal(readThemeCookie("foo=1; wx_theme_mode=dark; bar=2"), "dark");
  assert.equal(readThemeCookie("wx_theme_mode=neon"), null);
});

test("next boundary schedules a single future transition", () => {
  const atSix = new Date(2026, 0, 1, 6, 30);
  const atEightPm = new Date(2026, 0, 1, 20, 0);
  assert.equal(millisecondsUntilNextBoundary(atSix), 30 * 60 * 1000 + 40);
  assert.equal(millisecondsUntilNextBoundary(atEightPm), 11 * 60 * 60 * 1000 + 40);
});

test("selected surfaces meet WCAG AA text contrast in light and dark modes", () => {
  assert.ok(contrastRatio("#211458", "#f0eaff") >= 4.5);
  assert.ok(contrastRatio("#554f7d", "#f0eaff") >= 4.5);
  assert.ok(contrastRatio("#ffffff", "#272354") >= 4.5);
  assert.ok(contrastRatio("#c5cae8", "#272354") >= 4.5);
});

test("semantic interaction states protect selected and focus colors from holiday palettes", () => {
  const css = readProjectFile("app/globals.css");
  for (const token of [
    "--wx-surface-default",
    "--wx-surface-hover",
    "--wx-surface-selected",
    "--wx-border-selected",
    "--wx-text-selected",
    "--wx-text-selected-muted",
    "--wx-focus-ring",
    "--wx-surface-active",
    "--wx-surface-disabled",
    "--wx-icon-selected"
  ]) {
    assert.match(css, new RegExp(token));
  }
  assert.match(
    css,
    /html\[data-holiday-theme\] \.wx-interactive-state\[data-state="selected"\]/
  );
});

test("shared selected-state contract is used by public, hiring and admin controls", () => {
  for (const path of [
    "components/ScopeCard.tsx",
    "components/ServicePathHelper.tsx",
    "components/MobileMenu.tsx",
    "components/axo/ServiceSelector.tsx",
    "components/hiring/ApplicationFormControls.tsx",
    "components/admin/AdminNavigation.tsx",
    "components/admin/AdminDataTable.tsx",
    "components/admin/HolidayExperienceManager.tsx"
  ]) {
    assert.match(readProjectFile(path), /wx-interactive-state/);
  }
  assert.doesNotMatch(
    readProjectFile("components/ScopeCard.tsx"),
    /linear-gradient\(135deg, #faf7ff/
  );
  assert.doesNotMatch(
    readProjectFile("components/MobileMenu.tsx"),
    /active\s*&&\s*"[^"]*bg-white/
  );
});
