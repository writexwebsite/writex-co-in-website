# My WriteX Disposable Migration Proof

Date: 27 August 2026

Result: **APPLY PASS / ROLLBACK PASS / REAPPLY PASS**

Evidence: **E2 — locally reproduced with synthetic data only**

## Safety boundary

- Engine: MySQL Community Server 8.0.44 no-install local runtime.
- Binding: `127.0.0.1:43306`; production/default port 3306 was unused.
- Database: exact disposable name `my_writex_stage3b1_proof`.
- Source data: three synthetic leads, invoices, and assignments only.
- Script safety: refuses non-loopback hosts, ports outside 40000–49999, or a MySQL client outside the workspace `.local` directory.
- The proof database was dropped after the run and the temporary server shut down normally.
- No service installation, production connection, production credential, staging mutation, or notification occurred.

## Proof sequence and reconciliation

| Phase | Result | Runtime | Key evidence |
|---|---|---:|---|
| Before | Baseline | — | Leads 3, invoices 3, assignments 3 |
| Apply 0001–0004 | PASS | 2,087 ms | 15 Customer Master tables; 3 optional nullable legacy columns |
| Rollback 0004–0001 | PASS | 1,290 ms | 0 Customer Master tables; 0 optional columns; legacy 3/3/3 unchanged |
| Reapply 0001–0004 | PASS | 1,733 ms | 15 Customer Master tables; 3 optional columns; legacy 3/3/3 unchanged |

Total successful proof runtime, including merge/reversal cases and cleanup: 10,406 ms.

## Apply checks

- 53 distinct indexes and 74 table constraints observed across the 15 new tables.
- Customer/invoice link orphan count: 0.
- Customer/project link orphan count: 0.
- Portal account insert: 1.
- Manager-history insert: 1.
- Case-insensitive duplicate WriteX ID insert: rejected as expected.
- Invalid invoice session carrying customer ownership: rejected by the scope check as expected.
- Synthetic Customer Master, identifier, encrypted/HMAC placeholder phone/email, alias, invoice link, project link, manager history, portal account, customer/invoice sessions, login event, preferences, relationship event, and nullable legacy backfill all succeeded.

## Issues found

The first harness-development execution exposed an incorrect synthetic session column list; the fixture was corrected before accepting evidence. One subsequent preliminary run produced an inconsistent first baseline count during rapid proof-database recreation; the runner was hardened to read all legacy counts atomically in one query. The final repeated run passed end to end. No migration DDL defect was observed in the accepted proof.

This proves the drafts against an empty/synthetic MySQL 8.0.44 shape—not against an approved sanitized LTS clone. A fresh approved snapshot dry run and schema-owner review remain mandatory before real integration.

## Reproduction

`scripts/prove-my-writex-disposable.mjs` performs the exact proof and always attempts to drop only `my_writex_stage3b1_proof` on exit. It requires a separately started workspace-local MySQL server on the approved high port. The ignored evidence file is `.local/mysql-proof/proof-results.json`.
