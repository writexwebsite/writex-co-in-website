import {
  contractNotFound,
  GENERIC_AUTH_FAILURE,
  MyWritexContractError,
  type MyWritexContractRequest,
  type MyWritexPrincipal,
  type MyWritexRequestStatus,
} from "./contract";
import {
  classifyPortalIdentifier,
  normalizeRegisteredPhone,
} from "./customer-identity";
import {
  findLocalCustomerByCredentials,
  findLocalCustomerById,
  findLocalProjectByInvoice,
  LOCAL_CUSTOMER_A_ID,
  LOCAL_CUSTOMER_B_ID,
  type LocalContractCustomer,
  type LocalContractProject,
} from "./local-contract-fixture";

type AdapterConfig = Readonly<{
  nodeEnv?: string;
  fixturesEnabled?: boolean;
  now?: () => Date;
}>;

type CreateRequestInput = Readonly<{
  title: string;
  type: string;
  projectPublicRef?: string;
}>;

type MutableRequest = {
  -readonly [Key in keyof MyWritexContractRequest]: MyWritexContractRequest[Key];
} & {
  ownerKey: string;
  fingerprint: string;
};

const sessionRefs: Record<string, string> = {
  [LOCAL_CUSTOMER_A_ID]: "session-mock-customer-a",
  [LOCAL_CUSTOMER_B_ID]: "session-mock-customer-b",
};

function publicProject(project: LocalContractProject) {
  return structuredClone(project);
}

function ownerKey(principal: MyWritexPrincipal) {
  return principal.scope === "customer"
    ? `customer:${principal.customerMasterId}`
    : `invoice:${principal.invoiceReference}`;
}

function requestFingerprint(input: CreateRequestInput) {
  return JSON.stringify({
    projectPublicRef: input.projectPublicRef?.trim() || null,
    title: input.title.trim(),
    type: input.type.trim(),
  });
}

/**
 * Local-only contract façade. It deliberately wraps the deterministic Stage 3A
 * fixtures and has no network client, database driver, or production endpoint.
 */
export class LocalMockMyWritexAdapter {
  private readonly now: () => Date;
  private readonly requests = new Map<string, MutableRequest>();
  private readonly idempotency = new Map<string, string>();
  private requestSequence = 1000;

  constructor(config: AdapterConfig = {}) {
    const nodeEnv = config.nodeEnv ?? process.env.NODE_ENV;
    const fixturesEnabled =
      config.fixturesEnabled ?? process.env.MY_WRITEX_DEV_FIXTURES === "true";
    if (nodeEnv === "production" || !fixturesEnabled) {
      throw new MyWritexContractError(
        "FIXTURES_DISABLED",
        503,
        "Local My WriteX development fixtures are disabled.",
      );
    }
    this.now = config.now ?? (() => new Date());
    this.seedRequests();
  }

  private seedRequests() {
    const customer = findLocalCustomerById(LOCAL_CUSTOMER_A_ID);
    customer?.historicalRequests.forEach((request) => {
      const record: MutableRequest = {
        requestRef: request.requestRef,
        title: request.title,
        type: request.type,
        status: request.status as MyWritexRequestStatus,
        createdAt: request.createdAt,
        ownerKey: `customer:${LOCAL_CUSTOMER_A_ID}`,
        fingerprint: "seeded",
      };
      this.requests.set(record.requestRef, record);
    });
  }

  resolveAuth(identifier: string, registeredPhone: string): MyWritexPrincipal {
    const phone = normalizeRegisteredPhone(registeredPhone);
    const parsed = classifyPortalIdentifier(identifier);
    if (!phone) this.authenticationFailed();

    if (parsed.kind === "invoice") {
      const invoice = findLocalProjectByInvoice(parsed.normalized);
      if (!invoice || invoice.customer.registeredPhone !== phone) {
        this.authenticationFailed();
      }
      return {
        sessionRef: `session-mock-invoice-${parsed.normalized.toLowerCase()}`,
        scope: "invoice",
        invoiceReference: parsed.normalized,
      };
    }

    const customer = findLocalCustomerByCredentials(parsed.normalized, phone);
    if (!customer) this.authenticationFailed();
    return {
      sessionRef: sessionRefs[customer.customerMasterId],
      scope: "customer",
      customerMasterId: customer.customerMasterId,
    };
  }

  private authenticationFailed(): never {
    throw new MyWritexContractError(
      "AUTHENTICATION_FAILED",
      401,
      GENERIC_AUTH_FAILURE,
    );
  }

  private customerFor(principal: MyWritexPrincipal): LocalContractCustomer {
    if (principal.scope === "customer" && principal.customerMasterId) {
      if (sessionRefs[principal.customerMasterId] !== principal.sessionRef) {
        return contractNotFound();
      }
      return findLocalCustomerById(principal.customerMasterId) ?? contractNotFound();
    }
    if (principal.scope === "invoice" && principal.invoiceReference) {
      if (
        principal.sessionRef !==
        `session-mock-invoice-${principal.invoiceReference.toLowerCase()}`
      ) {
        return contractNotFound();
      }
      const match = findLocalProjectByInvoice(principal.invoiceReference);
      return match?.customer ?? contractNotFound();
    }
    return contractNotFound();
  }

