import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { logIntegrationEvent } from "@/lib/security";

type AcademySyncPayload = {
  requestId: string;
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    officialEmail: string;
    department: string;
    designation: string;
    employmentStatus: "ACTIVE" | "INACTIVE";
    managerEmployeeId: string | null;
  };
  access: { enabled: boolean; role: "EMPLOYEE" | "TRAINER" | "MANAGER_TL" | "SUPER_ADMIN"; employeeSegment: "NEW_BDE" | "SENIOR_BDE"; primarySuperAdmin: boolean };
  team: {
    id: string;
    code: string;
    name: string;
    status: "ACTIVE" | "INACTIVE";
    managerEmployeeId: string | null;
  } | null;
  requestedBy: { adminId: string; email: string };
};

type AcademySyncResult = {
  academyUserId: string;
  employeeReference: string;
  status: "ACTIVE" | "INACTIVE";
  role: "EMPLOYEE" | "TRAINER" | "MANAGER_TL" | "SUPER_ADMIN";
  teamReference: string | null;
  sessionsRevoked: number;
  created: boolean;
  credentialsGenerated?: boolean;
  initialPassword?: string;
};

export type AcademyCredentialResult = {
  academyUserId: string;
  employeeReference: string;
  loginEmail: string;
  initialPassword: string;
  sessionsRevoked: number;
};

export type AcademyEmployeePurgePreview = {
  exists: boolean;
  hasMeaningfulHistory: boolean;
  totalRows: number;
  categories: Array<{ code: string; label: string; count: number }>;
  tables: Array<{ table: string; count: number }>;
};

export type AcademyEmployeePurgeResult = {
  deleted: boolean;
  alreadyAbsent: boolean;
  removedRows: number;
  counts: Record<string, number>;
};

export class AcademySyncError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly requestId: string,
    public readonly status: number
  ) {
    super(message);
  }
}

function configuration() {
  const baseUrl = process.env.ACADEMY_INTERNAL_BASE_URL;
  const serviceId = process.env.ACADEMY_INTERNAL_SERVICE_ID || "writex-website";
  const keyId = process.env.ACADEMY_INTERNAL_KEY_ID;
  const secret = process.env.ACADEMY_INTERNAL_SERVICE_SECRET;
  if (!baseUrl || !keyId || !secret) {
    throw new AcademySyncError(
      "Academy employee sync is not configured.",
      "NOT_CONFIGURED",
      randomUUID(),
      503
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), serviceId, keyId, secret };
}

function signaturePayload(method: string, pathname: string, timestamp: string, nonce: string, body: string) {
  return `${method}\n${pathname}\n${timestamp}\n${nonce}\n${createHash("sha256").update(body).digest("hex")}`;
}

