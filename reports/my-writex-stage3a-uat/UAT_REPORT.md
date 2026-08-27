# My WriteX Stage 3A — Local UAT Report

Date: 27 August 2026  
Environment: localhost development fixtures only  
Branch: `feature/my-writex-v1`

## REGRESSION

Client Login: **UNCHANGED**  
Employee Login: **UNTOUCHED**  
Invoice Login: **GO**  
WriteX ID Login: **GO**  
Auth Scope Isolation: **GO**  
Stage 2A UI: **PRESERVED**

## REVENUE ENGINE

Start New Requirement: **GO**  
Draft Autosave: **GO**  
Review & Submit: **GO**  
Submission Acknowledgement: **GO**  
Order Similar Work: **GO**  
Safe Prefill: **GO**  
Upcoming Work Conversion: **GO**  
Duplicate Conversion Prevention: **GO**

## REQUEST PIPELINE

My Requests: **GO**  
Request Detail: **GO**  
Status History: **GO**  
More Information Needed: **GO**  
Customer Response: **GO**  
Manager Assignment: **GO — Aman**  
Development Inspector: **GO**

## INVOICE CUSTOMER

Invoice Request Flow: **GO**  
Invoice Similar Work: **GO**  
Single-Project Boundary: **GO**  
Customer-Wide Data Hidden: **GO**

## QUALITY

Mobile UX: **GO**  
File Validation: **GO**  
Double-Click Safety: **GO**  
Idempotency: **GO**  
Authorization Negative Tests: **GO**  
Analytics Events: **GO**

## LOCAL FUNNEL

New Requirement Starts: **4**  
New Requirement Submissions: **4**  
Similar Work Starts: **1**  
Similar Work Submissions: **1**  
Upcoming Work Conversions: **1**  
Invoice Workspace Submissions: **1**

Additional local lifecycle evidence: 7 drafts started, 24 draft saves, 7 total submissions, 1 Reviewing transition, 1 More Information Needed transition, 1 customer response, 1 Ready for Discussion transition, and 2 idempotent cancellation checks. Counts include isolated local QA fixtures and no production records.

## LOCAL URLS

My WriteX: <http://127.0.0.1:3000/my-writex>  
New Requirement: <http://127.0.0.1:3000/my-writex/new-requirement>  
My Requests: <http://127.0.0.1:3000/my-writex/requests>  
Example Request: <http://127.0.0.1:3000/my-writex/requests/REQ-2026-0002>  
Upcoming Work: <http://127.0.0.1:3000/my-writex/upcoming>  
Development Request Inspector: <http://127.0.0.1:3000/dev/my-writex-requests>

The development server was stopped after local UAT as required. Start it again with explicit local fixtures before opening these URLs.

## CODE

Branch: `feature/my-writex-v1`

Files Created:

- Request domain, validation, atomic local repository, scoped API helpers, and customer-safe serializers under `lib/my-writex/`.
- Customer, invoice, and development-inspector request API routes under `app/api/`.
- Request creation, list, detail, response, invoice-centre, and inspector routes under `app/`.
- Request list, detail, inspector, and four-step creation experiences under `components/my-writex/`.
- Stage 3A API QA script, fixture, regression tests, screenshots, and this report.

Files Modified:

- Existing My WriteX home, navigation, hubs, project detail, upcoming-work, project explorer, manager, primitives, and requirement-draft integration points.
- `.gitignore` to exclude `.local/` UAT persistence.
- Existing Stage 2/2A tests only where the canonical Stage 3A request contract changed expected local behavior.

Tests:

- **PASS** — API/security QA: zero failures across unauthenticated, expired-session, customer/invoice cross-scope, manipulated reference/source, internal-note privacy, repeated submission, repeated cancellation, and duplicate upcoming-conversion checks.
- **PASS** — Client portal regression suite: **45 passed, 0 failed** (including mandatory title-case normalization for requirement titles).
- **PASS** — Responsive browser UAT at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844, and 360×800.
- **PASS** — Strict TypeScript check scoped to the complete My WriteX/Stage 3A surface and its imports.
- **PASS** — ESLint across the complete My WriteX/Stage 3A surface: **0 errors, 0 warnings**.

## RESPONSIVE UAT

The new-requirement flow, My Requests, Request Detail, and Upcoming Work conversion were measured at every required viewport. All 32 route/viewport combinations reported `scrollWidth <= innerWidth`; no horizontal overflow was detected. Desktop and mobile creation reviews, file input, success views, request actions, invoice review, and the sticky mobile navigation were also exercised interactively.

| Viewport | New requirement | My Requests | Request detail | Upcoming work |
|---|---:|---:|---:|---:|
| 1920×1080 | GO | GO | GO | GO |
| 1440×900 | GO | GO | GO | GO |
| 1366×768 | GO | GO | GO | GO |
| 1024×768 | GO | GO | GO | GO |
| 768×1024 | GO | GO | GO | GO |
| 430×932 | GO | GO | GO | GO |
| 390×844 | GO | GO | GO | GO |
| 360×800 | GO | GO | GO | GO |

## SCREENSHOTS

1. `01-start-new-requirement-desktop-step1.png`
2. `02-start-new-requirement-desktop-review.png`
3. `03-start-new-requirement-mobile-step2.png`
4. `04-start-new-requirement-mobile-review.png`
5. `05-requirement-success-desktop.png`
6. `06-requirement-success-mobile.png`
7. `07-my-requests-desktop.png`
8. `08-my-requests-mobile.png`
9. `09-request-detail-desktop.png`
10. `10-request-detail-mobile.png`
11. `11-similar-work-prefilled-desktop-review.png`
12. `12-upcoming-conversion-mobile.png`
13. `13-dev-inspector-queue.png`
14. `14-dev-inspector-detail-status-update.png`
15. `15-invoice-request-flow-desktop.png`
16. `16-invoice-request-flow-mobile.png`
17. `17-invoice-request-success-mobile.png`

All screenshots are full-viewport localhost captures in `reports/my-writex-stage3a-uat/screenshots/`.

## SAFETY

Production Modified: **NO**  
Production Deployed: **NO**  
LTS Modified: **NO**  
Production Data Modified: **NO**  
Real Notifications Sent: **NO**

The request store is gated behind explicit non-production fixtures and writes only to ignored `.local/` storage. Files are metadata-only; no raw bytes or local paths are persisted. No production build, deploy, release, PM2 reload, Nginx/DNS change, LTS integration, production database mutation, real customer record, or notification was performed.

## FINAL STATUS

**READY FOR FOUNDER STAGE 3A UAT**

STOP AFTER LOCAL UAT. Do not begin LTS integration or production deployment without explicit Founder approval.
