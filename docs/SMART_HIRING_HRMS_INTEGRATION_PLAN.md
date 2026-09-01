# Smart Hiring HRMS Integration Plan

## Status

**Planning boundary only. HRMS is not connected or modified by this release.**

Smart Hiring owns candidate applications, consent, assessment evidence, human reviews, interviews, final hiring decisions, and the audited hand-off intent. The future HRMS remains the employee-system authority after an approved candidate becomes a real employee.

## Provider Boundary

The existing `HiringHrmsProvider` interface in `lib/hiring/providers.ts` is the only approved integration boundary. Its unavailable implementation must continue to fail safely until Founder-approved credentials, contracts, field mappings, security review, and production UAT exist.

Required provider operations:

- create an employee from a selected and fully approved candidate;
- update an already linked employee without creating duplicates;
- read sync status using a stable candidate/employee correlation reference;
- retry an idempotent failed transfer;
- deactivate only through an explicitly authorised employee lifecycle action.

## Identity and Access Contract

- Smart Hiring access grants attach to an existing Website Admin identity.
- A hiring grant never creates an employee, password, global Admin role, or HRMS identity.
- Candidate identity remains separate from employee identity until the governed join gate.
- Future HRMS correlation uses opaque internal references, not plaintext credentials.
- Grant/revoke remains owned by Website Admin Super Admin and is checked live for every Hiring page, API, file preview, and export.

## Transfer Gate

No provider call may create an employee unless all of the following are true:

1. final human decision is Selected;
2. required identity, education, and background verification gates are approved;
3. joining is explicitly confirmed;
4. department, designation, manager, work arrangement, and official contact mappings are complete;
5. duplicate employee lookup is clear;
6. the authorised Admin confirms the exact transfer;
7. an idempotency key and audit correlation ID are recorded.

## Data Minimisation

Only approved employee-onboarding fields may cross the provider boundary. Assessment answers, integrity signals, Sales video files, reviewer notes, rejected-candidate data, and unrelated candidate files must not be transferred to HRMS.

## Failure and Recovery

- Provider timeout or error leaves the candidate record intact and reports `sync_failed` or `manual_review`.
- No UI may claim an employee was created until the provider returns and the stable employee reference is persisted.
- Retries reuse the same idempotency identity.
- Partial or conflicting provider responses require manual review; they never create a second employee.
- Every request and result is audited without secrets or raw candidate documents.

## Activation Checklist

- Founder approval for the selected HRMS provider and budget;
- legal/privacy review and data-processing agreement;
- credential storage and rotation plan;
- field mapping and enum reconciliation;
- sandbox contract tests, replay/idempotency tests, and failure injection;
- least-privilege provider service account;
- production backup and rollback plan;
- controlled real-human UAT with no duplicate identity creation;
- monitoring, alert ownership, retention, and incident runbook.

Until every item is approved, `UnavailableHiringHrmsProvider` remains the truthful production implementation.
