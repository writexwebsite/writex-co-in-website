import "server-only";

import {
  GetPublicAccessBlockCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getS3Runtime, isS3RuntimeConfigured } from "@/lib/storage/s3-config";
import {
  isExpectedLeastPrivilegeListDenial,
  type SanitizedS3Health
} from "@/lib/storage/s3-status";

const SUCCESS_CACHE_MS = 45_000;
const FAILURE_CACHE_MS = 10_000;
const REQUEST_TIMEOUT_MS = 5_000;

const globalForS3Health = globalThis as typeof globalThis & {
  writexS3HealthCache?: {
    expiresAt: number;
    value: SanitizedS3Health;
  };
};

function result(
  overrides: Partial<SanitizedS3Health>
): SanitizedS3Health {
  return {
    state: "status_unavailable",
    configured: false,
    reachable: false,
    bucket: "not_configured",
    privateAccess: null,
    publicAccessBlocked: null,
    lastCheckedAt: new Date().toISOString(),
    ...overrides
  };
}

function cache(value: SanitizedS3Health) {
  globalForS3Health.writexS3HealthCache = {
    value,
    expiresAt:
      Date.now() +
      (value.state === "configured_healthy"
        ? SUCCESS_CACHE_MS
        : FAILURE_CACHE_MS)
  };
  return value;
}

export async function getS3Health(
  options: { force?: boolean } = {}
): Promise<SanitizedS3Health> {
  const cached = globalForS3Health.writexS3HealthCache;
  if (!options.force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!isS3RuntimeConfigured()) {
    return cache(
      result({ state: "not_configured", bucket: "not_configured" })
    );
  }

  try {
    const { client, bucket, privatePrefix } = getS3Runtime();
    try {
      await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `${privatePrefix}/`,
          MaxKeys: 1
        }),
        { abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
      );
    } catch (error) {
      if (!isExpectedLeastPrivilegeListDenial(error)) throw error;
      // The application identity is intentionally object-scoped. A signed 403
      // proves S3 reachability while preserving the no-list policy.
      return cache(
        result({
          state: "configured_healthy",
          configured: true,
          reachable: true,
          bucket: "configured",
          privateAccess: true,
          publicAccessBlocked: null
        })
      );
    }

    let publicAccessBlocked: boolean | null = null;
    try {
      const publicAccess = await client.send(
        new GetPublicAccessBlockCommand({ Bucket: bucket }),
        { abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
      );
      const block = publicAccess.PublicAccessBlockConfiguration;
      publicAccessBlocked = Boolean(
        block?.BlockPublicAcls &&
          block.IgnorePublicAcls &&
          block.BlockPublicPolicy &&
          block.RestrictPublicBuckets
      );
    } catch {
      // A least-privilege object identity may not read the bucket policy.
      publicAccessBlocked = null;
    }

    return cache(
      result({
        state: "configured_healthy",
        configured: true,
        reachable: true,
        bucket: "configured",
        privateAccess: true,
        publicAccessBlocked
      })
    );
  } catch {
    return cache(
      result({
        state: "configured_unreachable",
        configured: true,
        reachable: false,
        bucket: "configured",
        privateAccess: false,
        publicAccessBlocked: null
      })
    );
  }
}

export function clearS3HealthCache() {
  delete globalForS3Health.writexS3HealthCache;
}