async function signedAcademyRequest<T>({
  pathname,
  method = "GET",
  body = ""
}: {
  pathname: string;
  method?: "GET" | "POST";
  body?: string;
}) {
  const config = configuration();
  const pathOnly = pathname.split("?", 1)[0];
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createHmac("sha256", config.secret)
    .update(signaturePayload(method, pathOnly, timestamp, nonce, body))
    .digest("base64url");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.ACADEMY_INTERNAL_TIMEOUT_MS || 8000));
  try {
    const response = await fetch(`${config.baseUrl}${pathname}`, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        "x-writex-service-id": config.serviceId,
        "x-writex-key-id": config.keyId,
        "x-writex-timestamp": timestamp,
        "x-writex-nonce": nonce,
        "x-writex-signature": signature
      },
      ...(body ? { body } : {}),
      cache: "no-store",
      signal: controller.signal
    });
    const result = await response.json().catch(() => null) as
      | { ok: true; data: T }
      | { ok: false; error?: { code?: string; message?: string } }
      | null;
    if (!response.ok || !result?.ok) {
      const error = result && !result.ok ? result.error : undefined;
      throw new AcademySyncError(
        error?.message || "Academy did not accept the governance request.",
        error?.code || "ACADEMY_REQUEST_FAILED",
        nonce,
        response.status
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof AcademySyncError) throw error;
    throw new AcademySyncError(
      error instanceof Error && error.name === "AbortError"
        ? "Academy governance request timed out."
        : "Academy governance service is temporarily unavailable.",
      error instanceof Error && error.name === "AbortError" ? "ACADEMY_TIMEOUT" : "ACADEMY_UNAVAILABLE",
      nonce,
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

export type AcademyGovernanceConfig = {
  productKey: "SALES_ACADEMY";
  provider: "OPENAI";
  providerProjectId: string;
  modelId: string;
  reasoningEffort: "none";
  maxPrimaryCallsPerEvent: 1;
  pricingVersions: Array<{
    id: string;
    versionKey: string;
    provider: "OPENAI";
    modelId: "gpt-5.6-luna";
    serviceTier: "STANDARD";
    contextTier: "SHORT" | "LONG";
    inputUsdPerMillionTokens: number;
    cachedInputUsdPerMillionTokens: number;
    cacheWriteUsdPerMillionTokens: number;
    outputUsdPerMillionTokens: number;
    longContextThresholdTokens: number;
    currency: "USD";
    effectiveAt: string;
    verifiedAt: string;
    sourceUrl: string;
    modelSourceUrl: string;
    changeReason: string;
  }>;
  capacity: {
    plannedBdes: number;
    trainingDaysPerMonth: number;
    plannedTrainingMonths: number;
    sessionMinutesMin: number;
    sessionMinutesMax: number;
    lightEventsPerBdeDay: number;
    normalEventsPerBdeDay: number;
    rigorousEventsPerBdeDay: number;
  };
  masterStatus: "ACTIVE" | "PAUSED" | "BUDGET_PROTECTED";
  operatingTargetInr: number;
  internalSafetyStopInr: number;
  masterCeilingInr: number;
  providerHardLimitUsd: number;
  higherCapabilityFallbackEnabled: false;
  budgetFxRate: number;
  budgetFxSource: string;
};

export type AcademyUsageExport = {
  settings: {
    provider: string;
    modelId: string | null;
    masterStatus: string;
    academyStatus: string;
    operatingTargetInr: number;
    internalSafetyStopInr: number;
    masterCeilingInr: number;
    academyOperationalLimitInr: number;
  };
  events: Array<{
    eventId: string;
    environment: string;
    occurredAt: string;
    employeeId: string | null;
    employeeDisplayName: string | null;
    applicationSessionId: string | null;
    customerRelationshipId: string | null;
    provider: string;
    providerProjectId: string;
    providerRequestId: string | null;
    modelId: string | null;
    inputTokens: number;
    cachedInputTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    visibleCustomerBubbles: number;
    estimatedCostUsd: number | null;
    estimatedCostInr: number | null;
    pricingVersionId: string | null;
    localEstimatedCostUsd: number | null;
    localEstimatedCostInr: number | null;
    providerReportedCostUsd: number | null;
    providerReportedCostInr: number | null;
    outcome: string;
    latencyMs: number;
    failureType: string | null;
    retryCount: number;
  }>;
  activity: {
    monthStart: string;
    activeBdes: number;
    bdeMessagesSent: number;
    aiResponseEvents: number;
    visibleCustomerBubbles: number;
    trainingSessions: number;
  };
};

export function fetchAcademyAiUsage(after?: string) {
  const query = after ? `?after=${encodeURIComponent(after)}` : "";
  return signedAcademyRequest<AcademyUsageExport>({ pathname: `/api/internal/ai-governance/usage${query}` });
}

export function syncAcademyAiGovernanceConfig(config: AcademyGovernanceConfig) {
  return signedAcademyRequest<{ updatedAt: string }>({
    pathname: "/api/internal/ai-governance/config",
    method: "POST",
    body: JSON.stringify(config)
  });
}

export async function syncEmployeeToAcademy(payload: AcademySyncPayload) {
  const config = configuration();
  const pathname = "/api/internal/employees/sync";
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createHmac("sha256", config.secret)
    .update(signaturePayload("POST", pathname, timestamp, nonce, body))
    .digest("base64url");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.ACADEMY_INTERNAL_TIMEOUT_MS || 8000));

  try {
    const response = await fetch(`${config.baseUrl}${pathname}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-writex-service-id": config.serviceId,
        "x-writex-key-id": config.keyId,
        "x-writex-timestamp": timestamp,
        "x-writex-nonce": nonce,
        "x-writex-signature": signature
      },
      body,
      cache: "no-store",
      signal: controller.signal
    });
    const result = await response.json().catch(() => null) as
      | { ok: true; data: AcademySyncResult }
      | { ok: false; error?: { code?: string; message?: string } }
      | null;
    if (!response.ok || !result?.ok) {
      const error = result && !result.ok ? result.error : undefined;
      throw new AcademySyncError(
        error?.message || "Academy did not accept the employee change.",
        error?.code || "ACADEMY_REQUEST_FAILED",
        payload.requestId,
        response.status
      );
    }
    await logIntegrationEvent({
      system: "sales_academy",
      endpoint: pathname,
      requestId: payload.requestId,
      status: "success"
    });
    return result.data;
  } catch (error) {
    const safeError = error instanceof AcademySyncError
      ? error
      : new AcademySyncError(
          error instanceof Error && error.name === "AbortError"
            ? "Academy sync timed out. The requested change is saved and can be retried."
            : "Academy is temporarily unavailable. The requested change is saved and can be retried.",
          error instanceof Error && error.name === "AbortError" ? "ACADEMY_TIMEOUT" : "ACADEMY_UNAVAILABLE",
          payload.requestId,
          503
        );
    await logIntegrationEvent({
      system: "sales_academy",
      endpoint: pathname,
      requestId: payload.requestId,
      status: "failed",
      errorMessage: `${safeError.code}: ${safeError.message}`
    });
    throw safeError;
  } finally {
    clearTimeout(timer);
  }
}

export async function resetAcademyEmployeePassword(
  employeeId: string,
  requestedBy: { adminId: string; email: string }
) {
  const requestId = randomUUID();
  const pathname = `/api/internal/employees/${encodeURIComponent(employeeId)}/credentials/reset`;
  try {
    const result = await signedAcademyRequest<AcademyCredentialResult>({
      pathname,
      method: "POST",
      body: JSON.stringify({ requestId, requestedBy })
    });
    await logIntegrationEvent({
      system: "sales_academy",
      endpoint: pathname,
      requestId,
      status: "success"
    });
    return { ...result, requestId };
  } catch (error) {
    const safeError = error instanceof AcademySyncError
      ? error
      : new AcademySyncError(
          "Academy password reset is temporarily unavailable. Retry from this employee record.",
          "ACADEMY_UNAVAILABLE",
          requestId,
          503
        );
    await logIntegrationEvent({
      system: "sales_academy",
      endpoint: pathname,
      requestId,
      status: "failed",
      errorMessage: `${safeError.code}: ${safeError.message}`
    });
    throw safeError;
  }
}

export async function previewAcademyEmployeePurge(
  employeeId: string,
  requestedBy: { adminId: string; email: string }
) {
  const requestId = randomUUID();
  const pathname = `/api/internal/employees/${encodeURIComponent(employeeId)}/purge`;
  const result = await signedAcademyRequest<AcademyEmployeePurgePreview>({
    pathname,
    method: "POST",
    body: JSON.stringify({ requestId, action: "PREVIEW", requestedBy })
  });
  return { requestId, ...result };
}

export async function permanentlyPurgeAcademyEmployee(
  employeeId: string,
  input: {
    mode: "ZERO_HISTORY" | "FULL_PURGE";
    reason: string;
    requestedBy: { adminId: string; email: string };
  }
) {
  const requestId = randomUUID();
  const pathname = `/api/internal/employees/${encodeURIComponent(employeeId)}/purge`;
  const result = await signedAcademyRequest<AcademyEmployeePurgeResult>({
    pathname,
    method: "POST",
    body: JSON.stringify({ requestId, action: "PURGE", ...input })
  });
  return { requestId, ...result };
}
