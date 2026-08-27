# My WriteX Stage 3B-1 Staging Security Test Plan

Date: 27 August 2026

Local result: **GO — locally executable controls passed**

Real-integration result: **NO-GO — isolated staging execution and security approval remain mandatory**

No live attack testing, production connection, real credential, customer notification, or production data mutation was performed.

## Local execution evidence

| Control | Local evidence | Result | Required staging evidence |
|---|---|---|---|
| Username enumeration resistance | Unknown WriteX ID, wrong phone, missing invoice, and malformed phone return the same 401 contract error and message | PASS | Timing distribution and response-shape comparison through the staging BFF |
| Phone enumeration resistance | Correct identifier/wrong phone is indistinguishable from an unknown identifier | PASS | Distributed attempts across identifiers/IPs/devices |
| Brute-force throttling | Login route has same-origin and per-IP/identifier rate-limit hooks; persistent attempt lock checks hashed input/IP evidence | PASS (control/source) | Exercise threshold, cooldown, reset, distributed-source behavior, and alerting against staging storage |
| Invoice/customer scope isolation | Invoice principal sees one invoice/project; customer principal sees only its Customer Master graph | PASS | Repeat against imported approved sanitized cases |
| Customer A/B separation | Cross-customer list/detail and forged-principal access return not found | PASS | Repeat through HTTP and datastore adapter |
| IDOR | Foreign project/request references and forged Customer Master IDs are denied without revealing ownership | PASS | Automated reference substitution across every endpoint |
| Session fixation | Opaque random tokens are hashed at rest and the session endpoint rotates the token | PASS (control/source and existing local suite) | Verify pre-login token is not retained and old token fails after rotation |
| Session expiry | Existing development-session tests prove idle/absolute expiry; stored-session queries require every expiry window to remain valid | PASS (local) | Clock-boundary, idle refresh, and absolute-expiry cases |
| Logout revocation | Logout revokes the hashed session and clears the cookie; local development sessions are revocable | PASS (local) | Verify old token and concurrent tabs fail after logout/logout-all |
| Malformed identifiers | Empty, unknown, malformed phone, and non-international ambiguous phone inputs fail closed | PASS | Unicode/confusable, overlong, encoding, and parser-fuzz corpus |
| Country-code normalization | Only explicit international values are accepted by the integration contract; supported existing Indian portal formats remain covered separately | PASS | Approved country set and representation-equivalence matrix |
| SQL/ORM injection safety | New adapters contain no SQL, HTTP client, or production connector; snapshot records and relationships are validated before use | PASS for skeleton | Parameterization tests through the future staging LTS adapter; query-log review; no dynamic identifiers |
| API schema validation | OpenAPI 3.1 contract validated with Redocly; contract routes/headers/security controls are asserted | PASS | Request/response conformance and negative-schema tests through BFF/integration service |
| Rate-limit hooks | Rate limit and persistent lockout hooks are present in login sources and covered by Stage 3B-1 safety assertions | PASS (control/source) | Shared-store/concurrency/failover proof and safe metrics |
| Duplicate request idempotency | Same owner/key/body replays; same owner/key/different body returns conflict; another customer cannot read the request | PASS | Persistence, concurrency, retry, and expiry behavior |

## Commands and results

- `pnpm run test:client-portal`: **71 passed, 0 failed**.
- `pnpm exec tsx --test tests/client-portal/my-writex-stage3b1.test.ts`: **11 passed, 0 failed**.
- `pnpm --package=@redocly/cli dlx redocly lint MY_WRITEX_LTS_API_CONTRACT.yaml`: **valid, 0 errors**.
- `node scripts/sanitize-lts-snapshot.mjs --self-test`: **PASS**, two synthetic rows and eight deterministic transformations; no source PII survived.
- Targeted integration ESLint: **PASS**.
- Repository-wide TypeScript: **PASS**.
- Optimized production build: **PASS**. This was a local build only; it was not deployed.

## Staging execution sequence

1. Confirm the isolated staging resource inventory and deny every production endpoint, bucket, sender, session store, and credential.
2. Import only a checksum-pinned, approved sanitized snapshot.
3. Apply migrations and reconcile counts, ownership links, constraints, indexes, and orphans.
4. Run the complete security matrix through the BFF and integration service with safe correlation IDs.
5. Inspect logs/metrics for forbidden PII and verify notification sink isolation.
6. Roll back, destroy, recreate, reapply, and rerun critical authorization/idempotency cases.
7. Record evidence, exceptions, owners, expiry dates, and security/data/schema approvals.

## Stop conditions

Stop immediately on any production hostname/credential, raw PII in logs, cross-customer response, generic-error divergence, stale-token acceptance, unparameterized query, real notification delivery, count/checksum mismatch, unexplained orphan, or incomplete rollback.
