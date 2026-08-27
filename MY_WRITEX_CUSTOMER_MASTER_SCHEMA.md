# My WriteX Customer Master Schema Proposal

Status: **DRAFT — DESIGN ONLY — DO NOT RUN IN PRODUCTION**

## Identity principle

`customer_masters.id` is the immutable ownership key. It is a non-guessable UUID generated inside the trusted service and never displayed to customers. WriteX ID, phone, email, historical lead ID, invoice ID, and public project references are identifiers or links—not ownership keys.

```text
customer_masters (immutable root)
  ├─ customer_identifiers (WriteX ID and source references)
  ├─ customer_phones / customer_emails / customer_aliases
  ├─ customer_invoice_links / customer_project_links
  ├─ customer_manager_history
  ├─ customer_portal_accounts ─ customer_sessions / customer_login_events
  ├─ customer_preferences / customer_relationship_events
  └─ customer_merge_history (survivor + absorbed roots + reversible ledger)
```

## Proposed entities

| Entity | Purpose | Minimum fields / controls |
|---|---|---|
| `customer_masters` | Immutable customer root | `id uuid PK`; `preferred_name`; `status`; `relationship_started_on`; `primary_manager_source_user_id`; `source_system`; `source_provenance json`; `created_at`; `updated_at`; no public sequential identifier |
| `customer_identifiers` | Typed identifiers and WriteX ID history | `id`; `customer_master_id`; `identifier_type`; encrypted/original value where required; `normalized_value_hash`; `display_value`; `status`; `valid_from/to`; `is_primary`; provenance; case-insensitive uniqueness for active WriteX IDs |
| `customer_phones` | Multiple phone aliases | encrypted E.164 value; keyed hash for equality; masked display; country; label; verified state/time/source; primary flag; validity interval; uniqueness policy scoped to active non-shared phones |
| `customer_emails` | Multiple email aliases | encrypted value; keyed normalized hash; masked display; verified state/time/source; primary flag; validity interval |
| `customer_aliases` | Historical names/spellings | encrypted/display-safe value; normalized hash; alias type; valid interval; source; never unique |
| `customer_invoice_links` | Customer→invoice ownership | `customer_master_id`; source system; source invoice ID; public invoice reference; link status; confidence; evidence; linked/reviewed timestamps; unique source invoice link |
| `customer_project_links` | Customer→assignment/project ownership | source project ID; public project reference; optional invoice link; status; provenance; unique source project link |
| `customer_manager_history` | BDE/manager timeline | source user ID; role; valid from/to; assignment reason; source; changed by; no destructive overwrite |
| `customer_merge_history` | Review and reversible merge ledger | event ID; survivor/absorbed IDs; status; reason; confidence; evidence snapshot; impact snapshot; actor; approved/executed/reversed timestamps; reversal reference |
| `customer_portal_accounts` | Customer-facing access account | customer root; status; login policy version; active WriteX identifier link; lock/cooldown state; session epoch; timestamps |
| `customer_login_events` | Security telemetry | account; generic result/reason code; IP/device hashes; correlation ID; occurred/retention timestamps; never raw credentials |
| `customer_sessions` | Revocable customer sessions | opaque token hash; account/customer IDs; auth scope; issued/idle/absolute expiry; revoked data; device/IP risk hashes |
| `customer_preferences` | Non-identity preferences | locale, timezone, communication and accessibility preferences; version/audit fields |
| `customer_relationship_events` | Append-only customer timeline | typed event; public/source references; safe summary; occurred time; source; actor; visibility classification |

## Required constraints

- UUID primary keys generated server-side; foreign keys always target immutable internal IDs.
- Active normalized WriteX ID uniqueness is case-insensitive.
- One active primary WriteX ID, phone, email, and portal account per customer where applicable.
- Source invoice/project links are unique by `(source_system, source_record_id)`.
- Hashes used for equality are keyed HMACs with rotatable key version, not unsalted public hashes.
- Sensitive originals are encrypted at rest and never written to logs or audit metadata.
- Append-only history for identifier changes, manager changes, merge decisions, and relationship events.
- `merged_into_customer_master_id` can only be set through an authorized merge workflow and cannot form cycles.
- Deletion is lifecycle/status based; legal deletion/anonymization must preserve non-PII financial/audit integrity.

## Lifecycle

1. Create a Customer Master without merging any historical records.
2. Attach source lead identifiers and one primary contact through a reviewed/provenance-backed link.
3. Link invoices/projects additively; legacy fields stay readable during dual-read.
4. Create the portal account and WriteX ID only after identity review.
5. Record every alias, manager change, and relationship event without overwriting history.
6. Merge only after impact preview and authorization; preserve absorbed IDs and allow a controlled reversal plan.

## Compatibility

Legacy invoice login remains invoice scoped. A customer-scoped session targets the Customer Master; invoice-scoped sessions never gain customer-wide traversal. Backfill is phased and nullable, and unlinked historical records remain operational under legacy paths until reviewed.
