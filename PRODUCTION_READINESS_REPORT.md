# WriteX Production Readiness Report

## Production Ready

- Public brochure and lead capture pages
- Quote lead API with safe WhatsApp fallback
- Private S3 upload architecture
- Admin authentication and protected internal routes
- Client portal session and payment/download safety checks
- Payment proof review workflow
- Revision request workflow
- Admin metrics, audit logs, integration logs, CRM queues, SLA alerts, manager review, and founder reporting

## Brochure Mode

Public pages remain usable even when backend credentials are not configured. Quote, upload, and client-portal workflows fail safely and guide users to WhatsApp instead of showing fake success.

## Requires Credentials

- PostgreSQL: `DATABASE_URL`
- S3: AWS bucket and credentials
- Email: `RESEND_API_KEY` and notification recipients
- Auth: `AUTH_COOKIE_SECRET`
- Jobs: `JOB_SECRET`
- LTS/PMT: live base URLs and API keys

## Revenue Visibility Readiness

- Source tracking fields are available on quote leads
- Lead pipeline fields are available
- Quote/conversion/loss tracking is available
- Founder report route is available at `/admin/founder-report`

Known missing items:

- Ad spend import
- CAC calculation
- Repeat purchase/LTV calculation
- GA4/Search Console integration
- Offline payment reconciliation automation

## Known Launch Blockers

- Production credentials must be configured on the VPS.
- First admin must be created with a generated password hash.
- LTS and PMT live API behavior must be verified with real vendor documentation.
- Malware scanning remains a future upload-hardening task before high-volume uploads.
