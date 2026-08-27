# My WriteX Rollout Cohort Strategy

Date: 27 August 2026

Evidence: **E2 local aggregate analysis of `Dump20260717.zip`; production parity is not asserted.**

No customer was selected, contacted, assigned a WriteX ID, merged, or activated.

## Estimated cohorts

| Cohort | Segment | Estimated count | Share | Current treatment |
|---|---|---:|---:|---|
| A | Clean repeat customers | 3,348 | 67.24% of eligible; 49.69% of assessed | Priority pool for future reviewed pilot selection |
| B | Clean single/low-volume customers | 1,631 | 32.76% of eligible; 24.21% of assessed | Later-wave pool after pilot proof |
| C | Review Required | 336 | 4.99% of assessed | Human review; excluded from pilot/activation |
| D | Not Eligible | 1,423 | 21.12% of assessed | Excluded until source correction and fresh review |
| Total | Assessed customer-stage leads | 6,738 | 100.00% | Reconciles exactly |

Cohorts A and B reconcile exactly to the 4,979 Eligible estimate.

## Cohort rules

### Cohort A — Clean repeat customers

All Stage 3B-1 eligibility rules pass, a current owner can be derived from the reviewed lead evidence, and the customer has at least two reliable invoice or assignment/project relationships. The record has no unresolved duplicate, ownership, phone-format, assignment, or BDE conflict.

This is a provisional priority pool, not a launch list. The local evidence does not establish current production parity or a trustworthy recency cutoff. A fresh approved snapshot must reconfirm recent activity, BDE, contact validity, disputes, retention/consent, and complete history.

### Cohort B — Clean single or low-volume customers

All Stage 3B-1 eligibility rules pass, but the local evidence shows only single/low-volume reliable relationships or does not confirm a current owner. These customers remain eligible in principle but are not the default first-pilot population.

### Cohort C — Review Required

The 336 records are contactable and reliably linked but have an identity, ownership, phone-format, assignment, or manager conflict. They require an authorized business/data-owner decision. No name-only or low-confidence match may produce a merge.

### Cohort D — Not Eligible

The 1,423 records lack a valid normalized phone or a reliable invoice/project relationship under current evidence. Known test/internal status, consent, retention, restriction, and live-status checks can only increase this excluded population until resolved.

## Rollout sequence

1. **Founder UAT:** local fixtures only.
2. **E3 staging:** synthetic plus approved sanitized cases; no real account activation.
3. **Pilot selection review:** select 10–25 from refreshed Cohort A only after all gates and approvals pass.
4. **Pilot:** reversible, closely monitored, no automatic expansion.
5. **Cohort A waves:** small batches with daily reconciliation and stop authority.
6. **Cohort B:** only after Cohort A performance and support evidence are accepted.
7. **Cohorts C/D:** never enter rollout without their required review/correction and a new eligibility decision.

## Quality limits

- Counts are estimates, not activation commitments.
- Repeat volume is measurable E2 evidence; recent activity is deliberately not claimed.
- Production parity, fresh snapshot approval, data-owner acceptance, E3 proof, and security/schema approvals remain mandatory.
- A segment assignment never authorizes a merge, login, notification, Customer Master write, or production change.
