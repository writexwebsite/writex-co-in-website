import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import {
  isEmailConfigured,
  verifyEmailTransport
} from "@/lib/notifications";
import { getS3Health } from "@/lib/storage/s3-health";

export const INTEGRATION_HEALTH_STATUSES = [
  "connected_healthy",
  "configured_unreachable",
  "awaiting_connection",
  "disabled_configuration",
  "status_check_failed",
  "not_configured"
] as const;

export type IntegrationHealthStatus =
  (typeof INTEGRATION_HEALTH_STATUSES)[number];

export const integrationHealthLabels: Record<
  IntegrationHealthStatus,
  string
> = {
  connected_healthy: "Connected and Healthy",
  configured_unreachable: "Configured but Unreachable",
  awaiting_connection: "Awaiting Connection",
  disabled_configuration: "Disabled by Configuration",
  status_check_failed: "Status Check Failed",
  not_configured: "Not Configured"
};

export type IntegrationHealthRecord = {
  key:
    | "website"
    | "database"
    | "s3"
    | "holiday_storage"
    | "holiday_audio_upload"
    | "holiday_audio_playback"
    | "ses"
    | "notification_service"
    | "lts"
    | "pmt"
    | "hrms"
    | "trust_publishing";
  name: string;
  status: IntegrationHealthStatus;
  detail: string;
  checkedAt: string;
  href: string;
  messageIdStored?: boolean;
};

type HttpHealthInput = {
  configured: boolean;
  disabled: boolean;
  url?: string;
  headers?: Record<string, string>;
  awaitingDetail: string;
  disabledDetail: string;
  connectedDetail: string;
};

async function checkHttpProvider(
  input: HttpHealthInput
): Promise<Pick<IntegrationHealthRecord, "status" | "detail">> {
  if (input.disabled) {
    return {
      status: "disabled_configuration",
      detail: input.disabledDetail
    };
  }
  if (!input.configured) {
    return {
      status: "awaiting_connection",
      detail: input.awaitingDetail
    };
  }
  if (!input.url) {
    return {
      status: "not_configured",
      detail: "A live provider is selected but its health endpoint is not configured."
    };
  }
  try {
    const response = await fetch(input.url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-correlation-id": crypto.randomUUID(),
        ...(input.headers || {})
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000)
    });
    if (response.ok) {
      return { status: "connected_healthy", detail: input.connectedDetail };
    }
    if ([401, 403].includes(response.status)) {
      return {
        status: "configured_unreachable",
        detail: "The provider responded, but the configured server credential or source policy was not accepted."
      };
    }
    return {
      status: "configured_unreachable",
      detail: `The provider responded with HTTP ${response.status}.`
    };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        status: "configured_unreachable",
        detail: "The configured provider did not respond within the safe health-check window."
      };
    }
    return {
      status: "status_check_failed",
      detail: "The health check could not complete. Configuration has not been treated as absent."
    };
  }
}

export async function storeIntegrationHealthSnapshot(
  record: Pick<IntegrationHealthRecord, "key" | "status" | "detail"> & {
    messageId?: string | null;
  }
) {
  if (!isDatabaseConfigured()) return;
  await dbQuery(
    `
      insert into integration_health_snapshots (
        integration_name, status, safe_detail, last_message_id, checked_at, updated_at
      )
      values ($1, $2, $3, $4, now(), now())
      on conflict (integration_name)
      do update set
        status = excluded.status,
        safe_detail = excluded.safe_detail,
        last_message_id = coalesce(excluded.last_message_id, integration_health_snapshots.last_message_id),
        checked_at = excluded.checked_at,
        updated_at = now()
    `,
    [record.key, record.status, record.detail, record.messageId || null]
  ).catch(() => undefined);
}

async function storedMessageIdExists() {
  if (!isDatabaseConfigured()) return false;
  const result = await dbQuery<{ present: boolean }>(
    `
      select exists (
        select 1
        from integration_health_snapshots
        where integration_name in ('ses', 'notification_service')
          and last_message_id is not null
      ) as present
    `
  ).catch(() => null);
  return Boolean(result?.rows[0]?.present);
}

export async function getIntegrationHealth(): Promise<
  IntegrationHealthRecord[]
