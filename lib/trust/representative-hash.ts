import { createHmac } from "crypto";

export function hashRepresentativeMobile(
  normalizedMobile: string,
  secret: string
) {
  return createHmac("sha256", secret)
    .update(normalizedMobile)
    .digest("hex");
}
