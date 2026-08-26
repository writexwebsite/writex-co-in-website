import "server-only";

import { ApiError } from "@/lib/api/response";
import { logIntegrationEvent } from "@/lib/security";
import {
  mapLtsStatusToPortalStage,
  portalStageKeys,
  type PortalStageKey,
  type PortalStageStatus
} from "@/lib/integrations/status-mapping";

type IntegrationMode = "disabled" | "mock" | "live";

export type LtsInvoiceValidation = {
  valid: boolean;
  invoiceId: string;
  orderId?: string;
  clientName?: string;
  whatsappMasked?: string;
  status?: string;
};

export type LtsInvoice = {
  invoiceId: string;
  orderId?: string;
  clientName?: string;
  whatsapp?: string;
  email?: string;
  serviceType?: string;
  subject?: string;
  academicLevel?: string;
  wordCount?: number;
  deadline?: string;
  orderStatus?: string;
  deliveryStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedRepresentative?: {
    name?: string;
    designation?: string;
    department?: string;
    status?: string;
    approved: boolean;
  };
};

export type LtsWorkJourneyStage = {
  key: PortalStageKey;
  label: string;
  status: PortalStageStatus;
  completedAt?: string;
  description?: string;
};

export type LtsWorkJourney = {
  invoiceId: string;
  currentStage: PortalStageKey;
  progressPercent: number;
  stages: LtsWorkJourneyStage[];
};

export type LtsOrderFile = {
  id: string;
  fileName?: string;
  assetType?: "preview" | "final" | "brief" | "sample" | "other";
  fileType?: string;
  fileSize?: number;
  status?: string;
  s3Key?: string;
};

export type LtsOrderFiles = {
  invoiceId: string;
  previewAvailable: boolean;
  finalAvailable: boolean;
  previewFileId?: string;
  finalFileId?: string;
  files: LtsOrderFile[];
};

export type LtsSamples = {
  samples: Array<{
    id: string;
    title: string;
    category?: string;
    description?: string;
  }>;
};

export type ClientEventType =
  | "client_logged_in"
  | "preview_viewed"
  | "preview_opened"
  | "download_attempted"
  | "final_download_started"
  | "revision_requested"
  | "payment_proof_uploaded";

export type ClientEvent = {
  eventType: ClientEventType | string;
  metadata?: Record<string, unknown>;
};

function getIntegrationMode(): IntegrationMode {
  const mode = process.env.INTEGRATION_MODE || "disabled";
  return mode === "mock" || mode === "live" ? mode : "disabled";
}

function getTimeoutMs() {
  const value = Number(process.env.LTS_API_TIMEOUT_MS || 10000);
  return Number.isFinite(value) && value > 0 ? value : 10000;
}

function isLiveConfigured() {
  return Boolean(process.env.LTS_API_BASE_URL && process.env.LTS_API_KEY);
}

