import { createHash } from "crypto";
import { z } from "zod";

export const suspiciousReportTypes = [
  "Unknown representative",
  "Different payment details",
  "Personal UPI or bank request",
  "Fake invoice",
  "Fake QR code",
  "Brand impersonation",
  "Suspicious WhatsApp or email",
  "Other"
] as const;

export const suspiciousReportSchema = z.object({
  reportType: z.enum(suspiciousReportTypes),
  identifier: z.string().trim().min(2).max(254),
  relatedReference: z.string().trim().max(120).optional(),
  description: z.string().trim().min(20).max(5000),
  customerEmail: z.email().max(254),
  customerMobile: z.string().trim().max(40).optional(),
  website: z.string().trim().max(160).optional()
});

export type SuspiciousReportInput = z.infer<typeof suspiciousReportSchema>;

export function maskTrustIdentifier(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) {
    const [local, domain] = trimmed.split("@");
    return `${local.slice(0, 2)}***@${domain || "***"}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 4) return `***${digits.slice(-4)}`;
  return `${trimmed.slice(0, 2)}***`;
}

export function buildSuspiciousReportSubmissionKey(
  input: SuspiciousReportInput,
  suppliedKey?: string | null
) {
  if (suppliedKey && /^[A-Za-z0-9_-]{16,128}$/.test(suppliedKey)) {
    return createHash("sha256")
      .update(`trust-report:${suppliedKey}`)
      .digest("hex");
  }

  return createHash("sha256")
    .update(
      [
        input.reportType,
        input.identifier.toLowerCase(),
        input.relatedReference?.toLowerCase() || "",
        input.description.toLowerCase(),
        input.customerEmail.toLowerCase()
      ].join("|")
    )
    .digest("hex");
}
