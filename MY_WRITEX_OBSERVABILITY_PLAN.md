# My WriteX Integration Observability Plan

Status: **READY FOR STAGING IMPLEMENTATION**

## Structured event contract

Every future BFF/integration call emits one safe event with only:

- event name;
- request correlation ID;
- authentication scope (`anonymous`, `invoice`, or `customer`);
- customer public reference when authorized;
- normalized API route template, never a raw query string;
- latency in milliseconds;
- result (`success`, `failure`, `denied`, or `timeout`);
- allowlisted integration error class.

`safeMyWritexIntegrationLog` implements this allowlist locally and rejects unsafe identifiers/routes/error classes. It constructs a new object rather than spreading caller data.

Never log full or partial phone/email beyond a separately approved fixed mask, WriteX login input, names, requirement/brief text, filenames/file keys, request bodies, secrets, cookies, authorization headers, raw session tokens, HMACs, SQL, stack traces containing payloads, or arbitrary upstream error messages.

## Error classes

Use bounded codes such as:

- `AUTH_FAILED`
- `AUTH_THROTTLED`
- `AUTH_LOCKED`
- `OBJECT_DENIED`
- `UPSTREAM_TIMEOUT`
- `UPSTREAM_UNAVAILABLE`
- `SCHEMA_MISMATCH`
- `IDEMPOTENCY_CONFLICT`
- `DATA_OWNERSHIP_UNRESOLVED`

Customer responses remain generic. Detailed diagnostics stay in access-controlled traces identified only by the safe correlation ID.

## Metrics

| Metric | Type | Safe dimensions |
|---|---|---|
| Auth resolver success/failure | Counter | scope, result, reason class |
| Auth throttled/locked | Counter | scope, policy version |
| Customer lookup latency | Histogram | route, result |
| Project/invoice lookup errors | Counter | route, error class |
| Authorization denials | Counter | scope, object type |
| Request creation failures | Counter | scope, error class |
| Idempotent replay/conflict | Counter | scope, outcome |
| Integration timeouts/unavailable | Counter | dependency alias, error class |
| Snapshot/schema mismatch | Gauge/counter | adapter version, schema version |

Do not use customer, phone, email, IP, device, session, invoice, project, or request identifiers as metric labels.

## Operational controls

- Generate/validate correlation IDs at the BFF and propagate them end to end.
- Apply sampling only to success traces; retain all safe denial/timeout/error-class metrics.
- Alert on rate/latency changes using minimum-volume windows and staging-tested thresholds.
- Protect logs with least privilege, encryption, immutable audit access, retention/deletion policy, and export restrictions.
- Run automated forbidden-field scans on log fixtures and staging output.
- Validate dashboards against metric definitions; no raw payload search should be necessary for normal operations.
