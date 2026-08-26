const allowedMobileCharacters = /^[+\d\s().-]+$/u;
const indianNationalMobile = /^[6-9]\d{9}$/;

function hasBalancedParentheses(value: string) {
  let depth = 0;

  for (const character of value) {
    if (character === "(") {
      depth += 1;
      if (depth > 1) return false;
    } else if (character === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }

  return depth === 0;
}

export function normalizeIndianMobile(value: string) {
  const input = value.trim();
  if (
    !input ||
    !allowedMobileCharacters.test(input) ||
    !hasBalancedParentheses(input)
  ) {
    return null;
  }

  const plusCount = input.match(/\+/g)?.length ?? 0;
  if (plusCount > 1) return null;
  if (plusCount === 1 && !/^\+\s*91[\s().-]*[6-9]/.test(input)) {
    return null;
  }

  const digits = input.replace(/\D/g, "");
  let nationalNumber: string;

  if (digits.length === 10) nationalNumber = digits;
  else if (digits.length === 12 && digits.startsWith("91")) {
    nationalNumber = digits.slice(2);
  } else if (digits.length === 14 && digits.startsWith("0091")) {
    nationalNumber = digits.slice(4);
  } else {
    return null;
  }

  if (!indianNationalMobile.test(nationalNumber)) return null;

  return `+91${nationalNumber}`;
}

export function mobileLastFour(normalizedMobile: string) {
  return normalizedMobile.slice(-4);
}

export function maskMobile(normalizedMobile: string) {
  return `******${mobileLastFour(normalizedMobile)}`;
}
