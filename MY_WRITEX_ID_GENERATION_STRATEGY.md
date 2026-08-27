# Initial WriteX ID Generation Strategy

Status: **READY FOR STAGING DESIGN — no production IDs assigned**

## Principle

A WriteX ID is a customer-facing alias, never the database ownership key. The immutable Customer Master ID remains internal. Initial processing produces reserved suggestions only; the customer may later choose or change an available ID under the approved policy.

## Deterministic candidate sequence

Given an eligible Customer Master and its approved preferred/public name:

1. Normalize with Unicode NFKD, remove diacritics, lowercase, and retain ASCII letters, digits, `.`, `_`, and `-` only.
2. Generate readable bases in order: `firstlast`, `first.last`, and an approved short-name form.
3. Reject values outside 5–30 characters, starting without a letter, ending in punctuation, containing repeated punctuation, reserved/offensive values, or matching invoice-like prefixes such as `inv`, `invoice`, or `wx-<digits>`.
4. Check availability case-insensitively across active, reserved, retired, quarantined, and alias-history identifiers.
5. If all readable bases collide, append a three-character lowercase base-36 token derived with a versioned server-side HMAC over the immutable internal identity. The token is stable within the policy/key version but does not reveal that identity.
6. Sort batch reservations by immutable internal identity before checking collisions, so identical input produces identical results.
7. Reserve—do not activate—the first valid candidate. Activation requires the separately approved customer/account flow.

No raw phone, email, invoice number, sequential customer number, database ID, or predictable count may appear in the suffix.

## Anonymized examples

| Approved public-name input | Candidate order |
|---|---|
| `Profile Alpha` | `profilealpha` → `profile.alpha` → `profilealpha.7k2` |
| `Profile Alpha` collision | `profilealpha.3m8` using the second Customer Master’s opaque HMAC token |
| `WX 1001` | rejected as invoice-like; use approved non-conflicting public-name candidates |
| Reserved `support` | rejected; produce `supportingname`-based candidates only when derived from an approved public name |

## Availability and lifecycle

- Availability checks and writes use the same normalized value and a database unique constraint.
- Reservation is atomic and idempotent; a conflict restarts from the deterministic candidate list.
- Changes retire the prior ID into alias history and quarantine it from reuse.
- Retired/quarantined IDs continue resolving only under the approved anti-enumeration rules; they are not reassigned immediately.
- Offensive/reserved lists and HMAC key versions are versioned and auditable.
- Suggestions are safe to display only after authentication or within an authorized account-creation flow.

The existing `customer-identity.ts` local implementation proves normalization, validation, case-insensitive availability, invoice-prefix exclusion, and deterministic suggestions. Production persistence remains disabled.
