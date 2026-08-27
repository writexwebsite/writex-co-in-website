# Customer Master Review — Workflow and Local Mock Design

## Review queue

The future LTS/Admin page lists one canonical candidate pair per row with status, confidence band, rule/version, masked phones/emails, invoice/project counts, assigned BDEs, relationship dates, unresolved conflicts, and the proposed survivor. Raw phone/email values are not shown by default.

Filters: status, confidence reason, conflict type, BDE, snapshot, age, and reviewer. Sorting defaults to high-confidence/oldest first. Bulk merge is disabled in the first production version.

## Candidate detail

Side-by-side panels show:

- immutable Customer Master references using internal admin-safe labels;
- source lead/customer IDs and provenance;
- masked/verified contact aliases;
- WriteX ID/account state;
- invoices, projects, payments, files, requests, and relationship-event counts;
- manager/BDE history and current ownership;
- explicit agreement/conflict indicators;
- prior `Confirmed Different Customer`, merge, or reversal history.

The reviewer can choose **Confirm Same Customer**, **Confirm Different Customers**, or **Defer Review** with a required reason. Only after a second authorized approval does **Merge** become available. **Reverse Merge** appears only when the stored impact ledger says reversal is safe.

## Mandatory impact preview

```json
{
  "candidateRef": "DUP-MOCK-0001",
  "proposedSurvivorRef": "CM-MOCK-A",
  "counts": {
    "customerRoots": 2,
    "invoices": 5,
    "projects": 4,
    "payments": 7,
    "files": 12,
    "managerHistory": 3,
    "portalAccounts": 1,
    "activeSessionsToRevoke": 2
  },
  "conflicts": ["different_primary_manager"],
  "reversible": true,
  "dryRunOnly": true
}
```

Preview is regenerated immediately before approval and execution. If source versions or counts change, approval becomes stale and the merge is blocked.

## Local mock behavior

The Stage 3B-0 mock uses synthetic customers only. It can:

- normalize identifiers;
- produce deterministic duplicate suggestions with reason codes;
- prove that name-only candidates are never mergeable;
- calculate an impact preview from fixture link counts;
- transition a mock candidate through review statuses in memory;
- return a simulated merge ledger entry without changing Stage 3A fixtures or any database.

It cannot execute SQL, contact LTS, create a real Customer Master, mutate portal accounts, or send notifications.

## Audit events

`duplicate.suggested`, `duplicate.review_started`, `duplicate.confirmed_same`, `duplicate.confirmed_different`, `duplicate.deferred`, `merge.previewed`, `merge.approved`, `merge.executed`, `merge.reversal_previewed`, and `merge.reversed`.

Each event includes actor/role, candidate reference, policy/rule version, source snapshot, correlation ID, reason, before/after status, and safe impact counts. Evidence values are references/hashes, not raw PII.
