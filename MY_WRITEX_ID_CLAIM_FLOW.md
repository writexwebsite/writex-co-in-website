# My WriteX ID Claim and Assignment Flow

Status: **FUTURE DESIGN ONLY — no real IDs assigned or activated**

The current Client Login design is unchanged. Future authentication remains **WriteX ID + Registered Phone**, with no OTP and no password.

## Future flow

1. After Customer Master eligibility and account approval, the server prepares a reserved suggestion from the approved public/preferred name and an opaque collision suffix when needed.
2. The authenticated/assisted claim screen shows the suggested ID, the current registered phone in an approved mask, and a plain explanation that the phone must match the registered record.
3. The customer can accept the suggestion or enter another candidate.
4. Availability is checked case-insensitively against active, reserved, retired, quarantined, offensive, and protected identifiers.
5. Invalid format, reserved words, invoice-like prefixes, and unavailable names receive one generic reason plus safe alternative suggestions. The response must not reveal who owns an unavailable ID.
6. Acceptance performs one atomic reservation/activation under an idempotency key and database uniqueness constraint. A collision restarts from the deterministic candidate list.
7. The account page displays the current WriteX ID and the policy for later changes.
8. A later change requires an approved re-authentication/assisted process, cooldown, audit event, and confirmation. The old ID moves to alias/retired history and quarantine; it is not immediately reassigned.

## Validation rules

- 5–30 characters, normalized case-insensitively.
- Starts with a letter; allowed characters are lowercase letters, digits, `.`, `_`, and `-`.
- No trailing/repeated punctuation, reserved/offensive value, or invoice-like `inv`, `invoice`, or `wx-<digits>` pattern.
- No raw phone, email, invoice number, database ID, or predictable sequence in the ID/suffix.
- Suggestions are deterministic within a versioned policy and secret-HMAC key, but do not expose the internal Customer Master identity.

## Failure states

| State | Customer-safe response |
|---|---|
| Unavailable | “That WriteX ID is unavailable. Try one of these suggestions.” |
| Reserved/protected | “That WriteX ID cannot be used. Choose another.” |
| Invalid format | Show the length/character rule without echoing unsafe input into logs |
| Concurrent collision | Retry atomically and show the next safe suggestion |
| Phone does not match | Use the same generic login/verification failure; do not reveal which field exists |
| Account not eligible | Direct to support without exposing data-quality reasons |

Because registered phone is not a strong second factor, this session must not independently authorize phone replacement, identity changes, refunds, payment changes, destructive merges, or other high-risk operations.
