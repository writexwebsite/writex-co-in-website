-- DRAFT — DO NOT RUN IN PRODUCTION
-- Optional compatibility acceleration only after schema-owner approval.
-- Preconditions: columns and index names must not already exist; execute only in a disposable clone first.

ALTER TABLE leads ADD COLUMN customer_master_id CHAR(36) NULL;
ALTER TABLE invoices ADD COLUMN customer_master_id CHAR(36) NULL;
ALTER TABLE assignments ADD COLUMN customer_master_id CHAR(36) NULL;

CREATE INDEX leads_customer_master_idx ON leads (customer_master_id);
CREATE INDEX invoices_customer_master_idx ON invoices (customer_master_id);
CREATE INDEX assignments_customer_master_idx ON assignments (customer_master_id);

-- Intentionally no NOT NULL constraint, no foreign key, and no backfill here.
-- Add constraints only in a later approved phase after zero-orphan reconciliation.
