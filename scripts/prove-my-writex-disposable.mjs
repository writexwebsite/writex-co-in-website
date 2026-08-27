#!/usr/bin/env node

/**
 * Runs Stage 3B-1 migration and merge proofs against one explicitly local,
 * high-port MySQL instance. The exact proof database is dropped on exit.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROOF_DATABASE = "my_writex_stage3b1_proof";

function args(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    values.set(argv[index]?.replace(/^--/, ""), argv[index + 1]);
  }
  return {
    mysqlBin: values.get("mysql-bin"),
    host: values.get("host"),
    port: Number(values.get("port")),
    output: values.get("output"),
  };
}

const options = args(process.argv.slice(2));
const workspace = process.cwd();
const expectedLocalRoot = path.resolve(workspace, ".local").toLowerCase();
const mysqlBin = path.resolve(options.mysqlBin ?? "");
if (
  options.host !== "127.0.0.1" ||
  !Number.isInteger(options.port) ||
  options.port < 40000 ||
  options.port > 49999 ||
  !mysqlBin.toLowerCase().startsWith(`${expectedLocalRoot}${path.sep}`) ||
  path.basename(mysqlBin).toLowerCase() !== "mysql.exe" ||
  !options.output
) {
  throw new Error(
    "Safety refusal: require workspace-local mysql.exe, host 127.0.0.1, port 40000–49999, and output path.",
  );
}

const baseArgs = [
  "--protocol=tcp",
  `--host=${options.host}`,
  `--port=${options.port}`,
  "--user=root",
  "--batch",
  "--raw",
  "--skip-column-names",
  "--default-character-set=utf8mb4",
];

function mysql(sql, database, allowFailure = false) {
  const commandArgs = [...baseArgs, ...(database ? [`--database=${database}`] : [])];
  try {
    return execFileSync(mysqlBin, commandArgs, {
      cwd: workspace,
      encoding: "utf8",
      input: sql,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
      stdio: ["pipe", "pipe", allowFailure ? "pipe" : "inherit"],
    }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function numberQuery(sql) {
  return Number(mysql(sql, PROOF_DATABASE));
}

function readMigration(name) {
  return fs.readFileSync(
    path.join(workspace, "migrations", "draft-my-writex-customer-master", name),
    "utf8",
  );
}

const upMigrations = [
  "0001_customer_master_core.up.sql",
  "0002_customer_links_portal.up.sql",
  "0003_customer_merge_ledger.up.sql",
  "0004_optional_legacy_nullable_links.up.sql",
];
const downMigrations = [
  "0004_optional_legacy_nullable_links.down.sql",
  "0003_customer_merge_ledger.down.sql",
  "0002_customer_links_portal.down.sql",
  "0001_customer_master_core.down.sql",
];

function apply(names) {
  for (const name of names) mysql(readMigration(name), PROOF_DATABASE);
}

function customerTableCount() {
  return numberQuery(
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE 'customer\\_%';",
  );
}

function optionalColumnCount() {
  return numberQuery(
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND column_name='customer_master_id' AND table_name IN ('leads','invoices','assignments');",
  );
}

function legacyCounts() {
  const [leads, invoices, assignments] = mysql(
    "SELECT (SELECT COUNT(*) FROM leads),(SELECT COUNT(*) FROM invoices),(SELECT COUNT(*) FROM assignments);",
    PROOF_DATABASE,
  )
    .split("\t")
    .map(Number);
  return {
    leads,
    invoices,
    assignments,
  };
}

const UUID = {
  a: "00000000-0000-4000-8000-000000000001",
  b: "00000000-0000-4000-8000-000000000002",
  c: "00000000-0000-4000-8000-000000000003",
  d: "00000000-0000-4000-8000-000000000004",
  e: "00000000-0000-4000-8000-000000000005",
  f: "00000000-0000-4000-8000-000000000006",
};

const legacySql = `
CREATE DATABASE ${PROOF_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ${PROOF_DATABASE};
CREATE TABLE leads (leadId BIGINT NOT NULL PRIMARY KEY, label VARCHAR(32) NOT NULL) ENGINE=InnoDB;
CREATE TABLE invoices (invoiceId BIGINT NOT NULL PRIMARY KEY, leadId BIGINT NULL, label VARCHAR(32) NOT NULL) ENGINE=InnoDB;
CREATE TABLE assignments (assignmentId BIGINT NOT NULL PRIMARY KEY, invoiceId BIGINT NULL, leadId BIGINT NULL, label VARCHAR(32) NOT NULL) ENGINE=InnoDB;
INSERT INTO leads VALUES (1,'synthetic-a'),(2,'synthetic-b'),(3,'synthetic-c');
INSERT INTO invoices VALUES (101,1,'synthetic-i1'),(102,2,'synthetic-i2'),(103,3,'synthetic-i3');
INSERT INTO assignments VALUES (201,101,1,'synthetic-p1'),(202,102,2,'synthetic-p2'),(203,103,3,'synthetic-p3');
`;

const migrationFixtureSql = `
INSERT INTO customer_masters (id,preferred_name,status,relationship_started_on,source_system,source_provenance)
VALUES ('${UUID.a}','Synthetic A','active','2026-01-01','synthetic',JSON_OBJECT('proof',true)),
       ('${UUID.b}','Synthetic B','active','2026-01-02','synthetic',JSON_OBJECT('proof',true));
INSERT INTO customer_identifiers (id,customer_master_id,identifier_type,normalized_value,display_value,status,is_primary,source_system,provenance)
VALUES ('10000000-0000-4000-8000-000000000001','${UUID.a}','writex_id','alpha.user','alpha.user','active',1,'synthetic',JSON_OBJECT('proof',true)),
       ('10000000-0000-4000-8000-000000000002','${UUID.b}','writex_id','beta.user','beta.user','active',1,'synthetic',JSON_OBJECT('proof',true));
INSERT INTO customer_phones (id,customer_master_id,encrypted_e164,normalized_hmac,hmac_key_version,masked_display,country_code,verification_status,is_primary,source_system,provenance)
VALUES ('20000000-0000-4000-8000-000000000001','${UUID.a}',UNHEX('0102'),UNHEX(SHA2('phone-a',256)),1,'+44••••0001','GB','verified',1,'synthetic',JSON_OBJECT('proof',true));
INSERT INTO customer_emails (id,customer_master_id,encrypted_email,normalized_hmac,hmac_key_version,masked_display,verification_status,is_primary,source_system,provenance)
VALUES ('30000000-0000-4000-8000-000000000001','${UUID.a}',UNHEX('0102'),UNHEX(SHA2('email-a',256)),1,'a•••@example.invalid','verified',1,'synthetic',JSON_OBJECT('proof',true));
INSERT INTO customer_aliases (id,customer_master_id,alias_type,encrypted_alias,masked_display,source_system,provenance)
VALUES ('40000000-0000-4000-8000-000000000001','${UUID.a}','name',UNHEX('0102'),'S•••••••• A','synthetic',JSON_OBJECT('proof',true));
INSERT INTO customer_invoice_links (id,customer_master_id,source_system,source_invoice_id,public_invoice_ref,link_status,confidence,evidence,linked_at)
VALUES ('50000000-0000-4000-8000-000000000001','${UUID.a}','synthetic','101','INV-PROOF-101','confirmed','known',JSON_OBJECT('proof',true),NOW(6));
INSERT INTO customer_project_links (id,customer_master_id,customer_invoice_link_id,source_system,source_project_id,public_project_ref,link_status,confidence,evidence,linked_at)
VALUES ('60000000-0000-4000-8000-000000000001','${UUID.a}','50000000-0000-4000-8000-000000000001','synthetic','201','PRJ-PROOF-201','confirmed','known',JSON_OBJECT('proof',true),NOW(6));
INSERT INTO customer_manager_history (id,customer_master_id,source_system,source_user_id,manager_role,valid_from,change_reason,changed_by,provenance)
VALUES ('70000000-0000-4000-8000-000000000001','${UUID.a}','synthetic','manager-1','relationship_manager',NOW(6),'proof','proof-runner',JSON_OBJECT('proof',true));
INSERT INTO customer_portal_accounts (id,customer_master_id,active_writex_identifier_id,status,login_policy_version)
VALUES ('80000000-0000-4000-8000-000000000001','${UUID.a}','10000000-0000-4000-8000-000000000001','active','stage3b1-proof');
INSERT INTO customer_sessions (id,customer_portal_account_id,customer_master_id,auth_scope,source_invoice_id,opaque_token_hmac,token_key_version,session_epoch,issued_at,idle_expires_at,absolute_expires_at)
VALUES ('90000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','${UUID.a}','customer',NULL,UNHEX(SHA2('session-a',256)),1,1,NOW(6),DATE_ADD(NOW(6),INTERVAL 30 MINUTE),DATE_ADD(NOW(6),INTERVAL 8 HOUR)),
       ('90000000-0000-4000-8000-000000000002',NULL,NULL,'invoice','101',UNHEX(SHA2('session-i',256)),1,1,NOW(6),DATE_ADD(NOW(6),INTERVAL 30 MINUTE),DATE_ADD(NOW(6),INTERVAL 8 HOUR));
INSERT INTO customer_login_events (id,customer_portal_account_id,event_type,result,reason_code,correlation_id,occurred_at,retain_until,safe_metadata)
VALUES ('a0000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','auth.resolve','success','MATCHED','corr-proof',NOW(6),DATE_ADD(NOW(6),INTERVAL 30 DAY),JSON_OBJECT('proof',true));
INSERT INTO customer_preferences (customer_master_id,communication_preferences,accessibility_preferences,updated_by)
VALUES ('${UUID.a}',JSON_OBJECT('portal',true),JSON_OBJECT(),'proof-runner');
INSERT INTO customer_relationship_events (id,customer_master_id,event_type,public_ref,source_system,safe_summary,occurred_at,safe_metadata)
VALUES ('b0000000-0000-4000-8000-000000000001','${UUID.a}','joined','REL-PROOF-001','synthetic','Synthetic proof event',NOW(6),JSON_OBJECT('proof',true));
UPDATE leads SET customer_master_id='${UUID.a}' WHERE leadId=1;
UPDATE invoices SET customer_master_id='${UUID.a}' WHERE invoiceId=101;
UPDATE assignments SET customer_master_id='${UUID.a}' WHERE assignmentId=201;
`;

const duplicateIdentifierSql = `
INSERT INTO customer_identifiers (id,customer_master_id,identifier_type,normalized_value,status,is_primary,source_system,provenance)
VALUES ('10000000-0000-4000-8000-000000000099','${UUID.b}','writex_id','ALPHA.USER','active',1,'synthetic',JSON_OBJECT('proof',true));
`;
const invalidSessionSql = `
INSERT INTO customer_sessions (id,customer_master_id,auth_scope,source_invoice_id,opaque_token_hmac,token_key_version,session_epoch,issued_at,idle_expires_at,absolute_expires_at)
VALUES ('90000000-0000-4000-8000-000000000099','${UUID.a}','invoice','101',UNHEX(SHA2('bad-session',256)),1,1,NOW(6),DATE_ADD(NOW(6),INTERVAL 30 MINUTE),DATE_ADD(NOW(6),INTERVAL 8 HOUR));
`;

const mergeFixtureSql = `
INSERT INTO customer_masters (id,preferred_name,status,source_system,source_provenance) VALUES
('${UUID.a}','Synthetic A','active','synthetic',JSON_OBJECT('proof',true)),('${UUID.b}','Synthetic B','active','synthetic',JSON_OBJECT('proof',true)),
('${UUID.c}','Synthetic C','active','synthetic',JSON_OBJECT('proof',true)),('${UUID.d}','Synthetic D','active','synthetic',JSON_OBJECT('proof',true)),
('${UUID.e}','Synthetic E','active','synthetic',JSON_OBJECT('proof',true)),('${UUID.f}','Synthetic F','active','synthetic',JSON_OBJECT('proof',true));
INSERT INTO customer_invoice_links (id,customer_master_id,source_system,source_invoice_id,public_invoice_ref,link_status,confidence,evidence) VALUES
('50000000-0000-4000-8000-000000000002','${UUID.b}','synthetic','102','INV-PROOF-102','confirmed','known',JSON_OBJECT('proof',true));
INSERT INTO customer_project_links (id,customer_master_id,customer_invoice_link_id,source_system,source_project_id,public_project_ref,link_status,confidence,evidence) VALUES
('60000000-0000-4000-8000-000000000002','${UUID.b}','50000000-0000-4000-8000-000000000002','synthetic','202','PRJ-PROOF-202','confirmed','known',JSON_OBJECT('proof',true));
INSERT INTO customer_manager_history (id,customer_master_id,source_system,source_user_id,manager_role,valid_from,change_reason,changed_by,provenance) VALUES
('70000000-0000-4000-8000-000000000002','${UUID.b}','synthetic','manager-2','relationship_manager',NOW(6),'proof','proof-runner',JSON_OBJECT('proof',true));
CREATE TABLE proof_payments (id BIGINT PRIMARY KEY, customer_invoice_link_id CHAR(36) NOT NULL, amount DECIMAL(10,2) NOT NULL, CONSTRAINT proof_payments_invoice_fk FOREIGN KEY (customer_invoice_link_id) REFERENCES customer_invoice_links(id));
CREATE TABLE proof_files (id BIGINT PRIMARY KEY, customer_project_link_id CHAR(36) NOT NULL, safe_ref VARCHAR(64) NOT NULL, CONSTRAINT proof_files_project_fk FOREIGN KEY (customer_project_link_id) REFERENCES customer_project_links(id));
INSERT INTO proof_payments VALUES (1,'50000000-0000-4000-8000-000000000002',100.00);
INSERT INTO proof_files VALUES (1,'60000000-0000-4000-8000-000000000002','FILE-PROOF-1');
INSERT INTO customer_duplicate_candidates (id,candidate_ref,customer_a_id,customer_b_id,confidence,status,rule_version,reasons,conflicts,source_snapshot,first_suggested_at,last_evaluated_at) VALUES
('c0000000-0000-4000-8000-000000000001','DUP-PROOF-A','${UUID.a}','${UUID.b}','high','under_review','v1',JSON_ARRAY('exact_phone'),JSON_ARRAY(),'synthetic',NOW(6),NOW(6)),
('c0000000-0000-4000-8000-000000000002','DUP-PROOF-B','${UUID.a}','${UUID.c}','high','suggested_duplicate','v1',JSON_ARRAY('exact_email'),JSON_ARRAY(),'synthetic',NOW(6),NOW(6)),
('c0000000-0000-4000-8000-000000000003','DUP-PROOF-C','${UUID.d}','${UUID.e}','low','confirmed_different_customer','v1',JSON_ARRAY('name_only'),JSON_ARRAY('different_phone'), 'synthetic',NOW(6),NOW(6)),
('c0000000-0000-4000-8000-000000000004','DUP-PROOF-D','${UUID.a}','${UUID.d}','medium','suggested_duplicate','v1',JSON_ARRAY('known_customer_phone_alias'),JSON_ARRAY(),'synthetic',NOW(6),NOW(6)),
('c0000000-0000-4000-8000-000000000005','DUP-PROOF-E','${UUID.b}','${UUID.c}','high','under_review','v1',JSON_ARRAY('invoice_wrongly_mapped'),JSON_ARRAY('ownership'), 'synthetic',NOW(6),NOW(6)),
('c0000000-0000-4000-8000-000000000006','DUP-PROOF-F','${UUID.a}','${UUID.f}','medium','under_review','v1',JSON_ARRAY('two_bde_owners'),JSON_ARRAY('manager'), 'synthetic',NOW(6),NOW(6));
`;

const mergeSql = `
UPDATE customer_invoice_links SET customer_master_id='${UUID.a}' WHERE customer_master_id='${UUID.b}';
UPDATE customer_project_links SET customer_master_id='${UUID.a}' WHERE customer_master_id='${UUID.b}';
UPDATE customer_manager_history SET customer_master_id='${UUID.a}' WHERE customer_master_id='${UUID.b}';
UPDATE customer_masters SET status='merged',merged_into_customer_master_id='${UUID.a}' WHERE id='${UUID.b}';
UPDATE customer_duplicate_candidates SET status='merged',reviewed_by='proof-reviewer',reviewed_at=NOW(6),review_reason='Synthetic approved proof' WHERE candidate_ref='DUP-PROOF-A';
INSERT INTO customer_merge_history (id,merge_ref,duplicate_candidate_id,event_type,survivor_customer_master_id,absorbed_customer_master_id,policy_version,source_snapshot,evidence_snapshot,impact_before,impact_after,expected_row_counts,actual_row_counts,approved_by,executed_by,reason,approved_at,executed_at)
VALUES ('d0000000-0000-4000-8000-000000000001','MERGE-PROOF-001','c0000000-0000-4000-8000-000000000001','merge_executed','${UUID.a}','${UUID.b}','v1','synthetic',JSON_OBJECT('case','A'),JSON_OBJECT('invoices',1,'projects',1,'payments',1,'files',1,'managerHistory',1),JSON_OBJECT('invoices',1,'projects',1,'payments',1,'files',1,'managerHistory',1),JSON_OBJECT('invoiceLinks',1,'projectLinks',1,'managerHistory',1),JSON_OBJECT('invoiceLinks',1,'projectLinks',1,'managerHistory',1),'proof-reviewer','proof-runner','Synthetic merge proof',NOW(6),NOW(6));
`;

const reverseSql = `
UPDATE customer_invoice_links SET customer_master_id='${UUID.b}' WHERE id='50000000-0000-4000-8000-000000000002';
UPDATE customer_project_links SET customer_master_id='${UUID.b}' WHERE id='60000000-0000-4000-8000-000000000002';
UPDATE customer_manager_history SET customer_master_id='${UUID.b}' WHERE id='70000000-0000-4000-8000-000000000002';
UPDATE customer_masters SET status='active',merged_into_customer_master_id=NULL WHERE id='${UUID.b}';
UPDATE customer_duplicate_candidates SET status='merge_reversed' WHERE candidate_ref='DUP-PROOF-A';
INSERT INTO customer_merge_history (id,merge_ref,duplicate_candidate_id,event_type,survivor_customer_master_id,absorbed_customer_master_id,previous_merge_event_id,policy_version,source_snapshot,evidence_snapshot,impact_before,impact_after,expected_row_counts,actual_row_counts,approved_by,executed_by,reason,approved_at,executed_at)
VALUES ('d0000000-0000-4000-8000-000000000002','MERGE-PROOF-REV-001','c0000000-0000-4000-8000-000000000001','merge_reversed','${UUID.a}','${UUID.b}','d0000000-0000-4000-8000-000000000001','v1','synthetic',JSON_OBJECT('case','G'),JSON_OBJECT('invoiceLinks',1,'projectLinks',1,'managerHistory',1),JSON_OBJECT('invoiceLinks',1,'projectLinks',1,'managerHistory',1),JSON_OBJECT('invoiceLinks',1,'projectLinks',1,'managerHistory',1),JSON_OBJECT('invoiceLinks',1,'projectLinks',1,'managerHistory',1),'proof-reviewer','proof-runner','Synthetic reverse proof',NOW(6),NOW(6));
`;

const startedAt = Date.now();
const result = {
  safety: {
    host: options.host,
    port: options.port,
    database: PROOF_DATABASE,
    productionConnection: false,
    syntheticDataOnly: true,
  },
  engine: {},
  migration: {},
  merge: {},
};

try {
  const engine = mysql("SELECT VERSION(),@@port,CURRENT_USER();").split("\t");
  if (Number(engine[1]) !== options.port) throw new Error("Connected port does not match proof port");
  result.engine = { version: engine[0], port: Number(engine[1]), user: engine[2] };
  mysql(`DROP DATABASE IF EXISTS ${PROOF_DATABASE};`);
  mysql(legacySql);
  result.migration.beforeLegacyCounts = legacyCounts();

  let phaseStart = Date.now();
  apply(upMigrations);
  result.migration.applyMs = Date.now() - phaseStart;
  mysql(migrationFixtureSql, PROOF_DATABASE);
  result.migration.apply = "PASS";
  result.migration.afterApply = {
    customerTables: customerTableCount(),
    optionalLegacyColumns: optionalColumnCount(),
    indexes: numberQuery("SELECT COUNT(DISTINCT table_name,index_name) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name LIKE 'customer\\_%';"),
    constraints: numberQuery("SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema=DATABASE() AND table_name LIKE 'customer\\_%';"),
    orphanInvoiceLinks: numberQuery("SELECT COUNT(*) FROM customer_invoice_links l LEFT JOIN customer_masters c ON c.id=l.customer_master_id WHERE c.id IS NULL;"),
    orphanProjectLinks: numberQuery("SELECT COUNT(*) FROM customer_project_links l LEFT JOIN customer_masters c ON c.id=l.customer_master_id WHERE c.id IS NULL;"),
    portalAccounts: numberQuery("SELECT COUNT(*) FROM customer_portal_accounts;"),
    managerHistory: numberQuery("SELECT COUNT(*) FROM customer_manager_history;"),
  };
  result.migration.constraintTests = {
    caseInsensitiveWriteXIdUniquenessRejected:
      mysql(duplicateIdentifierSql, PROOF_DATABASE, true) === null,
    invalidInvoiceCustomerScopeRejected:
      mysql(invalidSessionSql, PROOF_DATABASE, true) === null,
  };
  if (!Object.values(result.migration.constraintTests).every(Boolean)) {
    throw new Error("A mandatory constraint test did not reject invalid data");
  }

  phaseStart = Date.now();
  apply(downMigrations);
  result.migration.rollbackMs = Date.now() - phaseStart;
  result.migration.afterRollback = {
    customerTables: customerTableCount(),
    optionalLegacyColumns: optionalColumnCount(),
    legacyCounts: legacyCounts(),
  };
  result.migration.rollback =
    result.migration.afterRollback.customerTables === 0 &&
    result.migration.afterRollback.optionalLegacyColumns === 0 &&
    JSON.stringify(result.migration.afterRollback.legacyCounts) ===
      JSON.stringify(result.migration.beforeLegacyCounts)
      ? "PASS"
      : "FAIL";
  if (result.migration.rollback !== "PASS") throw new Error("Rollback reconciliation failed");

  phaseStart = Date.now();
  apply(upMigrations);
  result.migration.reapplyMs = Date.now() - phaseStart;
  result.migration.afterReapply = {
    customerTables: customerTableCount(),
    optionalLegacyColumns: optionalColumnCount(),
    legacyCounts: legacyCounts(),
  };
  result.migration.reapply =
    result.migration.afterReapply.customerTables === 15 &&
    result.migration.afterReapply.optionalLegacyColumns === 3 &&
    JSON.stringify(result.migration.afterReapply.legacyCounts) ===
      JSON.stringify(result.migration.beforeLegacyCounts)
      ? "PASS"
      : "FAIL";
  if (result.migration.reapply !== "PASS") throw new Error("Reapply reconciliation failed");

  mysql(mergeFixtureSql, PROOF_DATABASE);
  mysql(mergeSql, PROOF_DATABASE);
  const candidateCaseCount = numberQuery(
    "SELECT COUNT(*) FROM customer_duplicate_candidates;",
  );
  result.merge.afterMerge = {
    survivorStable: numberQuery(`SELECT COUNT(*) FROM customer_masters WHERE id='${UUID.a}' AND status='active' AND merged_into_customer_master_id IS NULL;`) === 1,
    absorbedMarkedMerged: numberQuery(`SELECT COUNT(*) FROM customer_masters WHERE id='${UUID.b}' AND status='merged' AND merged_into_customer_master_id='${UUID.a}';`) === 1,
    invoiceRelinked: numberQuery(`SELECT COUNT(*) FROM customer_invoice_links WHERE id='50000000-0000-4000-8000-000000000002' AND customer_master_id='${UUID.a}';`) === 1,
    projectRelinked: numberQuery(`SELECT COUNT(*) FROM customer_project_links WHERE id='60000000-0000-4000-8000-000000000002' AND customer_master_id='${UUID.a}';`) === 1,
    paymentLinkPreserved: numberQuery("SELECT COUNT(*) FROM proof_payments WHERE id=1 AND customer_invoice_link_id='50000000-0000-4000-8000-000000000002';") === 1,
    fileLinkPreserved: numberQuery("SELECT COUNT(*) FROM proof_files WHERE id=1 AND customer_project_link_id='60000000-0000-4000-8000-000000000002';") === 1,
    managerHistoryPreserved: numberQuery("SELECT COUNT(*) FROM customer_manager_history WHERE id='70000000-0000-4000-8000-000000000002';") === 1,
    mergeLedgerCreated: numberQuery("SELECT COUNT(*) FROM customer_merge_history WHERE event_type='merge_executed';") === 1,
    nameOnlyNotMerged: numberQuery("SELECT COUNT(*) FROM customer_duplicate_candidates c LEFT JOIN customer_merge_history h ON h.duplicate_candidate_id=c.id WHERE c.candidate_ref='DUP-PROOF-C' AND c.status='confirmed_different_customer' AND h.id IS NULL;") === 1,
    candidateCaseCount,
    casesRepresented: candidateCaseCount === 6,
  };
  result.merge.mergeProof = Object.entries(result.merge.afterMerge)
    .filter(([key]) => key !== "candidateCaseCount")
    .every(([, value]) => value === true)
    ? "PASS"
    : "FAIL";
  if (result.merge.mergeProof !== "PASS") throw new Error("Merge proof reconciliation failed");

  mysql(reverseSql, PROOF_DATABASE);
  result.merge.afterReverse = {
    absorbedRestored: numberQuery(`SELECT COUNT(*) FROM customer_masters WHERE id='${UUID.b}' AND status='active' AND merged_into_customer_master_id IS NULL;`) === 1,
    invoiceRestored: numberQuery(`SELECT COUNT(*) FROM customer_invoice_links WHERE id='50000000-0000-4000-8000-000000000002' AND customer_master_id='${UUID.b}';`) === 1,
    projectRestored: numberQuery(`SELECT COUNT(*) FROM customer_project_links WHERE id='60000000-0000-4000-8000-000000000002' AND customer_master_id='${UUID.b}';`) === 1,
    managerHistoryRestored: numberQuery(`SELECT COUNT(*) FROM customer_manager_history WHERE id='70000000-0000-4000-8000-000000000002' AND customer_master_id='${UUID.b}';`) === 1,
    paymentStillLinked: numberQuery("SELECT COUNT(*) FROM proof_payments WHERE id=1;") === 1,
    fileStillLinked: numberQuery("SELECT COUNT(*) FROM proof_files WHERE id=1;") === 1,
    reversalLedgerCreated: numberQuery("SELECT COUNT(*) FROM customer_merge_history WHERE event_type='merge_reversed' AND previous_merge_event_id IS NOT NULL;") === 1,
    statusReversed: numberQuery("SELECT COUNT(*) FROM customer_duplicate_candidates WHERE candidate_ref='DUP-PROOF-A' AND status='merge_reversed';") === 1,
  };
  result.merge.reverseProof = Object.values(result.merge.afterReverse).every(Boolean)
    ? "PASS"
    : "FAIL";
  if (result.merge.reverseProof !== "PASS") throw new Error("Reverse proof reconciliation failed");
} finally {
  result.runtimeMs = Date.now() - startedAt;
  try {
    mysql(`DROP DATABASE IF EXISTS ${PROOF_DATABASE};`);
    result.safety.proofDatabaseDropped = true;
  } catch {
    result.safety.proofDatabaseDropped = false;
  }
  fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
  fs.writeFileSync(path.resolve(options.output), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(result, null, 2));
