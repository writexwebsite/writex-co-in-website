# My WriteX E4 Production-Parity Checklist

Status: **READY FOR AUTHORIZED READ-ONLY USE — production parity remains NOT CONFIRMED**

This checklist authorizes no access by itself. Use only a separately approved read-only identity and window. Record metadata/hashes/counts; never print secrets, connection strings, raw PII, tokens, requirement text, file keys, or customer rows.

| Item | Read-only evidence | Safe comparison | Owner sign-off | Result |
|---|---|---|---|---|
| Deployed LTS commit/version | Release manifest, image digest, or approved health/admin version | Exact SHA/digest against approved source | LTS owner | ☐ |
| Deployed schema version | Migration ledger version and ordered hashes | Exact version/hash list | Schema owner | ☐ |
| Database engine/version | Approved metadata query | Engine patch, SQL mode, collation/time zone | DBA/schema owner | ☐ |
| Customer/lead structure | `information_schema`/approved schema export | Column/type/null/default/order hash | Schema owner | ☐ |
| Invoice/payment structure | Metadata only | Column/relationship hash | Schema owner | ☐ |
| Project/assignment/task structure | Metadata only | Column/relationship hash | Schema owner | ☐ |
| Constraints | Table/check/key metadata | Constraint type and reference hash | Schema owner | ☐ |
| Indexes | Statistics metadata | Name/uniqueness/ordered-column hash | DBA | ☐ |
| Phone/email formats | Aggregate validity/null/duplicate/representation counts only | Rate comparison to fresh sanitized snapshot | Data owner | ☐ |
| Assigned-BDE source | Schema plus owner-approved semantics for assigned/created/history fields | Explicit precedence and history rule | Data owner | ☐ |
| Existing client auth | Approved route/session/cookie configuration inventory | Method/scope/failure/expiry/revocation matrix | Security owner | ☐ |
| File-storage references | Bucket/account aliases, key-pattern schema, policy IDs | No object contents or signed URLs | Storage/security owner | ☐ |
| Invoice/customer ownership | FK metadata and aggregate orphan/mismatch counts | Fresh-snapshot reconciliation | Data/schema owners | ☐ |
| Project/invoice ownership | FK metadata and aggregate orphan/mismatch counts | Fresh-snapshot reconciliation | Data/schema owners | ☐ |
| Live route behaviour | Safe HEAD/GET or approved synthetic monitoring identity | Route/status/auth-scope matrix; no mutation | App/security owners | ☐ |

## Evidence record

For every check record approval reference, operator, UTC time, production release ID, query/command ID, result hash/count, reviewer, and expiry date. Stop on unexpected hostname, write capability, query-plan risk, replica lag, secret/PII output, or mismatch that lacks an owner.

E4 is complete only when every item is checked, exceptions have explicit owners and expiry, and the LTS, schema, data, storage, application, and security owners sign the parity record. Until then, production parity is **NOT CONFIRMED**.
