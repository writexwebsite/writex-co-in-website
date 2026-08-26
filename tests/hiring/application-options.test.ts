import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultHiringOptions,
  getDefaultActiveHiringOptions,
  isHiringOptionSetKey
} from "../../lib/hiring/application-options";

test("new Careers option sets expose full-time-safe work arrangements only", () => {
  const workModes = defaultHiringOptions.work_mode.map((option) =>
    option.label.toLowerCase()
  );
  assert.equal(
    workModes.some((value) =>
      ["freelance", "part-time", "contract", "hourly"].some((term) =>
        value.includes(term)
      )
    ),
    false
  );
});

test("protected defaults remain active and option keys are validated", () => {
  const options = getDefaultActiveHiringOptions();
  assert.equal(options.writer_subject.length > 10, true);
  assert.equal(options.writer_subject.every((option) => option.protected), true);
  assert.equal(isHiringOptionSetKey("writer_subject"), true);
  assert.equal(isHiringOptionSetKey("engagement_preference"), false);
});
