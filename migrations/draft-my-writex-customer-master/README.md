# DRAFT — DO NOT RUN IN PRODUCTION

These MySQL 8 migration drafts describe an additive Customer Master foundation for an isolated, disposable copy of the recovered LTS schema. They have not been run against LTS, staging, or production.

Order:

1. `0001_customer_master_core.up.sql`
2. `0002_customer_links_portal.up.sql`
3. `0003_customer_merge_ledger.up.sql`
4. `0004_optional_legacy_nullable_links.up.sql` only after explicit schema-owner approval

The first three files create new tables only. File 0004 adds nullable lookup columns and indexes to legacy tables; historical rows remain null until a separately approved phased backfill. No migration uses `sync({ alter: true })`, rewrites an existing table, deletes data, or forces a merge.

Rollback files are ordered in reverse. Follow `DRY_RUN.md`; do not point any command at a live endpoint.
