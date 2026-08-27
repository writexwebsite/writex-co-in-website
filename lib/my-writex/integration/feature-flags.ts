export type MyWritexFeatureFlags = Readonly<{
  MY_WRITEX_ENABLED: boolean;
  MY_WRITEX_LTS_INTEGRATION_ENABLED: boolean;
  MY_WRITEX_CUSTOMER_MASTER_ENABLED: boolean;
  MY_WRITEX_REAL_REQUESTS_ENABLED: boolean;
  MY_WRITEX_PRODUCTION_AUTH_ENABLED: boolean;
  MY_WRITEX_LOCAL_MOCK_ENABLED: boolean;
  MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED: boolean;
}>;

export const MY_WRITEX_FEATURE_FLAG_DEFAULTS: MyWritexFeatureFlags = Object.freeze({
  MY_WRITEX_ENABLED: false,
  MY_WRITEX_LTS_INTEGRATION_ENABLED: false,
  MY_WRITEX_CUSTOMER_MASTER_ENABLED: false,
  MY_WRITEX_REAL_REQUESTS_ENABLED: false,
  MY_WRITEX_PRODUCTION_AUTH_ENABLED: false,
  MY_WRITEX_LOCAL_MOCK_ENABLED: false,
  MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED: false,
});

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function getMyWritexFeatureFlags(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MyWritexFeatureFlags {
  const production = environment.NODE_ENV === "production";
  if (production) return MY_WRITEX_FEATURE_FLAG_DEFAULTS;

  return {
    MY_WRITEX_ENABLED: enabled(environment.MY_WRITEX_ENABLED),
    MY_WRITEX_LTS_INTEGRATION_ENABLED: false,
    MY_WRITEX_CUSTOMER_MASTER_ENABLED: enabled(
      environment.MY_WRITEX_CUSTOMER_MASTER_ENABLED,
    ),
    MY_WRITEX_REAL_REQUESTS_ENABLED: false,
    MY_WRITEX_PRODUCTION_AUTH_ENABLED: false,
    MY_WRITEX_LOCAL_MOCK_ENABLED: enabled(environment.MY_WRITEX_LOCAL_MOCK_ENABLED),
    MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED: enabled(
      environment.MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED,
    ),
  };
}

export function riskyIntegrationFlagsAreOff(flags: MyWritexFeatureFlags) {
  return (
    !flags.MY_WRITEX_LTS_INTEGRATION_ENABLED &&
    !flags.MY_WRITEX_REAL_REQUESTS_ENABLED &&
    !flags.MY_WRITEX_PRODUCTION_AUTH_ENABLED
  );
}
