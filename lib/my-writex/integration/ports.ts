import type {
  MyWritexContractRequest,
  MyWritexPrincipal,
} from "./contract";

export type CustomerSafeProfile = Readonly<{
  scope: "customer" | "invoice";
  displayName: string;
  writeXId?: string;
  invoiceReference?: string;
  relationshipSince?: string | number;
  clientStatus?: string;
}>;

export type IntegrationProject = Readonly<{
  publicRef: string;
  invoiceReference?: string;
  title: string;
  status: string;
  [key: string]: unknown;
}>;

export type IntegrationInvoice = Readonly<{
  invoiceReference: string;
  projectPublicRef?: string;
  status?: string;
  [key: string]: unknown;
}>;

export type IntegrationDocument = Readonly<{
  publicRef: string;
  projectPublicRef: string;
  name: string;
  [key: string]: unknown;
}>;

export interface CustomerResolver {
  resolveAuth(identifier: string, registeredPhone: string): MyWritexPrincipal;
  getMe(principal: MyWritexPrincipal): CustomerSafeProfile;
}

export interface ProjectRepository {
  listProjects(principal: MyWritexPrincipal): readonly IntegrationProject[];
  getProject(principal: MyWritexPrincipal, publicRef: string): IntegrationProject;
}

export interface InvoiceRepository {
  listInvoices(principal: MyWritexPrincipal): readonly IntegrationInvoice[];
}

export interface DocumentRepository {
  listDocuments(principal: MyWritexPrincipal): readonly IntegrationDocument[];
}

export interface ManagerRepository {
  getManager(principal: MyWritexPrincipal): Readonly<Record<string, unknown>>;
}

export interface RelationshipRepository {
  getRelationship(principal: MyWritexPrincipal): readonly Readonly<Record<string, unknown>>[];
}

export interface RequestRepository {
  listRequests(principal: MyWritexPrincipal): readonly MyWritexContractRequest[];
  getRequest(
    principal: MyWritexPrincipal,
    requestRef: string,
  ): MyWritexContractRequest;
  createRequest(
    principal: MyWritexPrincipal,
    input: Readonly<{ title: string; type: string; projectPublicRef?: string }>,
    idempotencyKey: string,
  ): MyWritexContractRequest;
  respondToRequest(
    principal: MyWritexPrincipal,
    requestRef: string,
    response: string,
  ): MyWritexContractRequest;
}

export type MyWritexIntegrationPorts = CustomerResolver &
  ProjectRepository &
  InvoiceRepository &
  DocumentRepository &
  ManagerRepository &
  RelationshipRepository &
  RequestRepository;
