-- DRAFT — DO NOT RUN IN PRODUCTION
-- Run only after proving every new link is represented in the additive link tables.

DROP INDEX assignments_customer_master_idx ON assignments;
DROP INDEX invoices_customer_master_idx ON invoices;
DROP INDEX leads_customer_master_idx ON leads;

ALTER TABLE assignments DROP COLUMN customer_master_id;
ALTER TABLE invoices DROP COLUMN customer_master_id;
ALTER TABLE leads DROP COLUMN customer_master_id;
