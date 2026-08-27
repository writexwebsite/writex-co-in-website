import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  contractNotFound,
  GENERIC_AUTH_FAILURE,
  MyWritexContractError,
  type MyWritexContractRequest,
  type MyWritexPrincipal,
} from "./contract";
import {
  classifyPortalIdentifier,
  normalizeRegisteredPhone,
} from "./customer-identity";
import type {
  IntegrationDocument,
  IntegrationInvoice,
  IntegrationProject,
  MyWritexIntegrationPorts,
} from "./ports";

export type SanitizedSnapshot = Readonly<{
  metadata: Readonly<{
    sanitized: true;
    approvalRef: string;
    snapshotTime: string;
    schemaVersion: number;
  }>;
  customers: readonly Readonly<{
    customerRef: string;
    writeXId: string;
    registeredPhone: string;
    displayName: string;
    relationshipSince?: string;
    clientStatus?: string;
    manager: Readonly<Record<string, unknown>>;
  }>[];
  projects: readonly (IntegrationProject & Readonly<{ customerRef: string }>)[];
  invoices: readonly (IntegrationInvoice & Readonly<{ customerRef: string }>)[];
  documents: readonly (IntegrationDocument & Readonly<{ customerRef: string }>)[];
  relationship: readonly Readonly<{
    customerRef: string;
    publicRef: string;
    type: string;
    label: string;
    occurredAt: string;
  }>[];
  requests?: readonly (MyWritexContractRequest &
    Readonly<{ ownerScope: "customer" | "invoice"; ownerRef: string }>)[];
}>;

