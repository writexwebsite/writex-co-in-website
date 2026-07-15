export type PhoneConfidence = "high" | "medium" | "low" | "suspicious";

const countryDialCodes: Record<string, string> = {
  IN: "91",
  GB: "44",
  AU: "61",
  CA: "1",
  US: "1",
  AE: "971",
  NZ: "64",
  SG: "65",
  MY: "60",
  IE: "353",
  DE: "49",
  FR: "33"
};

export const phoneCountryOptions = [
  ["IN", "India", "+91"],
  ["GB", "United Kingdom", "+44"],
  ["AU", "Australia", "+61"],
  ["CA", "Canada", "+1"],
  ["US", "United States", "+1"],
  ["AE", "UAE", "+971"],
  ["NZ", "New Zealand", "+64"],
  ["SG", "Singapore", "+65"],
  ["MY", "Malaysia", "+60"],
  ["IE", "Ireland", "+353"],
  ["DE", "Germany", "+49"],
  ["FR", "France", "+33"]
] as const;

export function validateAndNormalizePhone(raw: string, countryCode: string) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  const dialCode = countryDialCodes[countryCode] || "";
  const normalizedDigits = trimmed.startsWith("+")
    ? digits
    : digits.startsWith(dialCode)
      ? digits
      : `${dialCode}${digits}`;
  const normalized = normalizedDigits ? `+${normalizedDigits}` : "";
  const repeated = /^(\d)\1{7,}$/.test(digits) || /^(\d)\1{7,}$/.test(normalizedDigits);
  const sequential = ["0123456789", "1234567890", "9876543210"].some((pattern) =>
    normalizedDigits.includes(pattern) || digits.includes(pattern)
  );
  const impossible = normalizedDigits.length < 8 || normalizedDigits.length > 15;

  let confidence: PhoneConfidence = "high";
  if (repeated || sequential || impossible) confidence = "suspicious";
  else if (!dialCode || !trimmed.startsWith("+")) confidence = "medium";
  else if (normalizedDigits.length < 10) confidence = "low";

  return {
    raw: trimmed,
    normalized,
    confidence,
    valid: !impossible && !repeated && !sequential,
    reasons: [
      ...(impossible ? ["invalid_length"] : []),
      ...(repeated ? ["repeated_digits"] : []),
      ...(sequential ? ["sequential_pattern"] : [])
    ]
  };
}
