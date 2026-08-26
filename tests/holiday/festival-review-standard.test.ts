import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FESTIVAL_REVIEW_CONTEXTS,
  FESTIVAL_REVIEW_SCORE_DIMENSIONS,
  festivalAxoPlacement,
  festivalReviewChecklistFailures,
  festivalReviewMissingContexts,
  festivalReviewScore,
  festivalReviewScoreComplete,
  festivalReviewSpecificChecks
} from "../../lib/holiday/festival-review-standard";

describe("Festival Founder visual review standard", () => {
  it("requires all six responsive appearance contexts", () => {
    assert.deepEqual(festivalReviewMissingContexts([]), FESTIVAL_REVIEW_CONTEXTS);
    assert.deepEqual(
      festivalReviewMissingContexts([
        "desktop:light",
        "desktop:dark",
        "tablet:light",
        "tablet:dark",
        "mobile:light",
        "mobile:dark"
      ]),
      []
    );
  });

  it("calculates the locked 100-point score and rejects incomplete scoring", () => {
    const fullScore = Object.fromEntries(
      FESTIVAL_REVIEW_SCORE_DIMENSIONS.map(([key, , maximum]) => [key, maximum])
    );
    assert.equal(festivalReviewScore(fullScore), 100);
    assert.equal(festivalReviewScoreComplete(fullScore), true);
    assert.equal(festivalReviewScoreComplete({ visualQuality: 20 }), false);
  });

  it("reports exact mandatory blockers", () => {
    const checks = festivalReviewSpecificChecks("ground", ["footer_decoration"]);
    const result = festivalReviewChecklistFailures(checks, {
      balanced_multi_element: "issue"
    });
    assert.equal(result.issues[0]?.[1], "Balanced multi-element composition");
    assert.ok(result.incomplete.some(([key]) => key === "full_footer_top"));
  });

  it("keeps fallback handheld props anchored relative to AXO", () => {
    const placement = festivalAxoPlacement(null, "right_hand");
    assert.equal(placement.coordinateSpace, "anchor_box");
    assert.equal(placement.anchorType, "right_hand");
    assert.ok(placement.anchorPoint.x > 0.8);
    assert.ok(placement.transforms.mobile.scale < placement.transforms.desktop.scale);
  });
});
