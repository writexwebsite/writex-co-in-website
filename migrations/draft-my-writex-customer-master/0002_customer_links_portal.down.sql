-- DRAFT — DO NOT RUN IN PRODUCTION
-- Destructive rollback for a disposable empty dry-run schema only.

DROP TABLE IF EXISTS customer_relationship_events;
DROP TABLE IF EXISTS customer_preferences;
DROP TABLE IF EXISTS customer_login_events;
DROP TABLE IF EXISTS customer_sessions;
DROP TABLE IF EXISTS customer_portal_accounts;
DROP TABLE IF EXISTS customer_manager_history;
DROP TABLE IF EXISTS customer_project_links;
DROP TABLE IF EXISTS customer_invoice_links;