  getMe(principal: MyWritexPrincipal) {
    const customer = this.customerFor(principal);
    return principal.scope === "customer"
      ? {
          scope: "customer" as const,
          writeXId: customer.writeXId,
          displayName: customer.name,
          preferredName: customer.preferredName,
          relationshipSince: customer.relationshipSince,
          clientStatus: customer.clientStatus,
        }
      : {
          scope: "invoice" as const,
          invoiceReference: principal.invoiceReference!,
          displayName: customer.name,
        };
  }

  listProjects(principal: MyWritexPrincipal) {
    const customer = this.customerFor(principal);
    const projects =
      principal.scope === "customer"
        ? customer.projects
        : customer.projects.filter(
            (project) => project.invoiceReference === principal.invoiceReference,
          );
    return projects.map(publicProject);
  }

  getProject(principal: MyWritexPrincipal, publicRef: string) {
    let project: LocalContractProject | undefined;
    if (principal.scope === "customer" && principal.customerMasterId) {
      project = this.customerFor(principal).projects.find(
        (candidate) => candidate.publicRef === publicRef,
      );
    } else if (principal.scope === "invoice" && principal.invoiceReference) {
      this.customerFor(principal);
      const candidate = findLocalProjectByInvoice(principal.invoiceReference)?.project;
      project = candidate?.publicRef === publicRef ? candidate : undefined;
    }
    return project ? publicProject(project) : contractNotFound();
  }

  listInvoices(principal: MyWritexPrincipal) {
    const customer = this.customerFor(principal);
    return customer.invoices.filter(
      (invoice) =>
        principal.scope === "customer" ||
        invoice.invoiceReference === principal.invoiceReference,
    );
  }

  listDocuments(principal: MyWritexPrincipal) {
    const customer = this.customerFor(principal);
    if (principal.scope === "customer") return customer.documents;
    const project = findLocalProjectByInvoice(principal.invoiceReference!)?.project;
    return project
      ? customer.documents.filter(
          (document) => document.projectPublicRef === project.publicRef,
        )
      : contractNotFound();
  }

  getManager(principal: MyWritexPrincipal) {
    return this.customerFor(principal).manager;
  }

  getRelationship(principal: MyWritexPrincipal) {
    const customer = this.customerFor(principal);
    if (principal.scope === "customer") return customer.relationshipTimeline;
    const project = findLocalProjectByInvoice(principal.invoiceReference!)?.project;
    return project?.timeline ?? contractNotFound();
  }

  listRequests(principal: MyWritexPrincipal) {
    this.customerFor(principal);
    const key = ownerKey(principal);
    return Array.from(this.requests.values())
      .filter((request) => request.ownerKey === key)
      .map(this.publicRequest);
  }

  getRequest(principal: MyWritexPrincipal, requestRef: string) {
    this.customerFor(principal);
    const request = this.requests.get(requestRef);
    if (!request || request.ownerKey !== ownerKey(principal)) return contractNotFound();
    return this.publicRequest(request);
  }

  createRequest(
    principal: MyWritexPrincipal,
    input: CreateRequestInput,
    idempotencyKey: string,
  ) {
    this.customerFor(principal);
    const title = input.title.trim();
    const type = input.type.trim();
    const normalizedKey = idempotencyKey.trim();
    if (!title || !type || !normalizedKey) {
      throw new MyWritexContractError(
        "INVALID_REQUEST",
        400,
        "Title, type and idempotency key are required.",
      );
    }
    if (input.projectPublicRef) this.getProject(principal, input.projectPublicRef);

    const key = `${ownerKey(principal)}:${normalizedKey}`;
    const fingerprint = requestFingerprint(input);
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

    const requestRef = `REQ-MOCK-${++this.requestSequence}`;
    const request: MutableRequest = {
      requestRef,
      title,
      type,
      status: "Received",
      createdAt: this.now().toISOString(),
      projectPublicRef: input.projectPublicRef,
      ownerKey: ownerKey(principal),
      fingerprint,
    };
    this.requests.set(requestRef, request);
    this.idempotency.set(key, requestRef);
    return this.publicRequest(request);
  }

  respondToRequest(
    principal: MyWritexPrincipal,
    requestRef: string,
    response: string,
  ) {
    this.customerFor(principal);
    const request = this.requests.get(requestRef);
    if (!request || request.ownerKey !== ownerKey(principal)) return contractNotFound();
    if (!response.trim()) {
      throw new MyWritexContractError(
        "INVALID_REQUEST",
        400,
        "A response is required.",
      );
    }
    request.lastResponse = response.trim();
    request.status = "Reviewing";
    return this.publicRequest(request);
  }

  private publicRequest(request: MutableRequest): MyWritexContractRequest {
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

/** Stage 3B contract name; behavior remains the production-locked local mock. */
export class MockAdapter extends LocalMockMyWritexAdapter {}
