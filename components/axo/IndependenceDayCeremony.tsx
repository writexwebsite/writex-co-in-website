"use client";

export type IndependenceCeremonyState =
  | "normal"
  | "enter"
  | "arrive"
  | "hoist"
  | "honour"
  | "return"
  | "complete";

const ASHOKA_CHAKRA_SPOKES = Array.from({ length: 24 }, (_, index) => index * 15);

export function IndependenceDayCeremony({
  state,
  reducedMotion
}: {
  state: IndependenceCeremonyState;
  reducedMotion: boolean;
}) {
  return (
    <div
      aria-hidden
      className="wx-independence-axo-ceremony pointer-events-none fixed z-[64]"
      data-ceremony-state={state}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <div className="wx-independence-ceremonial-ground">
        <span />
      </div>
      <div className="wx-independence-flagpole">
        <span className="wx-independence-flagpole-finial" />
        <span className="wx-independence-flagpole-shaft" />
        <span className="wx-independence-flagpole-base" />
        <span className="wx-independence-hoisted-flag">
          <IndianFlag />
        </span>
      </div>
      <div className="wx-independence-ceremony-petals">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function IndianFlag() {
  return (
    <svg
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
    >
      <rect width="120" height="26.6667" fill="#FF9933" />
      <rect y="26.6667" width="120" height="26.6667" fill="#FFFFFF" />
      <rect y="53.3333" width="120" height="26.6667" fill="#138808" />
      <g transform="translate(60 40)" fill="none" stroke="#000080">
        <circle r="9.5" strokeWidth="1.5" />
        <circle r="1.25" fill="#000080" stroke="none" />
        {ASHOKA_CHAKRA_SPOKES.map((angle) => (
          <line
            key={angle}
            x1="0"
            y1="-1.75"
            x2="0"
            y2="-8.75"
            strokeWidth="0.8"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>
    </svg>
  );
}
