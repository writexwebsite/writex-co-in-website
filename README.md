# WriteX Academic Support Website

Premium Next.js full-stack rebuild for WriteX: academic support, research guidance, editing, dissertation support, SOP/admissions writing, plagiarism review, and quote-led conversion.

## Stack Overview

- Frontend and backend: Next.js full-stack app with App Router API routes
- Hosting target: isolated AWS Lightsail deployment on Ubuntu 24.04
- Database: isolated PostgreSQL 16 database on the Lightsail instance
- File storage: AWS S3 private bucket
- Admin auth: SQL-backed admin users, bcrypt password hashes, secure HTTP-only signed cookie
- Client portal auth: Invoice ID + registered mobile verification, secure HTTP-only signed cookie
- Email: Resend adapter now, AWS SES-compatible notification layer later
- Internal systems: LTS API for work journey/order status, PMT API for payment status

Architecture:

```text
User -> Next.js frontend -> Next.js API/backend layer -> PostgreSQL + LTS API + PMT API + S3
```

## Backend Architecture

Backend-ready modules live under `lib/`:

- `lib/db`: PostgreSQL pool, query helpers, quote lead insert helper
- `lib/auth`: admin sessions, client sessions, secure cookie helpers, bcrypt password verification
- `lib/integrations/lts.ts`: LTS wrapper placeholders for invoice validation, work journey, order files, samples, and client events
- `lib/integrations/pmt.ts`: PMT wrapper placeholders for payment status, payment details, proof submission, and accounts events
- `lib/storage/s3.ts`: private S3 upload/delete/signed preview/signed download helpers
- `lib/notifications`: Resend notification adapter for leads, payment proof, accounts, and download unlocks
- `lib/validation.ts`: Zod validation contracts for quote leads, upload metadata, admin login, and future client login
- `lib/security`: rate limit helpers, request context, audit logging, input validation, hash helpers
- `lib/api/response.ts`: safe API success/error response helpers

Production behavior:

- Missing production credentials fail safely with 503 responses.
- Unconfigured quote, upload, LTS, and PMT capabilities fail safely instead of pretending to save or sync data.
- Frontend never decides payment unlock.
- Final download is authorized on the server against PMT payment status.

## API Routes

Client portal APIs:

- `POST /api/client/validate`
- `GET /api/client/dashboard`
- `GET /api/client/preview/:invoiceId`
- `GET /api/client/download/:invoiceId`
- `POST /api/client/payment-proof`
- `POST /api/client/logout`

Quote and upload APIs:

- `POST /api/quote`
- `POST /api/upload-brief`

## Phase 1 Quote Lead Capture

`POST /api/quote` is the first live backend capability. It accepts JSON from the pricing quote form, validates the payload with Zod, saves the lead in PostgreSQL when `DATABASE_URL` is configured, and sends a Resend notification when `RESEND_API_KEY` and `QUOTE_NOTIFICATION_EMAIL` are configured.

Required quote fields:

- `name`
- `whatsapp`
- `service_required`
- `deadline`
- `instructions` or `brief_summary`
- `consent: true`

Optional quote fields:

- `email` (validated when provided)
- `country`
- `academic_level`
- `subject`
- `word_count` (must be positive when provided)
- `source`
- `file_name`
- `file_size`
- `file_type`
- `uploaded_file_asset_id`

If PostgreSQL is not configured or a save fails, the API does not fake success. It returns a safe WhatsApp fallback response so the frontend can ask the student to send the same details directly on WhatsApp. If email notification is not configured, the lead can still be saved successfully and the notification result is returned as a server-side warning.

The Phase 1 file field is metadata-only. Selecting a file in the form records the file name/type/size for context, but it does not upload the file unless the S3 upload flow is connected later. Users are told to send files directly on WhatsApp for urgent handling.

