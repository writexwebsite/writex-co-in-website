# DRAFT — DO NOT RUN IN PRODUCTION — Rollback Plan

Rollback is validated only on a disposable dry-run database.

1. Stop application traffic to the disposable target and capture final migration/backfill counts.
2. If no backfill or portal activity occurred, run down files in reverse: 0004, 0003, 0002, 0001.
3. If synthetic links/events exist, export their non-PII audit/count evidence, then clear only the disposable data under the test plan before running destructive down files.
4. For 0004, first prove every nullable legacy link is reproducible from `customer_invoice_links` / `customer_project_links`; then drop indexes and columns.
5. Validate that all new objects are absent and legacy schema/count/checksums match the captured baseline.

For any future real deployment, rollback must normally be forward/compensating: disable reads/writes behind a feature flag, retain Customer Master and merge-ledger tables, restore legacy read paths, revoke affected sessions, and correct links through new audit events. Never drop a populated merge ledger or silently delete identifier history. A production rollback requires a separate approved runbook, backup/restore proof, owners, maintenance window, and stop criteria.
