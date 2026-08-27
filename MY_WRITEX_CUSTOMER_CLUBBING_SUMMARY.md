# My WriteX Customer Clubbing Readiness Audit

## Decision

The local snapshot is sufficient to design matching and review controls, but it is not safe to perform real merges. The audit is **GO for readiness design** and **NO-GO for production clubbing** until current-live parity, phone-country rules, verified-email provenance, ownership semantics, and a supervised dry run are established.

## Evidence and scope

- **E1:** recovered sanitized LTS backend source and SQL schema were inspected read-only.
- **E2:** aggregate analysis was locally reproduced from `C:\Users\Writex\Downloads\Dump20260717.zip` without extracting it, modifying it, or emitting raw row data.
- Snapshot label: `Dump20260717`; MySQL dump metadata reports MySQL 8.0.44 and database `writex_lts`.
- Parsed rows: 201,444 leads, 16,894 invoices, and 17,622 assignments.
- Audit population: non-deleted `leads` with `leadStage >= 5`; non-deleted invoices and assignments.
- No E3 staging or E4 live verification was performed. The snapshot’s approval status and current-live parity are not documented, so the findings must not be treated as present-day production totals.

## Headline findings

| Check | Count | Interpretation |
|---|---:|---|
| Potential customer records | 6,738 | LTS represents customer state on lead rows, not a permanent Customer Master. |
| Unique normalized phones | 6,675 | Phone is the strongest available identity signal, but normalization needs approved country rules. |
| Unique valid emails | 284 | Email coverage is too low to be the primary key; verification status is not present. |
| Duplicate exact-phone groups | 60 | High-confidence suggestions only; never silent merges. |
| Duplicate exact-email groups | 4 | Medium/high only after verified-email provenance is established. |
| Same-name/different-phone groups | 398 | Strong evidence that name-only matching would be unsafe. |
| Customers with multiple invoices | 3,307 | A permanent one-to-many Customer Master relationship is required. |
| Unreliable invoice ownership | 156 / 16,229 | Includes 13 orphan lead IDs, 6 non-customer lead stages, and 137 phone mismatches. |
| Unreliable assignment mapping | 1,451 / 17,478 | 1,412 assignments have missing lead ID and missing invoice ID; reason counts can overlap. |
| Invalid customer phones | 2 | Basic 8–15 digit check only; no carrier/reachability validation. |
| Country-code representation groups | 33 | Canonical phone storage plus original-value provenance is necessary. |
| BDE ownership inconsistency groups | 44 | `assignedTo`, lead creator, and invoice creator semantics need business confirmation. |

## Normalization used

Phone values were trimmed to digits; a leading `00` was removed; a supplied dial code was applied conservatively to local-length numbers; only 8–15 digit results were accepted. Email values were trimmed and lowercased, then checked for a basic `local@domain.tld` structure. Names were Unicode-normalized, lowercased, punctuation-collapsed, and used only to measure risk—never as an automatic merge key.

The CSV contains counts, denominators, evidence labels, methods, and short one-way SHA-256 group labels. Those labels cannot reveal the original name, phone, or email and are not stable identifiers for production workflows.

## Data-quality risks

1. Customer identity is mutable lead state. A lead can change stage and customer details are duplicated into invoices.
2. `leads.whatsappNumber` is required but uniqueness and canonical country handling are not enforced by the observed schema.
3. Invoice ownership uses `leadId`, but invoices also repeat customer name and phone, allowing divergence.
4. Assignment ownership is split across `assignment.leadId` and `assignment.invoiceId`; many historical rows lack both.
5. The source has one lead email and one WhatsApp number, so aliases and history cannot be represented reliably.
6. BDE ownership may mean `assignedTo`, creator, or invoice creator depending on workflow. The 44 flagged groups are review candidates, not proof of an error.

## Required gates before real clubbing

- Obtain a freshly approved sanitized snapshot and reconcile all row counts against a controlled read-only production query.
- Confirm `leadStage` semantics and the authoritative BDE/manager ownership rule with LTS owners.
- Approve country-aware phone normalization and verified-email provenance.
- Generate suggestions only; manually adjudicate exact-phone groups first.
- Produce an impact preview for invoices, assignments, payments, task files, BDE history, and portal access.
- Backfill links additively, reconcile counts, retain every original ID, and test reversal in an isolated database.

Production modified: **NO**. LTS modified: **NO**. Production data modified: **NO**.
