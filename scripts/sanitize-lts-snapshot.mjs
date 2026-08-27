#!/usr/bin/env node

/**
 * OFFLINE SANITIZATION TOOL — NEVER CONNECTS TO LTS OR A DATABASE.
 *
 * It accepts an explicitly approved local SQL-dump ZIP and writes a new ZIP
 * containing sanitized SQL plus an aggregate verification manifest. IDs and
 * foreign-key values are preserved; PII is deterministically pseudonymized so
 * duplicate and relationship patterns remain testable.
 */
import { createHash, createHmac } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import yauzl from "yauzl";
import yazl from "yazl";

const MAX_SQL_ENTRY_BYTES = 256 * 1024 * 1024;

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--self-test") return { selfTest: true };
    if (!argument.startsWith("--") || !argv[index + 1]) {
      throw new Error(`Invalid argument: ${argument}`);
    }
    values.set(argument.slice(2), argv[++index]);
  }
  return {
    input: values.get("input"),
    output: values.get("output"),
    approvalRef: values.get("approval-ref"),
    sourceEnvironment: values.get("source-environment"),
    snapshotTime: values.get("snapshot-time"),
    keyEnv: values.get("key-env") ?? "LTS_SANITIZATION_KEY",
  };
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

function openZip(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (error, zipFile) =>
      error ? reject(error) : resolve(zipFile),
    );
  });
}

function entryBuffer(zipFile, entry) {
  if (entry.uncompressedSize > MAX_SQL_ENTRY_BYTES) {
    throw new Error(`Entry exceeds ${MAX_SQL_ENTRY_BYTES} bytes: ${entry.fileName}`);
  }
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) return reject(error);
      const chunks = [];
      let size = 0;
      stream.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_SQL_ENTRY_BYTES) stream.destroy(new Error("Entry size limit exceeded"));
        else chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  });
}

function decodeSqlString(raw) {
  let value = "";
  for (let index = 1; index < raw.length - 1; index += 1) {
    if (raw[index] !== "\\") {
      value += raw[index];
      continue;
    }
    index += 1;
    value += {
      "0": "\0",
      b: "\b",
      n: "\n",
      r: "\r",
      t: "\t",
      Z: "\x1a",
    }[raw[index]] ?? raw[index];
  }
  return value;
}

function sqlString(value) {
  return `'${String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\0", "\\0")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")}'`;
}

function piiKind(columnName) {
  const compact = columnName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "id" || compact.endsWith("id")) return null;
  if (/password|passwd|secret|token|otp|credential|apikey|privatekey/.test(compact)) return "credential";
  if (/email/.test(compact)) return "email";
  if (/whatsapp|mobile|telephone|phoneno|phonenumber|contactnumber/.test(compact)) return "phone";
  if (/firstname|lastname|fullname|customername|clientname|username|employeename|assignmentname/.test(compact)) return "name";
  if (/address|postcode|postalcode|zipcode/.test(compact)) return "address";
  if (/dateofbirth|birthdate|dob/.test(compact)) return "date";
  if (/bankaccount|accountnumber|upi|aadhar|aadhaar|passport|pannumber|ifsc|swift/.test(compact)) return "financial";
  if (/filepath|filename|fileurl|document|attachment|resume|photo|image|signature|curriculumvitae/.test(compact)) return "file";
  if (/ipaddress|useragent|devicefingerprint|deviceid/.test(compact)) return "device";
  if (/requirement|brief|description|comment|message|query|solution|feedback|internalnote/.test(compact)) return "free_text";
  return null;
}

function createPseudonymizer(key) {
  const digest = (kind, value) =>
    createHmac("sha256", key)
      .update(`${kind}:${String(value).normalize("NFKC").trim().toLowerCase()}`)
      .digest("hex");

  return (kind, value) => {
    const hash = digest(kind, value);
    switch (kind) {
      case "credential":
        return "REDACTED";
      case "email":
        return `person_${hash.slice(0, 12)}@example.invalid`;
      case "phone": {
        const digits = (BigInt(`0x${hash.slice(0, 12)}`) % 1_000_000n)
          .toString()
          .padStart(6, "0");
        return `+447000${digits}`;
      }
      case "name":
        return `Person_${hash.slice(0, 12)}`;
      case "address":
        return `Address_${hash.slice(0, 12)}`;
      case "date": {
        const year = String(value).match(/^(19|20)\d{2}/)?.[0] ?? "2000";
        return `${year}-01-01`;
      }
      case "financial":
        return `FIN_${hash.slice(0, 12)}`;
      case "file":
        return `sanitized/${hash.slice(0, 16)}.bin`;
      case "device":
        return `DEVICE_${hash.slice(0, 12)}`;
      case "free_text":
        return `[SANITIZED_TEXT_${hash.slice(0, 12)}]`;
      default:
        throw new Error(`Unsupported PII kind: ${kind}`);
    }
  };
}

