-- DRAFT — DO NOT RUN IN PRODUCTION
-- Additive links, manager history, relationship history, preferences and portal security records.

CREATE TABLE IF NOT EXISTS customer_invoice_links (
  id CHAR(36) NOT NULL,
  customer_master_id CHAR(36) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_invoice_id VARCHAR(128) NOT NULL,
  public_invoice_ref VARCHAR(64) NOT NULL,
  link_status VARCHAR(24) NOT NULL DEFAULT 'suggested',
  confidence VARCHAR(16) NOT NULL,
  evidence JSON NOT NULL,
  linked_at DATETIME(6) NULL,
  reviewed_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT customer_invoice_links_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_invoice_links_status_ck CHECK (link_status IN ('suggested','confirmed','rejected','unlinked')),
  CONSTRAINT customer_invoice_links_confidence_ck CHECK (confidence IN ('high','medium','low','known')),
  UNIQUE KEY customer_invoice_links_source_uq (source_system, source_invoice_id),
  UNIQUE KEY customer_invoice_links_public_uq (public_invoice_ref),
  INDEX customer_invoice_links_customer_idx (customer_master_id, link_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_project_links (
  id CHAR(36) NOT NULL,
  customer_master_id CHAR(36) NOT NULL,
  customer_invoice_link_id CHAR(36) NULL,
  source_system VARCHAR(64) NOT NULL,
  source_project_id VARCHAR(128) NOT NULL,
  public_project_ref VARCHAR(64) NOT NULL,
  link_status VARCHAR(24) NOT NULL DEFAULT 'suggested',
  confidence VARCHAR(16) NOT NULL,
  evidence JSON NOT NULL,
  linked_at DATETIME(6) NULL,
  reviewed_by VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT customer_project_links_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_project_links_invoice_fk FOREIGN KEY (customer_invoice_link_id) REFERENCES customer_invoice_links(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT customer_project_links_status_ck CHECK (link_status IN ('suggested','confirmed','rejected','unlinked')),
  CONSTRAINT customer_project_links_confidence_ck CHECK (confidence IN ('high','medium','low','known')),
  UNIQUE KEY customer_project_links_source_uq (source_system, source_project_id),
  UNIQUE KEY customer_project_links_public_uq (public_project_ref),
  INDEX customer_project_links_customer_idx (customer_master_id, link_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_manager_history (
  id CHAR(36) NOT NULL,
  customer_master_id CHAR(36) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_user_id VARCHAR(128) NOT NULL,
  manager_role VARCHAR(64) NOT NULL,
  valid_from DATETIME(6) NOT NULL,
  valid_to DATETIME(6) NULL,
  change_reason VARCHAR(255) NOT NULL,
  changed_by VARCHAR(128) NOT NULL,
  provenance JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT customer_manager_history_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_manager_history_validity_ck CHECK (valid_to IS NULL OR valid_to >= valid_from),
  INDEX customer_manager_history_customer_idx (customer_master_id, valid_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_portal_accounts (
  id CHAR(36) NOT NULL,
  customer_master_id CHAR(36) NOT NULL,
  active_writex_identifier_id CHAR(36) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  login_policy_version VARCHAR(32) NOT NULL,
  failed_attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  cooldown_until DATETIME(6) NULL,
  locked_until DATETIME(6) NULL,
  session_epoch BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT customer_portal_accounts_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_portal_accounts_identifier_fk FOREIGN KEY (active_writex_identifier_id) REFERENCES customer_identifiers(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_portal_accounts_status_ck CHECK (status IN ('active','locked','disabled','merged')),
  UNIQUE KEY customer_portal_accounts_customer_uq (customer_master_id),
  UNIQUE KEY customer_portal_accounts_identifier_uq (active_writex_identifier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_sessions (
  id CHAR(36) NOT NULL,
  customer_portal_account_id CHAR(36) NULL,
  customer_master_id CHAR(36) NULL,
  auth_scope VARCHAR(16) NOT NULL,
  source_invoice_id VARCHAR(128) NULL,
  opaque_token_hmac BINARY(32) NOT NULL,
  token_key_version SMALLINT UNSIGNED NOT NULL,
  session_epoch BIGINT UNSIGNED NOT NULL,
  ip_risk_hmac BINARY(32) NULL,
  device_risk_hmac BINARY(32) NULL,
  issued_at DATETIME(6) NOT NULL,
  idle_expires_at DATETIME(6) NOT NULL,
  absolute_expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  revocation_reason VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  CONSTRAINT customer_sessions_account_fk FOREIGN KEY (customer_portal_account_id) REFERENCES customer_portal_accounts(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_sessions_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_sessions_scope_ck CHECK ((auth_scope = 'customer' AND customer_portal_account_id IS NOT NULL AND customer_master_id IS NOT NULL AND source_invoice_id IS NULL) OR (auth_scope = 'invoice' AND customer_portal_account_id IS NULL AND customer_master_id IS NULL AND source_invoice_id IS NOT NULL)),
  CONSTRAINT customer_sessions_expiry_ck CHECK (issued_at < idle_expires_at AND idle_expires_at <= absolute_expires_at),
  UNIQUE KEY customer_sessions_token_uq (opaque_token_hmac, token_key_version),
  INDEX customer_sessions_customer_idx (customer_master_id, revoked_at, absolute_expires_at),
  INDEX customer_sessions_invoice_idx (source_invoice_id, revoked_at, absolute_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_login_events (
  id CHAR(36) NOT NULL,
  customer_portal_account_id CHAR(36) NULL,
  event_type VARCHAR(48) NOT NULL,
  result VARCHAR(24) NOT NULL,
  reason_code VARCHAR(64) NOT NULL,
  correlation_id VARCHAR(128) NOT NULL,
  identity_lookup_hmac BINARY(32) NULL,
  ip_risk_hmac BINARY(32) NULL,
  device_risk_hmac BINARY(32) NULL,
  occurred_at DATETIME(6) NOT NULL,
  retain_until DATETIME(6) NOT NULL,
  safe_metadata JSON NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT customer_login_events_account_fk FOREIGN KEY (customer_portal_account_id) REFERENCES customer_portal_accounts(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT customer_login_events_result_ck CHECK (result IN ('success','failed','denied','locked')),
  INDEX customer_login_events_rate_idx (identity_lookup_hmac, ip_risk_hmac, occurred_at),
  INDEX customer_login_events_retention_idx (retain_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_preferences (
  customer_master_id CHAR(36) NOT NULL,
  locale VARCHAR(16) NULL,
  timezone VARCHAR(64) NULL,
  communication_preferences JSON NOT NULL,
  accessibility_preferences JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by VARCHAR(128) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (customer_master_id),
  CONSTRAINT customer_preferences_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS customer_relationship_events (
  id CHAR(36) NOT NULL,
  customer_master_id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  public_ref VARCHAR(64) NOT NULL,
  source_system VARCHAR(64) NOT NULL,
  source_record_id VARCHAR(128) NULL,
  safe_summary VARCHAR(500) NOT NULL,
  visibility VARCHAR(24) NOT NULL DEFAULT 'customer',
  occurred_at DATETIME(6) NOT NULL,
  recorded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  safe_metadata JSON NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT customer_relationship_events_customer_fk FOREIGN KEY (customer_master_id) REFERENCES customer_masters(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT customer_relationship_events_visibility_ck CHECK (visibility IN ('internal','customer','invoice')),
  UNIQUE KEY customer_relationship_events_public_uq (public_ref),
  INDEX customer_relationship_events_customer_idx (customer_master_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
