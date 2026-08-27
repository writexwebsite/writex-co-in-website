# My WriteX Data-Owner Review Pack

## The decision in plain language

My WriteX needs one dependable customer record that brings together the same person’s invoices, projects, files, manager history, and portal account. Today, older LTS records can represent the same customer more than once or contain incomplete links. The proposed **Customer Master** is the stable internal record used to keep that history together.

A **WriteX ID** is the readable login name shown to the customer. It is an alias, not the ownership key. The future login remains **WriteX ID + Registered Phone**. There is no OTP or password in this design, so high-risk account, payment, refund, phone, and identity changes must not rely on this lightweight login alone.

## How customer clubbing works

The system may suggest that two historical records could belong to the same customer when strong evidence matches, such as the same normalized phone or verified email. Suggestions do not change data.

The system never auto-merges:

- name-only matches;
- low/medium-confidence matches;
- conflicting phone, ownership, project, invoice, or BDE evidence;
- any real customer record without an authorized reviewer and audited decision.

Human review outcomes are **Same Customer**, **Different Customer**, **Defer**, or **Not Eligible**. Reviewers see masked evidence and impact counts, not unnecessary PII.

## What happens during a reviewed merge

One Customer Master remains the survivor. The other is marked as absorbed; it is not silently deleted. Approved invoice/project links move to the survivor while payment/file link identities and manager history remain preserved. An append-only ledger records who approved the change, the evidence, counts, and before/after ownership.

A designed reversal restores the absorbed record and the moved ownership links while retaining both the original merge and reversal evidence. Reversal is not the same as erasing the audit trail.

Old WriteX IDs move into alias/retired history and are quarantined from reassignment. They never become database ownership keys.

## Current local estimates

| Decision group | Count | Meaning |
|---|---:|---|
| Eligible | 4,979 | Valid phone, reliable relationship, no hard conflict under E2 local evidence |
| Review Required | 336 | Contactable/reliably linked but a conflict needs a human decision |
| Not Eligible | 1,423 | No valid phone or no reliable invoice/project relationship |

The 336 Review Required records may involve exact-phone/email duplicates, conflicting lead/invoice/project ownership, ambiguous phone representations, assignment conflicts, or multiple-BDE evidence. Categories overlap; the final eligibility count is unique and reconciled.

The 1,423 Not Eligible records cannot safely support the planned login/history under current evidence. They may become review candidates after source correction, but never move silently to Eligible. Test/internal status, current retention/consent, restrictions, and production parity are still unknown and can reduce the eventual eligible population.

## Decisions requested from data owners

1. Approve the authoritative customer-ownership and current-BDE rules.
2. Approve the eligibility, Review Required, and Not Eligible definitions.
3. Nominate reviewers and the evidence they may use.
4. Approve which fields are safe for suggestions and which require escalation.
5. Approve merge/reversal authority, separation of duties, and audit retention.
6. Approve WriteX ID reservation/retirement rules and customer communication.
7. Accept remediation thresholds on a fresh approved snapshot.

No real integration, merge, Customer Master creation, login activation, or customer contact should begin until these decisions and the remaining technical/security gates are signed.
