delete from schema_migrations where migration_name='20260826_axo_control_api_v1';
drop table if exists axo_webhook_deliveries;
drop table if exists axo_webhook_subscriptions;
drop table if exists axo_api_idempotency;
drop table if exists axo_api_schema_migrations;
