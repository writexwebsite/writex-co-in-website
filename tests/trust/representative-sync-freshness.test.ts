import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REPRESENTATIVE_SYNC_MAX_AGE_HOURS,
  isRepresentativeSyncFresh,
  readRepresentativeSyncMaxAgeHours
} from "../../lib/trust/representative-sync-freshness";

const NOW = new Date("2026-10-28T10:00:00.000Z");

test("accepts a recent successful LTS synchronization", () => {
  assert.equal(
    isRepresentativeSyncFresh(
      {
        lastAttemptedAt: "2026-10-28T05:00:00.000Z",
        lastSuccessfulAt: "2026-10-28T05:00:02.000Z",
        safeFailureReason: null
      },
      { now: NOW }
    ),
    true
  );
});

test("fails closed when synchronization state or success is missing", () => {
  assert.equal(isRepresentativeSyncFresh(undefined, { now: NOW }), false);
  assert.equal(
    isRepresentativeSyncFresh(
      {
        lastAttemptedAt: "2026-10-28T05:00:00.000Z",
        lastSuccessfulAt: null,
        safeFailureReason: "forbidden"
      },
      { now: NOW }
    ),
    false
  );
});

test("fails closed when the last successful snapshot is too old", () => {
  assert.equal(
    isRepresentativeSyncFresh(
      {
        lastAttemptedAt: "2026-09-11T05:00:02.000Z",
        lastSuccessfulAt: "2026-09-11T05:00:02.000Z",
        safeFailureReason: null
      },
      { now: NOW }
    ),
    false
  );
});

test("fails closed when a later synchronization attempt failed", () => {
  assert.equal(
    isRepresentativeSyncFresh(
      {
        lastAttemptedAt: "2026-10-28T09:48:31.000Z",
        lastSuccessfulAt: "2026-10-28T05:00:02.000Z",
        safeFailureReason: "forbidden"
      },
      { now: NOW }
    ),
    false
  );
});

test("does not let an earlier historical failure invalidate a later success", () => {
  assert.equal(
    isRepresentativeSyncFresh(
      {
        lastAttemptedAt: "2026-10-28T05:00:00.000Z",
        lastSuccessfulAt: "2026-10-28T05:00:02.000Z",
        safeFailureReason: "network_error"
      },
      { now: NOW }
    ),
    true
  );
});

test("rejects future and malformed success timestamps", () => {
  for (const lastSuccessfulAt of [
    "2026-10-28T10:00:01.000Z",
    "not-a-date"
  ]) {
    assert.equal(
      isRepresentativeSyncFresh(
        {
          lastAttemptedAt: null,
          lastSuccessfulAt,
          safeFailureReason: null
        },
        { now: NOW }
      ),
      false
    );
  }
});

test("uses a bounded configurable maximum age with a safe default", () => {
  assert.equal(
    readRepresentativeSyncMaxAgeHours({
      REPRESENTATIVE_DIRECTORY_MAX_STALENESS_HOURS: "12"
    }),
    12
  );
  assert.equal(
    readRepresentativeSyncMaxAgeHours({
      REPRESENTATIVE_DIRECTORY_MAX_STALENESS_HOURS: "invalid"
    }),
    DEFAULT_REPRESENTATIVE_SYNC_MAX_AGE_HOURS
  );
  assert.equal(
    readRepresentativeSyncMaxAgeHours({
      REPRESENTATIVE_DIRECTORY_MAX_STALENESS_HOURS: "1000"
    }),
    DEFAULT_REPRESENTATIVE_SYNC_MAX_AGE_HOURS
  );
});
