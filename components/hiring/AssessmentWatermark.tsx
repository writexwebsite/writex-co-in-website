"use client";

import { useEffect, useMemo, useState } from "react";

const WATERMARK_GROUPS = 8;
const POSITION_OFFSETS = [
  { x: 0, y: 0 },
  { x: 28, y: -22 },
  { x: -24, y: 32 }
] as const;

function shortReference(reference: string, length: number) {
  const compact = reference.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return compact.slice(-length).padStart(length, "0");
}

export function compactAssessmentWatermarkReferences({
  applicationReference,
  sessionReference
}: {
  applicationReference: string;
  sessionReference: string;
}) {
  return {
    application: `APP-${shortReference(applicationReference, 6)}`,
    session: `S-${shortReference(sessionReference, 4)}`
  };
}

function formatLiveTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function AssessmentWatermark({
  applicationReference,
  sessionReference
}: {
  applicationReference: string;
  sessionReference: string;
}) {
  const identifiers = useMemo(
    () => compactAssessmentWatermarkReferences({ applicationReference, sessionReference }),
    [applicationReference, sessionReference]
  );
  const [liveTime, setLiveTime] = useState("--:--");
  const [positionIndex, setPositionIndex] = useState(0);

  useEffect(() => {
    const updateTime = () => setLiveTime(formatLiveTime(new Date()));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateTime();

    const interval = window.setInterval(() => {
      updateTime();
      if (!reducedMotion.matches) {
        setPositionIndex((current) => (current + 1) % POSITION_OFFSETS.length);
      }
    }, 45_000);

    return () => window.clearInterval(interval);
  }, []);

  const offset = POSITION_OFFSETS[positionIndex];

  return (
    <div
      aria-hidden="true"
      data-testid="assessment-watermark"
      className="pointer-events-none fixed inset-0 z-20 grid select-none grid-cols-1 place-items-center overflow-hidden py-6 opacity-[0.045] sm:grid-cols-2 sm:py-8 lg:grid-cols-3"
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
    >
      {Array.from({ length: WATERMARK_GROUPS }, (_, index) => (
        <div
          data-watermark-group
          className={`${index >= 6 ? "hidden lg:flex" : index >= 4 ? "hidden sm:flex" : "flex"} h-[160px] w-[260px] -rotate-[21deg] flex-col items-center justify-center text-center text-[10px] font-semibold leading-[1.25] text-wxIndigo900 sm:h-[185px] sm:w-[300px] sm:text-[12px] lg:h-[200px] lg:w-[340px] lg:text-[13px]`}
          key={index}
        >
          <span>WriteX Assessment</span>
          <span>{identifiers.application} · {identifiers.session}</span>
          <span suppressHydrationWarning>{liveTime}</span>
        </div>
      ))}
    </div>
  );
}
