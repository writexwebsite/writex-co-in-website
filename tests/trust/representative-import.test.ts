import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  parseRepresentativeWorkbook,
  RepresentativeWorkbookValidationError
} from "../../lib/trust/representative-import-parser";

const HEADERS = [
  "Mobile Number",
  "Full Name",
  "Designation",
  "Department",
  "Status"
];

async function workbookBuffer(rows: unknown[][], headers = HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Representatives");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}

test("parses active rows and ignores inactive rows", async () => {
  const result = await parseRepresentativeWorkbook(
    await workbookBuffer([
      [
        "+91 98765-43210",
        "Rahul Sharma",
        "Senior Business Development Executive",
        "Business Development",
        "Active"
      ],
      [
        "9123456789",
        "Priya Singh",
        "Team Leader",
        "Business Development",
        "Inactive"
      ]
    ]),
    "test-hmac-secret"
  );

  assert.equal(result.representatives.length, 1);
  assert.equal(result.ignoredCount, 1);
  assert.equal(result.duplicateCount, 0);
  assert.equal(result.representatives[0].mobileLastFour, "3210");
  assert.match(result.representatives[0].employeeId, /^excel-[a-f0-9]{32}$/);
  assert.equal(
    "normalizedMobile" in result.representatives[0],
    false,
    "the parsed persistence record must not expose a raw mobile number"
  );
});

test("excludes every occurrence of a duplicate normalized mobile", async () => {
  const result = await parseRepresentativeWorkbook(
    await workbookBuffer([
      ["9876543210", "First", "Executive", "Sales", "Active"],
      ["91 98765 43210", "Second", "Manager", "Sales", "Active"]
    ]),
    "test-hmac-secret"
  );

  assert.equal(result.representatives.length, 0);
  assert.equal(result.duplicateCount, 2);
  assert.equal(result.ignoredCount, 2);
  assert.deepEqual(
    result.errorRows.map((row) => row.row),
    [2, 3]
  );
});

test("reports invalid active rows without including the submitted value", async () => {
  const result = await parseRepresentativeWorkbook(
    await workbookBuffer([
      ["12345", "Invalid Mobile", "Executive", "Sales", "Active"],
      ["9876543210", "", "Executive", "Sales", "Active"]
    ]),
    "test-hmac-secret"
  );

  assert.equal(result.representatives.length, 0);
  assert.equal(result.ignoredCount, 2);
  assert.equal(JSON.stringify(result.errorRows).includes("12345"), false);
  assert.match(result.errorRows[0].errors[0], /valid Indian mobile/);
});

test("rejects workbooks missing required columns", async () => {
  const buffer = await workbookBuffer([["9876543210", "Rahul"]], [
    "Mobile Number",
    "Full Name"
  ]);

  await assert.rejects(
    () =>
      parseRepresentativeWorkbook(
        buffer,
        "test-hmac-secret"
      ),
    RepresentativeWorkbookValidationError
  );
});
