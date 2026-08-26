import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { ApiError } from "@/lib/api/response";
import { isProduction } from "@/lib/security";
import {
  resolveS3Configuration,
  type ResolvedS3Configuration
} from "@/lib/storage/s3-config-validation";

const globalForS3 = globalThis as typeof globalThis & {
  writexS3Client?: S3Client;
  writexS3ClientIdentity?: string;
};

export function getS3ConfigurationResult() {
  return resolveS3Configuration({
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_S3_PRIVATE_PREFIX: process.env.AWS_S3_PRIVATE_PREFIX
  });
}

export function isS3RuntimeConfigured() {
  return getS3ConfigurationResult().configured;
}

export function requireS3Configuration(): ResolvedS3Configuration {
  const result = getS3ConfigurationResult();
  if (!result.configured) {
    throw new ApiError(
      503,
      "NOT_CONFIGURED",
      isProduction()
        ? "Secure file storage is not configured."
        : `Secure file storage is not configured. Missing: ${result.missing.join(", ")}.`
    );
  }
  return result.configuration;
}

export function getS3Runtime() {
  const configuration = requireS3Configuration();
  const identity = `${configuration.region}:${configuration.accessKeyId}`;

  if (
    !globalForS3.writexS3Client ||
    globalForS3.writexS3ClientIdentity !== identity
  ) {
    globalForS3.writexS3Client = new S3Client({
      region: configuration.region,
      credentials: {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
        sessionToken: configuration.sessionToken
      }
    });
    globalForS3.writexS3ClientIdentity = identity;
  }

  return {
    client: globalForS3.writexS3Client,
    bucket: configuration.bucket,
    privatePrefix: configuration.privatePrefix
  };
}