Admin APIs:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/leads`
- `GET /api/admin/leads/:id`
- `PATCH /api/admin/leads/:id/status`
- `GET /api/admin/invoices`
- `GET /api/admin/payment-events`

## Environment Variables

Copy `.env.example` to `.env.local` for local development and configure production values on the VPS:

```bash
NEXT_PUBLIC_SITE_URL=https://www.writex.co.in
NEXT_PUBLIC_WHATSAPP_NUMBER=918100977068
NEXT_PUBLIC_PRIMARY_EMAIL=info@writex.co.in
NEXT_PUBLIC_SUPPORT_EMAIL=customer@writex.co.in

DATABASE_URL=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_PRIVATE_PREFIX=writex
MAX_UPLOAD_SIZE_MB=25
PAYMENT_PROOF_MAX_UPLOAD_SIZE_MB=10

RESEND_API_KEY=
RESEND_FROM_EMAIL=WriteX <noreply@writex.co.in>
QUOTE_NOTIFICATION_EMAIL=
ACCOUNTS_NOTIFICATION_EMAIL=

LTS_API_BASE_URL=
LTS_API_KEY=
LTS_API_TIMEOUT_MS=10000
PMT_API_BASE_URL=
PMT_API_KEY=
PMT_API_TIMEOUT_MS=10000
INTEGRATION_MODE=disabled
ALLOW_LOCAL_PAYMENT_UNLOCK=false

