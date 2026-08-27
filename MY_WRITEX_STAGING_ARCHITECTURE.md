# My WriteX ↔ LTS Disposable Staging Architecture

Status: **DESIGN READY — environment not provisioned**

Public DNS: **NOT CREATED**

## Isolation boundary

Staging must have no route, credential, trust relationship, bucket, session store, notification provider, or account shared with production. A production hostname, database endpoint, S3 bucket, queue, sender identity, webhook, or secret causes startup refusal.

```text
Founder/VPN browser
        │
        ▼
My WriteX staging BFF :3100
        │ mTLS + short-lived staging audience
        ▼
Integration service :4100
  ├─ SanitizedSnapshotAdapter
  ├─ staging MySQL :43306
  ├─ staging object emulator :49000
  ├─ notification sink :48025/:48080
  └─ safe metrics/log sink :49090
```

Use an internal hostname first, for example `my-writex-staging.internal`, or localhost/approved VPN routing. `my-writex-staging.writex.co.in` requires explicit DNS, certificate, access-control, and security approval; Stage 3B-1 does not create it.

## Components

| Component | Isolation requirement | Reset/rollback |
|---|---|---|
| My WriteX BFF | Staging build, staging cookie name/domain, no production environment inheritance | Redeploy pinned image; clear staging sessions |
| Integration service | Versioned `/api/my-writex` contract; production adapter absent/disabled | Feature flags OFF; roll back image |
| Database | Disposable MySQL 8.0.x with only approved sanitized/synthetic data | Destroy volume; recreate; apply approved migrations |
| Files | Emulator or dedicated empty staging bucket with deny policy against production ARNs | Delete staging objects/volume only |
| Sessions | Dedicated random key and store; cookies `Secure`, `HttpOnly`, staging-only domain | Increment staging session epoch; clear store |
| Notifications | Mail/SMS/WhatsApp sink that cannot deliver externally | Purge sink; no real provider credentials |
| Secrets | Dedicated secret namespace, short-lived access, no copy from production | Revoke staging identities and rotate |
| Logs/metrics | Dedicated sink with allowlisted safe fields | Retention-limited purge |

## Required environment contract

All risky flags default to false:

```dotenv
NODE_ENV=production
MY_WRITEX_ENABLED=false
MY_WRITEX_LTS_INTEGRATION_ENABLED=false
MY_WRITEX_CUSTOMER_MASTER_ENABLED=false
MY_WRITEX_REAL_REQUESTS_ENABLED=false
MY_WRITEX_PRODUCTION_AUTH_ENABLED=false
MY_WRITEX_LOCAL_MOCK_ENABLED=false
MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED=false
```

For an approved staging run only, use a distinct `APP_ENV=staging`, enable `MY_WRITEX_ENABLED` and `MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED`, and keep the three real-production flags false. Configuration validation must reject:

- hostnames/buckets containing approved production identifiers;
- database port 3306 or an unapproved host;
- production cookie names/domains;
- real notification credentials;
- missing staging approval reference;
- simultaneous mock/sanitized and production-adapter modes.

## Data and file strategy

1. Import a freshly approved sanitized SQL snapshot into the disposable database.
2. Use only generated safe file metadata and inert placeholder files; never copy production objects.
3. Keep source IDs only where needed to prove links; expose public staging references to browser responses.
4. Seed Customer A/B, invoice-only, orphan, duplicate, BDE-conflict, and reversal cases.
5. Store no raw names, phones, emails, requirement text, uploaded files, secrets, tokens, or notification destinations.

## Reset sequence

1. Disable all My WriteX staging flags and stop BFF/integration traffic.
2. Revoke staging sessions/service tokens.
3. Verify exact staging resource identifiers.
4. Destroy only disposable database/object/session volumes.
5. Recreate from pinned definitions and the approved sanitized snapshot hash.
6. Apply migrations, fixtures, and contract/security tests.
7. Record hashes, counts, test result, operator, and approval reference.

No production resource is part of this sequence.
