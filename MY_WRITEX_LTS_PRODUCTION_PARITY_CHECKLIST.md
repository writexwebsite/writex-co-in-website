# My WriteX ↔ LTS Production-Parity Checklist

Date: 27 August 2026

Current evidence ceiling: **E2 — locally reproduced**

Production parity verdict: **NOT CONFIRMED**

This checklist is read-only. It must never print environment values, connection strings, secrets, raw customer records, file contents, session tokens, or full phone/email values. A check is not complete merely because the recovered source contains a matching name.

## Evidence labels

- **E1 — source observed:** structure found in an approved source/schema artifact.
- **E2 — locally reproduced:** behavior reproduced from approved local/sanitized inputs.
- **E3 — staging verified:** behavior and structure verified in an isolated staging environment.
- **E4 — live verified:** an authorized read-only production observation was recorded.

## Known baseline

| Evidence | Value | Level | Parity conclusion |
|---|---|---|---|
| Recovered local LTS source | `company-recovery-sanitized-20260802` | E1 | Useful structure; not proof of deployment |
| Recovered branch | `recovered-live-worktree-20260802` | E1 | Contains a recovered worktree delta |
| Recovered HEAD | `8a57b8932269637c2b58f760de5f74e4c94a1bdd` | E1 | Production deployment unknown |
| Historical sanitized snapshot commit | `e217f470b8a0d10cd901ec96856125c6fa31a736` | E1 | Tied historically to production commit `5d6993084816f3fef70e10db4756e1de9743906d`, not current parity |
| Local SQL dump label | `Dump20260717` / MySQL 8.0.44 | E1/E2 | Approval and current production parity unconfirmed |

## Authorized read-only verification procedure

Every observation must record approver, operator, UTC time, source environment, safe command/query ID, result hash, and evidence level. Compare hashes/counts and structural metadata—not data rows.

| Gate | Read-only evidence to collect | Safe comparison | Required level | Current status |
|---|---|---|---|---|
| Deployed LTS version | Release manifest, image digest, or Git SHA exposed by an approved admin/health channel | Exact SHA/digest against approved source | E4 | Not observed |
| Schema migration version | Migration ledger version/hash | Exact ordered version list | E4 | Not observed |
| Database engine | `SELECT VERSION()` through approved read-only account | Major/minor/patch and SQL mode | E4 | Local only: 8.0.44 |
| Core table structures | `SHOW CREATE TABLE` or `information_schema.columns` for leads, invoices, invoice payments, assignments, task/delivery/support tables | Column name/type/null/default/order hashes | E4 | E1 local map only |
| Indexes | `information_schema.statistics` | Table/index/uniqueness/ordered-column hashes | E4 | Not observed live |
| Constraints | `information_schema.table_constraints` and key/check usage | Constraint type and column/reference hashes | E4 | Not observed live |
| Auth model | Approved route inventory, session configuration, middleware and cookie policy | Route/method/scope/security-control matrix | E3 then E4 | E1 source only |
| Current API routes | Framework route inventory or approved OpenAPI export | Method/path/version/authorization hashes | E4 | E1 source only |
| BDE ownership | Schema plus owner-approved semantics for lead `assignedTo`, lead `createdBy`, and invoice `createdBy` | Explicit precedence/history contract | E3/E4 | Ambiguous; unresolved |
| Invoice/customer relationship | FK metadata plus orphan aggregate counts | Parent coverage and mismatch rates | E3/E4 | E2 local: unreliable rows exist |
| Project/invoice relationship | FK metadata plus orphan aggregate counts | Parent coverage and mismatch rates | E3/E4 | E2 local: unreliable rows exist |
| Phone/email formats | Aggregate-only validity/normalization profile | Null/valid/duplicate/format rates; no values | E3/E4 | E2 local only |
| File/storage references | Schema, bucket identifier aliases, key-prefix patterns and access policy IDs | No object contents; no signed URLs | E3/E4 | Not observed live |

## Safe command/query constraints

1. Use a separately approved read-only identity with no DDL/DML, file, process, replication, or administrative grants.
2. Run from an approved host and change window; no shell history containing secrets.
3. Select only metadata and aggregate counts. Never select names, emails, phone numbers, requirement text, file keys, hashes of passwords/tokens, or raw JSON payloads.
4. Cap execution time and rows. Stop on any query-plan risk, replica lag, unexpected hostname, or permission mismatch.
5. Store only sanitized evidence hashes/counts in the parity report.
6. E4 must be independently reviewed by the LTS schema owner and security owner.

## Required parity output

The future signed parity record must include:

- deployed version/digest and approved source commit;
- per-table structure/index/constraint hashes;
- migration ledger and engine/SQL-mode evidence;
- route/auth/scope matrix;
- ownership and relationship semantics;
- aggregate drift against the new sanitized snapshot;
- all exceptions, owners, expiry dates, and an explicit GO/NO-GO decision.

Until that record exists, **production parity is NOT CONFIRMED** and no real adapter may be enabled.
