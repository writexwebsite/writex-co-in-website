import {
  MY_WRITEX_REQUEST_SOURCES,
  emptyRequirementFields,
  type MyWritexRequestFile,
  type MyWritexRequestInput,
  type MyWritexRequirementFields,
} from "@/lib/my-writex/request-types";

export const MY_WRITEX_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MY_WRITEX_MAX_FILES = 8;

export const MY_WRITEX_ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function normalizeRequirementTitle(value: string) {
  return value.replace(/(^|[\s/–—-]+)([a-z])/g, (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);
}

export function safeRequestFileName(value: unknown) {
  const cleaned = text(value, 140).replace(/[\\/]/g, "-").replace(/\.{2,}/g, ".");
  return cleaned.replace(/[^a-zA-Z0-9._()\- ]/g, "_").replace(/^\.+/, "");
}

export function sanitizeRequirementFields(value: unknown): MyWritexRequirementFields {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const empty = emptyRequirementFields();
  return {
    service: text(source.service, 80),
    category: text(source.category, 80),
    title: normalizeRequirementTitle(text(source.title, 160)),
    subject: text(source.subject, 120),
    module: text(source.module, 120),
    institution: text(source.institution, 160),
    course: text(source.course, 160),
    scope: text(source.scope, 240),
    wordCount: text(source.wordCount, 24),
    deadlineDate: text(source.deadlineDate, 10),
    deadlineTime: text(source.deadlineTime, 5),
    timezone: text(source.timezone, 80) || empty.timezone,
    urgency: text(source.urgency, 40) || empty.urgency,
    context: text(source.context, 800),
    expectedDeliverable: text(source.expectedDeliverable, 240),
    detailedBrief: text(source.detailedBrief, 6000),
    fileNote: text(source.fileNote, 800),
  };
}

export function validateDeadline(fields: Pick<MyWritexRequirementFields, "deadlineDate" | "deadlineTime">, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.deadlineDate)) return "Choose a valid deadline date.";
  if (fields.deadlineTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.deadlineTime)) return "Choose a valid deadline time.";
  const [year, month, day] = fields.deadlineDate.split("-").map(Number);
  const calendarDate = new Date(year, month - 1, day);
  if (calendarDate.getFullYear() !== year || calendarDate.getMonth() !== month - 1 || calendarDate.getDate() !== day) return "Choose a possible calendar date.";
  const date = new Date(`${fields.deadlineDate}T${fields.deadlineTime || "23:59"}:00`);
  if (Number.isNaN(date.getTime())) return "Choose a valid deadline date and time.";
  if (date.getTime() <= now.getTime()) return "The deadline must be in the future.";
  return "";
}

export function validateRequestStep(step: number, fields: MyWritexRequirementFields) {
  const errors: string[] = [];
  if (step === 1) {
    if (!fields.service) errors.push("Choose a service.");
    if (!fields.category) errors.push("Choose a category.");
    if (fields.title.length < 4) errors.push("Add a clear requirement title.");
  }
  if (step === 2) {
    if (fields.scope.length < 4) errors.push("Describe the scope or word count.");
    const deadlineError = validateDeadline(fields);
    if (deadlineError) errors.push(deadlineError);
    if (!fields.expectedDeliverable) errors.push("Describe the expected deliverable.");
  }
  if (step === 3 && fields.detailedBrief.length < 20) {
    errors.push("Add a detailed brief of at least 20 characters.");
  }
  return errors;
}

export function sanitizeRequestFiles(value: unknown): MyWritexRequestFile[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MY_WRITEX_MAX_FILES) throw new Error(`Add no more than ${MY_WRITEX_MAX_FILES} files.`);
  return value.map((candidate) => {
    const file = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
    const name = safeRequestFileName(file.name);
    const mimeType = text(file.mimeType, 120).toLowerCase();
    const size = Number(file.size);
    if (!name || !mimeType || !MY_WRITEX_ALLOWED_FILE_TYPES.has(mimeType)) throw new Error("One or more files has an unsupported type.");
    if (!Number.isFinite(size) || size <= 0 || size > MY_WRITEX_MAX_FILE_BYTES) throw new Error("Each file must be between 1 byte and 10 MB.");
    return {
      id: text(file.id, 80) || crypto.randomUUID(),
      name,
      mimeType,
      size,
      purpose: file.purpose === "brief" ? "brief" as const : "supporting" as const,
      uploadState: "stored" as const,
      addedAt: new Date().toISOString(),
    };
  });
}

export function sanitizeRequestInput(value: unknown): MyWritexRequestInput {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source = text(input.source, 40);
  if (!MY_WRITEX_REQUEST_SOURCES.includes(source as (typeof MY_WRITEX_REQUEST_SOURCES)[number])) throw new Error("Choose a valid request source.");
  const idempotencyKey = text(input.idempotencyKey, 120);
  if (idempotencyKey.length < 8) throw new Error("A stable request key is required.");
  return {
    requestId: text(input.requestId, 80) || undefined,
    idempotencyKey,
    source: source as MyWritexRequestInput["source"],
    sourceProjectId: text(input.sourceProjectId, 120) || undefined,
    sourceProjectTitle: text(input.sourceProjectTitle, 160) || undefined,
    sourceUpcomingId: text(input.sourceUpcomingId, 120) || undefined,
    sourceUpcomingTitle: text(input.sourceUpcomingTitle, 160) || undefined,
    sourceInvoiceReference: text(input.sourceInvoiceReference, 120) || undefined,
    fields: sanitizeRequirementFields(input.fields),
    files: sanitizeRequestFiles(input.files),
  };
}

export function validateCompleteRequest(fields: MyWritexRequirementFields) {
  return [1, 2, 3].flatMap((step) => validateRequestStep(step, fields));
}
