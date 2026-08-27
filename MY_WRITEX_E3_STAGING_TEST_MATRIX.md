# My WriteX E3 Staging Verification Matrix

Status: **MATRIX READY — E3 execution not yet run**

Each case requires an approved sanitized snapshot, isolated staging, safe correlation ID, operator, timestamp, build/schema/snapshot hashes, PASS/FAIL evidence, and linked defect/exception. Any critical authorization or reconciliation failure is a NO-GO.

| ID | Area | Test | Expected result | Evidence | Gate |
|---|---|---|---|---|---|
| AUTH-01 | Auth | WriteX ID + registered phone | Exact normalized match creates customer-scoped session; response is generic | HTTP trace + safe audit event | Critical |
| AUTH-02 | Auth | Invoice + registered phone | Creates invoice-only session for one invoice/project | HTTP trace + scope assertion | Critical |
| AUTH-03 | Auth | Unknown ID, wrong phone, malformed input | Same status/body/timing class; no enumeration clue | Response comparison | Critical |
| AUTH-04 | Auth | Rate-limit and lock behaviour | Threshold, cooldown, persistent/distributed controls, and metrics work | Attempt timeline + safe metrics | Critical |
| AUTH-05 | Auth | Idle and absolute session expiry | Expired token fails; absolute lifetime cannot be extended | Clock-boundary trace | Critical |
| AUTH-06 | Auth | Rotation, logout, logout-all | Old/revoked tokens fail; cookie is cleared/rotated safely | Token-hash/session audit | Critical |
| DATA-01 | Data | Customer profile | Only approved public/masked fields match source | Field reconciliation | Critical |
| DATA-02 | Data | Project history | Count/ownership/status/dates reconcile | Aggregate/object checklist | Critical |
| DATA-03 | Data | Invoice history | Counts, ownership, amount/status presentation reconcile | Aggregate/object checklist | Critical |
| DATA-04 | Data | Documents | Metadata belongs to authorized project; no raw keys/foreign files | Scope and metadata trace | Critical |
| DATA-05 | Data | Manager mapping | Current manager and preserved history match owner-approved rule | Manager reconciliation | High |
| DATA-06 | Data | Relationship timeline | Public events are complete, ordered, and privacy-safe | Timeline reconciliation | High |
| AUTHZ-01 | Authorization | Customer A vs Customer B | No list/detail/search response crosses ownership | Two-principal test | Critical |
| AUTHZ-02 | Authorization | Invoice scope | Only the authorized invoice/project/documents/requests are visible | Invoice-principal test | Critical |
| AUTHZ-03 | Authorization | Project IDOR | Foreign/guessed public reference returns generic not found | Reference substitution | Critical |
| AUTHZ-04 | Authorization | Request IDOR | Foreign request cannot be listed/read/responded to | Reference substitution | Critical |
| AUTHZ-05 | Authorization | Document IDOR | Foreign document cannot be listed, previewed, or downloaded | Reference substitution | Critical |
| REV-01 | Revenue flow | New requirement | One authorized, idempotent request is created in staging only | API + datastore trace | High |
| REV-02 | Revenue flow | Similar work | Only safe project context carries forward | Before/after payload diff | High |
| REV-03 | Revenue flow | Upcoming work conversion | One request is created; duplicate conversion is prevented | API + idempotency trace | High |
| REV-04 | Revenue flow | Manager queue | Correct manager sees the request; another manager does not | Two-manager queue check | Critical |
| REV-05 | Revenue flow | Status cycle | Received → Reviewing → More Information Needed → customer response works with full audit history | Lifecycle trace | High |
| MIG-01 | Migration | Customer Master creation | Eligible synthetic/sanitized case produces one master and identifiers | Count/link reconciliation | Critical |
| MIG-02 | Migration | Invoice/project/manager links | Zero unexpected orphans and approved ownership | FK/orphan report | Critical |
| MIG-03 | Migration | Rollback | New structures removed/compensated as designed; baseline preserved | Counts/checksums | Critical |
| MIG-04 | Migration | Reapply | Reapply succeeds idempotently with reconciled counts | Counts/checksums | Critical |
| OBS-01 | Observability | Correlation IDs | Valid ID propagates end to end; invalid ID refused/replaced | Trace linkage | High |
| OBS-02 | Observability | Failure logs | Only allowlisted error class and safe metadata appear | Forbidden-field scan | Critical |
| OBS-03 | Observability | Authorization denials | Denials emit safe scope/object-class signal without PII | Log/metric check | High |
| OBS-04 | Observability | Latency | Route/result histograms emit without customer identifiers as labels | Metric inspection | Medium |

Exit criteria: every Critical/High case passes, Medium exceptions have owner/expiry, reset/rebuild is repeatable, and data/schema/security owners sign the E3 evidence pack.