function maskWhatsapp(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function integrationUnavailable(message = "Work journey data is temporarily unavailable."): never {
  throw new ApiError(503, "INTEGRATION_UNAVAILABLE", message);
}

function assertModeAllowsRequest(endpoint: string) {
  const mode = getIntegrationMode();

  if (mode === "disabled") {
    integrationUnavailable("Client portal data is temporarily unavailable.");
  }

  if (mode === "mock" && process.env.NODE_ENV === "production") {
    integrationUnavailable("LTS mock mode is not available in production.");
  }

  if (mode === "live" && !isLiveConfigured()) {
    integrationUnavailable("Client portal data is temporarily unavailable.");
  }

  return { mode, endpoint };
}

async function logLts({
  endpoint,
  requestId,
  status,
  errorMessage
}: {
  endpoint: string;
  requestId?: string;
  status: string;
  errorMessage?: string;
}) {
  await logIntegrationEvent({
    system: "LTS",
    endpoint,
    requestId,
    status,
    errorMessage
  });
}

async function requestLts<T>(endpoint: string, init?: RequestInit): Promise<T> {
  assertModeAllowsRequest(endpoint);
  const requestId = crypto.randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  const url = new URL(endpoint, process.env.LTS_API_BASE_URL || "");

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${process.env.LTS_API_KEY}`,
        "x-request-id": requestId,
        ...(init?.headers || {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    await logLts({ endpoint, requestId, status: String(response.status) });

    if (!response.ok) {
      integrationUnavailable();
    }

    return (await response.json()) as T;
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    await logLts({
      endpoint,
      requestId,
      status: isAbort ? "timeout" : "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });

    if (error instanceof ApiError) throw error;
    integrationUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}

function readString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function readBoolean(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "true") return true;
      if (value.toLowerCase() === "false") return false;
    }
  }
  return false;
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeInvoiceValidation(payload: unknown, fallbackInvoiceId: string) {
  const source = toObject(payload);
  const whatsapp = readString(source, ["whatsapp", "phone", "clientWhatsapp"]);
  return {
    valid: Boolean(source.valid ?? source.exists ?? source.matched),
    invoiceId: readString(source, ["invoiceId", "invoice_id", "id"]) || fallbackInvoiceId,
    orderId: readString(source, ["orderId", "order_id"]),
    clientName: readString(source, ["clientName", "client_name", "name"]),
    whatsappMasked:
      readString(source, ["whatsappMasked", "whatsapp_masked"]) ||
      (whatsapp ? maskWhatsapp(whatsapp) : undefined),
    status: readString(source, ["status", "orderStatus", "order_status"])
  } satisfies LtsInvoiceValidation;
}

function normalizeInvoice(payload: unknown, fallbackInvoiceId: string) {
  const source = toObject(payload);
  const representative = toObject(
    source.assignedRepresentative ||
      source.assigned_representative ||
      source.representative
  );
  const representativeName = readString(representative, [
    "publicDisplayName",
    "public_display_name",
    "name",
    "fullName",
    "full_name"
  ]);
  const representativeApproved =
    readBoolean(representative, [
      "verified",
      "isVerified",
      "is_verified",
      "isPubliclyVerifiable",
      "is_publicly_verifiable"
    ]);
  return {
    invoiceId: readString(source, ["invoiceId", "invoice_id", "id"]) || fallbackInvoiceId,
    orderId: readString(source, ["orderId", "order_id"]),
    clientName: readString(source, ["clientName", "client_name", "name"]),
    whatsapp: readString(source, ["whatsapp", "phone", "clientWhatsapp"]),
    email: readString(source, ["email", "clientEmail"]),
    serviceType: readString(source, ["serviceType", "service_type", "service"]),
    subject: readString(source, ["subject"]),
    academicLevel: readString(source, ["academicLevel", "academic_level", "level"]),
    wordCount: readNumber(source, ["wordCount", "word_count"]),
    deadline: readString(source, ["deadline", "dueDate", "due_date"]),
    orderStatus: readString(source, ["orderStatus", "order_status", "workStatus", "status"]),
    deliveryStatus: readString(source, ["deliveryStatus", "delivery_status"]),
    createdAt: readString(source, ["createdAt", "created_at"]),
    updatedAt: readString(source, ["updatedAt", "updated_at"]),
    assignedRepresentative: representativeName
      ? {
          name: representativeName,
          designation: readString(representative, ["designation"]),
          department: readString(representative, ["department"]),
          status: readString(representative, ["status"]),
          approved: representativeApproved
        }
      : undefined
  } satisfies LtsInvoice;
}

function stageLabel(key: PortalStageKey) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildDefaultJourney(invoiceId: string, externalStatus?: string): LtsWorkJourney {
  const currentStage = mapLtsStatusToPortalStage(externalStatus);
  const currentIndex = portalStageKeys.indexOf(currentStage);
  const stages = portalStageKeys.map((key, index) => ({
    key,
    label: stageLabel(key),
    status:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "active"
          : "pending",
    description: "Status mapping placeholder until final LTS workflow stages are connected."
  })) satisfies LtsWorkJourneyStage[];

  return {
    invoiceId,
    currentStage,
    progressPercent: Math.round(((currentIndex + 1) / portalStageKeys.length) * 100),
    stages
  };
}

function normalizeJourney(payload: unknown, invoiceId: string): LtsWorkJourney {
  const source = toObject(payload);
  const externalStatus = readString(source, ["currentStage", "current_stage", "status"]);
  const defaultJourney = buildDefaultJourney(invoiceId, externalStatus);
  const rawStages = Array.isArray(source.stages) ? source.stages : undefined;

  if (!rawStages?.length) return defaultJourney;

  const stages = rawStages.map((stage) => {
    const item = toObject(stage);
    const key = mapLtsStatusToPortalStage(readString(item, ["key", "status", "code"]));
    const rawStatus = readString(item, ["status", "state"]);
    const status =
      rawStatus === "complete" || rawStatus === "active" || rawStatus === "pending"
        ? rawStatus
        : "pending";
    return {
      key,
      label: readString(item, ["label", "name"]) || stageLabel(key),
      status,
      completedAt: readString(item, ["completedAt", "completed_at"]),
      description: readString(item, ["description"])
    } satisfies LtsWorkJourneyStage;
  });

  return {
    invoiceId,
    currentStage: mapLtsStatusToPortalStage(externalStatus),
    progressPercent:
      readNumber(source, ["progressPercent", "progress_percent"]) ??
      defaultJourney.progressPercent,
    stages
  };
}

function normalizeFiles(payload: unknown, invoiceId: string): LtsOrderFiles {
  const source = toObject(payload);
  const rawFiles = Array.isArray(source.files) ? source.files : [];
  const files = rawFiles.map((file) => {
    const item = toObject(file);
    return {
      id: readString(item, ["id", "fileId", "file_id"]) || crypto.randomUUID(),
      fileName: readString(item, ["fileName", "file_name", "name"]),
      assetType:
        (readString(item, ["assetType", "asset_type", "type"]) as LtsOrderFile["assetType"]) ||
        "other",
      fileType: readString(item, ["fileType", "file_type", "mimeType"]),
      fileSize: readNumber(item, ["fileSize", "file_size", "size"]),
      status: readString(item, ["status"]),
      s3Key: readString(item, ["s3Key", "s3_key", "storageKey"])
    } satisfies LtsOrderFile;
  });

  return {
    invoiceId,
    previewAvailable:
      readBoolean(source, ["previewAvailable", "preview_available"]) ||
      files.some((file) => file.assetType === "preview"),
    finalAvailable:
      readBoolean(source, ["finalAvailable", "final_available"]) ||
      files.some((file) => file.assetType === "final"),
    previewFileId: readString(source, ["previewFileId", "preview_file_id"]),
    finalFileId: readString(source, ["finalFileId", "final_file_id"]),
    files
  };
}

function getMockInvoice(invoiceId: string) {
  const fixtures: Record<string, LtsInvoice> = {
    "WXTEST-PENDING": {
      invoiceId,
      orderId: "WXORDER-TEST-PENDING",
      clientName: "Test Client Pending",
      whatsapp: "919999990001",
      email: "pending@example.test",
      serviceType: "Coursework & Brief Support",
      subject: "Management",
      academicLevel: "Postgraduate",
      wordCount: 2500,
      deadline: "2026-08-15",
      orderStatus: "ORDER_CREATED",
      deliveryStatus: "pending"
    },
    "WXTEST-READY": {
      invoiceId,
      orderId: "WXORDER-TEST-READY",
      clientName: "Test Client Ready",
      whatsapp: "919999990002",
      email: "ready@example.test",
      serviceType: "Dissertation Support",
      subject: "Business Research",
      academicLevel: "MBA",
      wordCount: 8000,
      deadline: "2026-08-20",
      orderStatus: "COMPLETED",
      deliveryStatus: "preview_ready"
    },
    "WXTEST-PAID": {
      invoiceId,
      orderId: "WXORDER-TEST-PAID",
      clientName: "Test Client Paid",
      whatsapp: "919999990003",
      email: "paid@example.test",
      serviceType: "Academic Editing & Proofreading",
      subject: "Finance",
      academicLevel: "Postgraduate",
      wordCount: 3500,
      deadline: "2026-08-25",
      orderStatus: "DELIVERED",
      deliveryStatus: "closed"
    }
  };

  return fixtures[invoiceId];
}

function mockOnly(invoiceId?: string) {
  if (getIntegrationMode() !== "mock" || process.env.NODE_ENV === "production") {
    return null;
  }
  if (!invoiceId) return true;
  return getMockInvoice(invoiceId) ? true : null;
}

export async function validateInvoice(invoiceId: string, whatsapp: string) {
  const endpoint = "/client/validate";
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    const invoice = getMockInvoice(invoiceId);
    return {
      valid: Boolean(invoice && invoice.whatsapp?.endsWith(whatsapp.replace(/\D/g, "").slice(-4))),
      invoiceId,
      orderId: invoice?.orderId,
      clientName: invoice?.clientName,
      whatsappMasked: invoice?.whatsapp ? maskWhatsapp(invoice.whatsapp) : undefined,
      status: invoice?.orderStatus
    } satisfies LtsInvoiceValidation;
  }

  const payload = await requestLts(endpoint, {
    method: "POST",
    body: JSON.stringify({ invoiceId, whatsapp })
  });

  return normalizeInvoiceValidation(payload, invoiceId);
}

export async function getInvoice(invoiceId: string) {
  const endpoint = `/invoices/${encodeURIComponent(invoiceId)}`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    return getMockInvoice(invoiceId) as LtsInvoice;
  }

  return normalizeInvoice(await requestLts(endpoint), invoiceId);
}

export async function getWorkJourney(invoiceId: string) {
  const endpoint = `/invoices/${encodeURIComponent(invoiceId)}/journey`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    return buildDefaultJourney(invoiceId, getMockInvoice(invoiceId)?.orderStatus);
  }

  return normalizeJourney(await requestLts(endpoint), invoiceId);
}

export async function getOrderFiles(invoiceId: string) {
  const endpoint = `/invoices/${encodeURIComponent(invoiceId)}/files`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    return {
      invoiceId,
      previewAvailable: invoiceId !== "WXTEST-PENDING",
      finalAvailable: invoiceId === "WXTEST-PAID",
      previewFileId: invoiceId !== "WXTEST-PENDING" ? `${invoiceId}-PREVIEW` : undefined,
      finalFileId: invoiceId === "WXTEST-PAID" ? `${invoiceId}-FINAL` : undefined,
      files: []
    } satisfies LtsOrderFiles;
  }

  return normalizeFiles(await requestLts(endpoint), invoiceId);
}

export async function getSamples() {
  const endpoint = "/samples";
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly()) {
    return { samples: [] } satisfies LtsSamples;
  }

  const payload = await requestLts<unknown>(endpoint);
  const source = toObject(payload);
  const samples = Array.isArray(source.samples) ? source.samples : [];

  return {
    samples: samples.map((sample) => {
      const item = toObject(sample);
      return {
        id: readString(item, ["id"]) || crypto.randomUUID(),
        title: readString(item, ["title", "name"]) || "Sample",
        category: readString(item, ["category"]),
        description: readString(item, ["description"])
      };
    })
  } satisfies LtsSamples;
}

export async function sendClientEvent(invoiceId: string, event: ClientEvent) {
  const endpoint = `/invoices/${encodeURIComponent(invoiceId)}/events`;
  const mode = assertModeAllowsRequest(endpoint).mode;

  if (mode === "mock" && mockOnly(invoiceId)) {
    await logLts({
      endpoint,
      requestId: `${invoiceId}:${event.eventType}`,
      status: "mock_accepted"
    });
    return { accepted: true };
  }

  await requestLts(endpoint, {
    method: "POST",
    body: JSON.stringify(event)
  });

  return { accepted: true };
}
