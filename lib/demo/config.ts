export const DEMO_CLIENT_COOKIE = "__Host-writex_demo_client_session";
export const DEMO_EMPLOYEE_COOKIE = "__Host-writex_demo_employee_session";
export const DEMO_CLIENT_LOCAL_COOKIE = "writex_demo_client_session_local";
export const DEMO_EMPLOYEE_LOCAL_COOKIE = "writex_demo_employee_session_local";

export function isDemoServerEnabled() {
  return process.env.DEMO_LOGIN_ENABLED === "true";
}

export function getDemoSessionExpirySeconds() {
  const configured = Number(process.env.DEMO_SESSION_EXPIRY_SECONDS || 3600);
  if (!Number.isFinite(configured)) return 3600;
  return Math.min(3600, Math.max(300, Math.round(configured)));
}