function tableColumns(sql) {
  const start = sql.indexOf("CREATE TABLE");
  const end = sql.indexOf("PRIMARY KEY", start);
  if (start < 0 || end < 0) return [];
  return [...sql.slice(start, end).matchAll(/^\s+`([^`]+)`/gm)].map(
    (match) => match[1],
  );
}

function parseToken(sql, start) {
  if (sql[start] === "'") {
    let index = start + 1;
    while (index < sql.length) {
      if (sql[index] === "\\") index += 2;
      else if (sql[index] === "'") {
        index += 1;
        return {
          raw: sql.slice(start, index),
          value: decodeSqlString(sql.slice(start, index)),
          next: index,
        };
      } else index += 1;
    }
    throw new Error("Unterminated SQL string");
  }
  let index = start;
  while (index < sql.length && ![",", ")"].includes(sql[index])) index += 1;
  const raw = sql.slice(start, index).trim();
  return { raw, value: /^NULL$/i.test(raw) ? null : raw, next: index };
}

function sanitizeSql(sql, entryName, key) {
  const columns = tableColumns(sql);
  if (!columns.length || !sql.includes("INSERT INTO")) {
    return { sql, rowCount: 0, transformed: 0, transformations: {} };
  }
  const pseudonymize = createPseudonymizer(key);
  const transformations = {};
  let transformed = 0;
  let rowCount = 0;
  let cursor = 0;
  let output = "";

  while (true) {
    const insertAt = sql.indexOf("INSERT INTO", cursor);
    if (insertAt < 0) {
      output += sql.slice(cursor);
      break;
    }
    const valuesAt = sql.indexOf(" VALUES ", insertAt);
    if (valuesAt < 0) throw new Error(`INSERT without VALUES in ${entryName}`);
    const rowsStart = valuesAt + " VALUES ".length;
    output += sql.slice(cursor, rowsStart);
    let index = rowsStart;
    const serializedRows = [];
    while (index < sql.length) {
      while (/\s/.test(sql[index] ?? "")) index += 1;
      if (sql[index] === ";") break;
      if (sql[index] === ",") {
        index += 1;
        continue;
      }
      if (sql[index] !== "(") throw new Error(`Unexpected INSERT syntax in ${entryName}`);
      index += 1;
      const serialized = [];
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
        while (/\s/.test(sql[index] ?? "")) index += 1;
        const token = parseToken(sql, index);
        index = token.next;
        const kind = piiKind(columns[columnIndex]);
        if (kind && token.value !== null && String(token.value).length > 0) {
          serialized.push(sqlString(pseudonymize(kind, token.value)));
          transformations[kind] = (transformations[kind] ?? 0) + 1;
          transformed += 1;
        } else {
          serialized.push(token.raw);
        }
        while (/\s/.test(sql[index] ?? "")) index += 1;
        if (columnIndex < columns.length - 1) {
          if (sql[index] !== ",") throw new Error(`Column mismatch in ${entryName}`);
          index += 1;
        }
      }
      while (/\s/.test(sql[index] ?? "")) index += 1;
      if (sql[index] !== ")") throw new Error(`Row terminator missing in ${entryName}`);
      index += 1;
      serializedRows.push(`(${serialized.join(",")})`);
      rowCount += 1;
    }
    if (sql[index] !== ";") throw new Error(`INSERT terminator missing in ${entryName}`);
    output += `${serializedRows.join(",\n")};`;
    cursor = index + 1;
  }

  return { sql: output, rowCount, transformed, transformations };
}

async function sanitizeArchive(options) {
  for (const [name, value] of Object.entries(options)) {
    if (name !== "selfTest" && !value) throw new Error(`Missing required option: ${name}`);
  }
  if (!/^[A-Za-z0-9._:/-]{4,128}$/.test(options.approvalRef)) {
    throw new Error("approval-ref must be a safe, non-empty approval identifier");
  }
  if (!Number.isFinite(Date.parse(options.snapshotTime))) {
    throw new Error("snapshot-time must be an ISO-8601 date/time");
  }
  if (/^https?:|^\\\\/.test(options.input)) {
    throw new Error("input must be an offline local file, never a URL or network share");
  }
  const input = path.resolve(options.input);
  const output = path.resolve(options.output);
  if (input === output || path.extname(input).toLowerCase() !== ".zip") {
    throw new Error("input must be a ZIP and output must be a different path");
  }
  if (await fsp.stat(input).then((stat) => !stat.isFile()).catch(() => true)) {
    throw new Error("approved input ZIP does not exist");
  }
  if (await fsp.stat(output).then(() => true).catch(() => false)) {
    throw new Error("output already exists; refusing to overwrite evidence");
  }
  const key = process.env[options.keyEnv];
  if (!key || key.length < 32) {
    throw new Error(`${options.keyEnv} must contain at least 32 characters`);
  }

  const inputSha256 = await sha256File(input);
  const sourceZip = await openZip(input);
  const targetZip = new yazl.ZipFile();
  const report = {
    schemaVersion: 1,
    sourceEnvironment: options.sourceEnvironment,
    snapshotTime: options.snapshotTime,
    approvalRef: options.approvalRef,
    inputSha256,
    evidence: "Offline sanitization; no database or network connection",
    piiStrategy: "Deterministic HMAC pseudonyms; IDs and foreign keys preserved",
    sqlEntries: 0,
    rows: 0,
    transformedValues: 0,
    transformations: {},
    skippedNonSqlEntries: 0,
  };

  await new Promise((resolve, reject) => {
    sourceZip.on("error", reject);
    sourceZip.on("end", resolve);
    sourceZip.on("entry", async (entry) => {
      try {
        if (/\/$/.test(entry.fileName)) {
          sourceZip.readEntry();
          return;
        }
        if (!entry.fileName.toLowerCase().endsWith(".sql")) {
          report.skippedNonSqlEntries += 1;
          sourceZip.readEntry();
          return;
        }
        const buffer = await entryBuffer(sourceZip, entry);
        const result = sanitizeSql(buffer.toString("utf8"), entry.fileName, key);
        targetZip.addBuffer(Buffer.from(result.sql, "utf8"), entry.fileName);
        report.sqlEntries += 1;
        report.rows += result.rowCount;
        report.transformedValues += result.transformed;
        for (const [kind, count] of Object.entries(result.transformations)) {
          report.transformations[kind] = (report.transformations[kind] ?? 0) + count;
        }
        sourceZip.readEntry();
      } catch (error) {
        reject(error);
      }
    });
    sourceZip.readEntry();
  });

  targetZip.addBuffer(
    Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8"),
    "SANITIZATION_REPORT.json",
  );
  await fsp.mkdir(path.dirname(output), { recursive: true });
  const outputStream = fs.createWriteStream(output, { flags: "wx" });
  targetZip.outputStream.pipe(outputStream);
  targetZip.end();
  await new Promise((resolve, reject) => {
    outputStream.on("close", resolve);
    outputStream.on("error", reject);
  });
  console.log(JSON.stringify({ ok: true, output, report }, null, 2));
}

function selfTest() {
  const sample = `CREATE TABLE \`leads\` (\n  \`leadId\` int NOT NULL,\n  \`firstName\` varchar(50),\n  \`email\` varchar(100),\n  \`whatsappNumber\` varchar(30),\n  \`password\` varchar(100),\n  PRIMARY KEY (\`leadId\`)\n);\nINSERT INTO \`leads\` VALUES (1,'Alex','same@example.com','+447700900001','secret'),(2,'Alex','same@example.com','+447700900001','secret');\n`;
  const result = sanitizeSql(sample, "synthetic_leads.sql", "x".repeat(32));
  if (result.rowCount !== 2 || result.transformed !== 8) throw new Error("Unexpected self-test counts");
  if (/same@example\.com|447700900001|'secret'/.test(result.sql)) throw new Error("PII survived self-test");
  if (!result.sql.includes("(1,") || !result.sql.includes("(2,")) throw new Error("IDs changed");
  const emails = [...result.sql.matchAll(/person_[a-f0-9]+@example\.invalid/g)].map((match) => match[0]);
  const phones = [...result.sql.matchAll(/\+447000\d{6}/g)].map((match) => match[0]);
  if (new Set(emails).size !== 1 || new Set(phones).size !== 1) {
    throw new Error("Duplicate relationships were not preserved");
  }
  console.log(JSON.stringify({ ok: true, selfTest: "PASS", rows: result.rowCount, transformed: result.transformed }));
}

const options = parseArgs(process.argv.slice(2));
if (options.selfTest) selfTest();
else await sanitizeArchive(options);
