export const LTS_EMPLOYEE_LOGIN_START_URL =
  "https://lts.writex.co.in/__employee_login_start";

export const LTS_EMPLOYEE_LOGIN_ACTION_URL =
  "https://lts.writex.co.in/__employee_login";

// The legacy LTS authority accepts any non-empty existing password. Keep the
// branded handoff compatible with those credentials; password policy belongs
// to account creation/reset, not to sign-in.
export const LTS_EMPLOYEE_PASSWORD_MIN_LENGTH = 1;

export function employeePasswordMinLength(ltsReady: boolean) {
  return ltsReady ? LTS_EMPLOYEE_PASSWORD_MIN_LENGTH : 8;
}

const ltsLoginReasons = new Set([
  "auth-failed",
  "bootstrap-required",
  "csrf-blocked",
  "rate-limited",
  "service-unavailable"
]);

export type LtsEmployeeLoginState = {
  ready: boolean;
  recoveryUrl?: string;
  message?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function messageFor(reason: string | undefined) {
  if (reason === "auth-failed") {
    return "Unable to sign in with those details. Please try again or contact WriteX IT Support.";
  }
  if (reason === "rate-limited") {
    return "Too many sign-in attempts were received. Please wait a few minutes and try again.";
  }
  if (reason === "service-unavailable") {
    return "LTS sign-in is temporarily unavailable. Please try again shortly.";
  }
  if (reason === "csrf-blocked" || reason === "bootstrap-required") {
    return "The secure LTS sign-in was refreshed. Please sign in again.";
  }
  return undefined;
}

export function resolveLtsEmployeeLoginState(searchParams: {
  lts_ready?: string | string[];
  lts?: string | string[];
}): LtsEmployeeLoginState {
  const ready = first(searchParams.lts_ready) === "1";
  const rawReason = first(searchParams.lts);
  const reason = rawReason && ltsLoginReasons.has(rawReason) ? rawReason : undefined;

  // Every public employee-login entry must establish the short-lived LTS
  // browser bootstrap before the form can submit credentials. The website's
  // separate directory adapter is not the authority for legacy LTS accounts.
  if (!ready) {
    const recovery = new URL(LTS_EMPLOYEE_LOGIN_START_URL);
    if (reason) recovery.searchParams.set("reason", reason);
    return { ready: false, recoveryUrl: recovery.toString() };
  }

  return { ready: true, message: messageFor(reason) };
}
