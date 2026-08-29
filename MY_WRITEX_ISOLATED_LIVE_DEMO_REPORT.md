# My WriteX Isolated Live Demo — Founder Release Report

Verified: 29 August 2026 (Asia/Calcutta)

## Demo Deployment

- Demo URL: https://demo.writex.co.in/client-login
- My WriteX URL: https://demo.writex.co.in/my-writex
- Demo Inspector URL: https://demo.writex.co.in/dev/my-writex-requests
- WriteX ID: `shubham.demo`
- Registered Phone: `+91 90000 00001`
- Normalized demo phone: `+919000000001`
- Synthetic customer: Shubham
- Assigned demo manager: Aman
- Demo banner: `Demo Environment · No real customer data`

The inspector uses a separate demo-review access mechanism. Its access code is intentionally not stored in this repository.

## Validation

| Gate | Result | Live evidence |
|---|---|---|
| Frozen Client Login | GO | Approved fields, card, typography, spacing and responsive behavior retained; no demo banner added to the login screen. |
| Shubham Login | GO | Synthetic credentials authenticate and route to `/my-writex`; invalid credentials return a generic `401`. |
| Home | GO | Personal greeting, three active projects, next actions, manager, jobs and relationship recognition rendered. |
| Projects | GO | Three active projects and the completed-project history rendered from the synthetic fixture. |
| Project Room | GO | Active and completed rooms, verified quality journey, files, invoice/payment and support surfaces rendered. |
| Start New Requirement | GO | Four-step requirement journey is usable and generated `REQ-2026-0004` during live UAT. |
| Draft Autosave | GO | Draft restored after a live page reload; lowercase input normalized to `Strategic Management Report`. |
| Order Similar Work | GO | Completed project safely carried service/category context without old payment or confidential fields. |
| Upcoming Work Conversion | GO | `Research Proposal` was prepared from Upcoming Work and submitted as `REQ-2026-0005`. |
| My Requests | GO | New and seeded requests, filters, detail, timeline and next action rendered. |
| Manager Handoff | GO | Aman requested more information; Shubham responded; status returned from `More Information Needed` to `Reviewing`. |
| Career | GO | Career home, eight synthetic jobs, job details, CV Studio and three CV versions rendered. |
| Mobile | GO | 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932 and 390×844 passed with no horizontal overflow. Mobile navigation, drawer and logout remained usable. |
| Session Isolation | GO | `__Host-my_writex_demo_session`; HttpOnly, Secure, SameSite=Lax, Path=/, demo-host only; logout removes access and protected routes redirect to login. |
| Demo Reset | GO | Demo-only reset restored exactly `REQ-DEMO-0001`, `REQ-DEMO-0002` and `REQ-DEMO-0003` with Reviewing, More Information Needed and Closed states. |
| Noindex Protection | GO | HTTPS response header is noindex/nofollow/noarchive; robots disallows `/`; sitemap contains no URL; production source maps are disabled. |

## Responsive UAT

| Viewport | Horizontal overflow | Demo banner | Home content/navigation |
|---|---:|---:|---:|
| 1920×1080 | No | Present | Pass |
| 1440×900 | No | Present | Pass |
| 1366×768 | No | Present | Pass |
| 1024×768 | No | Present | Pass |
| 768×1024 | No | Present | Pass |
| 430×932 | No | Present | Pass |
| 390×844 | No | Present | Pass |

The live journey also covered requirement entry, Project Room, Jobs, CV Studio, My Requests, the mobile drawer, logout and protected-route denial.

## Security and Operations Evidence

- HTTPS: valid Let's Encrypt certificate for `demo.writex.co.in`, current certificate expiry 27 November 2026 UTC.
- HTTP: redirects to the same HTTPS demo URL.
- Health: `200`, app `my-writex-demo`, environment `demo`, database `not_configured`.
- Demo Admin and Admin API routes: `404`.
- Inspector without review authentication: `401`.
- Login cookie: HttpOnly, Secure, SameSite=Lax, `Path=/`, `__Host-` prefix.
- Review cookie: separate HttpOnly, Secure, SameSite=Strict demo cookie.
- Login, request mutation, inspector and reset routes are rate limited.
- Request submissions are origin checked, idempotent and storage capped.
- Demo uploads are metadata-only/local UAT; no external storage or production notification provider is connected.
- Production adapter guard tests confirm no production adapter can load in demo mode.
- Tests: 19 isolated Stage 3A/lifecycle/security tests passed; scoped ESLint passed; demo TypeScript and production-mode demo build passed in the deployment run.
- GitHub Actions deployment: https://github.com/writexwebsite/writex-co-in-website/actions/runs/33256811107 (`success`).

## Feature Flags

| Flag | Demo value |
|---|---:|
| `MY_WRITEX_DEMO_MODE` | `true` |
| `MY_WRITEX_ENABLED` | `true` |
| `MY_WRITEX_DEMO_ACCOUNT_ENABLED` | `true` |
| `MY_WRITEX_LTS_INTEGRATION_ENABLED` | `false` |
| `MY_WRITEX_CUSTOMER_MASTER_ENABLED` | `false` |
| `MY_WRITEX_REAL_REQUESTS_ENABLED` | `false` |
| `MY_WRITEX_PRODUCTION_AUTH_ENABLED` | `false` |
| `CLIENT_AUTH_PROVIDER` | `disabled` |
| `DATABASE_URL` | empty |
| `LTS_API_BASE_URL` / `LTS_API_KEY` | empty |
| `PMT_API_BASE_URL` / `PMT_API_KEY` | empty |

## Safety

- Production Website Modified: NO
- Production Client Login Modified: NO
- Production Data Modified: NO
- LTS Modified: NO
- LTS Connected: NO
- Real Notifications Sent: NO
- Real Customer Data Used: NO

Production Client Login remained `200`, 49,857 bytes, SHA-256 `c81ae175fa60b938b7bd44a762411a1cf542858dcc1dccd93c149523174cd4ef` in the immediate post-release and final isolation checks. The isolated deploy guard also verified that the production release symlink, production PM2 PIDs and production Nginx configuration did not change during deployment.

## Runtime, Release, Reset and Rollback

- PM2 Process: `my-writex-demo`
- Port: `3100` on `127.0.0.1`
- Application root: `/var/www/my-writex-demo`
- Environment: `/var/www/my-writex-demo/shared/.env.demo`
- Logs: `/var/www/my-writex-demo/logs`
- Demo data: `/var/www/my-writex-demo/shared/data/requests.json`
- Release: `/var/www/my-writex-demo/current` at commit `50a0c9b027a7747d98204fd706af74c0e3941690`
- Release tag: `my-writex-demo-v1-20260829-login-fix`
- Reset: `/var/www/my-writex-demo/reset-my-writex-demo`
- Rollback: `/var/www/my-writex-demo/rollback-my-writex-demo 20260829T140218Z-64b557c5a9d9`

The reset command changes only the isolated synthetic request store. The rollback command switches only the `my-writex-demo` release and restarts only the `my-writex-demo` PM2 process.

## Final Status

**MY WRITEX ISOLATED LIVE DEMO READY FOR FOUNDER REVIEW: YES**

Real LTS integration and real-customer enablement were not started and remain explicitly out of scope.
