import "server-only";

import { createHash, randomBytes } from "crypto";

export function createDownloadToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashDownloadToken(token) };
}

export function hashDownloadToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

