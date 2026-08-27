export function normalizeInvoiceId(value: string) {
  return value.trim().toUpperCase();
}

export function invoiceReferencesMatch(left: string, right: string) {
  return normalizeInvoiceId(left) === normalizeInvoiceId(right);
}

export function normalizeWhatsapp(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /[A-Za-z]/.test(trimmed)) return "";

  const compact = trimmed.replace(/[\s().-]/g, "");
  const withInternationalPrefix = compact.startsWith("00")
    ? `+${compact.slice(2)}`
    : compact;

  if (/^\+[1-9]\d{7,14}$/.test(withInternationalPrefix)) {
    return withInternationalPrefix;
  }

  const digits = withInternationalPrefix.replace(/\D/g, "");
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return "";
}
