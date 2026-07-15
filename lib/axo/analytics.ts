import type { AxoAnalyticsEvent } from "./types";

const allowedKeys = new Set(["service_id", "step_id", "source_page", "urgency_bucket", "has_files", "file_count", "completion_percent", "reason_code", "deterministic_mode"]);

export function sanitizeAxoAnalytics(payload: Record<string, unknown> = {}) {
  return Object.fromEntries(Object.entries(payload).filter(([key, value]) => allowedKeys.has(key) && ["string", "number", "boolean"].includes(typeof value)));
}

export function trackAxoEvent(event: AxoAnalyticsEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const detail = { event, ...sanitizeAxoAnalytics(payload) };
  window.dispatchEvent(new CustomEvent("writex:axo-event", { detail }));
  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  dataLayer?.push(detail);
}
