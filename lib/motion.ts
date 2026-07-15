export const motionDurations = {
  fast: 0.12,
  normal: 0.22,
  slow: 0.42,
  heroStep: 0.36
} as const;

export const motionEase = [0.22, 1, 0.36, 1] as const;

export const motionViewport = {
  once: true,
  margin: "-72px"
} as const;

export const visibleRevealStart = {
  opacity: 0.98,
  y: 18
} as const;

export const visibleRevealEnd = {
  opacity: 1,
  y: 0
} as const;
