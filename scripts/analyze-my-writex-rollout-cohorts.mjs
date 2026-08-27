#!/usr/bin/env node

/**
 * Produces aggregate-only Stage 3B-2 rollout-cohort counts from the approved
 * local evidence ZIP. It never prints names, phones, emails, IDs, or rows.
 */
import { execFileSync } from "node:child_process";

const zipPath = process.argv[2];
if (!zipPath) {
  throw new Error(
    "Usage: node scripts/analyze-my-writex-rollout-cohorts.mjs <approved-local-dump.zip>",
  );
}

const entries = {
  leads: "Dump20260717/writex_lts_leads.sql",
  invoices: "Dump20260717/writex_lts_invoices.sql",
  assignments: "Dump20260717/writex_lts_assignments.sql",
};

function loadEntry(entryName) {
  return execFileSync("tar", ["-xOf", zipPath, entryName], {
    encoding: "utf8",
    maxBuffer: 160 * 1024 * 1024,
    windowsHide: true,
  });
}

function columnNames(sql) {
  const createStart = sql.indexOf("CREATE TABLE");
  const createEnd = sql.indexOf("PRIMARY KEY", createStart);
  return [...sql.slice(createStart, createEnd).matchAll(/^\s+`([^`]+)`/gm)].map(
    (match) => match[1],
  );
}

function decodeEscape(character) {
  return {
    "0": "\0",
    b: "\b",
    n: "\n",
    r: "\r",
    t: "\t",
    Z: "\x1a",
  }[character] ?? character;
}

function forEachSqlRow(sql, callback) {
  let searchFrom = 0;
  while (true) {
    const insertAt = sql.indexOf("INSERT INTO", searchFrom);
    if (insertAt === -1) return;
    const valuesAt = sql.indexOf(" VALUES ", insertAt);
    if (valuesAt === -1) return;
    let index = valuesAt + " VALUES ".length;
    while (index < sql.length) {
      while (/[,\s]/.test(sql[index] ?? "")) index += 1;
      if (sql[index] === ";") {
        searchFrom = index + 1;
        break;
      }
      if (sql[index] !== "(") {
        searchFrom = index + 1;
        break;
      }
      index += 1;
      const row = [];
      while (index < sql.length) {
        if (sql[index] === "'") {
          index += 1;
          let value = "";
          while (index < sql.length) {
            if (sql[index] === "\\") {
              index += 1;
              value += decodeEscape(sql[index]);
              index += 1;
            } else if (sql[index] === "'") {
              index += 1;
              break;
            } else {
              value += sql[index];
              index += 1;
            }
          }
          row.push(value);
        } else {
          const start = index;
          while (index < sql.length && ![",", ")"].includes(sql[index])) index += 1;
          const token = sql.slice(start, index).trim();
          row.push(token === "NULL" ? null : token);
        }
        if (sql[index] === ",") {
          index += 1;
          continue;
        }
        if (sql[index] === ")") {
          index += 1;
          callback(row);
          break;
        }
      }
    }
  }
}

function loadRows(entryName, callback) {
  const sql = loadEntry(entryName);
  const columns = columnNames(sql);
  let count = 0;
  forEachSqlRow(sql, (values) => {
    count += 1;
    callback(
      Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null])),
    );
  });
  return count;
}

function integer(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEmail(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function normalizePhone(whatsappNumber, dialCode) {
  let digits = String(whatsappNumber ?? "").replace(/\D/g, "");
  const dial = String(dialCode ?? "").replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (dial && digits.length === 10 && !digits.startsWith(dial)) digits = `${dial}${digits}`;
  else if (dial && digits.startsWith("0") && digits.length >= 9 && digits.length <= 11) {
    digits = `${dial}${digits.slice(1)}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function addToGroup(map, key, value) {
  if (!key) return;
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function union(...sets) {
  return new Set(sets.flatMap((set) => [...set]));
}

const allLeads = new Map();
const customerLeads = new Map();
const phoneGroups = new Map();
const emailGroups = new Map();
const phoneRepresentations = new Map();

const parsedLeadRows = loadRows(entries.leads, (row) => {
  const leadId = integer(row.leadId);
  if (leadId === null) return;
  const phone = normalizePhone(row.whatsappNumber, row.dialCode);
  const lead = {
    leadId,
    stage: integer(row.leadStage),
    isDeleted: integer(row.isDeleted) === 1,
    phone,
    email: normalizeEmail(row.email),
    rawPhoneRepresentation: `${String(row.dialCode ?? "").replace(/\s/g, "")}|${String(
      row.whatsappNumber ?? "",
    ).replace(/\s/g, "")}`,
    assignedTo: integer(row.assignedTo),
    createdBy: integer(row.createdBy),
  };
  allLeads.set(leadId, lead);
  if (lead.isDeleted || lead.stage === null || lead.stage < 5) return;
  customerLeads.set(leadId, lead);
  addToGroup(phoneGroups, lead.phone, leadId);
  addToGroup(emailGroups, lead.email, leadId);
  if (phone) {
    const representations = phoneRepresentations.get(phone) ?? new Set();
    representations.add(lead.rawPhoneRepresentation);
    phoneRepresentations.set(phone, representations);
  }
});

const duplicatePhoneLeadIds = new Set(
  [...phoneGroups.values()].filter((values) => values.length > 1).flat(),
);
const duplicateEmailLeadIds = new Set(
  [...emailGroups.values()].filter((values) => values.length > 1).flat(),
);
const ambiguousPhoneLeadIds = new Set(
  [...phoneRepresentations]
    .filter(([, representations]) => representations.size > 1)
    .flatMap(([phone]) => phoneGroups.get(phone) ?? []),
);

const invoices = new Map();
const reliableInvoiceLeadIds = new Set();
const reliableInvoiceCounts = new Map();
const invoiceOwnershipConflictLeadIds = new Set();
const invoiceCreatorsByLead = new Map();

const parsedInvoiceRows = loadRows(entries.invoices, (row) => {
  const invoiceId = integer(row.invoiceId);
  if (invoiceId === null || integer(row.isDeleted) === 1) return;
  const leadId = integer(row.leadId);
  const invoicePhone = normalizePhone(row.whatsappNumber, null);
  const creator = integer(row.createdBy);
  const invoice = { invoiceId, leadId, reliable: false };
  invoices.set(invoiceId, invoice);
  if (leadId === null || !customerLeads.has(leadId)) return;

  const creators = invoiceCreatorsByLead.get(leadId) ?? new Set();
  if (creator !== null) creators.add(creator);
  invoiceCreatorsByLead.set(leadId, creators);

  const lead = allLeads.get(leadId);
  if (
    lead.phone &&
    invoicePhone &&
    lead.phone !== invoicePhone &&
    !invoicePhone.endsWith(lead.phone) &&
    !lead.phone.endsWith(invoicePhone)
  ) {
    invoiceOwnershipConflictLeadIds.add(leadId);
    return;
  }
  invoice.reliable = true;
  reliableInvoiceLeadIds.add(leadId);
  increment(reliableInvoiceCounts, leadId);
});

const reliableAssignmentLeadIds = new Set();
const reliableAssignmentCounts = new Map();
const assignmentConflictLeadIds = new Set();

const parsedAssignmentRows = loadRows(entries.assignments, (row) => {
  if (integer(row.isDeleted) === 1) return;
  const leadId = integer(row.leadId);
  const invoiceId = integer(row.invoiceId);
  const invoice = invoiceId === null ? undefined : invoices.get(invoiceId);
  const reliable = Boolean(
    leadId !== null &&
      invoiceId !== null &&
      customerLeads.has(leadId) &&
      invoice &&
      invoice.leadId === leadId,
  );
  if (reliable) {
    reliableAssignmentLeadIds.add(leadId);
    increment(reliableAssignmentCounts, leadId);
  } else if (leadId !== null && customerLeads.has(leadId)) {
    assignmentConflictLeadIds.add(leadId);
  }
});

const bdeConflictLeadIds = new Set(
  [...customerLeads.values()]
    .filter((lead) => {
      const creators = invoiceCreatorsByLead.get(lead.leadId) ?? new Set();
      const owner = lead.assignedTo ?? lead.createdBy;
      return creators.size > 1 || (owner !== null && [...creators].some((id) => id !== owner));
    })
    .map((lead) => lead.leadId),
);

const hardReviewLeadIds = union(
  duplicatePhoneLeadIds,
  duplicateEmailLeadIds,
  ambiguousPhoneLeadIds,
  invoiceOwnershipConflictLeadIds,
  assignmentConflictLeadIds,
  bdeConflictLeadIds,
);
const reliablyLinkedLeadIds = union(reliableInvoiceLeadIds, reliableAssignmentLeadIds);

const eligibleLeadIds = new Set();
const reviewRequiredLeadIds = new Set();
const notEligibleLeadIds = new Set();
for (const lead of customerLeads.values()) {
  if (!lead.phone || !reliablyLinkedLeadIds.has(lead.leadId)) {
    notEligibleLeadIds.add(lead.leadId);
  } else if (hardReviewLeadIds.has(lead.leadId)) {
    reviewRequiredLeadIds.add(lead.leadId);
  } else {
    eligibleLeadIds.add(lead.leadId);
  }
}

const cohortA = new Set();
const cohortB = new Set();
let pilotQualifiedByVolume = 0;
for (const leadId of eligibleLeadIds) {
  const lead = customerLeads.get(leadId);
  const invoicesCount = reliableInvoiceCounts.get(leadId) ?? 0;
  const projectsCount = reliableAssignmentCounts.get(leadId) ?? 0;
  const knownOwner = (lead.assignedTo ?? lead.createdBy) !== null;
  const repeatEvidence = invoicesCount >= 2 || projectsCount >= 2;
  if (repeatEvidence && knownOwner) cohortA.add(leadId);
  else cohortB.add(leadId);
  if (knownOwner && (invoicesCount >= 3 || projectsCount >= 3)) {
    pilotQualifiedByVolume += 1;
  }
}

const total = customerLeads.size;
const result = {
  evidence: {
    level: "E2 — local aggregate analysis; production parity not asserted",
    snapshotLabel: "Dump20260717",
    privacy: "Counts only; no customer identifiers or PII emitted",
  },
  definition: {
    cohortA:
      "Eligible, known current owner, and repeat evidence from at least two reliable invoices or projects. Recency must be rechecked on the approved fresh snapshot.",
    cohortB:
      "All other eligible records: clean identity/ownership but single/low-volume evidence or no confirmed current owner in this snapshot.",
    cohortC: "Review Required under the Stage 3B-1 eligibility policy.",
    cohortD: "Not Eligible under the Stage 3B-1 eligibility policy.",
  },
  counts: {
    cohortA: cohortA.size,
    cohortB: cohortB.size,
    cohortC: reviewRequiredLeadIds.size,
    cohortD: notEligibleLeadIds.size,
    eligible: eligibleLeadIds.size,
    total,
    pilotQualifiedByVolume,
  },
  checks: {
    eligibleReconciles: cohortA.size + cohortB.size === eligibleLeadIds.size,
    totalReconciles:
      cohortA.size + cohortB.size + reviewRequiredLeadIds.size + notEligibleLeadIds.size ===
      total,
    expectedEligible: eligibleLeadIds.size === 4979,
    expectedReviewRequired: reviewRequiredLeadIds.size === 336,
    expectedNotEligible: notEligibleLeadIds.size === 1423,
  },
  parsedRows: {
    leads: parsedLeadRows,
    invoices: parsedInvoiceRows,
    assignments: parsedAssignmentRows,
  },
};

if (!Object.values(result.checks).every(Boolean)) {
  throw new Error("Cohort analysis did not reconcile to the Stage 3B-1 eligibility baseline.");
}

console.log(JSON.stringify(result, null, 2));
