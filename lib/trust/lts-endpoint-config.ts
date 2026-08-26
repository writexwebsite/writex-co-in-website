export type LtsTrustCentreConfig = {
  headerName: string;
  health: {
    url: string;
    apiKey: string;
  };
  representatives: {
    url: string;
    apiKey: string;
  };
  timeoutMs: number;
};

type LtsEnvironment = Partial<Record<string, string | undefined>>;

export function readLtsTrustCentreConfig(
  environment: LtsEnvironment
): LtsTrustCentreConfig | null {
  const healthUrl = environment.LTS_HEALTH_URL?.trim();
  const healthApiKey = environment.LTS_HEALTH_API_KEY?.trim();
  const representativesUrl = environment.LTS_REPRESENTATIVES_URL?.trim();
  const representativesApiKey =
    environment.LTS_REPRESENTATIVES_API_KEY?.trim();
  const headerName =
    environment.LTS_API_HEADER_NAME?.trim() || "x-writex-api-key";
  const configuredTimeout = Number(environment.LTS_API_TIMEOUT_MS || 5000);

  if (
    !healthUrl ||
    !healthApiKey ||
    !representativesUrl ||
    !representativesApiKey ||
    !/^[A-Za-z0-9-]+$/.test(headerName)
  ) {
    return null;
  }

  return {
    headerName,
    health: { url: healthUrl, apiKey: healthApiKey },
    representatives: {
      url: representativesUrl,
      apiKey: representativesApiKey
    },
    timeoutMs:
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 5000
  };
}
