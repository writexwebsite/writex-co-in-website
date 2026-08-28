# My WriteX Isolated Live Demo Runbook

## Purpose

This runbook operates the Founder-only My WriteX demo at `demo.writex.co.in`. It is a synthetic demonstration environment, not a real Customer Master or LTS integration.

## Isolation contract

| Resource | Demo value |
|---|---|
| Application root | `/var/www/my-writex-demo` |
| Releases | `/var/www/my-writex-demo/releases` |
| Current release | `/var/www/my-writex-demo/current` |
| Environment | `/var/www/my-writex-demo/shared/.env.demo` |
| Request store | `/var/www/my-writex-demo/shared/data/requests.json` |
| Logs | `/var/www/my-writex-demo/logs` |
| PM2 process | `my-writex-demo` |
| Listener | Dynamically selected free `127.0.0.1:3100–3199` port, persisted in `/var/www/my-writex-demo/shared/port` |
| Nginx site | `/etc/nginx/sites-available/my-writex-demo` |
| Session cookie | `__Host-my_writex_demo_session` |
| Review cookie | `__Host-my_writex_demo_review` |
| Database | None |
| LTS/PMT | Disabled and unconfigured |

The deploy script records the production WriteX release link, production PM2 PIDs, TheWriteX PM2 PID, and production Nginx configuration hash before deployment. It fails if any invariant changes.

## Demo credentials

- WriteX ID: `shubham.demo`
- Registered phone display: `+91 90000 00001`
- Normalized phone: `+919000000001`
- Inspector: separate review code supplied directly to the Founder; never store the plaintext code in Git

## Feature flags

The demo starts only when these values are exact:

```text
MY_WRITEX_DEMO_MODE=true
MY_WRITEX_ENABLED=true
MY_WRITEX_DEMO_ACCOUNT_ENABLED=true
MY_WRITEX_LTS_INTEGRATION_ENABLED=false
MY_WRITEX_CUSTOMER_MASTER_ENABLED=false
MY_WRITEX_REAL_REQUESTS_ENABLED=false
MY_WRITEX_PRODUCTION_AUTH_ENABLED=false
MY_WRITEX_LOCAL_MOCK_ENABLED=false
MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED=false
CLIENT_AUTH_PROVIDER=disabled
DATABASE_URL=
```

Any production provider, database URL, LTS endpoint/key, PMT endpoint/key, or risky feature flag disables the demo fixture at runtime and fails deployment validation.

## Deploy

Deployment is triggered only by an explicitly pushed `my-writex-demo-v*` tag. The workflow packages the tagged commit, uses the existing pinned Lightsail SSH channel, and invokes:

```bash
bash scripts/deploy-my-writex-demo.sh
```

The server script creates a separate release, reduces its route tree to the authorized Client Login, My WriteX, restricted inspector, and health surfaces, and installs a demo-only root layout, redirect, robots file, sitemap, and TypeScript project. It then installs dependencies, runs focused lint, TypeScript, the two dedicated My WriteX safety suites, and a production build. It seeds the demo only when no request store exists, atomically switches the demo symlink, and starts/restarts only `my-writex-demo`.

It creates only the demo Nginx virtual host. When `demo.writex.co.in` resolves to `43.205.194.174`, it obtains a dedicated certificate and installs the HTTPS configuration.

## Reset

Reset only when the Founder is not actively using the demo:

```bash
/var/www/my-writex-demo/reset-my-writex-demo
```

The reset restores the three seeded Shubham request states and removes request interactions created during testing. It does not alter application code, releases, environment secrets, logs, PM2, Nginx, production data, LTS, PMT, or any real customer.

The restricted inspector also exposes a rate-limited **Reset Demo** action with the same request-store scope.

## Rollback

List exact releases:

```bash
ls -1dt /var/www/my-writex-demo/releases/*
```

Rollback only the demo symlink and demo PM2 process:

```bash
/var/www/my-writex-demo/rollback-my-writex-demo <release-directory-name>
```

The rollback script validates that the target is inside the demo release directory, restarts only `my-writex-demo`, and verifies the isolated health endpoint.

## Safety checks

- `X-Robots-Tag: noindex, nofollow, noarchive` is set by Next.js and Nginx.
- `robots.txt` disallows `/`; the demo sitemap is empty.
- Browser source maps remain disabled.
- Admin, Employee, generic Demo, contact, quote, hiring, job, trust, upload, and website-experience APIs are blocked at the demo Nginx boundary.
- Login and review-code failures are generic and rate-limited.
- Customer mutations are same-origin checked, rate-limited, owner-scoped, idempotent, and stored only in the capped demo JSON store.
- Uploaded file bytes are not persisted; only bounded synthetic metadata is stored.
- No real email, SMS, WhatsApp, notification, invoice, payment, LTS request, or Customer Master write exists in this path.
