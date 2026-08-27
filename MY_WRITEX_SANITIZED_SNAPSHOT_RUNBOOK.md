# My WriteX Fresh Sanitized Snapshot Runbook

Status: **RUNBOOK READY — no fresh approved snapshot obtained**

Scope: offline export sanitization only; no live pull is authorized by Stage 3B-1.

## Approval gate

Before obtaining or processing a snapshot, record:

- written data-owner and security approval references;
- named export operator and source environment;
- snapshot UTC date/time and database engine/version;
- approved tables and excluded data classes;
- transfer/storage location, retention, deletion date, and recipients;
- confirmation that the export method is read-only and does not include credentials, secrets, session tokens, binary uploads, or object contents.

If any item is absent, stop. The existing `Dump20260717.zip` is evidence for local E2 analysis only because its current approval/sanitization provenance is not documented.

## Sanitization behavior

`scripts/sanitize-lts-snapshot.mjs` accepts only an offline local ZIP. It contains no database or HTTP client. It:

- preserves primary keys, foreign keys, invoice/project/customer relationship keys, enums, dates needed for structure, and duplicate equality patterns;
- deterministically HMAC-pseudonymizes names, emails, phones, addresses, financial identifiers, device identifiers, free text, and file references;
- replaces credentials/tokens with `REDACTED`;
- omits non-SQL ZIP entries, so uploaded binary files are never copied;
- writes `SANITIZATION_REPORT.json` with input SHA-256, approval reference, snapshot time, row counts, transformation counts, and skipped-file counts;
- refuses URL/network-share input, missing approval metadata, a short/missing key, or output overwrite.

The HMAC key is an ephemeral sanitization secret. It must come from the approved secret manager, must never be committed or printed, and should be destroyed after the verification window.

## Preflight and self-test

```powershell
node scripts/sanitize-lts-snapshot.mjs --self-test
```

Expected: `selfTest: PASS`, two synthetic rows processed, original synthetic email/phone/credential absent, IDs unchanged, and duplicate pseudonyms preserved.

## Exact offline command template

Run only after the approval gate is complete and the approved export is already present on local encrypted storage:

```powershell
$env:LTS_SANITIZATION_KEY = '<retrieve securely; minimum 32 characters>'
node scripts/sanitize-lts-snapshot.mjs `
  --input 'C:\Approved-LTS-Exports\lts-approved-YYYYMMDDTHHMMSSZ.zip' `
  --output 'C:\Approved-LTS-Exports\sanitized\lts-sanitized-YYYYMMDDTHHMMSSZ.zip' `
  --approval-ref 'DATA-APPROVAL-REFERENCE' `
  --source-environment 'production-offline-approved-export' `
  --snapshot-time 'YYYY-MM-DDTHH:MM:SSZ' `
  --key-env 'LTS_SANITIZATION_KEY'
Remove-Item Env:LTS_SANITIZATION_KEY
```

Do not paste the real key into the command transcript or report.

## Verification

1. Verify the input SHA-256 against the exporter’s signed handoff.
2. Inspect only `SANITIZATION_REPORT.json` and schema/aggregate output initially.
3. Confirm every SQL entry parsed, expected tables are present, row counts reconcile, and transformed-value counts are plausible.
4. Scan the sanitized archive for approved synthetic canaries and prohibited patterns. Do not print any match value.
5. Re-run the Stage 3B-0 and Stage 3B-1 aggregate analyzers; compare counts, relationship coverage, duplicate group sizes, and orphan counts with the unsanitized export’s private verification totals.
6. Import only into an isolated disposable MySQL instance with no production routes, S3, sessions, notifications, or credentials.
7. Validate referential integrity, schema parity, duplicate preservation, and login/eligibility estimates.
8. Produce a signed verification report with hashes/counts only. Two reviewers must confirm no raw PII appears.
9. Retain the sanitized snapshot only for the approved period; delete the raw export under the owner-approved evidence-preserving procedure.

## Stop conditions

Stop on missing approval, unexpected live/network input, raw files, unrecognized SQL structure, column-count mismatch, unhandled likely-PII column, row-count drift, broken key relationships, output overwrite, or evidence of credentials/tokens. Do not silently skip a failed table.
