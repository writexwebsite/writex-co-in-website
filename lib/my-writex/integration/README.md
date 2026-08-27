# Stage 3B-0 Local Contract Adapter

This folder is additive readiness work only. It contains no HTTP client, database driver, production hostname, secret, notification sender, or merge executor.

- `contract.ts` defines local scope, request, and error types.
- `customer-identity.ts` implements WriteX ID and international-phone normalization, deterministic ID suggestions, duplicate-confidence suggestions, and non-executable merge impact previews.
- `local-contract-fixture.ts` supplies sanitized, deterministic Customer A, Customer B, and invoice-only contract data.
- `mock-adapter.ts` exposes the project, invoice, document, manager, relationship, and request operations described by the draft OpenAPI contract.

The Stage 3A product fixture remains frozen for Founder UAT. This adapter therefore mirrors only the minimum deterministic contract fields instead of rewiring any Stage 3A page or API. After Stage 3A approval, Stage 3B may move the shared fixture source behind this façade under a separate authorized change. Production construction is hard-blocked, and every merge helper returns `executable: false` or `autoMergeAllowed: false`.

Run the isolated contract tests with:

```powershell
pnpm exec tsx --test tests/client-portal/my-writex-stage3b0.test.ts
```

