import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError, forbidden } from "@/lib/api/response";
import type { ClientSession } from "@/lib/auth";
import { createMyWritexDemoRequestDatabase } from "@/lib/my-writex/demo-request-seed";
import {
  isMyWritexDemoFixtureEnabled,
  isMyWritexFixtureEnabled,
} from "@/lib/my-writex/dev-fixture";
import {
  type MyWritexRequestEventName,
  type MyWritexRequestFunnel,
  type MyWritexRequestInput,
  type MyWritexRequestOwner,
  type MyWritexRequestRecord,
  type MyWritexRequestStatus,
  type MyWritexRequestView,
} from "@/lib/my-writex/request-types";

type RequestDatabase = { version: 1; sequence: number; requests: MyWritexRequestRecord[] };
const emptyDatabase = (): RequestDatabase => ({ version: 1, sequence: 0, requests: [] });
const initialDatabase = (): RequestDatabase =>
  isMyWritexDemoFixtureEnabled()
    ? createMyWritexDemoRequestDatabase()
    : emptyDatabase();

const DEMO_MAX_REQUESTS = 100;
const DEMO_MAX_STORE_BYTES = 1024 * 1024;

declare global {
  var __myWritexRequestStoreQueue: Promise<unknown> | undefined;
}

function storePath() {
  const configured = process.env.MY_WRITEX_REQUEST_STORE_PATH?.trim();
  if (isMyWritexDemoFixtureEnabled() && (!configured || !path.isAbsolute(configured))) {
    throw new ApiError(503, "NOT_CONFIGURED", "The isolated demo request store is not configured.");
  }
  return configured || path.join(process.cwd(), ".local", "my-writex-stage3a", "requests.json");
}

function assertLocalStore() {
  if (!isMyWritexFixtureEnabled()) {
    throw new ApiError(404, "NOT_FOUND", "This local request capability is not available.");
  }
}

async function readDatabase() {
  assertLocalStore();
  try {
    const parsed = JSON.parse(await readFile(storePath(), "utf8")) as RequestDatabase;
    return parsed.version === 1 && Array.isArray(parsed.requests) ? parsed : emptyDatabase();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return initialDatabase();
    throw error;
  }
}

async function writeDatabase(database: RequestDatabase) {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const serialized = `${JSON.stringify(database, null, 2)}\n`;
  if (isMyWritexDemoFixtureEnabled() && Buffer.byteLength(serialized, "utf8") > DEMO_MAX_STORE_BYTES) {
    throw new ApiError(507, "INTEGRATION_UNAVAILABLE", "The demo request store has reached its safe capacity.");
  }
  await writeFile(temporary, serialized, { encoding: "utf8", flag: "wx" });
  await rename(temporary, target);
}

async function mutate<T>(operation: (database: RequestDatabase) => T | Promise<T>) {
  assertLocalStore();
  const previous = globalThis.__myWritexRequestStoreQueue || Promise.resolve();
  let release: () => void = () => undefined;
  const current = new Promise<void>((resolve) => { release = resolve; });
  globalThis.__myWritexRequestStoreQueue = previous.then(() => current);
  await previous;
  try {
    const database = await readDatabase();
    const result = await operation(database);
    await writeDatabase(database);
    return result;
  } finally {
    release();
  }
}

export function requestOwnerFromSession(session: ClientSession): MyWritexRequestOwner {
  if (session.authScope === "customer" && session.customerMasterId) return { kind: "customer", customerMasterId: session.customerMasterId };
  if (session.authScope === "invoice" && session.invoiceId) return { kind: "invoice", invoiceReference: session.invoiceId };
  throw forbidden();
}

function ownerKey(owner: MyWritexRequestOwner) {
  return owner.kind === "customer" ? `customer:${owner.customerMasterId}` : `invoice:${owner.invoiceReference}`;
}

function owns(record: MyWritexRequestRecord, owner: MyWritexRequestOwner) {
  return ownerKey(record.owner) === ownerKey(owner);
}

function event(record: MyWritexRequestRecord, name: MyWritexRequestEventName, at: string) {
  record.events.push({ id: crypto.randomUUID(), at, name, source: record.source, status: record.status });
}

function history(record: MyWritexRequestRecord, at: string, title: string, detail: string, actor: MyWritexRequestRecord["history"][number]["actor"], fromStatus?: MyWritexRequestStatus, toStatus?: MyWritexRequestStatus) {
  record.history.push({ id: crypto.randomUUID(), at, actor, title, detail, fromStatus, toStatus });
}

