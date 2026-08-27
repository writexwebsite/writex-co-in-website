# My WriteX Synthetic Merge and Reversal Proof

Date: 27 August 2026

Result: **MERGE PASS / REVERSE MERGE PASS**

Evidence: **E2 — MySQL 8.0.44, disposable database, synthetic cases only**

No production record was inspected, created, linked, merged, or reversed.

## Cases

| Case | Evidence | Expected treatment | Proof |
|---|---|---|---|
| A | Exact phone duplicate | High-confidence suggestion; reviewed merge | Candidate and merge/reversal ledger created |
| B | Exact email duplicate | High-confidence suggestion; human review | Suggestion retained; no silent merge |
| C | Same name, different phone | Low confidence; confirm different unless independent evidence | `confirmed_different_customer`; no merge history |
| D | Multiple phones, one known customer | Medium-confidence alias/history review | Suggestion only |
| E | One invoice wrongly mapped | Ownership conflict; human reconciliation | Under-review candidate with ownership conflict |
| F | Two BDE owners | Manager conflict; preserve history | Under-review candidate with manager conflict |
| G | Reverse Case A | Restore absorbed master and links; append reversal | Reversal ledger points to prior merge event |

## Merge assertions

All passed:

- name-only candidate did not merge;
- survivor Customer Master ID remained active and unchanged;
- absorbed Customer Master was marked `merged` with `merged_into` pointing to the survivor;
- invoice and project links moved to the survivor;
- payment remained attached to the same invoice-link ID;
- file remained attached to the same project-link ID;
- manager-history row was preserved while ownership moved;
- append-only `merge_executed` ledger recorded before/after impacts and expected/actual counts;
- six candidate scenarios were present.

## Reverse assertions

All passed:

- absorbed Customer Master returned to active with no `merged_into` value;
- invoice, project, and manager-history ownership returned to the absorbed master;
- payment and file link IDs remained intact;
- candidate status became `merge_reversed`;
- append-only reversal ledger referenced the original merge event.

## Limitation

This proves controlled relationship movement and reversal against synthetic proof tables and the draft ledger. It does not prove that current production task, payment, file, or manager tables match the recovered source. Production parity, a fresh approved sanitized snapshot, data-owner review, and staging proof remain mandatory.
