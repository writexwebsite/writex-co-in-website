import type { MyWritexPrincipal } from "./contract";
import type {
  CustomerResolver,
  DocumentRepository,
  InvoiceRepository,
  ManagerRepository,
  ProjectRepository,
  RelationshipRepository,
  RequestRepository,
} from "./ports";

export type MyWriteXServiceDependencies = Readonly<{
  customers: CustomerResolver;
  projects: ProjectRepository;
  invoices: InvoiceRepository;
  documents: DocumentRepository;
  managers: ManagerRepository;
  relationships: RelationshipRepository;
  requests: RequestRepository;
}>;

/** Application layer with no database, HTTP, or LTS dependency of its own. */
export class MyWriteXService {
  constructor(private readonly dependencies: MyWriteXServiceDependencies) {}

  resolveAuth(identifier: string, registeredPhone: string) {
    return this.dependencies.customers.resolveAuth(identifier, registeredPhone);
  }

  getMe(principal: MyWritexPrincipal) {
    return this.dependencies.customers.getMe(principal);
  }

  listProjects(principal: MyWritexPrincipal) {
    return this.dependencies.projects.listProjects(principal);
  }

  getProject(principal: MyWritexPrincipal, publicRef: string) {
    return this.dependencies.projects.getProject(principal, publicRef);
  }

  listInvoices(principal: MyWritexPrincipal) {
    return this.dependencies.invoices.listInvoices(principal);
  }

  listDocuments(principal: MyWritexPrincipal) {
    return this.dependencies.documents.listDocuments(principal);
  }

  getManager(principal: MyWritexPrincipal) {
    return this.dependencies.managers.getManager(principal);
  }

  getRelationship(principal: MyWritexPrincipal) {
    return this.dependencies.relationships.getRelationship(principal);
  }

  listRequests(principal: MyWritexPrincipal) {
    return this.dependencies.requests.listRequests(principal);
  }

  getRequest(principal: MyWritexPrincipal, requestRef: string) {
    return this.dependencies.requests.getRequest(principal, requestRef);
  }

  createRequest(
    principal: MyWritexPrincipal,
    input: Readonly<{ title: string; type: string; projectPublicRef?: string }>,
    idempotencyKey: string,
  ) {
    return this.dependencies.requests.createRequest(
      principal,
      input,
      idempotencyKey,
    );
  }

  respondToRequest(
    principal: MyWritexPrincipal,
    requestRef: string,
    response: string,
  ) {
    return this.dependencies.requests.respondToRequest(
      principal,
      requestRef,
      response,
    );
  }
}