AUTH_COOKIE_NAME=writex_admin_session
AUTH_COOKIE_SECRET=
CLIENT_SESSION_MAX_AGE_SECONDS=604800
```

Generate a strong random value for `AUTH_COOKIE_SECRET`.

## Local Setup

Using a normal local Node setup:

```bash
pnpm install
pnpm dev
```

Using the bundled Codex runtime on this workstation:

```powershell
& "C:\Users\Writex\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd" install
& "C:\Users\Writex\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd" dev
```

## Database Migration Steps

Run the schema against AWS RDS PostgreSQL:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

The schema creates:

- `admin_users`
- `lead_notes`
- `client_sessions`
- `quote_leads`
- `portal_invoice_cache`
- `file_assets`
- `preview_download_logs`
- `payment_events`
- `integration_logs`

Recommended `quote_leads.status` values are `new`, `contacted`, `quoted`, `converted`, `lost`, and `spam`.

Admin users must be inserted with bcrypt password hashes. Do not store plain passwords.

## S3 Setup Notes

- Use a private S3 bucket.
- Block all public access.
- Store uploaded briefs, payment proofs, previews, and final files under `AWS_S3_PRIVATE_PREFIX`.
- Do not expose S3 keys to the frontend.
- Preview and download routes generate temporary signed URLs server-side.
- Final download is allowed only after PMT returns `settled` or `approved`.

## Phase 2 Secure File Upload

`POST /api/upload-brief` accepts multipart form uploads for quote-related files and stores them in a private S3 bucket when AWS credentials and PostgreSQL are configured. The route validates file size, extension, MIME type where practical, and stores only metadata in `file_assets`.

## Backend Phases 7-12

### Revision Workflow

- Client portal shows “Need a revision or clarification?” only after preview/final/quality-review style states.
- `POST /api/client/revision-request` stores revision requests against invoice/session, validates input, supports optional private S3 attachment, notifies support when configured, and sends a deferred LTS event when available.
- Admin routes: `/admin/revisions` and `/admin/revisions/:id`.
- Revision requests do not unlock downloads and are reviewed against the original brief/agreed scope.

### Admin Metrics and Audit Logs

- Protected metrics API: `GET /api/admin/metrics`.
- Admin pages: `/admin/audit-logs` and `/admin/integration-logs`.
- Audit logging avoids passwords, secrets, signed URLs, and full private payloads.

### CRM Follow-Up

- Quote leads support owner, priority, quality, follow-up date, quote amount, conversion amount, loss reason, and source metadata.
- CRM page: `/admin/crm`.
- Lead detail includes owner assignment, priority/quality controls, follow-up scheduling, quote/conversion/loss tracking, WhatsApp click tracking, and activity timeline.
- Auto-assignment is prepared behind `AUTO_ASSIGN_LEADS=false`.

### SLA and Manager Review

- SLA rules live in `lib/sla/slaRules.ts`.
- Protected job route: `POST /api/jobs/sla-check` with `x-job-secret`.
- Script: `pnpm jobs:sla-check`.
- Admin routes: `/admin/sla` and `/admin/manager-review`.
- Alerts are internal only and do not trigger WhatsApp automation.

### Production Hardening

- Health endpoint: `GET /api/health`.
- Protected system health endpoint: `GET /api/admin/system-health`.
- Security headers are configured in `next.config.mjs`.
- Deployment documentation: `DEPLOYMENT.md`.
- Launch checklist: `LAUNCH_CHECKLIST.md`.
- Readiness report: `PRODUCTION_READINESS_REPORT.md`.

### Revenue Attribution and Founder Reporting

- Quote forms send page path, landing page, referrer, UTM fields, and device type.
- Quote leads store confirmed revenue separately from estimated pipeline value.
- Founder report API: `GET /api/admin/founder-report`.
- Founder report page: `/admin/founder-report`.
- CSV export: `/api/admin/founder-report/export.csv`.
- Confirmed revenue only counts `converted_amount`; quoted amount is labelled estimated pipeline value.

Allowed upload extensions:

- PDF, DOC, DOCX
- PPT, PPTX
- XLS, XLSX, CSV
- JPG, JPEG, PNG
- TXT

Upload responses return `fileAssetId`, `fileName`, and `fileSize`. They never return public S3 URLs. Quote submissions can pass `uploaded_file_asset_id`; the quote API verifies the asset exists, is quote-related, and is not already linked to another lead before attaching it to `quote_leads.uploaded_file_asset_id`.

S3 key structure:

- `writex/quote-leads/{leadId}/briefs/{fileName}` for lead-linked quote files
- `writex/quote-leads/pending/{id}/briefs/{fileName}` for quote files uploaded before lead creation
- `writex/payment-proofs/{invoiceId}/{fileName}`
- `writex/previews/{invoiceId}/{fileName}`
- `writex/final-deliveries/{invoiceId}/{fileName}`

When upload storage is not configured, the quote form does not fake success. It keeps the text quote flow available and tells users to send the file on WhatsApp for fastest review.

## LTS And PMT Integrations

Do not connect directly to LTS or PMT databases.

- LTS is the source of truth for invoice validation, work journey, order files, and work status.
- PMT is the source of truth for payment status and download unlock decisions.
- PostgreSQL stores sessions, logs, file metadata, lead records, cache snapshots, and integration audit logs.

Phase 4 creates server-only adapter contracts in `lib/integrations/lts.ts` and `lib/integrations/pmt.ts`. The adapters normalize future API responses, apply timeout handling, log integration results to `integration_logs`, and return safe public errors when unavailable.

Integration modes:

- `disabled`: default. LTS/PMT adapter calls fail safely with integration unavailable responses.
- `mock`: development-only test fixtures for `WXTEST-PENDING`, `WXTEST-READY`, and `WXTEST-PAID`.
- `live`: calls real APIs using `LTS_API_BASE_URL`, `LTS_API_KEY`, `PMT_API_BASE_URL`, and `PMT_API_KEY`.

Production must not use mock mode. The adapters reject mock mode when `NODE_ENV=production`.

Required LTS API capabilities:

- Validate invoice and WhatsApp match.
- Return invoice/order/client/project summary.
- Return client work journey stages.
- Return order file availability metadata.
- Accept client-side portal events.
- Optionally return sample category metadata later.

Required PMT API capabilities:

- Return payment settlement status.
- Return payment details, balance, payment methods, and payment links.
- Receive payment proof metadata.
- Receive accounts notification events.

Status mapping:

- `lib/integrations/status-mapping.ts` maps placeholder LTS statuses to portal stages such as `brief_received`, `expert_assigned`, `quality_review`, and `preview_ready`.
- PMT statuses map to `payment_pending` or `download_unlocked`.
- Final status mappings must be reviewed after WriteX provides official LTS/PMT status codes.

Cache rules:

- `portal_invoice_cache` is only for display/performance snapshots.
- Cache cannot override current PMT status.
- Payment unlock must always verify live/current PMT settlement status through the PMT adapter.
- Raw payload caching should remain minimal and should not store sensitive private data beyond what is required for debugging and display.

Future portal API placeholders now available:

- `POST /api/client/validate`
- `GET /api/client/dashboard`
- `GET /api/client/payment-status`
- `GET /api/client/work-journey`

The current wrappers contain clean contracts and fail safely until official LTS/PMT credentials and API documentation are configured. Implement final endpoint paths and response-field mappings only after WriteX provides the final API contract.

## Client Portal MVP

Routes:

- `/client-login`
- `/client/dashboard`
- `/client/logout`

Login flow:

1. Client enters invoice ID and registered mobile number.
2. `POST /api/client/validate` checks the invoice/mobile combination through the LTS adapter.
3. A successful match creates a secure HTTP-only signed session cookie.
4. `/client/dashboard` loads client dashboard data through authenticated server APIs.

Session behaviour:

- Client session expiry uses `CLIENT_SESSION_MAX_AGE_SECONDS`.
- No session token is stored in localStorage.

Dashboard data sources:

- LTS adapter: invoice summary, client details, work journey, preview/final file availability metadata.
- PMT adapter: payment status, settlement state, balance, payment link/details.
- PostgreSQL: session storage, portal cache snapshots, event/download logs.

Preview/download rules:

- Preview and final download are requested through server APIs only.
- Direct permanent file URLs are never exposed.
- Preview access requires LTS preview availability and an available secure file reference.
- Final download requires current PMT settlement/approval and final file availability.
- Frontend state cannot unlock final download.

Known portal future work:

- Connect final LTS API contract and status mappings.
- Connect final PMT API contract and payment links.
- Generate watermarked previews.
- Add revision request flow in a later phase.

## Payment Proof And Accounts Workflow

Client submission flow:

- Authenticated clients can submit payment proof from `/client/dashboard` when payment is pending, partial, unpaid, or pending verification.
- The form accepts amount paid, payment method, transaction/reference ID, payment date, optional notes, and an optional JPG/PNG/PDF proof file.
- `POST /api/client/payment-proof` verifies the client session invoice, validates inputs, stores private proof metadata, and returns `verificationStatus: pending`.
- Client proof submission does not mark payment as settled.

Proof file storage:

- Proof files use private S3 storage with `asset_type = payment_proof`.
- S3 path format is `writex/payment-proofs/{invoiceId}/{fileName}` through the existing private prefix helper.
- Allowed proof file types are JPG, JPEG, PNG, and PDF.
- Max proof size uses `PAYMENT_PROOF_MAX_UPLOAD_SIZE_MB`, falling back to `MAX_UPLOAD_SIZE_MB`.
- No public file URL is exposed; admin access uses protected signed URLs only.

Accounts notification:

- `notifyPaymentProof()` sends proof details to `ACCOUNTS_NOTIFICATION_EMAIL`.
- The email includes invoice ID, client name when available, WhatsApp, amount claimed paid, payment method, reference, payment date, notes, proof file asset ID, PMT status snapshot, and admin review link.
- Files are not attached directly.

PMT adapter behaviour:

- The payment proof API attempts `submitPaymentProof()` after local storage.
- If PMT is disabled or unavailable, the client submission still succeeds when local storage succeeds.
- PMT errors are logged/deferred and do not become a fake settlement state.

Admin payment review:

- `/admin/payments` lists proof submissions for accounts review.
- `/admin/payments/[id]` shows proof details, PMT status snapshot, file metadata, admin notes, protected file access, and local verification actions.
- Admin actions can mark proof as pending, needs clarification, rejected, or verified locally.

Download unlock rule:

- Payment proof submitted means evidence received.
- Payment settled means PMT/accounts has verified settlement.
- Final download unlocks only when PMT returns settled/approved by default.
- `ALLOW_LOCAL_PAYMENT_UNLOCK=false` is the default.
- Setting `ALLOW_LOCAL_PAYMENT_UNLOCK=true` allows server-side local accounts verification to unlock final download, but this should be enabled only after WriteX approves that business rule.

Known payment workflow future work:

- Payment gateway webhook.
- Automatic PMT settlement sync.
- Role-specific accounts approval permissions.
- Malware scanning for payment proof files.
- Deeper payment proof audit trail and exports.

## Production Deployment

The production target is AWS Lightsail with timestamped releases under
`/var/www/writex-co-in`, PM2 process `writex-co-in`, loopback port `3002`, and
database `writex_co_in`. It is isolated from the existing TheWriteX application.

Use [DEPLOYMENT.md](./DEPLOYMENT.md) for the authoritative setup, manual deployment,
backup, health-check, Nginx, DNS, SSL, verification, and rollback commands. Deployment
is intentionally manual and the release script never runs database migrations.

## Security Notes

- Use HTTP-only secure cookies.
- Do not store session tokens in localStorage.
- Hash admin passwords with bcrypt.
- Rate limit customer verification and admin login attempts.
- Keep S3 objects private.
- Signed URLs must expire.
- Log preview/download events.
- Server authorizes final downloads; frontend never unlocks files.
- Validate all API inputs with Zod.
- Never expose service role keys, database credentials, S3 keys, or final file URLs to frontend code.

## What Is Currently Live

- Premium marketing website and SEO content architecture.
- Phase 1 quote lead capture API route with PostgreSQL save, Resend notification preparation, and WhatsApp fallback.
- Backend-ready client portal API placeholders.
- Phase 3 internal admin panel for authenticated quote lead review, lead status updates, notes, and protected S3 file access links.
- PostgreSQL schema and S3/LTS/PMT/Resend adapters.
- Quote form posts to `/api/quote`; if backend storage is not configured, it falls back to WhatsApp instead of showing a fake success state.

## What Requires Real Credentials

- AWS RDS PostgreSQL connection
- AWS S3 private bucket
- Resend production sender/API key
- LTS API base URL and API key
- PMT API base URL and API key
- Initial SQL admin user with bcrypt password hash

## Phase 3 Admin Panel

Admin routes:

- `/admin/login`
- `/admin/dashboard`
- `/admin/leads`
- `/admin/leads/[id]`

Admin API routes:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/leads`
- `GET /api/admin/leads/[id]`
- `PATCH /api/admin/leads/[id]/status`
- `POST /api/admin/leads/[id]/notes`
- `GET /api/admin/files/[fileAssetId]/signed-url`

