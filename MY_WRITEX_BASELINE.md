# My WriteX V1 technical baseline

Date: 2026-08-27  
Branch: `feature/my-writex-v1`  
Scope: localhost implementation only

## Protected Client Login

`/client-login` is a dynamic Next.js App Router page composed by `app/client-login/page.tsx`. It renders the shared `AuthShell` with `ClientLoginForm` inside it. `AuthShell` owns the single-canvas festival scene, desktop/mobile layout, theme control, AXO transition, brand panel and form stage. The functional form is the only surface that submits credentials.

The approved baseline was captured locally before My WriteX changes at:

- `reports/my-writex-uat/baseline-client-login-1440x900.png`
- `reports/my-writex-uat/baseline-client-login-390x844.png`

Protected pre-change fingerprints:

- `components/client/ClientLoginForm.tsx`: `5eb022c6bc920383f9cb2d641e4f37aeb640469ea79e879b30589fe44a48b951`
- `components/auth/AuthShell.tsx`: `7e15149b5caffb1b534ae666fe05c01ba5e7fdb136bbd2f6213f33e236bb6542`
- `app/globals.css`: `9291736335f9f45da9f4d6e708fd93f20a4cd6a4439da49d035fe1a27707a661`
- `components/auth/DesignerLoginThemeRenderer.tsx`: `120fbdfd203cdb0cc4354864df8ffc025a4484d528f51ac29d5ac37988b611f8`

Only the first-field label and post-submit destination are extension points for this task. `AuthShell`, festival rendering, layout, card classes, responsive rules, buttons, helper areas, theme behavior and employee login are outside the change surface.

## Existing invoice authentication

The form posts `invoiceNumber` and `mobile` to `POST /api/client/auth/login`. The route:

1. validates same-origin JSON using `futureClientLoginSchema`;
2. normalizes the invoice reference and phone;
3. applies an IP/identifier rate limit;
4. checks persisted temporary lock state and invoice access controls;
5. delegates verification to `ClientVerificationProvider`;
6. in the configured live mode, verifies against `validateInvoice` in the LTS adapter;
7. creates a random opaque session token and persists only its hash in PostgreSQL;
8. sets an HttpOnly, SameSite=Lax client cookie, Secure in production;
9. records login-attempt and audit events.

Errors are mapped through the shared safe API response layer. LTS mock behavior is explicitly rejected in production.

## Session architecture and scope

The current client cookie name is `__Host-writex_client_session` by default. The cookie value is an opaque random token, not a PII-bearing signed payload. `client_sessions` stores its hash, invoice binding, idle and absolute expiry, last-seen time, revocation state, verification metadata, access level and security mode.

`verifyClientSessionFromRequest` validates and refreshes persisted sessions for API routes. `requireClientSession` performs the equivalent check in server-rendered pages and redirects unauthenticated users to `/client-login`. `POST /api/client/auth/session` rotates valid session tokens. Logout revokes the persisted token and clears the cookie.

Before My WriteX, all client sessions are implicitly invoice-scoped because `invoice_id` is the only customer-data key. My WriteX must add an explicit `authScope` distinction and a customer-master key without weakening the existing invoice binding.

## Existing authenticated routes

Primary post-login pages:

- `/client/overview`
- `/client/project`
- `/client/files`
- `/client/invoices`
- `/client/invoices/[invoiceReference]`
- `/client/support`
- `/client/security`
- legacy `/client/dashboard`

`/client` redirects to `/client/overview`. The current portal shell is `ClientPortalChrome`; it and `ClientPortalPanels` are legacy frontend components that can be replaced for the new post-login experience.

## Existing client APIs and reusable backend behavior

Foundation APIs:

- `POST /api/client/auth/login`
- `GET /api/client/auth/session`
- `POST /api/client/auth/logout`
- `GET /api/client/overview`
- `GET /api/client/project`
- `GET /api/client/invoices`
- `GET /api/client/invoices/[invoiceReference]`
- `GET /api/client/files`
- `POST /api/client/files/[fileReference]/download`

