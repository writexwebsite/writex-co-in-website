import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const zipPath = process.argv[2];
if (!zipPath) {
  throw new Error(
    "Usage: node scripts/analyze-my-writex-remediation.mjs <approved-local-dump.zip>",
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
  return [
    ...sql
      .slice(createStart, createEnd)
      .matchAll(/^\s+`([^`]+)`/gm),
  ].map((match) => match[1]);
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

function normalizedName(firstName, lastName) {
  const value = `${firstName ?? ""} ${lastName ?? ""}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return value || null;
}

function addToGroup(map, key, value) {
  if (!key) return;
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function pseudonym(kind, value) {
  return `${kind}_${createHash("sha256")
    .update(`stage3b1:${kind}:${value}`)
    .digest("hex")
    .slice(0, 12)}`;
}

function union(...sets) {
  return new Set(sets.flatMap((set) => [...set]));
}

const allLeads = new Map();
const customerLeads = new Map();
const phoneGroups = new Map();
const emailGroups = new Map();
const nameGroups = new Map();
const phoneRepresentations = new Map();

const parsedLeadRows = loadRows(entries.leads, (row) => {
  const leadId = integer(row.leadId);
  if (leadId === null) return;
  const rawPhone = String(row.whatsappNumber ?? "").trim();
  const lead = {
    leadId,
    stage: integer(row.leadStage),
    isDeleted: integer(row.isDeleted) === 1,
    phone: normalizePhone(row.whatsappNumber, row.dialCode),
    email: normalizeEmail(row.email),
    name: normalizedName(row.firstName, row.lastName),
    rawPhonePresent: rawPhone.length > 0,
    rawPhoneRepresentation: `${String(row.dialCode ?? "").replace(/\s/g, "")}|${rawPhone.replace(/\s/g, "")}`,
    assignedTo: integer(row.assignedTo),
    createdBy: integer(row.createdBy),
  };
  allLeads.set(leadId, lead);
  if (lead.isDeleted || lead.stage === null || lead.stage < 5) return;
  customerLeads.set(leadId, lead);
  addToGroup(phoneGroups, lead.phone, leadId);
  addToGroup(emailGroups, lead.email, leadId);
  addToGroup(nameGroups, lead.name, { leadId, phone: lead.phone });
  if (lead.phone) {
    const representations = phoneRepresentations.get(lead.phone) ?? new Set();
    representations.add(lead.rawPhoneRepresentation);
    phoneRepresentations.set(lead.phone, representations);
  }
});

const duplicatePhoneGroups = new Map(
  [...phoneGroups].filter(([, leadIds]) => leadIds.length > 1),
);
const duplicateEmailGroups = new Map(
  [...emailGroups].filter(([, leadIds]) => leadIds.length > 1),
);
const ambiguousPhoneGroups = new Map(
  [...phoneRepresentations].filter(([, representations]) => representations.size > 1),
);
const duplicatePhoneLeadIds = new Set([...duplicatePhoneGroups.values()].flat());
const duplicateEmailLeadIds = new Set([...duplicateEmailGroups.values()].flat());
const ambiguousPhoneLeadIds = new Set(
  [...ambiguousPhoneGroups.keys()].flatMap((phone) => phoneGroups.get(phone) ?? []),
);

const invoices = new Map();
const reliableInvoiceLeadIds = new Set();
const invoiceOwnershipConflictLeadIds = new Set();
const orphanInvoiceIds = new Set();
const invoiceCreatorsByLead = new Map();
let activeInvoiceCount = 0;

const parsedInvoiceRows = loadRows(entries.invoices, (row) => {
  const invoiceId = integer(row.invoiceId);
  if (invoiceId === null || integer(row.isDeleted) === 1) return;
  activeInvoiceCount += 1;
  const leadId = integer(row.leadId);
  const invoicePhone = normalizePhone(row.whatsappNumber, null);
  const creator = integer(row.createdBy);
  const invoice = { invoiceId, leadId, invoicePhone, creator, reliable: false };
  invoices.set(invoiceId, invoice);

  if (leadId === null) {
    orphanInvoiceIds.add(invoiceId);
    return;
  }
  const lead = allLeads.get(leadId);
  if (!lead || lead.isDeleted || !customerLeads.has(leadId)) {
    orphanInvoiceIds.add(invoiceId);
    return;
  }
  const creators = invoiceCreatorsByLead.get(leadId) ?? new Set();
  if (creator !== null) creators.add(creator);
  invoiceCreatorsByLead.set(leadId, creators);

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
});

const reliableAssignmentLeadIds = new Set();
const assignmentConflictLeadIds = new Set();
const orphanAssignmentIds = new Set();
let activeAssignmentCount = 0;

const parsedAssignmentRows = loadRows(entries.assignments, (row) => {
  if (integer(row.isDeleted) === 1) return;
  activeAssignmentCount += 1;
  const assignmentId = integer(row.assignmentId) ?? activeAssignmentCount;
  const leadId = integer(row.leadId);
  const invoiceId = integer(row.invoiceId);
  const lead = leadId === null ? undefined : allLeads.get(leadId);
  const invoice = invoiceId === null ? undefined : invoices.get(invoiceId);
  const reliable = Boolean(
    leadId !== null &&
      invoiceId !== null &&
      lead &&
      !lead.isDeleted &&
      customerLeads.has(leadId) &&
      invoice &&
      invoice.leadId === leadId,
  );
  if (reliable) {
    reliableAssignmentLeadIds.add(leadId);
    return;
  }
  orphanAssignmentIds.add(assignmentId);
  if (leadId !== null && customerLeads.has(leadId)) {
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

const invalidPhoneLeadIds = new Set(
  [...customerLeads.values()]
    .filter((lead) => !lead.phone)
    .map((lead) => lead.leadId),
);
const missingPhoneLeadIds = new Set(
  [...customerLeads.values()]
    .filter((lead) => !lead.rawPhonePresent)
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

const humanReviewLeadIds = new Set(
  [...hardReviewLeadIds].filter((leadId) => customerLeads.has(leadId)),
);
const sameNameDifferentPhoneGroups = [...nameGroups.entries()].filter(
  ([, records]) => new Set(records.map((record) => record.phone).filter(Boolean)).size > 1,
);

function exampleRefs(kind, values, limit = 3) {
  return [...values].slice(0, limit).map((value) => pseudonym(kind, value));
}

const queue = [
  {
    category: "A",
    label: "Clean customer ownership",
    grain: "potential customer lead",
    count: eligibleLeadIds.size,
    autoFixSafe: "No mutation needed",
    action: "Eligible for staged Customer Master creation after approvals",
    humanReviewRequired: "No",
    blocksLogin: "No",
    blocksHistory: "No",
    blocksManager: "No",
    severity: "Low",
    confidence: "High",
    examples: exampleRefs("lead", eligibleLeadIds),
  },
  {
    category: "B",
    label: "Exact-phone duplicate",
    grain: "potential customer lead",
    count: duplicatePhoneLeadIds.size,
    groupCount: duplicatePhoneGroups.size,
    autoFixSafe: "No",
    action: "Auto-suggest only; authorized identity review",
    humanReviewRequired: "Yes",
    blocksLogin: "Yes",
    blocksHistory: "Yes",
    blocksManager: "Conditional",
    severity: "High",
    confidence: "High",
    examples: exampleRefs("phone_group", duplicatePhoneGroups.keys()),
  },
  {
    category: "C",
    label: "Exact-email duplicate",
    grain: "potential customer lead",
    count: duplicateEmailLeadIds.size,
    groupCount: duplicateEmailGroups.size,
    autoFixSafe: "No",
    action: "Auto-suggest only; verify email and phone context",
    humanReviewRequired: "Yes",
    blocksLogin: "Conditional",
    blocksHistory: "Yes",
    blocksManager: "Conditional",
    severity: "High",
    confidence: "High",
    examples: exampleRefs("email_group", duplicateEmailGroups.keys()),
  },
  {
    category: "D",
    label: "Conflicting ownership",
    grain: "potential customer lead",
    count: union(invoiceOwnershipConflictLeadIds, assignmentConflictLeadIds).size,
    autoFixSafe: "No",
    action: "Reconcile lead, invoice, assignment and contact evidence",
    humanReviewRequired: "Yes",
    blocksLogin: "Yes",
    blocksHistory: "Yes",
    blocksManager: "Yes",
    severity: "Critical",
    confidence: "High",
    examples: exampleRefs(
      "ownership",
      union(invoiceOwnershipConflictLeadIds, assignmentConflictLeadIds),
    ),
  },
  {
    category: "E",
    label: "Missing phone",
    grain: "potential customer lead",
    count: missingPhoneLeadIds.size,
    autoFixSafe: "No",
    action: "Obtain and verify an authorized registered phone",
    humanReviewRequired: "Yes",
    blocksLogin: "Yes",
    blocksHistory: "No",
    blocksManager: "No",
    severity: "High",
    confidence: "High",
    examples: exampleRefs("lead", missingPhoneLeadIds),
  },
  {
    category: "F",
    label: "Invalid or ambiguous phone",
    grain: "potential customer lead",
    count: union(invalidPhoneLeadIds, ambiguousPhoneLeadIds).size,
    groupCount: ambiguousPhoneGroups.size,
    autoFixSafe: "Format normalization only after reviewed country evidence",
    action: "Validate country code and canonical E.164 value",
    humanReviewRequired: "Yes",
    blocksLogin: "Yes",
    blocksHistory: "No",
    blocksManager: "No",
    severity: "High",
    confidence: "High",
    examples: exampleRefs("phone_format", ambiguousPhoneGroups.keys()),
  },
  {
    category: "G",
    label: "Invoice orphan",
    grain: "active invoice",
    count: orphanInvoiceIds.size,
    autoFixSafe: "No",
    action: "Reconstruct ownership from authorized source evidence",
    humanReviewRequired: "Yes",
    blocksLogin: "Yes for invoice scope",
    blocksHistory: "Yes",
    blocksManager: "Conditional",
    severity: "Critical",
    confidence: "High",
    examples: exampleRefs("invoice", orphanInvoiceIds),
  },
  {
    category: "H",
    label: "Project orphan",
    grain: "active assignment/project",
    count: orphanAssignmentIds.size,
    autoFixSafe: "No",
    action: "Reconcile lead and invoice parents before linking",
    humanReviewRequired: "Yes",
    blocksLogin: "Conditional",
    blocksHistory: "Yes",
    blocksManager: "Conditional",
    severity: "Critical",
    confidence: "High",
    examples: exampleRefs("assignment", orphanAssignmentIds),
  },
  {
    category: "I",
    label: "Multiple-BDE conflict",
    grain: "potential customer lead",
    count: bdeConflictLeadIds.size,
    autoFixSafe: "No",
    action: "Choose current manager and preserve full manager history",
    humanReviewRequired: "Yes",
    blocksLogin: "No",
    blocksHistory: "No",
    blocksManager: "Yes",
    severity: "High",
    confidence: "High",
    examples: exampleRefs("bde", bdeConflictLeadIds),
  },
  {
    category: "J",
    label: "Requires human review",
    grain: "unique potential customer lead",
    count: humanReviewLeadIds.size,
    autoFixSafe: "No",
    action: "Work the controlled review queue; categories may overlap",
    humanReviewRequired: "Yes",
    blocksLogin: "Conditional by underlying reason",
    blocksHistory: "Conditional by underlying reason",
    blocksManager: "Conditional by underlying reason",
    severity: "High",
    confidence: "High",
    examples: exampleRefs("review", humanReviewLeadIds),
  },
];

const result = {
  evidence: {
    source: "Local read-only SQL dump ZIP",
    snapshotLabel: "Dump20260717",
    evidenceLevel: "E2 — locally reproduced; production parity not asserted",
    piiPolicy: "Counts and deterministic anonymized references only",
  },
  grain: {
    eligibility: "non-deleted lead rows at customer stages 5 or higher",
    queue: "mixed, explicitly labeled per category",
  },
  parsedRows: {
    leads: parsedLeadRows,
    invoices: parsedInvoiceRows,
    assignments: parsedAssignmentRows,
    activeInvoices: activeInvoiceCount,
    activeAssignments: activeAssignmentCount,
    potentialCustomers: customerLeads.size,
  },
  eligibility: {
    eligible: eligibleLeadIds.size,
    reviewRequired: reviewRequiredLeadIds.size,
    notEligible: notEligibleLeadIds.size,
    reconcilesToPotentialCustomers:
      eligibleLeadIds.size + reviewRequiredLeadIds.size + notEligibleLeadIds.size,
    definitions: {
      eligible:
        "Valid normalized phone, at least one reliable invoice/project link, and no hard identity/ownership/BDE conflict.",
      reviewRequired:
        "Contactable and reliably linked, but an identity, ownership, format, assignment, or manager conflict remains.",
      notEligible:
        "No valid normalized phone or no reliable invoice/project link. Test/internal exclusions are unavailable in this snapshot and remain a pre-activation gate.",
    },
  },
  queue,
  nonBlockingWatchlist: {
    sameNameDifferentPhoneGroups: sameNameDifferentPhoneGroups.length,
    treatment:
      "Name-only similarity is not an identity conflict, is never auto-merged, and does not block eligibility without independent evidence.",
  },
};

if (result.eligibility.reconcilesToPotentialCustomers !== customerLeads.size) {
  throw new Error("Eligibility partition did not reconcile to potential customer rows.");
}

console.log(JSON.stringify(result, null, 2));
