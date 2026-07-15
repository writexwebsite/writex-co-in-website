import "server-only";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function sanitize(context: LogContext = {}) {
  return Object.fromEntries(
    Object.entries(context).filter(([key]) => {
      const lowered = key.toLowerCase();
      return !(
        lowered.includes("password") ||
        lowered.includes("otp") ||
        lowered.includes("secret") ||
        lowered.includes("token") ||
        lowered.includes("signedurl")
      );
    })
  );
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(JSON.stringify({ level: "info", message, ...sanitize(context) }));
  },
  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify({ level: "warn", message, ...sanitize(context) }));
  },
  error(message: string, context?: LogContext) {
    console.error(JSON.stringify({ level: "error", message, ...sanitize(context) }));
  }
};