> {
  const checkedAt = new Date().toISOString();
  const s3Promise = getS3Health({ force: true });
  const emailPromise = isEmailConfigured()
    ? verifyEmailTransport()
    : Promise.resolve({ configured: false, reachable: false, provider: "none" });
  const databasePromise = isDatabaseConfigured()
    ? dbQuery("select 1 as healthy")
        .then(() => true)
        .catch(() => false)
    : Promise.resolve(false);
  const holidayAudioPromise = isDatabaseConfigured()
    ? dbQuery<{ available: boolean }>(
        `
          select exists (
            select 1
            from holiday_theme_assets
            where asset_role = 'audio'
              and status = 'active'
              and review_status = 'approved'
          ) as available
        `
      )
        .then((result) => Boolean(result.rows[0]?.available))
        .catch(() => false)
    : Promise.resolve(false);

  const ltsHeader =
    process.env.LTS_API_HEADER_NAME?.trim() || "x-writex-api-key";
  const ltsHealthPromise = checkHttpProvider({
    configured: Boolean(
      process.env.LTS_HEALTH_URL && process.env.LTS_HEALTH_API_KEY
    ),
    disabled:
      process.env.REPRESENTATIVE_DIRECTORY_SOURCE !== "lts" &&
      process.env.CLIENT_AUTH_PROVIDER !== "lts",
    url: process.env.LTS_HEALTH_URL,
    headers: process.env.LTS_HEALTH_API_KEY
      ? { [ltsHeader]: process.env.LTS_HEALTH_API_KEY }
      : undefined,
    awaitingDetail: "The LTS provider is awaiting an approved endpoint and server credential.",
    disabledDetail: "LTS-backed website features are disabled by configuration.",
    connectedDetail: "The LTS health endpoint accepted the server-side check."
  });
  const pmtBase = process.env.PMT_API_BASE_URL?.trim();
  const pmtHealthPromise = checkHttpProvider({
    configured: Boolean(pmtBase && process.env.PMT_API_KEY),
    disabled:
      process.env.CLIENT_PROJECT_PROVIDER !== "pmt" &&
      process.env.CLIENT_FILES_PROVIDER !== "pmt",
    url:
      process.env.PMT_HEALTH_URL ||
      (pmtBase ? new URL("/v1/writex-integration/health", pmtBase).toString() : undefined),
    headers: process.env.PMT_API_KEY
      ? { authorization: `Bearer ${process.env.PMT_API_KEY}` }
      : undefined,
    awaitingDetail: "PMT project and deliverable providers are awaiting connection.",
    disabledDetail: "PMT-backed portal features are disabled by configuration.",
    connectedDetail: "The PMT health endpoint accepted the server-side check."
  });
  const hrmsPromise = checkHttpProvider({
    configured: Boolean(
      process.env.HIRING_HRMS_HEALTH_URL && process.env.HIRING_HRMS_API_KEY
    ),
    disabled: process.env.HIRING_HRMS_PROVIDER !== "api",
    url: process.env.HIRING_HRMS_HEALTH_URL,
    headers: process.env.HIRING_HRMS_API_KEY
      ? { authorization: `Bearer ${process.env.HIRING_HRMS_API_KEY}` }
      : undefined,
    awaitingDetail: "The HRMS joining provider is awaiting connection.",
    disabledDetail: "HRMS employee creation is disabled by configuration.",
    connectedDetail: "The HRMS health endpoint accepted the server-side check."
  });

  const [
    s3,
    email,
    databaseHealthy,
    holidayAudioAvailable,
    lts,
    pmt,
    hrms,
    messageIdStored
  ] =
    await Promise.all([
      s3Promise,
      emailPromise,
      databasePromise,
      holidayAudioPromise,
      ltsHealthPromise,
      pmtHealthPromise,
      hrmsPromise,
      storedMessageIdExists()
    ]);

  const s3Status: IntegrationHealthStatus =
    s3.state === "configured_healthy"
      ? "connected_healthy"
      : s3.state === "configured_unreachable"
        ? "configured_unreachable"
        : s3.state === "not_configured"
          ? "not_configured"
          : "status_check_failed";
  const emailStatus: IntegrationHealthStatus = !email.configured
    ? "not_configured"
    : email.reachable
      ? "connected_healthy"
      : "configured_unreachable";

  const records: IntegrationHealthRecord[] = [
    {
      key: "website",
      name: "Website",
      status: "connected_healthy",
      detail: "The current authenticated Admin request was served successfully.",
      checkedAt,
      href: "/api/health"
    },
    {
      key: "database",
      name: "Database",
      status: !isDatabaseConfigured()
        ? "not_configured"
        : databaseHealthy
          ? "connected_healthy"
          : "configured_unreachable",
      detail: !isDatabaseConfigured()
        ? "The application database is not configured."
        : databaseHealthy
          ? "The application database accepted a read-only health query."
          : "The configured application database did not accept the health query.",
      checkedAt,
      href: "/admin/system-health"
    },
    {
      key: "s3",
      name: "Private S3",
      status: s3Status,
      detail:
        s3Status === "connected_healthy"
          ? "Private object storage is reachable through the least-privilege application identity."
          : "The S3 health result reflects reachability without exposing bucket or credential details.",
      checkedAt: s3.lastCheckedAt,
      href: "/admin/storage"
    },
    {
      key: "holiday_storage",
      name: "Holiday Asset Storage",
      status: s3Status,
      detail:
        s3Status === "connected_healthy"
          ? "Festival assets use the same private WriteX S3 runtime and isolated asset prefix."
          : "Holiday asset storage follows the current private S3 health state.",
      checkedAt: s3.lastCheckedAt,
      href: "/admin/website-experience/holiday-themes"
    },
    {
      key: "holiday_audio_upload",
      name: "Audio Upload",
      status: s3Status,
      detail:
        s3Status === "connected_healthy"
          ? "Festival audio uploads can reach the isolated private S3 prefix."
          : "Festival audio upload availability follows private S3 reachability.",
      checkedAt: s3.lastCheckedAt,
      href: "/admin/website-experience/holiday-themes"
    },
    {
      key: "holiday_audio_playback",
      name: "Audio Playback",
      status:
        s3Status !== "connected_healthy"
          ? s3Status
          : holidayAudioAvailable
            ? "connected_healthy"
            : "awaiting_connection",
      detail:
        s3Status !== "connected_healthy"
          ? "Playback is unavailable while private holiday storage is unreachable."
          : holidayAudioAvailable
            ? "At least one approved private audio asset is available through the protected playback route."
            : "No approved active holiday audio asset is currently available.",
      checkedAt: s3.lastCheckedAt,
      href: "/admin/website-experience/holiday-themes"
    },
    {
      key: "ses",
      name: "Amazon SES",
      status: emailStatus,
      detail:
        emailStatus === "connected_healthy"
          ? "The configured SMTP transport accepted a live connection verification."
          : "Email configuration is reported separately from transport reachability.",
      checkedAt,
      href: "/admin/email",
      messageIdStored
    },
    {
      key: "notification_service",
      name: "Notification Service",
      status: emailStatus,
      detail:
        emailStatus === "connected_healthy"
          ? "Application notifications have a reachable email transport."
          : "Notification delivery remains fail-safe while the transport is unavailable.",
      checkedAt,
      href: "/admin/email",
      messageIdStored
    },
    { key: "lts", name: "LTS", ...lts, checkedAt, href: "/admin/integration-logs" },
    { key: "pmt", name: "PMT", ...pmt, checkedAt, href: "/admin/integration-logs" },
    { key: "hrms", name: "HRMS", ...hrms, checkedAt, href: "/admin/hiring/hrms-sync" },
    {
      key: "trust_publishing",
      name: "Trust Publishing",
      status:
        process.env.HIRING_TRUST_PUBLISHING_ENABLED === "true"
          ? process.env.HIRING_TRUST_PROVIDER === "api"
            ? "awaiting_connection"
            : "not_configured"
          : "disabled_configuration",
      detail:
        process.env.HIRING_TRUST_PUBLISHING_ENABLED === "true"
          ? "Trust publishing is enabled and awaits a provider-specific health adapter."
          : "Trust publishing is disabled by configuration.",
      checkedAt,
      href: "/admin/hiring/trust-publishing"
    }
  ];

  await Promise.all(
    records.map((record) =>
      storeIntegrationHealthSnapshot({
        key: record.key,
        status: record.status,
        detail: record.detail
      })
    )
  );
  return records;
}
