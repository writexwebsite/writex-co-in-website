import { normalizeIndianMobile } from "@/lib/trust/mobile";

export function normalizeInvoiceId(value: string) {
  return value.trim().toUpperCase();
}

export function invoiceReferencesMatch(left: string, right: string) {
  return normalizeInvoiceId(left) === normalizeInvoiceId(right);
}

export function normalizeWhatsapp(value: string) {
  return normalizeIndianMobile(value) || "";
}
