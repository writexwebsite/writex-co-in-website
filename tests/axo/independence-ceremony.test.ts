import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Independence Day decorates the functional AXO instead of replacing it", () => {
  const chrome = readFileSync("components/AppChrome.tsx", "utf8");
  const experience = readFileSync("components/axo/AxoExperience.tsx", "utf8");
  const launcher = readFileSync("components/axo/AxoLauncher.tsx", "utf8");

  assert.match(chrome, /usesInteractiveIndependenceAxo/);
  assert.match(chrome, /hidePublicChrome \|\| usesInteractiveIndependenceAxo/);
  assert.match(experience, /IndependenceDayCeremony/);
  assert.match(experience, /writex_independence_ceremony_v1/);
  assert.match(experience, /data-festival-ceremony=/);
  assert.match(launcher, /data-axo-functional-launcher="true"/);
  assert.match(launcher, /onClick=\{onOpen\}/);
  assert.match(launcher, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(launcher, /event\.preventDefault\(\); onOpen\(\)/);
  assert.match(launcher, /onFocus=\{\(\) => setEngaged\(true\)\}/);
});

test("flag-hoisting timeline is short, complete and session-scoped", () => {
  const experience = readFileSync("components/axo/AxoExperience.tsx", "utf8");

  for (const state of ["enter", "arrive", "hoist", "honour", "return", "complete"]) {
    assert.match(experience, new RegExp(`\\[\\d+, "${state}"\\]`));
  }
  assert.match(experience, /\[7500, "complete"\]/);
  assert.match(experience, /sessionStorage\.setItem\(INDEPENDENCE_CEREMONY_KEY, "started"\)/);
  assert.match(experience, /prefers-reduced-motion: reduce/);
});

test("ceremonial flag keeps the Indian flag geometry and correct Chakra", () => {
  const ceremony = readFileSync(
    "components/axo/IndependenceDayCeremony.tsx",
    "utf8"
  );
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(ceremony, /viewBox="0 0 120 80"/);
  assert.match(ceremony, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(ceremony, /length: 24/);
  assert.match(ceremony, /#FF9933/);
  assert.match(ceremony, /#FFFFFF/);
  assert.match(ceremony, /#138808/);
  assert.match(ceremony, /#000080/);
  assert.match(styles, /aspect-ratio: 3 \/ 2/);
  assert.match(styles, /\.wx-independence-flagpole-shaft/);
  assert.match(styles, /@media \(max-width: 767px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("AXO crosses to a left-side flag station and walks back before becoming idle", () => {
  const experience = readFileSync("components/axo/AxoExperience.tsx", "utf8");
  const styles = readFileSync("app/globals.css", "utf8");

  assert.match(
    styles,
    /--wx-axo-ceremony-destination: calc\(-100vw \+ clamp\(14\.5rem, 16vw, 17rem\)\)/
  );
  assert.match(styles, /\.wx-independence-axo-ceremony \{\s*left:/);
  assert.match(styles, /wx-independence-axo-procession-step/);
  assert.match(styles, /data-ceremony-state="return"\] button/);
  assert.match(
    experience,
    /ceremonyActive = independenceCeremonyEnabled && !\["normal", "complete"\]/
  );
  assert.match(experience, /ceremonyActive \|\| window\.sessionStorage/);
});
