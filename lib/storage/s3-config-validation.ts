export type S3Environment = Partial<
  Record<
    | "AWS_REGION"
    | "AWS_ACCESS_KEY_ID"
    | "AWS_SECRET_ACCESS_KEY"
    | "AWS_SESSION_TOKEN"
    | "AWS_S3_BUCKET"
    | "AWS_S3_PRIVATE_PREFIX",
    string | undefined
  >
>;

export type ResolvedS3Configuration = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  bucket: string;
  privatePrefix: string;
};

export type S3ConfigurationResult =
  | { configured: true; configuration: ResolvedS3Configuration; missing: [] }
  | { configured: false; configuration: null; missing: string[] };

function clean(value: string | undefined) {
  return value?.trim() || "";
}

export function resolveS3Configuration(
  environment: S3Environment
): S3ConfigurationResult {
  const values = {
    region: clean(environment.AWS_REGION),
    accessKeyId: clean(environment.AWS_ACCESS_KEY_ID),
    secretAccessKey: clean(environment.AWS_SECRET_ACCESS_KEY),
    sessionToken: clean(environment.AWS_SESSION_TOKEN),
    bucket: clean(environment.AWS_S3_BUCKET),
    privatePrefix: clean(environment.AWS_S3_PRIVATE_PREFIX).replace(
      /^\/+|\/+$/g,
      ""
    )
  };
  const required = [
    ["AWS_REGION", values.region],
    ["AWS_ACCESS_KEY_ID", values.accessKeyId],
    ["AWS_SECRET_ACCESS_KEY", values.secretAccessKey],
    ["AWS_S3_BUCKET", values.bucket],
    ["AWS_S3_PRIVATE_PREFIX", values.privatePrefix]
  ] as const;
  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    return { configured: false, configuration: null, missing };
  }

  return {
    configured: true,
    configuration: {
      region: values.region,
      accessKeyId: values.accessKeyId,
      secretAccessKey: values.secretAccessKey,
      sessionToken: values.sessionToken || undefined,
      bucket: values.bucket,
      privatePrefix: values.privatePrefix
    },
    missing: []
  };
}