export async function listRequests(owner: MyWritexRequestOwner) {
  const database = await readDatabase();
  return database.requests.filter((record) => owns(record, owner)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAllRequests() {
  const database = await readDatabase();
  return [...database.requests].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function toRequestView(record: MyWritexRequestRecord): MyWritexRequestView {
  const { fixtureScope, owner, idempotencyKey, events, ...view } = structuredClone(record);
  void fixtureScope;
  void owner;
  void idempotencyKey;
  void events;
  view.notes = view.notes.filter((note) => note.visibility === "customer");
  view.history = view.history.filter((entry) => entry.title !== "Internal note added");
  return view;
}

export async function findRequest(owner: MyWritexRequestOwner, publicReference: string) {
  return (await listRequests(owner)).find((record) => record.publicReference === publicReference) || null;
}

export async function findActiveDraftForSource(owner: MyWritexRequestOwner, source: MyWritexRequestRecord["source"], sourceReference?: string) {
  return (await listRequests(owner)).find((record) => {
    if (record.status !== "Draft" || record.source !== source) return false;
    if (source === "similar_project") return record.sourceProjectId === sourceReference;
    if (source === "upcoming_work") return record.sourceUpcomingId === sourceReference;
    if (source === "invoice_workspace") return record.sourceInvoiceReference === sourceReference;
    return true;
  }) || null;
}

export async function saveDraft(owner: MyWritexRequestOwner, input: MyWritexRequestInput) {
  return mutate((database) => {
    const now = new Date().toISOString();
    let record = database.requests.find((candidate) => owns(candidate, owner) && candidate.status === "Draft" && (candidate.id === input.requestId || candidate.idempotencyKey === input.idempotencyKey));
    if (!record) {
      if (isMyWritexDemoFixtureEnabled() && database.requests.length >= DEMO_MAX_REQUESTS) {
        throw new ApiError(429, "RATE_LIMITED", "The demo request limit has been reached. Reset the demo before continuing.");
      }
      record = {
        id: crypto.randomUUID(),
        fixtureScope: ownerKey(owner),
        owner,
        publicReference: `DRAFT-${new Date(now).getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        source: input.source,
        sourceProjectId: input.sourceProjectId,
        sourceProjectTitle: input.sourceProjectTitle,
        sourceUpcomingId: input.sourceUpcomingId,
        sourceUpcomingTitle: input.sourceUpcomingTitle,
        sourceInvoiceReference: input.sourceInvoiceReference,
        idempotencyKey: input.idempotencyKey,
        fields: input.fields,
        files: input.files.map((file) => ({ ...file, id: file.id || crypto.randomUUID(), uploadState: "stored", addedAt: now })),
        manager: { name: "Aman", role: "My WriteX Manager" },
        status: "Draft",
        createdAt: now,
        updatedAt: now,
        history: [],
        notes: [],
        events: [],
      };
      history(record, now, "Draft started", "A private local draft was created.", "Customer");
      event(record, "draft_started", now);
      database.requests.push(record);
    } else {
      record.fields = input.fields;
      record.files = input.files.map((file) => ({ ...file, id: file.id || crypto.randomUUID(), uploadState: "stored", addedAt: now }));
      record.updatedAt = now;
    }
    event(record, "draft_saved", now);
    return structuredClone(record);
  });
}

export async function submitRequest(owner: MyWritexRequestOwner, input: MyWritexRequestInput) {
  return mutate((database) => {
    const duplicate = database.requests.find((candidate) => owns(candidate, owner) && candidate.idempotencyKey === input.idempotencyKey && candidate.status !== "Draft");
    if (duplicate) return { record: structuredClone(duplicate), created: false };
    const upcomingDuplicate = input.source === "upcoming_work" ? database.requests.find((candidate) => owns(candidate, owner) && candidate.source === "upcoming_work" && candidate.sourceUpcomingId === input.sourceUpcomingId && !["Draft", "Cancelled"].includes(candidate.status)) : undefined;
    if (upcomingDuplicate) {
      const duplicateDraftIndex = database.requests.findIndex((candidate) => owns(candidate, owner) && candidate.status === "Draft" && (candidate.id === input.requestId || candidate.idempotencyKey === input.idempotencyKey));
      if (duplicateDraftIndex >= 0) database.requests.splice(duplicateDraftIndex, 1);
      return { record: structuredClone(upcomingDuplicate), created: false };
    }
    const record = database.requests.find((candidate) => owns(candidate, owner) && candidate.status === "Draft" && (candidate.id === input.requestId || candidate.idempotencyKey === input.idempotencyKey));
    if (!record) throw new ApiError(409, "BAD_REQUEST", "Save this draft before submitting it.");
    const now = new Date().toISOString();
    const fromStatus = record.status;
    record.fields = input.fields;
    record.files = input.files.map((file) => ({ ...file, id: file.id || crypto.randomUUID(), uploadState: "stored", addedAt: now }));
    record.status = "Submitted";
    const existingSequence = database.requests.reduce((maximum, candidate) => {
      const match = /^REQ-\d{4}-(\d{4,})$/.exec(candidate.publicReference);
      return match ? Math.max(maximum, Number(match[1])) : maximum;
    }, 0);
    database.sequence = Math.max(database.sequence, existingSequence) + 1;
    record.publicReference = `REQ-${new Date(now).getUTCFullYear()}-${String(database.sequence).padStart(4, "0")}`;
    record.submittedAt = now;
    record.updatedAt = now;
    history(record, now, "Requirement sent to Aman", "Your requirement entered the local manager review queue.", "Customer", fromStatus, "Submitted");
    event(record, "request_submitted", now);
    return { record: structuredClone(record), created: true };
  });
}

export async function discardDraft(owner: MyWritexRequestOwner, publicReference: string) {
  return mutate((database) => {
    const index = database.requests.findIndex((record) => owns(record, owner) && record.publicReference === publicReference && record.status === "Draft");
    if (index < 0) return false;
    database.requests.splice(index, 1);
    return true;
  });
}

export async function cancelRequest(owner: MyWritexRequestOwner, publicReference: string) {
  return mutate((database) => {
    const record = database.requests.find((candidate) => owns(candidate, owner) && candidate.publicReference === publicReference);
    if (!record) return null;
    if (["Cancelled", "Closed"].includes(record.status)) return structuredClone(record);
    const now = new Date().toISOString();
    const fromStatus = record.status;
    record.status = "Cancelled";
    record.updatedAt = now;
    history(record, now, "Request cancelled", "The customer cancelled this local request.", "Customer", fromStatus, "Cancelled");
    event(record, "request_cancelled", now);
    return structuredClone(record);
  });
}

export async function respondToInformationRequest(owner: MyWritexRequestOwner, publicReference: string, body: string) {
  return mutate((database) => {
    const record = database.requests.find((candidate) => owns(candidate, owner) && candidate.publicReference === publicReference);
    if (!record) return null;
    const existing = record.notes.find((note) => note.visibility === "customer" && note.author === "Customer" && note.body === body);
    if (existing && record.status === "Reviewing") return structuredClone(record);
    if (record.status !== "More Information Needed") throw new ApiError(409, "BAD_REQUEST", "This request is not waiting for more information.");
    const now = new Date().toISOString();
    record.notes.push({ id: crypto.randomUUID(), at: now, author: "Customer", visibility: "customer", body });
    record.status = "Reviewing";
    record.updatedAt = now;
    history(record, now, "More information received", "Your response was added and the request returned to review.", "Customer", "More Information Needed", "Reviewing");
    event(record, "customer_responded", now);
    return structuredClone(record);
  });
}

export async function updateRequestFromInspector(publicReference: string, action: { type: "status"; status: MyWritexRequestStatus } | { type: "request_information"; body: string } | { type: "internal_note"; body: string }) {
  return mutate((database) => {
    const record = database.requests.find((candidate) => candidate.publicReference === publicReference);
    if (!record) return null;
    const now = new Date().toISOString();
    if (action.type === "internal_note") {
      record.notes.push({ id: crypto.randomUUID(), at: now, author: "WriteX local inspector", visibility: "internal", body: action.body });
      history(record, now, "Internal note added", "A local-only internal note was added.", "WriteX local inspector");
    } else if (action.type === "request_information") {
      const latestCustomerNote = [...record.notes].reverse().find((note) => note.author === "Aman" && note.visibility === "customer");
      if (record.status === "More Information Needed" && latestCustomerNote?.body === action.body) return structuredClone(record);
      const fromStatus = record.status;
      record.notes.push({ id: crypto.randomUUID(), at: now, author: "Aman", visibility: "customer", body: action.body });
      record.status = "More Information Needed";
      history(record, now, "Aman requested more information", action.body, "Aman", fromStatus, record.status);
      event(record, "information_requested", now);
    } else if (record.status !== action.status) {
      const fromStatus = record.status;
      record.status = action.status;
      history(record, now, `Status changed to ${action.status}`, "Aman updated the local request status.", "WriteX local inspector", fromStatus, action.status);
      event(record, "status_changed", now);
    }
    record.updatedAt = now;
    return structuredClone(record);
  });
}

export async function requestFunnel(): Promise<MyWritexRequestFunnel> {
  const records = await listAllRequests();
  const count = (name: MyWritexRequestEventName) => records.reduce((total, record) => total + record.events.filter((candidate) => candidate.name === name).length, 0);
  return {
    draftsStarted: count("draft_started"),
    draftsSaved: count("draft_saved"),
    submitted: count("request_submitted"),
    reviewing: records.filter((record) => record.status === "Reviewing").length,
    informationNeeded: count("information_requested"),
    customerResponses: count("customer_responded"),
    readyForDiscussion: records.filter((record) => record.status === "Ready for Discussion").length,
    cancelled: count("request_cancelled"),
  };
}

export async function resetMyWritexDemoRequestStore() {
  if (!isMyWritexDemoFixtureEnabled()) {
    throw new ApiError(404, "NOT_FOUND", "The demo reset capability is not available.");
  }
  return mutate((database) => {
    const seed = createMyWritexDemoRequestDatabase();
    database.version = seed.version;
    database.sequence = seed.sequence;
    database.requests = seed.requests;
    return structuredClone(seed);
  });
}
