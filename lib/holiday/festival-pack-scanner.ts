import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import yauzl, { type Entry, type ZipFile } from "yauzl";
import { badRequest } from "@/lib/api/response";
import {
  describeHolidayImageDimensions,
  normalizeHolidayMediaMimeType,
  validateHolidayMediaAsset
} from "./assets";
import {
  FESTIVAL_PACK_MODES,
  type FestivalPackCompletenessFlag,
  type FestivalPackMapping,
  type FestivalPackMode,
  type FestivalPackResponsiveVariant,
  type FestivalPackScanResult,
  type ScannedFestivalPackFile
} from "./festival-pack-types";

const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const MAX_ENTRY_COUNT = 500;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 320 * 1024 * 1024;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_JSON_BYTES = 512 * 1024;
const MAX_COMPRESSION_RATIO = 200;

const unsafeExtensions = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".bat",
  ".cmd",
  ".exe",
  ".msi",
  ".com",
  ".scr",
  ".ps1",
  ".sh",
  ".bash",
  ".zsh",
  ".php",
  ".py",
  ".rb",
  ".pl",
  ".jar",
  ".war",
  ".dll",
  ".so",
  ".dylib"
]);

const designReferenceExtensions = new Set([
  ".html",
  ".htm",
  ".css",
  ".md",
  ".txt",
  ".pdf"
]);

const imageMimeByExtension: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml"
};

const audioMimeByExtension: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav"
};

type ZipEntryRecord = {
  entry: Entry;
  archivePath: string;
  extension: string;
};

function openZip(buffer: Buffer) {
  return new Promise<ZipFile>((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, decodeStrings: true, validateEntrySizes: true },
      (error, zipFile) => {
        if (error || !zipFile) reject(error || new Error("ZIP could not be opened."));
        else resolve(zipFile);
      }
    );
  });
}

function readEntry(zipFile: ZipFile, entry: Entry, maxBytes: number) {
  return new Promise<Buffer>((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error || new Error("ZIP entry could not be read."));
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      stream.on("data", (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > maxBytes) {
          stream.destroy(new Error("ZIP entry exceeds its safe extraction limit."));
          return;
        }
        chunks.push(chunk);
      });
      stream.once("error", reject);
      stream.once("end", () => resolve(Buffer.concat(chunks)));
    });
  });
}

function isUnsafeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  return (
    !normalized ||
    normalized.includes("\0") ||
    normalized.startsWith("/") ||
    /^[a-z]:/i.test(normalized) ||
    normalized.split("/").some((segment) => segment === "..")
  );
}

function isSymlink(entry: Entry) {
  const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (unixMode & 0o170000) === 0o120000;
}

function safeBaseName(archivePath: string) {
  return (
    path.posix
      .basename(archivePath.replace(/\\/g, "/"))
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 140) || "asset"
  );
}

function safeJsonObject(buffer: Buffer) {
  const parsed = JSON.parse(buffer.toString("utf8")) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Declarative JSON must contain one object.");
  }
  const source = buffer.toString("utf8");
  if (/"(?:__proto__|prototype|constructor)"\s*:/i.test(source)) {
    throw new Error("Declarative JSON contains a blocked property.");
  }
  return parsed as Record<string, unknown>;
}

function responsiveVariant(name: string): FestivalPackResponsiveVariant {
  const value = name.toLowerCase();
  if (/ultra[-_ ]?wide|21[-_ ]?9/.test(value)) return "ultrawide";
  if (/4[-_ ]?x[-_ ]?3|four[-_ ]?three/.test(value)) return "four_three";
  if (/mobile|phone|portrait/.test(value)) return "mobile";
  if (/tablet|ipad/.test(value)) return "tablet";
  if (/desktop|wide|16[-_ ]?9/.test(value)) return "wide";
  if (/(^|[-_/])dark([-. _/]|$)/.test(value)) return "dark";
  if (/(^|[-_/])light([-. _/]|$)/.test(value)) return "light";
  return "default";
}