The admin panel uses custom auth with bcrypt password hashes and a signed HTTP-only cookie. Roles are stored on `admin_users` as `super_admin`, `sales`, `support`, `accounts`, or `viewer`; Phase 3 enforces authenticated access first, with deeper role permissions reserved for later.

Create the first admin user manually:

```bash
pnpm admin:hash-password "replace-with-a-strong-password" admin@writex.co.in "WriteX Admin" super_admin
```

Run the generated SQL against the production PostgreSQL database. Do not commit real password hashes, secrets, or production credentials.

## Phase 1 Known Future Work

- Connect LTS/PMT portal APIs after official docs and credentials are available.
- Add production email sender domain verification for Resend.

## Phase 2 Known Future Work

- Add malware scanning for uploaded files.
- Generate watermarked document previews.
- Connect LTS delivery files and final-delivery upload workflows.

## Phase 3 Known Future Work

- Add finer role-based permissions for status changes, notes, accounts actions, and file access.
- Add lead assignment, internal notifications, and deeper audit reporting.
- Add malware scanning before allowing file viewing in production workflows.

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test:axo
pnpm test:theme
```

## Light, Dark, and Auto Themes

The shared theme provider supports `auto`, `light`, and `dark`. First-time visitors use Auto, which resolves from browser-local time: light from `NEXT_PUBLIC_THEME_DAY_START_HOUR` through the hour before `NEXT_PUBLIC_THEME_NIGHT_START_HOUR`. Manual choices persist in the `wx_theme_mode` cookie and local storage. A head script applies the resolved palette before hydration to prevent a visible theme flash.

IP timezone lookup is disabled by default and no external location service is called. The reserved `THEME_IP_TIMEZONE_*` settings should remain disabled unless a reviewed server-only provider is added. Anonymous interaction events are emitted as `writex:theme-event`; they contain only selected mode, resolved theme, and page path.

## Unified Authentication

- Client login: `/client-login` posts Invoice ID, registered WhatsApp number, and Client Access Code to `/api/client/auth/login`.
- Client access codes are bcrypt-hashed with `CLIENT_ACCESS_CODE_PEPPER`; plaintext is returned only by the authenticated generate/rotate admin action and is never stored.
- Temporary `restricted_two_field` mode creates a restricted session and blocks previews, downloads, payment details, payment proof, and revisions.
- Employee login: `/employee-login` posts identifier/password to `/api/employee/auth/login` and relies on the configured employee directory adapter in `lib/integrations/employeeAuth.ts`.
- Client, employee, and admin sessions use separate HttpOnly cookies. Employee navigation/default route must be supplied by the authoritative directory and the login component never hardcodes a department.
- No OTP capability exists in the current product. Forgot-password support directs staff to authorised IT support.
- Without PostgreSQL, LTS/client credentials, or employee-directory endpoints, authentication fails with an honest `503`; no mock identity is created.

## AXO Student Support Companion

AXO is a dynamically loaded, public student-support companion. It supplements the server-rendered site and never replaces service content, the standard quote form, WhatsApp, contact, or authenticated portals.

- Set `NEXT_PUBLIC_AXO_ENABLED=false` to remove AXO without changing the normal website journey.
- Keep `NEXT_PUBLIC_AXO_DETERMINISTIC_ONLY=true` for the approved v1. There is no AI-provider call or client-side secret.
- Service questions and fields live in `lib/axo/config.ts`; validation and summaries live in `lib/axo/rules.ts`.
- Approved answers live in `lib/axo/knowledge.ts`. Unknown questions use a fixed human-handoff fallback.
- Session drafts use `sessionStorage`. Cross-session device memory is explicit opt-in and stores no file contents.
- Private uploads use `/api/upload-brief`. S3 and PostgreSQL must be configured; otherwise AXO preserves the brief and offers retry/WhatsApp.
- Set `MALWARE_SCAN_REQUIRED=true` only after implementing an approved scanner in `lib/storage/malware.ts`; uploads then fail closed until scanning succeeds.
- Quote confirmation uses the existing `/api/quote` integration. Complex scope, pricing and feasibility remain human-reviewed.
- Analytics events are emitted as `writex:axo-event` and may enter `dataLayer`; payloads are allowlisted and exclude PII, order IDs, filenames and raw academic text.

Run AXO unit tests with `pnpm test:axo`. Detailed audit, privacy, upload, knowledge, analytics, journey and QA documents are under `docs/AXO_*.md`.

Troubleshooting: if the companion fails, its error boundary exposes the standard contact route. If storage or database credentials are absent, upload and quote endpoints return honest fallbacks. Clear `writex_axo_brief_v1` and `writex_axo_dismissed` from browser storage to reset a local test session.

## Academic Integrity Positioning

WriteX is positioned as an academic support and research guidance brand. The site avoids grade promises, misconduct framing, fake testimonials, fake client logos, and fabricated university affiliations.
# Phase 1 Free Tools sales engine

The controlled pilot adds `/tools`, `/tools/cv-builder`, `/tools/sop-builder`, and `/templates` without changing the homepage. Apply `database/schema.sql` before enabling lead downloads. Tool downloads use opaque, expiring server-side tokens; builder working text is not sent to analytics providers.

Required pilot flags are documented in `.env.example`. Public referrals and subscription billing remain disabled. The scheduled SLA route continues to use `JOB_SECRET` and now monitors tool-lead first-response deadlines after the Phase 1 migration is applied.
