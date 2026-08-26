import ExcelJS from "exceljs";
import { hashRepresentativeMobile } from "@/lib/trust/representative-hash";
import { mobileLastFour, normalizeIndianMobile } from "@/lib/trust/mobile";

const REQUIRED_HEADERS = [
  "Mobile Number",
  "Full Name",
  "Designation",
  "Department",
  "Status"
] as const;

const MAX_DATA_ROWS = 5_000;

export type RepresentativeImportErrorRow = {
  row: number;
  errors: string[];
};

export type ParsedRepresentative = {
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  normalizedMobileHash: string;
  mobileLastFour: string;
  status: "Active";
  isPubliclyVerifiable: true;
  sourceSystem: "excel";
};

export type ParsedRepresentativeWorkbook = {
  representatives: ParsedRepresentative[];
  ignoredCount: number;
  duplicateCount: number;
  errorRows: RepresentativeImportErrorRow[];
  activeRowCount: number;
};

export class RepresentativeWorkbookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepresentativeWorkbookValidationError";
  }
}

function cellText(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return value.text.trim();
  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function validateText(value: string, label: string) {
  if (!value) return `${label} is required.`;
  if (value.length > 160) return `${label} must be 160 characters or fewer.`;
  return null;
}

export async function parseRepresentativeWorkbook(
  buffer: Buffer,
  hmacSecret: string
): Promise<ParsedRepresentativeWorkbook> {
  if (!hmacSecret) {
    throw new RepresentativeWorkbookValidationError(
      "Representative import security is not configured."
    );
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new RepresentativeWorkbookValidationError(
      "The uploaded file is not a valid XLSX workbook."
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new RepresentativeWorkbookValidationError(
      "The workbook must contain at least one worksheet."
    );
  }

  const headerIndexes = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headerIndexes.set(cellText(cell.value).toLowerCase(), columnNumber);
  });

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerIndexes.has(header.toLowerCase())
  );
  if (missingHeaders.length) {
    throw new RepresentativeWorkbookValidationError(
      `Missing required columns: ${missingHeaders.join(", ")}.`
    );
  }

  const dataRowCount = Math.max(worksheet.actualRowCount - 1, 0);
  if (dataRowCount > MAX_DATA_ROWS) {
    throw new RepresentativeWorkbookValidationError(
      `The workbook exceeds the ${MAX_DATA_ROWS.toLocaleString("en-IN")} row import limit.`
    );
  }

  type Candidate = {
    row: number;
    normalizedMobile: string;
    fullName: string;
    designation: string;
    department: string;
  };

  const candidates: Candidate[] = [];
  const errorRows: RepresentativeImportErrorRow[] = [];
  let ignoredCount = 0;

  const column = (header: (typeof REQUIRED_HEADERS)[number]) =>
    headerIndexes.get(header.toLowerCase())!;

  for (let rowNumber = 2; rowNumber <= worksheet.actualRowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const mobile = cellText(row.getCell(column("Mobile Number")).value);
    const fullName = cellText(row.getCell(column("Full Name")).value);
    const designation = cellText(row.getCell(column("Designation")).value);
    const department = cellText(row.getCell(column("Department")).value);
    const status = cellText(row.getCell(column("Status")).value);

    if (![mobile, fullName, designation, department, status].some(Boolean)) {
      ignoredCount += 1;
      continue;
    }

    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "inactive") {
      ignoredCount += 1;
      continue;
    }

    const errors = [
      validateText(fullName, "Full Name"),
      validateText(designation, "Designation"),
      validateText(department, "Department")
    ].filter((error): error is string => Boolean(error));

    if (normalizedStatus !== "active") {
      errors.push("Status must be Active or Inactive.");
    }

    const normalizedMobile = normalizeIndianMobile(mobile);
    if (!normalizedMobile) {
      errors.push("Mobile Number is not a valid Indian mobile number.");
    }

    if (errors.length || !normalizedMobile) {
      ignoredCount += 1;
      errorRows.push({ row: rowNumber, errors });
      continue;
    }

    candidates.push({
      row: rowNumber,
      normalizedMobile,
      fullName,
      designation,
      department
    });
  }

  const mobileCounts = new Map<string, number>();
  for (const candidate of candidates) {
    mobileCounts.set(
      candidate.normalizedMobile,
      (mobileCounts.get(candidate.normalizedMobile) ?? 0) + 1
    );
  }

  const uniqueCandidates = candidates.filter((candidate) => {
    if ((mobileCounts.get(candidate.normalizedMobile) ?? 0) === 1) return true;
    ignoredCount += 1;
    errorRows.push({
      row: candidate.row,
      errors: ["Duplicate mobile number in spreadsheet."]
    });
    return false;
  });

  const duplicateCount = candidates.length - uniqueCandidates.length;
  const representatives = uniqueCandidates.map((candidate) => {
    const normalizedMobileHash = hashRepresentativeMobile(
      candidate.normalizedMobile,
      hmacSecret
    );

    return {
      employeeId: `excel-${normalizedMobileHash.slice(0, 32)}`,
      fullName: candidate.fullName,
      designation: candidate.designation,
      department: candidate.department,
      normalizedMobileHash,
      mobileLastFour: mobileLastFour(candidate.normalizedMobile),
      status: "Active" as const,
      isPubliclyVerifiable: true as const,
      sourceSystem: "excel" as const
    };
  });

  return {
    representatives,
    ignoredCount,
    duplicateCount,
    errorRows: errorRows.sort((left, right) => left.row - right.row),
    activeRowCount: candidates.length
  };
}
