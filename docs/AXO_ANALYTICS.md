# AXO Analytics

Events are defined in `lib/axo/types.ts` and emitted by `lib/axo/analytics.ts`. The payload allowlist contains only service ID, step ID, source page, urgency bucket, file presence/count, completion percentage, reason code and deterministic-mode state.

Never send names, emails, phone numbers, order IDs, filenames, messages or raw academic text. Primary measures are completed enquiries, qualification, quote completion, file completion, brief completeness, handoff and returning-session completion. Guardrails include dismissal, abandonment, upload failure, validation errors, performance and fallback rate.
