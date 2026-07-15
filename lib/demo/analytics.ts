"use client";

export type DemoEvent = "demo_client_login_started" | "demo_client_login_success" | "demo_employee_login_started" | "demo_workspace_selected" | "demo_employee_login_success" | "demo_action_blocked" | "demo_logout";

export function trackDemoEvent(event: DemoEvent, properties: { demo_type: "client" | "employee"; workspace?: string; page_path?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("writex:demo-event", { detail: { event, ...properties, demo_event: true, exclude_from_business_metrics: true } }));
}