Legacy/reusable project operations:

- `GET /api/client/dashboard`
- `GET /api/client/work-journey`
- `GET /api/client/payment-status`
- `POST /api/client/payment-proof`
- `POST /api/client/revision-request`
- `GET /api/client/preview/[invoiceId]`
- `GET /api/client/download/[invoiceId]`

Reusable backend functions include LTS invoice validation, invoice/work-journey/file retrieval, PMT payment retrieval, S3 signed access, payment-proof persistence, revision-request persistence, notification adapters, status override controls, rate limiting, same-origin enforcement, audit logging and session revocation/rotation.

## Data shape

The legacy LTS adapter exposes an invoice with invoice/order references, client identity, service type, subject, academic level, word count, deadline, order/delivery status, timestamps and an approved public representative. Work journeys contain a current stage, progress percentage and supported stages. Order files contain a file ID, safe name, asset type, type, size, status and storage key.

The newer provider boundary presents:

- `ClientIdentity`: invoice reference, optional client reference/display name and safe representative;
- `BillingInvoice`: dates, service description, currency, totals, balance and payment status;
- `ProjectSummary`: public stage/message/deadline/update time;
- `ClientDeliverable`: safe reference/name/type/size/approval time.

Billing, project and deliverables providers currently fail closed as unavailable because their approved cross-system contracts are not deployed. Temporary admin-created client test sessions use sanitized fixtures and disable customer actions.

## Authorization baseline

Invoice detail reads first compare the URL invoice reference to `session.invoiceId`. Preview, download, payment-proof and revision mutations repeat invoice equality checks on the server. File downloads also require full access. Test sessions are denied downloads, mutations, notifications and legacy high-risk actions. Frontend navigation is not the authorization boundary.

Required My WriteX extension points:

- explicit server-side invoice/customer scope guards;
- customer-master ownership checks before every customer/project read;
- shared project-detail presentation fed only by already-authorized data;
- customer APIs under a separate `/api/my-writex` namespace;
- a development-only fixture resolver isolated from LTS and production.

## Responsive baseline

The login uses a continuous festival canvas and a desktop brand/form split, then a mobile card over the mobile canvas. The approved CSS guarantees a minimum `100svh`, breakpoint-specific canvas sources and no horizontal overflow. The existing post-login portal uses a horizontal navigation strip below desktop width and a sidebar at `md`, but its visual design is not protected.

## Local development setup

- Framework: Next.js 16 App Router, React 19, TypeScript
- Package manager: pnpm
- Local command: `pnpm dev`
- Build: `pnpm build`
- Static verification: `pnpm typecheck`, `pnpm lint`
- Client tests: `pnpm test:client-portal`
- Local URL: `http://localhost:3000`

The repository already contained a large unrelated dirty worktree before this branch was created. Those changes are preserved. No production service, PM2 process, Nginx config, DNS, production environment, database or LTS setting is part of this task.

## Risks

- The production PostgreSQL schema is invoice-centric; customer sessions need a reviewed migration before a real Customer Master integration.
- The current generic mobile normalizer is India-only and rejects the required UK fixture, so international E.164 normalization must be introduced without changing the form layout.
- Current billing/project/file provider factories are deliberately unavailable. The local prototype must never present fixture data as live provider data.
- Several legacy endpoints assume every client session has an invoice. They require an explicit invoice-scope guard before customer-scoped sessions are introduced.
- The login canvas is dynamically festival-driven. Visual verification must compare the same localhost state and viewport; the implementation must not change festival or employee-login files.

## Recommended V1 architecture

Keep the existing production invoice verifier and persisted opaque sessions. Add a resolver that tries invoice access first and WriteX ID second, returning one generic failure. Use an explicit development flag plus `NODE_ENV !== production` for isolated fixtures. Store fixture sessions as opaque, expiring, revocable server-side records. Gate `/client/**` with invoice scope, `/my-writex/**` with customer scope, and verify project ownership from the authorized customer record. Keep Customer Master behind a future provider interface so real LTS integration can replace the fixture without rebuilding the UI.
