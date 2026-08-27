# My WriteX Customer Master Eligibility

Evidence: **E2 local aggregate analysis** of `Dump20260717.zip`; production parity is not asserted.

Grain: 6,738 non-deleted lead rows at customer stages 5 or higher.

Use: planning only—no production Customer Masters or WriteX IDs were created.

## Eligibility result

| Status | Count | Share | Meaning |
|---|---:|---:|---|
| Eligible | 4,979 | 73.89% | Valid normalized phone, at least one reliable invoice/project relationship, no hard identity/ownership/manager conflict |
| Review Required | 336 | 4.99% | Contactable and reliably linked, but identity, ownership, phone-format, assignment, or manager evidence conflicts |
| Not Eligible | 1,423 | 21.12% | No valid normalized phone or no reliable invoice/project relationship |
| Total | 6,738 | 100.00% | Reconciles exactly to the assessed customer-stage lead grain |

These are estimates, not activation counts. The snapshot does not provide a trustworthy test/internal-record flag, consent/retention decision, live status, or production parity. Those filters can only reduce the eventual eligible population.

## Eligible

All conditions are mandatory:

1. A valid canonical international phone can be derived without guessing the country.
2. At least one invoice or assignment/project has a structurally reliable relationship to the customer-stage lead.
3. The lead is not involved in an exact-phone or exact-email duplicate requiring review.
4. No invoice-contact ownership mismatch or assignment parent conflict is attached to the lead.
5. No unresolved multi-BDE/current-manager conflict exists.
6. The record is not known test, internal, deleted, restricted, or outside the approved retention/portal population.

Eligibility permits only staged Customer Master preparation after approvals. It does not automatically create a portal account, activate login, assign a WriteX ID, or merge records.

## Review Required

Any one of these conditions routes an otherwise contactable/reliably linked candidate to human review:

- exact normalized-phone duplicate;
- exact verified-email duplicate;
- multiple historical customer records with independent evidence;
- invoice/customer contact mismatch;
- assignment lead/invoice conflict;
- ambiguous country-code representation;
- multiple BDE/current-manager evidence;
- other identity conflict raised by a data steward.

Review outcomes are `Confirmed Same Customer`, `Confirmed Different Customer`, `Deferred`, or `Not Eligible`. No review outcome may be inferred from a name match alone.

## Not Eligible

- missing or invalid contact identity;
- no reliable invoice/project relationship;
- orphan/incomplete record without approved ownership evidence;
- known test/internal record;
- deleted/restricted/out-of-retention record;
- record whose lawful/approved portal use has not been established.

Correction may move a record to Review Required; it must not silently move directly to Eligible.

## Quality interpretation

- **High severity:** 1,423 records cannot support the approved phone-based login under the current local evidence.
- **High confidence:** the partition reconciles exactly and uses explicit structural/contact rules.
- **Main analytical limitation:** source approval and production parity are unknown; eligibility is likely to change on a fresh approved snapshot.
- **Automated tests:** partition reconciliation, phone validity, reliable-link existence, duplicate participation, ownership conflicts, and excluded-status checks should be deterministic release gates.
