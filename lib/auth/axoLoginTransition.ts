"use client";

export const AXO_AUTH_SUCCESS_EVENT = "writex:axo-auth-success";

export function navigateWithAxoTransition(destination: string, navigate: (path: string) => void, message = "Preparing your WriteX workspace…") {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.dispatchEvent(new CustomEvent(AXO_AUTH_SUCCESS_EVENT, { detail: { destination, message } }));
  window.setTimeout(() => navigate(destination), reducedMotion ? 150 : 820);
}
