# My WriteX Isolated Staging Runbook

Status: **READY FOR APPROVAL — not executed or provisioned by Stage 3B-2**

This runbook implements the existing staging architecture without production connectivity. Public DNS must not be created without explicit authorization.

## Fixed staging topology

| Component | Binding/name | Safety requirement |
|---|---|---|
| My WriteX staging BFF | `127.0.0.1:3100`; optional approved internal name `my-writex-staging.internal` | Staging cookie namespace, no production environment inheritance |
| Integration service | `127.0.0.1:4100` | Sanitized adapter only; production adapter absent/disabled |
| MySQL | `127.0.0.1:43306` | Disposable database; approved sanitized/synthetic data only |
| Object store emulator | `127.0.0.1:49000` | Inert placeholders; deny every production bucket/account |
| Notification sink | `127.0.0.1:48025` and `127.0.0.1:48080` | No SES/SMS/WhatsApp production credentials or recipients |
| Metrics/log sink | `127.0.0.1:49090` | Allowlisted safe fields; retention-limited |

## Stage 3B-2 environment contract

These defaults remain false and must not be enabled by this task:

```dotenv
MY_WRITEX_ENABLED=false
MY_WRITEX_LTS_INTEGRATION_ENABLED=false
MY_WRITEX_CUSTOMER_MASTER_ENABLED=false
MY_WRITEX_REAL_REQUESTS_ENABLED=false
MY_WRITEX_PRODUCTION_AUTH_ENABLED=false
MY_WRITEX_LOCAL_MOCK_ENABLED=false
MY_WRITEX_SANITIZED_SNAPSHOT_ENABLED=false
```

Future E3 execution may enable only the separately approved staging application and sanitized-snapshot mode in an isolated change window. LTS integration, real requests, production authentication, real notifications, and production credentials remain false/absent. Startup must refuse any production hostname, port, database, bucket, cookie domain, service audience, sender, or secret namespace.

## Pre-provision checklist

1. Record data-owner, security, schema-owner, and staging-change approvals.
2. Verify the fresh sanitized snapshot checksum, UTC timestamp, source environment, schema version, approval reference, and deletion date.
3. Allocate a dedicated staging directory/resource group and explicit resource-name prefix.
4. Create a dedicated secret namespace with short-lived staging-only identities; never copy production secrets.
5. Add deny policies for known production database endpoints, buckets, senders, cookie domains, and service audiences.
6. Confirm no production routes exist from the staging network.

## Build and verification sequence

1. Start the database/object/notification/observability dependencies on the fixed loopback ports.
2. Import only the approved sanitized snapshot; never mount raw uploads or production object storage.
3. Record pre-migration schema/count/checksum/orphan baselines.
4. Apply the draft migrations, reconcile, roll back completely, reconcile, then reapply.
5. Load only approved synthetic edge cases and sanitized relationship structures.
6. Start the integration service with the production adapter build-time disabled.
7. Start the BFF with a staging-only cookie name/key/domain and notification sink.
8. Execute `MY_WRITEX_E3_STAGING_TEST_MATRIX.md` and scan logs for prohibited fields.
9. Record image/commit/schema/snapshot hashes, test evidence, operator, approvals, and exceptions.

## Reset procedure

1. Set all feature flags false and stop BFF/integration traffic.
2. Revoke staging sessions/service tokens and purge the notification sink.
3. Resolve and verify each exact staging path/resource identifier.
4. Destroy only the disposable database, object-emulator, session, and log volumes bearing the staging prefix.
5. Recreate from pinned definitions and re-import the approved sanitized snapshot.
6. Reapply migrations and rerun critical reconciliation/authorization tests.

## Destroy procedure

After evidence retention is approved, disable flags, revoke identities, export only safe signed test summaries, delete exact staging resources, verify ports/resources are absent, revoke/rotate staging secrets, and record completion. Never use an unresolved variable, wildcard root, home directory, or shared production resource as a deletion target.

## Stop conditions

Stop on any production endpoint/credential, raw PII or object, real notification recipient, cookie collision, schema/count mismatch, broken relationship, cross-customer result, unsupported migration, log PII, or rollback failure.
