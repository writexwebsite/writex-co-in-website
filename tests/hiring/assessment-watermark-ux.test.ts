import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compactAssessmentWatermarkReferences } from "../../components/hiring/AssessmentWatermark";

test("assessment watermark uses compact application and session identifiers", () => {
  assert.deepEqual(
    compactAssessmentWatermarkReferences({
      applicationReference: "WX-HR-264B5D0F65",
      sessionReference: "WX-AS-68715AB8C6"
    }),
    { application: "APP-5D0F65", session: "S-B8C6" }
  );
});

test("shared assessment watermark stays subtle, sparse and non-interactive", () => {
  const watermark = readFileSync(
    new URL("../../components/hiring/AssessmentWatermark.tsx", import.meta.url),
    "utf8"
  );
  const workspace = readFileSync(
    new URL("../../components/hiring/AssessmentWorkspace.tsx", import.meta.url),
    "utf8"
  );

  assert.match(watermark, /const WATERMARK_GROUPS = 8/);
  assert.match(watermark, /opacity-\[0\.045\]/);
  assert.match(watermark, /text-\[10px\]/);
  assert.match(watermark, /sm:text-\[12px\]/);
  assert.match(watermark, /lg:text-\[13px\]/);
  assert.match(watermark, /-rotate-\[21deg\]/);
  assert.match(watermark, /pointer-events-none/);
  assert.match(watermark, /aria-hidden="true"/);
  assert.match(watermark, /prefers-reduced-motion: reduce/);
  assert.match(watermark, /45_000/);
  assert.match(workspace, /<AssessmentWatermark applicationReference=\{session\.applicationReference\} sessionReference=\{session\.reference\}/);
  assert.doesNotMatch(workspace, /Array\.from\(\{length:21\}/);
  assert.doesNotMatch(workspace, /text-2xl font-bold text-wxIndigo900\/\[0\.035\]/);
});

test("watermark correction does not remove assessment integrity logging", () => {
  const workspace = readFileSync(
    new URL("../../components/hiring/AssessmentWorkspace.tsx", import.meta.url),
    "utf8"
  );

  for (const event of [
    "focus_loss",
    "visibility_change",
    "fullscreen_exit",
    "copy_attempt",
    "paste_attempt",
    "large_insertion",
    "drag_drop_attempt"
  ]) {
    assert.match(workspace, new RegExp(event));
  }
});
