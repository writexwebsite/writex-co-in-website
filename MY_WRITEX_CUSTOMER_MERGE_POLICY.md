# Customer Merge Policy

Status: **DESIGN ONLY — NO REAL MERGES AUTHORIZED**

## Confidence model

| Level | Evidence | System action |
|---|---|---|
| High | Exact normalized phone; exact verified email; existing trusted customer reference | Create **Suggested Duplicate** only. Never silently merge. |
| Medium | Phone alias/history; verified email plus compatible name/context; repeated invoice/contact evidence | Queue for authorized review with conflicts visible. |
| Low | Name only; spelling similarity; same university/course; unverified contextual coincidence | Never auto-merge; normally suppress or show only as low-confidence research aid. |

Negative/conflicting evidence—different verified phones, contradictory verified emails, incompatible relationship dates, explicit “different customer” decision, or separate portal accounts—reduces confidence and can block a merge.

## Statuses

`Suggested Duplicate` → `Under Review` → `Confirmed Same Customer` or `Confirmed Different Customer` → `Merged`; a safe compensating operation can produce `Merge Reversed`.

Every transition is append-only and records actor, role, reason, evidence version, source snapshot, correlation ID, previous status, and timestamp. `Confirmed Different Customer` creates a suppression rule so the same weak pair is not repeatedly suggested without new evidence.

## Authorization

- First production version: every merge requires a trained reviewer and a second authorized approver.
- Reviewer cannot approve their own merge proposal.
- High-risk conflicts, portal-account collision, financial disagreement, legal hold, or active dispute require Super Admin/data-steward escalation.
- Name-only and low-confidence matches can never reach `Confirmed Same Customer` without new stronger evidence.

## Merge invariants

1. Choose a survivor Customer Master using completeness, verified identifiers, account activity, legal/finance holds, and relationship history—not smallest ID alone.
2. Preserve every original lead/customer/source ID and source row; no source row is deleted.
3. Re-link through additive link/alias records for invoices, projects, payments, files, BDE history, requests, and portal accounts.
4. Never alter invoice/payment facts or document contents during identity merge.
5. Detect conflicts before execution: two active WriteX IDs, incompatible verified phones/emails, duplicate active sessions, different finance restrictions, or contradictory managers.
6. Store pre-merge and post-merge impact snapshots plus row counts and checksums.
7. Reconcile expected and actual links in one controlled transaction; fail closed on any mismatch.
8. Revoke/rotate affected sessions when portal-account ownership changes; do not broaden an invoice-scoped session.

## Reversal plan

Reversal is a new ledger event, never deletion of the merge record. It restores link ownership from the pre-merge snapshot, reactivates the absorbed root where safe, rebuilds primary identifier/account selection, revokes sessions, and reconciles counts. Reversal is blocked for manual investigation if downstream records were created after merge and cannot be attributed unambiguously.

## Suggestion algorithm guardrails

- Exact normalized phone: high-confidence candidate, auto-suggest only.
- Exact verified email: high-confidence candidate; unverified exact email is medium.
- Name is a corroborating feature only and has zero authority to auto-merge.
- Deterministic rule/version and evidence features are stored; no opaque score alone authorizes a merge.
- Pair ordering is canonical so the same candidate is idempotent.
- Suggestions operate on an approved snapshot and cannot write to live customer ownership.

Production merge logic is intentionally not implemented in Stage 3B-0.
