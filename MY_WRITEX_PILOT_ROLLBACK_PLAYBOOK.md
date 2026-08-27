# My WriteX Pilot Failure and Rollback Playbook

Status: **READY FOR REVIEW — no pilot or production action executed**

## Universal first response

1. Set the global My WriteX availability flag false and keep LTS/customer-master/real-request/production-auth flags false.
2. Stop new sessions and revoke affected/all pilot sessions according to severity.
3. Restore invoice-only access where its existing verified path is safe; do not widen customer scope.
4. Preserve immutable audit evidence, safe correlation IDs, build/schema/snapshot hashes, counts, and timestamps.
5. Assign incident, data, technical, security, and customer-support owners.
6. Do not silently edit/merge production data or send customer communications without approval.

## Scenario actions

| Scenario | Immediate containment | Recovery proof before re-enable |
|---|---|---|
| Wrong customer history | Disable globally; revoke affected/all sessions; hide customer-wide history | Data-owner reconciliation, corrected mapping on staging, Customer A/B/IDOR rerun |
| Duplicate customer mapping | Disable affected Customer Masters; freeze merge/review actions | Reviewed Same/Different decision, link counts, ledger/reversal proof |
| Incorrect BDE | Stop manager routing and outbound contact; retain history | Data-owner current-manager decision and queue reconciliation |
| Auth failure | Hold activation; keep invoice-only fallback; inspect rate/session/provider evidence | Generic failures, valid login, expiry/rotation/revocation tests pass |
| Cross-customer exposure | Global emergency disable; revoke all pilot sessions; security incident process | Root cause, full authorization matrix, independent security approval; no partial bypass |
| Migration issue | Stop app/integration; preserve database snapshot and migration logs | Approved rollback/compensating action; counts/checksums/orphans reconciled; reapply on staging |
| Request creation failure | Disable real requests; preserve idempotency/audit evidence | Single-create/replay/conflict/concurrency tests and manager-queue reconciliation |
| My WriteX unavailable | Disable feature, publish approved support status, use invoice-only access where safe | Health, dependency, latency, capacity, session, and rollback checks pass |
| Staging parity mismatch | Stop gate; do not promote/build production adapter | E4 evidence reconciled or exception formally accepted by all owners |

## Migration rollback rule

Use destructive down migrations only on verified disposable staging. For any future production incident, use the approved forward/compensating procedure that preserves Customer Masters, merge/reversal ledgers, identifiers, and audit evidence unless a separately reviewed recovery plan says otherwise.

## Customer support escalation

Support receives only the approved public incident reference, affected safe customer reference, symptoms, permitted workaround, and next update time. Do not disclose another customer’s existence, data-quality reason, internal ID, raw phone/email, logs, or merge evidence. Only the named communications owner may contact pilot customers.

## Re-enable gate

Re-enable only after containment is verified, source and staging data reconcile, critical E3 cases pass, root cause and corrective action are reviewed, rollback is still available, and product/data/schema/security/support owners sign the decision. Expansion remains paused until a separate wave approval.
