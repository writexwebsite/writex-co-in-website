-- DRAFT — DO NOT RUN IN PRODUCTION
-- Destructive rollback for a disposable empty dry-run schema only.

DROP TABLE IF EXISTS customer_aliases;
DROP TABLE IF EXISTS customer_emails;
DROP TABLE IF EXISTS customer_phones;
DROP TABLE IF EXISTS customer_identifiers;
ALTER TABLE customer_masters DROP FOREIGN KEY customer_masters_merged_fk;
DROP TABLE IF EXISTS customer_masters;
