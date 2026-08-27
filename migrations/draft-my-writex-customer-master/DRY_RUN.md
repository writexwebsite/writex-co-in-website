# DRAFT — DO NOT RUN IN PRODUCTION — Dry-Run Plan

## Gate

Do not run these files until an LTS schema owner approves the target engine/version, naming, encryption/HMAC implementation, retention policy, and a freshly sanitized snapshot. The current Stage 3B-0 task does not authorize execution anywhere.

## Disposable-clone procedure

1. Provision an isolated local/disposable MySQL 8 instance with credentials that cannot reach staging or production.
2. Import a newly approved sanitized snapshot. Record snapshot checksum, table counts, schema checksum, engine version, and import log.
3. Run schema-only prechecks: required legacy tables, absent new table/index/column names, available disk, collation, and constraint support.
4. Capture baseline counts for `leads`, `invoices`, `invoicepaymentdetails`, `assignments`, task/delivery tables, and every new table (expected zero).
5. Apply 0001–0003 in order. Do not apply 0004 on the first pass.
6. Validate every new table, primary/foreign/unique/check constraint, index, and JSON column.
7. Insert synthetic records only. Test case-insensitive WriteX ID uniqueness, identifier retirement, customer/invoice/project links, invoice/customer session separation, duplicate candidate statuses, and merge-ledger append behavior.
8. Run a proposed backfill in report-only mode. Compare expected customer/invoice/project link counts, orphan counts, and duplicate groups with the approved audit.
9. Apply 0004 only in a second fresh clone after explicit review; confirm legacy row counts and checksums are unchanged and every new column is initially null.
10. Run application contract tests against the mock/isolated adapter. Do not enable live mode.
11. Execute down files in reverse on a separate throwaway copy. Confirm the pre-migration schema and row counts are restored.
12. Destroy only the disposable instance under its approved cleanup procedure; retain sanitized aggregate evidence, not raw rows.

## Reconciliation queries to prepare

- Count distinct linked source invoice/project IDs versus source non-deleted rows.
- Count duplicate source links (must be zero).
- Count links to absent source rows (must be zero).
- Count Customer Masters with no source identifier and with multiple active primary WriteX IDs (must be zero).
- Count customer sessions violating invoice/customer scope XOR (must be zero).
- Compare before/after legacy row counts and sampled non-PII checksums (must match exactly before backfill).
- Compare merge impact expected versus actual row counts (must match before commit).

## Stop conditions

Stop on any production-resolvable hostname, unsanitized PII export, schema drift, count/checksum mismatch, unsupported DDL, duplicate key, orphan link, scope violation, timeout, or rollback mismatch. Do not “fix forward” in the same run.
