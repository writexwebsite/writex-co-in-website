# My WriteX Authentication and Authorization Security Model

## Decision and risk

Approved product direction is **WriteX ID + Registered Phone**, with no password and no OTP. This is knowledge-based authentication using two identifiers that may both be discoverable, reused, forwarded, or visible in messages/documents. It is weaker than possession-based authentication and must not be presented as strong identity proof.

The model is acceptable only for a constrained customer portal with layered abuse controls, short revocable sessions, strict object authorization, and prohibited sensitive actions. A future possession factor remains recommended.

## Resolution

1. Normalize identifier, classify it unambiguously as invoice reference or WriteX ID, and normalize phone to the approved country-aware form.
2. Perform constant-shape lookups and comparisons on the server. Exact normalized phone equality is mandatory.
3. Return the same generic message, status family, timing envelope, and response shape for unknown identifier, wrong phone, disabled account, and unauthorized scope.
4. Never reveal whether the WriteX ID, invoice, or phone exists.
5. Create an opaque random session token; store only its keyed hash server-side. No PII-bearing self-contained token.

## Abuse controls

- Rate-limit by normalized-identifier HMAC, phone HMAC, IP prefix hash, device-risk hash, and global abuse state.
- Progressive cooldown after failures; temporary account/identifier lock after threshold; exponential extension for repeated windows.
- Apply generic 429/423 behavior without account-existence disclosure.
- Detect credential stuffing, distributed low-and-slow attempts, impossible travel, rapid device changes, and session fan-out.
- Alert on risk, but do not send real notifications during Stage 3B-0.
- Retain security telemetry only for an approved period; store IP/device indicators as keyed, rotated hashes where practical.

## Session contract

- Cookie: `HttpOnly`, `Secure` outside localhost, `SameSite=Lax` (or Strict if compatibility permits), narrow `Path=/`, no JavaScript access.
- Rotate token on login, scope elevation, and risk changes; prevent fixation.
- Suggested idle expiry: 30 minutes; absolute expiry: 12 hours; shorter under elevated risk.
- Server-side revocation and session epoch on account/customer root.
- Logout revokes the current session; “logout all sessions” increments epoch/revokes all account sessions.
- CSRF protection for state-changing routes: SameSite plus exact Origin/Host validation and anti-CSRF token where needed.
- Correlation IDs are safe opaque values and never contain customer data.

## Scope separation

| Scope | Ownership root | Permitted traversal |
|---|---|---|
| `invoice` | One authorized invoice public reference | Only that invoice, its linked project, files, payments, and requests. No customer-wide list or profile. |
| `customer` | Immutable Customer Master ID | Linked projects/invoices/documents/requests for that customer only. |

Every route resolves the session server-side and performs object-level ownership checks. A URL/public reference is never authorization. Unauthorized and nonexistent objects use the same 404-style response where appropriate. Customer A/B separation is tested across project, invoice, document, and request references.

## Sensitive actions prohibited under this login alone

- Change registered or primary phone/email.
- Change payment destination, bank/UPI details, or refund destination.
- Request/refinalize refunds or financial disbursements.
- Reveal stored academic-account passwords, highly sensitive credentials, full payment instruments, or unmasked identity documents.
- Merge/unmerge customers, change Customer Master ownership, or change manager/BDE history.
- Permanently delete the account, files, projects, or legal/financial history.
- Export all personal data without step-up review.
- Create privileged staff/admin access or elevate invoice scope to customer scope.

These require a separate verified support/operations workflow or future step-up possession factor.

## Audit events

Record `auth.resolve_succeeded/failed`, cooldown/lock, session created/rotated/revoked/expired, logout-all, object authorization denied, suspicious-device/IP signal, WriteX ID change, and sensitive-action blocked. Include actor/account/customer safe IDs, scope, reason code, correlation ID, policy version, and timestamp; never log raw phone, raw email, cookies, tokens, request briefs, or file contents.

## Service boundary

Browser → same-origin BFF uses the session cookie. BFF → integration service uses mTLS plus a short-lived audience-bound service credential. The integration service exposes only versioned customer-safe resources, maps internal IDs to public references, applies least privilege, and rejects arbitrary table/SQL access.

## Release gates

- Independent threat-model review and rate-limit/load test.
- Approved phone normalization and account lock/recovery procedures.
- Secure cookie verification behind real HTTPS and reverse proxy.
- Session revocation and Customer A/B authorization E2E tests in staging.
- Privacy/retention approval for login telemetry.
- Operational playbook for compromised phone, ID collision, and support recovery.

Stage 3B-0 implements only local mocks/contracts; it does not activate this authentication against LTS.
