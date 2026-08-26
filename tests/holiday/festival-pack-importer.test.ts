import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";
import yazl from "yazl";
import {
  computeFestivalPackCompleteness,
  scanFestivalZip
} from "../../lib/holiday/festival-pack-scanner";

async function zipBuffer(files: Array<{ name: string; data: Buffer | string }>) {
  const zip = new yazl.ZipFile();
  for (const file of files) {
    zip.addBuffer(
      typeof file.data === "string" ? Buffer.from(file.data) : file.data,
      file.name
    );
  }
  zip.end();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.once("error", reject);
    zip.outputStream.once("end", resolve);
  });
  return Buffer.concat(chunks);
}

async function png(width = 1200, height = 675, alpha = false) {
  return sharp({
    create: {
      width,
      height,
      channels: alpha ? 4 : 3,
      background: alpha
        ? { r: 109, g: 40, b: 217, alpha: 0.75 }
        : { r: 109, g: 40, b: 217 }
    }
  })
    .png()
    .toBuffer();
}

function wav() {
  const buffer = Buffer.alloc(48);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(40, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(4, 40);
  return buffer;
}

test("standard WriteX festival package classifies responsive, decorative and audio assets", async () => {
  const image = await png();
  const mobile = await png(480, 800);
  const archive = await zipBuffer([
    {
      name: "manifest.json",
      data: JSON.stringify({ version: 1, name: "Test Festival" })
    },
    { name: "assets/hero-desktop.png", data: image },
    { name: "assets/hero-mobile.png", data: mobile },
    { name: "assets/background-wide.png", data: image },
    { name: "assets/background-ultrawide.png", data: image },
    { name: "assets/background-dark.png", data: image },
    { name: "assets/header/ornament.png", data: await png(900, 300, true) },
    { name: "assets/footer/accent.png", data: await png(900, 300, true) },
    { name: "assets/audio/ambience.wav", data: wav() },
    { name: "tokens/light.json", data: JSON.stringify({ primary: "#6d28d9" }) },
    { name: "tokens/dark.json", data: JSON.stringify({ primary: "#a78bfa" }) }
  ]);
  const result = await scanFestivalZip({
    buffer: archive,
    sourceFileName: "test-festival.zip",
    requestedMode: "auto_detected"
  });
  assert.equal(result.mode, "standard_writex");
  assert.equal(result.blockedEntryCount, 0);
  assert.ok(result.files.some((file) => file.detectedClassification === "homepage_hero"));
  assert.ok(result.files.some((file) => file.detectedClassification === "header_decoration"));
  assert.ok(result.files.some((file) => file.detectedClassification === "audio"));
  assert.ok(result.files.some((file) => file.responsiveVariant === "mobile"));
  assert.ok(result.files.some((file) => file.responsiveVariant === "dark"));
  assert.ok(result.completenessFlags.includes("ready_to_activate"));
});

test("unusual image names require explicit manual mapping instead of guessing", async () => {
  const archive = await zipBuffer([
    { name: "visuals/final-thing-47.png", data: await png(1280, 720, true) }
  ]);
  const result = await scanFestivalZip({
    buffer: archive,
    sourceFileName: "unusual.zip",
    requestedMode: "auto_detected"
  });
  assert.equal(result.manualMappingCount, 1);
  assert.equal(result.files[0]?.inspectionStatus, "manual_mapping_required");
  assert.deepEqual(result.files[0]?.suggestedMappings, [
    { location: "reference_only", variant: "default" }
  ]);
});

test("flat mockup with baked form is reference-only and cannot become a second login form", async () => {
  const archive = await zipBuffer([
    { name: "Design 2.png", data: await png(1600, 1000) }
  ]);
  const result = await scanFestivalZip({
    buffer: archive,
    sourceFileName: "designer-flat-mockup.zip",
    requestedMode: "legacy_designer"
  });
  const file = result.files[0];
  assert.equal(file?.embeddedUiState, "contains_embedded_ui");
  assert.equal(file?.inspectionStatus, "manual_mapping_required");
  assert.equal(file?.suggestedMappings[0]?.location, "reference_only");
  assert.ok(result.completenessFlags.includes("flat_mockup_only"));
  const importer = readFileSync("components/admin/FestivalPackImporter.tsx", "utf8");
  assert.match(importer, /one real functional login form/i);
});

test("package missing mobile artwork reports the exact completeness gap", async () => {
  const archive = await zipBuffer([
    { name: "assets/client-login/background-wide.png", data: await png() }
  ]);
  const result = await scanFestivalZip({
    buffer: archive,
    sourceFileName: "desktop-only.zip",
    requestedMode: "auto_detected"
  });
  assert.ok(result.completenessFlags.includes("missing_mobile_assets"));
});

test("unsafe scripts are recorded as blocked and never extracted", async () => {
  const archive = await zipBuffer([
    { name: "assets/client-login/background-wide.png", data: await png() },
    { name: "preview/app.js", data: "fetch('/steal')" },
    { name: "install.bat", data: "echo unsafe" },
    { name: "angular/login.component.ts", data: "export class Login {}" },
    { name: "preview/index.html", data: "<form>reference only</form>" },
    { name: "preview/styles.css", data: ".form{}" }
  ]);
  const result = await scanFestivalZip({
    buffer: archive,
    sourceFileName: "legacy-designer.zip",
    requestedMode: "auto_detected"
  });
  assert.equal(result.mode, "legacy_designer");
  assert.equal(result.blockedEntryCount, 3);
  for (const file of result.files.filter((item) => item.kind === "unsafe")) {
    assert.equal(file.buffer, undefined);
    assert.equal(file.inspectionStatus, "rejected_unsafe");
    assert.equal(file.suggestedMappings[0]?.location, "ignore");
  }
  assert.equal(
    result.files.find((file) => file.archivePath.endsWith("index.html"))?.inspectionStatus,
    "reference_only"
  );
});

test("approved audio is classified as Sound with signature validation", async () => {
  const archive = await zipBuffer([
    { name: "assets/audio/festival-ambience.wav", data: wav() }
  ]);
  const result = await scanFestivalZip({
    buffer: archive,
    sourceFileName: "sound-pack.zip",
    requestedMode: "auto_detected"
  });
  assert.equal(result.files[0]?.kind, "audio");
  assert.deepEqual(result.files[0]?.suggestedMappings, [
    { location: "sound", variant: "default" }
  ]);
});

test("completeness never reports activation-ready for a flat mockup-only package", () => {
  const flags = computeFestivalPackCompleteness([
    {
      inspectionStatus: "manual_mapping_required",
      suggestedMappings: [{ location: "reference_only", variant: "wide" }],
      embeddedUiState: "contains_embedded_ui"
    }
  ]);
  assert.ok(flags.includes("flat_mockup_only"));
  assert.ok(!flags.includes("ready_to_activate"));
});

const independenceZip =
  "C:/Users/Writex/Downloads/WriteX_Login_Production_Ready_Independence_Day_FINAL_FIXED.zip";

test(
  "current Independence Day designer ZIP imports as a legacy package",
  { skip: !existsSync(independenceZip), timeout: 60_000 },
  async () => {
    const result = await scanFestivalZip({
      buffer: readFileSync(independenceZip),
      sourceFileName: "WriteX_Login_Production_Ready_Independence_Day_FINAL_FIXED.zip",
      requestedMode: "auto_detected"
    });
    assert.equal(result.mode, "legacy_designer");
    assert.ok(result.blockedEntryCount >= 1);
    assert.ok(
      result.files.some((file) =>
        file.suggestedMappings.some((mapping) => mapping.location === "client_login_background")
      )
    );
    assert.ok(
      result.files.some((file) =>
        file.suggestedMappings.some((mapping) => mapping.location === "employee_login_background")
      )
    );
    assert.ok(result.completenessFlags.includes("ready_to_activate"));
  }
);

test("importer architecture persists private ZIPs, versions, mappings and audit history", () => {
  const migration = readFileSync(
    "database/migrations/20260731_festival_pack_importer.sql",
    "utf8"
  );
  const route = readFileSync(
    "app/api/admin/website-experience/festival-packs/route.ts",
    "utf8"
  );
  const repository = readFileSync(
    "lib/holiday/festival-pack-repository.ts",
    "utf8"
  );
  assert.match(migration, /create table if not exists festival_pack_imports/i);
  assert.match(migration, /create table if not exists festival_pack_files/i);
  assert.match(migration, /create table if not exists festival_pack_audit/i);
  assert.match(migration, /previous_pack_id/i);
  assert.match(route, /assetType: "festival_pack_zip"/);
  assert.match(route, /Promise\.allSettled\(uploadedKeys/);
  assert.match(repository, /package_approved/);
  assert.match(repository, /package_activated/);
  assert.match(repository, /restorePreviousFestivalPack/);
  assert.doesNotMatch(route, /eval\(|new Function|child_process/);
});