function isFlatMockup({
  archivePath,
  width,
  height,
  hasAlpha
}: {
  archivePath: string;
  width: number | null;
  height: number | null;
  hasAlpha: boolean | null;
}) {
  if (!width || !height) return false;
  const name = archivePath.toLowerCase();
  return (
    /mockup|preview|screenshot|design[-_ ]?\d|full[-_ ]?(page|screen)/.test(name) &&
    width / height > 1.15 &&
    hasAlpha !== true
  );
}

function classifyAsset({
  archivePath,
  kind,
  mode,
  width,
  height,
  hasAlpha
}: {
  archivePath: string;
  kind: ScannedFestivalPackFile["kind"];
  mode: FestivalPackMode;
  width: number | null;
  height: number | null;
  hasAlpha: boolean | null;
}): Pick<
  ScannedFestivalPackFile,
  | "detectedClassification"
  | "confidence"
  | "reasons"
  | "suggestedMappings"
  | "inspectionStatus"
  | "embeddedUiState"
> {
  const value = archivePath.toLowerCase().replace(/\\/g, "/");
  const variant = responsiveVariant(value);
  const mappings: FestivalPackMapping[] = [];
  const reasons: string[] = [];

  if (kind === "audio") {
    return {
      detectedClassification: "audio",
      confidence: 0.99,
      reasons: ["Supported audio signature and audio filename/folder."],
      suggestedMappings: [{ location: "sound", variant }],
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (kind === "design_tokens") {
    const tokenMode = value.includes("dark") ? "dark" : value.includes("light") ? "light" : variant;
    return {
      detectedClassification: "design_tokens",
      confidence: 0.98,
      reasons: ["Declarative JSON in a manifest or tokens location."],
      suggestedMappings: [
        { location: "palette_source", variant: tokenMode as FestivalPackResponsiveVariant }
      ],
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (kind !== "image") {
    return {
      detectedClassification: kind,
      confidence: kind === "design_reference" ? 1 : 0,
      reasons: [
        kind === "design_reference"
          ? "Reference files are never rendered or executed."
          : "File is not an approved public asset."
      ],
      suggestedMappings: [{ location: "reference_only", variant }],
      inspectionStatus: kind === "design_reference" ? "reference_only" : "ignored",
      embeddedUiState: "no_embedded_ui"
    };
  }

  if (isFlatMockup({ archivePath, width, height, hasAlpha })) {
    return {
      detectedClassification: "flat_mockup_with_embedded_ui",
      confidence: 0.97,
      reasons: [
        "Flat preview/mockup imagery may contain a baked login form and is reference-only."
      ],
      suggestedMappings: [{ location: "reference_only", variant }],
      inspectionStatus: "manual_mapping_required",
      embeddedUiState: "contains_embedded_ui"
    };
  }

  if (/logo|brand[-_ ]?mark/.test(value)) {
    mappings.push({ location: "logo", variant });
    reasons.push("Filename identifies a brand/logo asset.");
    return {
      detectedClassification: "logo",
      confidence: 0.97,
      reasons,
      suggestedMappings: mappings,
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (/axo|mascot|robot/.test(value)) {
    mappings.push({ location: "axo_asset", variant });
    reasons.push("Filename or folder identifies an Axo/mascot asset.");
    return {
      detectedClassification: "axo",
      confidence: 0.96,
      reasons,
      suggestedMappings: mappings,
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (/header|ornament|nav[-_ ]?rail|garland/.test(value)) {
    mappings.push({ location: "header_decoration", variant });
    reasons.push("Filename or folder identifies header decoration.");
    return {
      detectedClassification: "header_decoration",
      confidence: 0.93,
      reasons,
      suggestedMappings: mappings,
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (/footer/.test(value)) {
    mappings.push({ location: "footer_decoration", variant });
    reasons.push("Filename or folder identifies footer decoration.");
    return {
      detectedClassification: "footer_decoration",
      confidence: 0.93,
      reasons,
      suggestedMappings: mappings,
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }

  const clientLogin = /client[-_ /]?login/.test(value);
  const employeeLogin = /employee[-_ /]?login|team[-_ /]?login/.test(value);
  const genericLogin = /login/.test(value) || mode === "legacy_designer";
  const formSkin = /form[-_ ]?(skin|frame)|card[-_ ]?skin/.test(value);
  const hero = /hero|artwork|foreground/.test(value);
  const background = /background|backdrop|canvas|scene/.test(value);

  if (formSkin && (clientLogin || genericLogin)) {
    mappings.push({ location: "client_login_form_skin", variant });
  }
  if (formSkin && (employeeLogin || genericLogin)) {
    mappings.push({ location: "employee_login_form_skin", variant });
  }
  if (hero && (clientLogin || genericLogin)) {
    mappings.push({ location: "client_login_hero", variant });
  }
  if (hero && (employeeLogin || genericLogin)) {
    mappings.push({ location: "employee_login_hero", variant });
  }
  if (background && (clientLogin || genericLogin)) {
    mappings.push({ location: "client_login_background", variant });
  }
  if (background && (employeeLogin || genericLogin)) {
    mappings.push({ location: "employee_login_background", variant });
  }
  if (mappings.length > 0) {
    reasons.push(
      mode === "legacy_designer"
        ? "Legacy login package structure and responsive filename were recognised."
        : "Login route and asset-role keywords were recognised."
    );
    return {
      detectedClassification: formSkin
        ? "login_form_skin"
        : hero
          ? "login_hero"
          : "login_background",
      confidence: mode === "legacy_designer" ? 0.94 : 0.9,
      reasons,
      suggestedMappings: mappings,
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }

  if (/home(page)?/.test(value) && hero) {
    return {
      detectedClassification: "homepage_hero",
      confidence: 0.9,
      reasons: ["Homepage and hero keywords were recognised."],
      suggestedMappings: [{ location: "homepage_hero", variant }],
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (hero && mode === "standard_writex") {
    return {
      detectedClassification: "homepage_hero",
      confidence: 0.88,
      reasons: ["Standard WriteX package hero naming was recognised."],
      suggestedMappings: [{ location: "homepage_hero", variant }],
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (background) {
    return {
      detectedClassification: "website_background",
      confidence: 0.76,
      reasons: ["Background filename and image aspect ratio were recognised."],
      suggestedMappings: [{ location: "website_background", variant }],
      inspectionStatus: "validated",
      embeddedUiState: "no_embedded_ui"
    };
  }
  if (hasAlpha && width && height) {
    return {
      detectedClassification: "transparent_artwork",
      confidence: 0.58,
      reasons: ["Transparent artwork needs a human placement decision."],
      suggestedMappings: [{ location: "reference_only", variant }],
      inspectionStatus: "manual_mapping_required",
      embeddedUiState: "needs_review"
    };
  }
  return {
    detectedClassification: "unclassified_image",
    confidence: 0.35,
    reasons: ["Filename and dimensions do not identify a safe public placement."],
    suggestedMappings: [{ location: "reference_only", variant }],
    inspectionStatus: "manual_mapping_required",
    embeddedUiState: "needs_review"
  };
}

function detectMode({
  requestedMode,
  sourceFileName,
  entries,
  manifest
}: {
  requestedMode: FestivalPackMode;
  sourceFileName: string;
  entries: ZipEntryRecord[];
  manifest: Record<string, unknown> | null;
}) {
  if (requestedMode !== "auto_detected") return requestedMode;
  const paths = entries.map((entry) => entry.archivePath.toLowerCase());
  if (
    manifest &&
    paths.some((value) =>
      /(^|\/)assets\/(hero|background|login-hero|login-background)-/.test(value)
    )
  ) {
    return "standard_writex" as const;
  }
  if (
    /login|designer/i.test(sourceFileName) ||
    paths.some((value) =>
      /angular-drop-in|preview\/index\.html|login\.component/.test(value)
    )
  ) {
    return "legacy_designer" as const;
  }
  return "auto_detected" as const;
}

export function computeFestivalPackCompleteness(
  files: Array<
    Pick<
      ScannedFestivalPackFile,
      "inspectionStatus" | "suggestedMappings" | "embeddedUiState"
    >
  >
) {
  const flags: FestivalPackCompletenessFlag[] = [];
  const mappings = files.flatMap((file) => file.suggestedMappings);
  const locations = new Set(mappings.map((mapping) => mapping.location));
  const variants = new Set(mappings.map((mapping) => mapping.variant));
  const manual = files.some(
    (file) => file.inspectionStatus === "manual_mapping_required"
  );
  const flatOnly =
    files.some((file) => file.embeddedUiState === "contains_embedded_ui") &&
    !mappings.some((mapping) =>
      [
        "client_login_hero",
        "client_login_background",
        "employee_login_hero",
        "employee_login_background"
      ].includes(mapping.location)
    );

  if (!variants.has("mobile")) flags.push("missing_mobile_assets");
  if (!variants.has("dark")) flags.push("missing_dark_variant");
  if (
    !locations.has("client_login_hero") &&
    !locations.has("employee_login_hero") &&
    !locations.has("client_login_background") &&
    !locations.has("employee_login_background")
  ) {
    flags.push("missing_login_hero");
  }
  if (
    !locations.has("homepage_hero") &&
    !locations.has("website_background") &&
    !locations.has("header_decoration") &&
    !locations.has("footer_decoration")
  ) {
    flags.push("missing_website_decorations");
  }
  if (!locations.has("sound")) flags.push("missing_audio");
  if (manual) flags.push("manual_mapping_required");
  if (flatOnly) flags.push("flat_mockup_only");

  const hasRenderableCore = mappings.some(
    (mapping) =>
      !["reference_only", "ignore", "palette_source", "logo"].includes(
        mapping.location
      )
  );
  if (hasRenderableCore && !manual && !flatOnly) {
    flags.push("ready_to_activate");
  }
  if (
    flags.every((flag) =>
      ["missing_audio", "missing_dark_variant"].includes(flag)
    ) &&
    hasRenderableCore
  ) {
    flags.unshift("complete");
  }
  return [...new Set(flags)];
}

export async function scanFestivalZip({
  buffer,
  sourceFileName,
  requestedMode = "auto_detected"
}: {
  buffer: Buffer;
  sourceFileName: string;
  requestedMode?: FestivalPackMode;
}): Promise<FestivalPackScanResult> {
  if (!FESTIVAL_PACK_MODES.includes(requestedMode)) {
    throw badRequest("Choose a supported festival package mode.");
  }
  if (buffer.byteLength <= 0 || buffer.byteLength > MAX_ZIP_BYTES) {
    throw badRequest("Festival ZIP files must be between 1 byte and 80 MB.");
  }
  if (
    buffer.byteLength < 4 ||
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b ||
    ![0x03, 0x05, 0x07].includes(buffer[2])
  ) {
    throw badRequest("The uploaded file is not a valid ZIP package.");
  }

  const zipFile = await openZip(buffer);
  const entries: ZipEntryRecord[] = [];
  let totalUncompressed = 0;
  await new Promise<void>((resolve, reject) => {
    zipFile.once("error", reject);
    zipFile.once("end", resolve);
    zipFile.on("entry", (entry: Entry) => {
      try {
        if (entries.length >= MAX_ENTRY_COUNT) {
          throw new Error("Festival ZIP contains too many files.");
        }
        const archivePath = entry.fileName.replace(/\\/g, "/");
        if (isUnsafeArchivePath(archivePath) || isSymlink(entry)) {
          throw new Error("Festival ZIP contains an unsafe path or symbolic link.");
        }
        if ((entry.generalPurposeBitFlag & 0x1) !== 0) {
          throw new Error("Encrypted ZIP entries are not supported.");
        }
        if (!archivePath.endsWith("/")) {
          totalUncompressed += entry.uncompressedSize;
          if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
            throw new Error("Festival ZIP expands beyond the safe package limit.");
          }
          const ratio =
            entry.compressedSize > 0
              ? entry.uncompressedSize / entry.compressedSize
              : entry.uncompressedSize;
          if (
            entry.uncompressedSize > 1024 * 1024 &&
            ratio > MAX_COMPRESSION_RATIO
          ) {
            throw new Error("Festival ZIP contains a suspicious compression ratio.");
          }
          entries.push({
            entry,
            archivePath,
            extension: path.posix.extname(archivePath).toLowerCase()
          });
        }
        zipFile.readEntry();
      } catch (error) {
        reject(error);
        zipFile.close();
      }
    });
    zipFile.readEntry();
  }).catch((error) => {
    throw badRequest(
      error instanceof Error
        ? error.message
        : "Festival ZIP validation failed."
    );
  });

  let manifest: Record<string, unknown> | null = null;
  const rawFiles: Array<
    Omit<ScannedFestivalPackFile, "detectedClassification" | "confidence" | "reasons" | "suggestedMappings" | "inspectionStatus" | "embeddedUiState">
  > = [];

  const contentZip = await openZip(buffer);
  const byPath = new Map(entries.map((record) => [record.archivePath, record]));
  await new Promise<void>((resolve, reject) => {
    contentZip.once("error", reject);
    contentZip.once("end", resolve);
    contentZip.on("entry", (entry: Entry) => {
      const record = byPath.get(entry.fileName.replace(/\\/g, "/"));
      if (!record) {
        contentZip.readEntry();
        return;
      }
      void (async () => {
        const base = {
          archivePath: record.archivePath,
          safeFileName: safeBaseName(record.archivePath),
          compressedSize: entry.compressedSize,
          uncompressedSize: entry.uncompressedSize,
          responsiveVariant: responsiveVariant(record.archivePath),
          rejectionReason: null,
          checksumSha256: null,
          width: null,
          height: null,
          hasAlpha: null,
          buffer: undefined,
          parsedJson: null
        } satisfies Omit<
          ScannedFestivalPackFile,
          "kind" | "mimeType" | "detectedClassification" | "confidence" | "reasons" | "suggestedMappings" | "inspectionStatus" | "embeddedUiState"
        >;
        if (unsafeExtensions.has(record.extension)) {
          rawFiles.push({
            ...base,
            kind: "unsafe",
            mimeType: null,
            rejectionReason: "Executable or script content is blocked and was not extracted."
          });
          return;
        }
        if (designReferenceExtensions.has(record.extension)) {
          rawFiles.push({
            ...base,
            kind: "design_reference",
            mimeType:
              record.extension === ".css"
                ? "text/css"
                : record.extension === ".html" || record.extension === ".htm"
                  ? "text/html"
                  : "text/plain"
          });
          return;
        }
        if (record.extension === ".json") {
          try {
            const jsonBuffer = await readEntry(contentZip, entry, MAX_JSON_BYTES);
            const parsedJson = safeJsonObject(jsonBuffer);
            const isManifest = /(^|\/)manifest\.json$/i.test(record.archivePath);
            if (isManifest && !manifest) manifest = parsedJson;
            rawFiles.push({
              ...base,
              kind: isManifest ? "manifest" : "design_tokens",
              mimeType: "application/json",
              checksumSha256: createHash("sha256").update(jsonBuffer).digest("hex"),
              parsedJson
            });
          } catch (error) {
            rawFiles.push({
              ...base,
              kind: "unsafe",
              mimeType: "application/json",
              rejectionReason:
                error instanceof Error
                  ? `Declarative JSON was quarantined: ${error.message}`
                  : "Declarative JSON was quarantined."
            });
          }
          return;
        }
        const imageMime = imageMimeByExtension[record.extension];
        const audioMime = audioMimeByExtension[record.extension];
        if (imageMime || audioMime) {
          const mimeType = normalizeHolidayMediaMimeType(imageMime || audioMime);
          const role = audioMime ? "audio" : "supporting";
          const mediaBuffer = await readEntry(
            contentZip,
            entry,
            audioMime ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES
          );
          let validated: Buffer;
          try {
            validated = validateHolidayMediaAsset(mediaBuffer, mimeType, role);
          } catch (error) {
            rawFiles.push({
              ...base,
              kind: "unsafe",
              mimeType,
              rejectionReason:
                error instanceof Error
                  ? `Media asset was quarantined: ${error.message}`
                  : "Media asset was quarantined."
            });
            return;
          }
          let width: number | null = null;
          let height: number | null = null;
          let hasAlpha: boolean | null = null;
          if (imageMime) {
            const dimensions = await describeHolidayImageDimensions(validated, mimeType);
            width = dimensions.width;
            height = dimensions.height;
            if (mimeType !== "image/svg+xml") {
              const metadata = await sharp(validated).metadata();
              hasAlpha = Boolean(metadata.hasAlpha);
            }
          }
          rawFiles.push({
            ...base,
            kind: audioMime ? "audio" : "image",
            mimeType,
            width,
            height,
            hasAlpha,
            checksumSha256: createHash("sha256").update(validated).digest("hex"),
            buffer: validated
          });
          return;
        }
        rawFiles.push({
          ...base,
          kind: "ignored",
          mimeType: null,
          rejectionReason: "Unsupported package file was ignored."
        });
      })()
        .then(() => contentZip.readEntry())
        .catch((error) => {
          reject(error);
          contentZip.close();
        });
    });
    contentZip.readEntry();
  }).catch((error) => {
    throw badRequest(
      error instanceof Error
        ? error.message
        : "Festival ZIP extraction failed safely."
    );
  });

  const mode = detectMode({ requestedMode, sourceFileName, entries, manifest });
  const files: ScannedFestivalPackFile[] = rawFiles.map((file) => {
    if (file.kind === "unsafe") {
      return {
        ...file,
        detectedClassification: "unsafe_code",
        confidence: 1,
        reasons: [file.rejectionReason || "Unsafe content was blocked."],
        suggestedMappings: [{ location: "ignore", variant: file.responsiveVariant }],
        inspectionStatus: "rejected_unsafe",
        embeddedUiState: "no_embedded_ui"
      };
    }
    if (file.kind === "manifest") {
      return {
        ...file,
        detectedClassification: "manifest",
        confidence: 1,
        reasons: ["Declarative package manifest."],
        suggestedMappings: [{ location: "reference_only", variant: "default" }],
        inspectionStatus: "reference_only",
        embeddedUiState: "no_embedded_ui"
      };
    }
    if (
      mode === "manual_mapping" &&
      ["image", "audio", "design_tokens"].includes(file.kind)
    ) {
      return {
        ...file,
        detectedClassification: `manual_${file.kind}`,
        confidence: 1,
        reasons: [
          "Manual Asset Mapping mode requires an explicit Super Admin placement decision."
        ],
        suggestedMappings: [],
        inspectionStatus: "manual_mapping_required",
        embeddedUiState:
          file.kind === "image" &&
          isFlatMockup({
            archivePath: file.archivePath,
            width: file.width,
            height: file.height,
            hasAlpha: file.hasAlpha
          })
            ? "contains_embedded_ui"
            : "needs_review"
      };
    }
    return {
      ...file,
      ...classifyAsset({
        archivePath: file.archivePath,
        kind: file.kind,
        mode,
        width: file.width,
        height: file.height,
        hasAlpha: file.hasAlpha
      })
    };
  });
  const completenessFlags = computeFestivalPackCompleteness(files);
  return {
    mode,
    manifest,
    files,
    entryCount: files.length,
    safeAssetCount: files.filter((file) =>
      ["image", "audio", "design_tokens"].includes(file.kind)
    ).length,
    blockedEntryCount: files.filter(
      (file) => file.inspectionStatus === "rejected_unsafe"
    ).length,
    manualMappingCount: files.filter(
      (file) => file.inspectionStatus === "manual_mapping_required"
    ).length,
    completenessFlags
  };
}

export const festivalPackZipLimits = {
  maxZipBytes: MAX_ZIP_BYTES,
  maxEntryCount: MAX_ENTRY_COUNT,
  maxTotalUncompressedBytes: MAX_TOTAL_UNCOMPRESSED_BYTES
};