function sessionRef(scope: string, reference: string) {
  return `snapshot-${createHash("sha256")
    .update(`${scope}:${reference}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function withoutCustomerRef<TPublic extends object>(
  record: TPublic & Readonly<{ customerRef: string }>,
): TPublic {
  const { customerRef, ...publicRecord } = record;
  void customerRef;
  return publicRecord as TPublic;
}

function validateSnapshot(snapshot: SanitizedSnapshot) {
  if (
    snapshot.metadata.sanitized !== true ||
    !snapshot.metadata.approvalRef ||
    !Number.isFinite(Date.parse(snapshot.metadata.snapshotTime)) ||
    snapshot.metadata.schemaVersion !== 1
  ) {
    throw new Error("Invalid or unapproved sanitized snapshot metadata");
  }
  const customerRefs = new Set<string>();
  const writeXIds = new Set<string>();
  for (const customer of snapshot.customers) {
    if (customerRefs.has(customer.customerRef)) {
      throw new Error("Duplicate sanitized customer reference");
    }
    const normalizedWriteXId = customer.writeXId.toLowerCase();
    if (writeXIds.has(normalizedWriteXId)) {
      throw new Error("Duplicate sanitized WriteX ID");
    }
    if (
      normalizeRegisteredPhone(customer.registeredPhone) !==
      customer.registeredPhone
    ) {
      throw new Error("Invalid or non-canonical sanitized registered phone");
    }
    customerRefs.add(customer.customerRef);
    writeXIds.add(normalizedWriteXId);
  }

  const invoiceOwners = new Map<string, string>();
  for (const invoice of snapshot.invoices) {
    if (!customerRefs.has(invoice.customerRef)) {
      throw new Error("Sanitized snapshot contains an orphan customer reference");
    }
    if (invoiceOwners.has(invoice.invoiceReference)) {
      throw new Error("Duplicate sanitized invoice reference");
    }
    invoiceOwners.set(invoice.invoiceReference, invoice.customerRef);
  }

  const projectOwners = new Map<string, string>();
  for (const project of snapshot.projects) {
    if (!customerRefs.has(project.customerRef)) {
      throw new Error("Sanitized snapshot contains an orphan customer reference");
    }
    if (projectOwners.has(project.publicRef)) {
      throw new Error("Duplicate sanitized project reference");
    }
    if (
      project.invoiceReference &&
      invoiceOwners.get(project.invoiceReference) !== project.customerRef
    ) {
      throw new Error("Sanitized project has an invalid invoice relationship");
    }
    projectOwners.set(project.publicRef, project.customerRef);
  }

  for (const document of snapshot.documents) {
    if (
      !customerRefs.has(document.customerRef) ||
      projectOwners.get(document.projectPublicRef) !== document.customerRef
    ) {
      throw new Error("Sanitized document has an invalid project relationship");
    }
  }

  for (const event of snapshot.relationship) {
    if (!customerRefs.has(event.customerRef)) {
      throw new Error("Sanitized snapshot contains an orphan customer reference");
    }
  }

  for (const request of snapshot.requests ?? []) {
    const ownerExists =
      request.ownerScope === "customer"
        ? customerRefs.has(request.ownerRef)
        : invoiceOwners.has(request.ownerRef);
    if (!ownerExists) {
      throw new Error("Sanitized request has an invalid owner relationship");
    }
    if (
      request.projectPublicRef &&
      (request.ownerScope === "customer"
        ? projectOwners.get(request.projectPublicRef) !== request.ownerRef
        : snapshot.projects.find(
            (project) =>
              project.publicRef === request.projectPublicRef &&
              project.invoiceReference === request.ownerRef,
          ) === undefined)
    ) {
      throw new Error("Sanitized request has an invalid project relationship");
    }
  }
}

type MutableSnapshotRequest = {
  -readonly [Key in keyof MyWritexContractRequest]: MyWritexContractRequest[Key];
} & {
  ownerScope: "customer" | "invoice";
  ownerRef: string;
  fingerprint?: string;
};

export class SanitizedSnapshotAdapter implements MyWritexIntegrationPorts {
  private readonly requests = new Map<string, MutableSnapshotRequest>();
  private readonly idempotency = new Map<string, string>();
  private requestSequence = 0;

  constructor(
    private readonly snapshot: SanitizedSnapshot,
    options: Readonly<{ nodeEnv?: string; enabled?: boolean }> = {},
  ) {
    const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
    const enabled =
      options.enabled ??
      process.env.MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED === "true";
    if (nodeEnv === "production" || !enabled) {
      throw new MyWritexContractError(
        "FIXTURES_DISABLED",
        503,
        "Sanitized snapshot adapter is disabled.",
      );
    }
    validateSnapshot(snapshot);
    for (const request of snapshot.requests ?? []) {
      this.requests.set(request.requestRef, { ...request });
    }
  }

  static async fromFile(
    filePath: string,
    options: Readonly<{ nodeEnv?: string; enabled?: boolean }> = {},
  ) {
    if (/^https?:|^\\\\/.test(filePath)) {
      throw new Error("Sanitized snapshot must be an offline local JSON file");
    }
    const resolved = path.resolve(filePath);
    const snapshot = JSON.parse(await readFile(resolved, "utf8")) as SanitizedSnapshot;
    return new SanitizedSnapshotAdapter(snapshot, options);
  }

  resolveAuth(identifier: string, registeredPhone: string): MyWritexPrincipal {
    const parsed = classifyPortalIdentifier(identifier);
    const phone = normalizeRegisteredPhone(registeredPhone);
    if (!phone) return this.authFailed();

    if (parsed.kind === "invoice") {
      const invoice = this.snapshot.invoices.find(
        (candidate) => candidate.invoiceReference === parsed.normalized,
      );
      const customer = invoice
        ? this.snapshot.customers.find(
            (candidate) => candidate.customerRef === invoice.customerRef,
          )
        : undefined;
      if (!invoice || customer?.registeredPhone !== phone) return this.authFailed();
      return {
        scope: "invoice",
        invoiceReference: invoice.invoiceReference,
        sessionRef: sessionRef("invoice", invoice.invoiceReference),
      };
    }

    const customer = this.snapshot.customers.find(
      (candidate) =>
        candidate.writeXId.toLowerCase() === parsed.normalized &&
        candidate.registeredPhone === phone,
    );
    if (!customer) return this.authFailed();
    return {
      scope: "customer",
      customerMasterId: customer.customerRef,
      sessionRef: sessionRef("customer", customer.customerRef),
    };
  }

  private authFailed(): never {
    throw new MyWritexContractError(
      "AUTHENTICATION_FAILED",
      401,
      GENERIC_AUTH_FAILURE,
    );
  }

  private customerFor(principal: MyWritexPrincipal) {
    if (principal.scope === "customer" && principal.customerMasterId) {
      if (
        principal.sessionRef !==
        sessionRef("customer", principal.customerMasterId)
      ) return contractNotFound();
      return (
        this.snapshot.customers.find(
          (customer) => customer.customerRef === principal.customerMasterId,
        ) ?? contractNotFound()
      );
    }
    if (principal.scope === "invoice" && principal.invoiceReference) {
      if (
        principal.sessionRef !==
        sessionRef("invoice", principal.invoiceReference)
      ) return contractNotFound();
      const invoice = this.snapshot.invoices.find(
        (candidate) =>
          candidate.invoiceReference === principal.invoiceReference,
      );
      return invoice
        ? (this.snapshot.customers.find(
            (customer) => customer.customerRef === invoice.customerRef,
          ) ?? contractNotFound())
        : contractNotFound();
    }
    return contractNotFound();
  }

  private visibleCustomerRef(principal: MyWritexPrincipal) {
    return this.customerFor(principal).customerRef;
  }

  getMe(principal: MyWritexPrincipal) {
    const customer = this.customerFor(principal);
    return principal.scope === "customer"
      ? {
          scope: "customer" as const,
          displayName: customer.displayName,
          writeXId: customer.writeXId,
          relationshipSince: customer.relationshipSince,
          clientStatus: customer.clientStatus,
        }
      : {
          scope: "invoice" as const,
          displayName: customer.displayName,
          invoiceReference: principal.invoiceReference!,
        };
  }

  listProjects(principal: MyWritexPrincipal) {
    const customerRef = this.visibleCustomerRef(principal);
    return this.snapshot.projects
      .filter(
        (project) =>
          project.customerRef === customerRef &&
          (principal.scope === "customer" ||
            project.invoiceReference === principal.invoiceReference),
      )
      .map((project) => withoutCustomerRef<IntegrationProject>(project));
  }

  getProject(principal: MyWritexPrincipal, publicRef: string) {
    return (
      this.listProjects(principal).find(
        (project) => project.publicRef === publicRef,
      ) ?? contractNotFound()
    );
  }

  listInvoices(principal: MyWritexPrincipal) {
    const customerRef = this.visibleCustomerRef(principal);
    return this.snapshot.invoices
      .filter(
        (invoice) =>
          invoice.customerRef === customerRef &&
          (principal.scope === "customer" ||
            invoice.invoiceReference === principal.invoiceReference),
      )
      .map((invoice) => withoutCustomerRef<IntegrationInvoice>(invoice));
  }

  listDocuments(principal: MyWritexPrincipal) {
    const allowedProjects = new Set(
      this.listProjects(principal).map((project) => project.publicRef),
    );
    return this.snapshot.documents
      .filter((document) => allowedProjects.has(document.projectPublicRef))
      .map((document) => withoutCustomerRef<IntegrationDocument>(document));
  }

  getManager(principal: MyWritexPrincipal) {
    return this.customerFor(principal).manager;
  }

  getRelationship(principal: MyWritexPrincipal) {
    const customerRef = this.visibleCustomerRef(principal);
    if (principal.scope === "invoice") return [];
    return this.snapshot.relationship
      .filter((event) => event.customerRef === customerRef)
      .map((event) =>
        withoutCustomerRef<Readonly<Record<string, unknown>>>(event),
      );
  }

  private owner(principal: MyWritexPrincipal) {
    this.customerFor(principal);
    return principal.scope === "customer"
      ? { scope: "customer" as const, ref: principal.customerMasterId! }
      : { scope: "invoice" as const, ref: principal.invoiceReference! };
  }

  listRequests(principal: MyWritexPrincipal) {
    const owner = this.owner(principal);
    return [...this.requests.values()]
      .filter(
        (request) =>
          request.ownerScope === owner.scope && request.ownerRef === owner.ref,
      )
      .map(this.publicRequest);
  }

  getRequest(principal: MyWritexPrincipal, requestRef: string) {
    const owner = this.owner(principal);
    const request = this.requests.get(requestRef);
    return request &&
      request.ownerScope === owner.scope &&
      request.ownerRef === owner.ref
      ? this.publicRequest(request)
      : contractNotFound();
  }

  createRequest(
    principal: MyWritexPrincipal,
    input: Readonly<{ title: string; type: string; projectPublicRef?: string }>,
    idempotencyKey: string,
  ) {
    const owner = this.owner(principal);
    if (input.projectPublicRef) this.getProject(principal, input.projectPublicRef);
    const fingerprint = JSON.stringify({ ...input, title: input.title.trim() });
    const key = `${owner.scope}:${owner.ref}:${idempotencyKey.trim()}`;
    const existingRef = this.idempotency.get(key);
    if (existingRef) {
      const existing = this.requests.get(existingRef)!;
      if (existing.fingerprint !== fingerprint) {
        throw new MyWritexContractError(
          "IDEMPOTENCY_CONFLICT",
          409,
          "That idempotency key was already used for another request.",
        );
      }
      return this.publicRequest(existing);
    }
    if (!input.title.trim() || !input.type.trim() || !idempotencyKey.trim()) {
      throw new MyWritexContractError(
        "INVALID_REQUEST",
        400,
        "Title, type and idempotency key are required.",
      );
    }
    const requestRef = `REQ-SNAPSHOT-${String(++this.requestSequence).padStart(4, "0")}`;
    this.requests.set(requestRef, {
      requestRef,
      title: input.title.trim(),
      type: input.type.trim(),
      status: "Received",
      createdAt: this.snapshot.metadata.snapshotTime,
      projectPublicRef: input.projectPublicRef,
      ownerScope: owner.scope,
      ownerRef: owner.ref,
      fingerprint,
    });
    this.idempotency.set(key, requestRef);
    return this.getRequest(principal, requestRef);
  }

  respondToRequest(
    principal: MyWritexPrincipal,
    requestRef: string,
    response: string,
  ) {
    const request = this.getRequest(principal, requestRef);
    if (!response.trim()) {
      throw new MyWritexContractError(
        "INVALID_REQUEST",
        400,
        "A response is required.",
      );
    }
    const stored = this.requests.get(request.requestRef)!;
    stored.lastResponse = response.trim();
    stored.status = "Reviewing";
    return this.publicRequest(stored);
  }

  private publicRequest(request: MyWritexContractRequest) {
    return {
      requestRef: request.requestRef,
      title: request.title,
      type: request.type,
      status: request.status,
      createdAt: request.createdAt,
      projectPublicRef: request.projectPublicRef,
      lastResponse: request.lastResponse,
    };
  }
}
