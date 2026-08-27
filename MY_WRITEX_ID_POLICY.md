# WriteX ID Policy

## Contract

- Display form may preserve approved lowercase styling; comparison form is Unicode NFKC, trimmed, optional leading `@` removed, and lowercased.
- Allowed characters: ASCII lowercase letters, digits, and single dots between alphanumeric segments.
- Length: 5–32 characters after normalization.
- Must start and end with an alphanumeric character; no consecutive dots.
- Uniqueness is case-insensitive across active IDs and quarantined historical IDs.
- WriteX ID is public-facing and never equals or encodes the immutable customer ID, lead ID, phone, invoice number, year-of-birth, or other sensitive/internal value.
- Default IDs should be memorable (`rahulsharma`, `rahul.sharma`, `rahulsharma.7k2`), not sequential public numbers.

Proposed validation expression after normalization:

```text
^(?=.{5,32}$)[a-z0-9]+(?:\.[a-z0-9]+)*$
```

## Reserved and blocked values

Reject platform/security words and confusing namespaces, including `admin`, `administrator`, `root`, `system`, `support`, `help`, `security`, `billing`, `invoice`, `payment`, `writex`, `mywritex`, `official`, `staff`, `employee`, `manager`, `api`, `www`, `mail`, `null`, and `undefined`, including obvious punctuation/case variants.

Reject terms from a versioned offensive/abuse list after separator removal and common character-folding. Flag impersonation of WriteX staff, institutions, public figures, or another customer for manual review.

Reject values matching invoice/public-reference patterns such as `WX-*`, `INV-*`, `REQ-*`, `PRJ-*`, or an all-numeric value. Never resolve an ambiguous token as both invoice and WriteX ID.

## Availability and suggestions

Availability is deterministic inside one transaction:

1. Normalize and validate.
2. Check active identifiers plus non-reuse quarantine.
3. Acquire a normalized-value advisory/row lock.
4. Reserve with a short expiry or create atomically under a unique index.
5. Return only `available`, `unavailable`, or `invalid`; unauthenticated checks are rate-limited and must not disclose account existence.

Suggestions are generated from approved name fragments plus a random 3-character base32 suffix. They are revalidated and checked atomically. Do not suggest phone digits, email local parts without consent, birth year, invoice digits, or an incrementing customer count.

## Changes and non-reuse

- Customer requests are reviewed under the authenticated account; a WriteX ID change is not a phone-change mechanism.
- Keep the previous value as a historical identifier with `retired` status.
- Do not reassign a retired ID to another customer for at least 24 months; permanently reserve IDs involved in abuse, impersonation, legal hold, or security incidents.
- Existing sessions remain bound to immutable customer ID and account/session epoch, not the text WriteX ID.
- Emit `writex_id.changed` and `writex_id.reuse_blocked` audit events with actor, correlation ID, reason code, and policy version.

## Examples

| Input | Normalized | Result |
|---|---|---|
| `@Rahul.Sharma` | `rahul.sharma` | Valid if available |
| `rahulsharma.7k2` | same | Valid if available |
| `WX-1001` | — | Rejected: invoice-like/confusing |
| `Admin` | `admin` | Rejected: reserved |
| `rahul..sharma` | — | Rejected: consecutive separators |

WriteX ID is never the database ownership key.
