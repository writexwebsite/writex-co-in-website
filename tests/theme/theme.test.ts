import assert from "node:assert/strict";
import test from "node:test";
import { millisecondsUntilNextBoundary, resolveTheme, resolveThemeForHour } from "../../lib/theme/resolveTheme";
import { readThemeCookie } from "../../lib/theme/themeCookie";

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
