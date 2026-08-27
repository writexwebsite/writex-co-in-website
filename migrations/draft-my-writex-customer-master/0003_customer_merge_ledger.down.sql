-- DRAFT — DO NOT RUN IN PRODUCTION
-- Destructive rollback for a disposable empty dry-run schema only.

DROP TABLE IF EXISTS customer_merge_history;
DROP TABLE IF EXISTS customer_duplicate_candidates;
