# My WriteX Pilot Plan

Status: **DESIGN READY — no actual customers selected or contacted**

Target: **10–25 reviewed Cohort A customers**, selected only after Founder UAT, E3 staging, E4 parity, data-owner/security/schema approval, and a production change authorization.

## Selection criteria

Every pilot customer must have:

- a valid, freshly reconfirmed normalized registered phone;
- one unambiguous Customer Master mapping and no unresolved duplicate candidate;
- a known current BDE/relationship manager with preserved history;
- at least three reliable historical invoices or projects, with the complete displayed history reconciled;
- recent approved activity within the data-owner-defined window;
- no unresolved orphan, ownership mismatch, country-code ambiguity, access restriction, consent/retention issue, or test/internal classification;
- an approved public WriteX ID reservation and support owner;
- a rollback mapping that restores invoice-only access without losing audit evidence.

Selection must deliberately include a small spread of project volumes and device types while keeping identity/ownership quality uniformly high. Do not choose actual records until a named data owner signs the candidate list.

## Exclusion criteria

Exclude any duplicate/review candidate, missing/invalid phone, disputed payment/refund, active complaint, sensitive account recovery, unclear manager ownership, incomplete history, active migration exception, unsupported country/phone pattern, notification-safety concern, or customer requiring a high-risk account change during the pilot.

## Operating model

| Responsibility | Named role before launch |
|---|---|
| Pilot owner and stop authority | Founder/product owner |
| Customer/data correctness | Data owner |
| Customer support | Named BDE plus backup |
| Technical monitoring | My WriteX on-call owner |
| LTS/schema safety | LTS schema owner |
| Security and incident response | Security owner |

No automated outbound campaign is permitted. Contact scripts, consent basis, channel, time window, and support escalation require separate approval.

## Daily monitoring

1. Reconcile activated accounts, login attempts, visible projects/invoices/documents, requests, and manager mappings.
2. Review authorization denials, error classes, latency, session revocations, idempotency conflicts, and support contacts using safe identifiers only.
3. Sample every newly activated customer’s history against the approved source before and after first login.
4. Hold a daily go/hold/rollback decision with product, data, support, and technical owners.
5. Do not enlarge the cohort automatically; require a signed wave decision.

## Success metrics

| Metric | Pilot target |
|---|---|
| Successful login | ≥95% of invited customers without manual identity correction |
| Correct project/invoice/document history | 100% of checked records |
| Cross-customer exposure | 0; any event triggers immediate global disable |
| New requirement submission | Function works for every consenting tester who attempts it |
| Similar-work submission | Correct safe prefill; no stale deadline/payment/private brief |
| Manager handoff | 100% routed to the approved current owner |
| Support request flow | Request recorded once, visible to the correct owner, no external send unless separately approved |
| Unhandled error rate | <1% of pilot requests; no repeated critical error class |
| User confusion rate | <10% require support for basic login/navigation |
| Repeat-use intent | ≥70% answer yes/maybe in the approved pilot review |

## Rollback criteria

Immediately stop and follow `MY_WRITEX_PILOT_ROLLBACK_PLAYBOOK.md` for any cross-customer exposure, wrong history, duplicate mapping, unauthorized login, incorrect manager affecting support, migration/count mismatch, non-idempotent request, production dependency leakage, notification escape, or two repeated critical failures without an understood safe workaround.

Lower-severity usability issues pause expansion; they do not justify silently changing data or widening permissions.
