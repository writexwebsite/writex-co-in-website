# AXO Security, Privacy and Academic Trust

## Boundaries

AXO has no shell, filesystem, Codex, deployment, database-admin, unrestricted email or dashboard access. Browser input can only update local UI state or call existing narrow HTTP endpoints.

## Threat controls

- XSS: React text rendering, no arbitrary HTML/Markdown and summary character stripping.
- Prompt injection: deterministic rules and approved records only; uploaded content is never interpreted as instructions.
- PII leakage: analytics allowlist; no raw brief, contact, order or filename events.
- File exposure: private S3, sanitized names, signature checks, signed access and scanner boundary.
- Fake order IDs: unauthenticated flows never reveal or confirm order details; authenticated portal is the source of truth.
- Quote manipulation: pricing stays server-side/manual; AXO sends requirements, not prices.
- Spam/API abuse: existing rate limiters and strict Zod schemas apply.
- CSRF: public JSON lead creation contains no ambient-auth authority; authenticated state-changing routes must retain same-site session and origin controls.
- Fabrication: fixed service catalogue, approved-answer search and explicit unknown-answer fallback.

## Consent and retention

Session resume uses session storage. Cross-session device memory is opt-in. Clear and hide controls are always available. File contents are never saved in browser storage. Operational retention requires policy approval before changing production periods.

## Academic trust

AXO identifies itself as AI-powered support. It frames WriteX around academic support, review, guidance, editing, formatting, referencing and learning-focused assistance. It does not promise outcomes or impersonate a writer or academic expert.
