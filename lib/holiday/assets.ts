import { createHash } from "crypto";
import sharp from "sharp";

const rasterMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif"
]);

export const allowedHolidayImageMimeTypes = new Set([
  ...rasterMimeTypes,
  "image/svg+xml"
]);

export const allowedHolidayAudioMimeTypes = new Set([
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav"
]);

export const allowedHolidayMediaMimeTypes = new Set([
  ...allowedHolidayImageMimeTypes,
  ...allowedHolidayAudioMimeTypes
]);

const holidayMediaMimeAliases = new Map([
  ["audio/mp3", "audio/mpeg"],
  ["application/ogg", "audio/ogg"],
  ["audio/wave", "audio/wav"],
  ["audio/vnd.wave", "audio/wav"]
]);

export function normalizeHolidayMediaMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();
  return holidayMediaMimeAliases.get(normalized) || normalized;
}

function hasRasterSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  }
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeType === "image/avif") {
    return (
      buffer.length >= 16 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["avif", "avis"].includes(buffer.subarray(8, 12).toString("ascii"))
    );
  }
  return false;
}

function validateStaticSvg(buffer: Buffer) {
  const source = buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
  if (
    !source.startsWith("<svg") &&
    !/^<\?xml[^>]*>\s*<svg/i.test(source)
  ) {
    throw new Error("The SVG document is invalid.");
  }

  const blocked = [
    /<!doctype/i,
    /<!entity/i,
    /<script/i,
    /<foreignObject/i,
    /<(?:iframe|object|embed|audio|video|canvas|image|use|animate|set)\b/i,
    /<style\b/i,
    /\son[a-z]+\s*=/i,
    /\b(?:href|src)\s*=/i,
    /javascript\s*:/i,
    /data\s*:/i,
    /expression\s*\(/i,
    /@import/i,
    /url\s*\(/i
  ];
  if (blocked.some((pattern) => pattern.test(source))) {
    throw new Error("Only static, self-contained SVG artwork is allowed.");
  }

  return Buffer.from(source, "utf8");
}

export function validateHolidayImageAsset(buffer: Buffer, mimeType: string) {
  if (!allowedHolidayImageMimeTypes.has(mimeType)) {
    throw new Error("Unsupported holiday image format.");
  }
  if (mimeType === "image/svg+xml") return validateStaticSvg(buffer);
  if (!hasRasterSignature(buffer, mimeType)) {
    throw new Error("The uploaded image signature is invalid.");
  }
  return buffer;
}

export function validateHolidayAudioAsset(buffer: Buffer, mimeType: string) {
  const normalizedMimeType = normalizeHolidayMediaMimeType(mimeType);
  if (!allowedHolidayAudioMimeTypes.has(normalizedMimeType)) {
    throw new Error("Unsupported holiday audio format.");
  }
  const isMp3 =
    normalizedMimeType === "audio/mpeg" &&
    (buffer.subarray(0, 3).toString("ascii") === "ID3" ||
      (buffer.length > 1 &&
        buffer[0] === 0xff &&
        (buffer[1] & 0xe0) === 0xe0));
  const isOgg =
    normalizedMimeType === "audio/ogg" &&
    buffer.subarray(0, 4).toString("ascii") === "OggS";
  const isWav =
    (normalizedMimeType === "audio/wav" ||
      normalizedMimeType === "audio/x-wav") &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE";
  if (!isMp3 && !isOgg && !isWav) {
    throw new Error("The uploaded audio signature is invalid.");
  }
  return buffer;
}

export function validateHolidayMediaAsset(
  buffer: Buffer,
  mimeType: string,
  role: string
) {
  const normalizedMimeType = normalizeHolidayMediaMimeType(mimeType);
  if (role === "audio") {
    return validateHolidayAudioAsset(buffer, normalizedMimeType);
  }
  if (allowedHolidayAudioMimeTypes.has(normalizedMimeType)) {
    throw new Error("Audio files may only use the audio asset role.");
  }
  return validateHolidayImageAsset(buffer, normalizedMimeType);
}

function wavDurationSeconds(buffer: Buffer) {
  if (
    buffer.length < 44 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WAVE"
  ) {
    return null;
  }

  let byteRate: number | null = null;
  let dataBytes: number | null = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    if (chunkId === "fmt " && chunkSize >= 12 && dataStart + 12 <= buffer.length) {
      byteRate = buffer.readUInt32LE(dataStart + 8);
    } else if (chunkId === "data") {
      dataBytes = Math.min(chunkSize, Math.max(0, buffer.length - dataStart));
    }
    const paddedSize = chunkSize + (chunkSize % 2);
    offset = dataStart + paddedSize;
  }

  if (!byteRate || !dataBytes) return null;
  const duration = dataBytes / byteRate;
  return Number.isFinite(duration) && duration > 0
    ? Number(duration.toFixed(3))
    : null;
}

export function describeHolidayMediaAsset(
  buffer: Buffer,
  mimeType: string,
  role: string
) {
  const normalizedMimeType = normalizeHolidayMediaMimeType(mimeType);
  return {
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    durationSeconds:
      role === "audio" &&
      ["audio/wav", "audio/x-wav"].includes(normalizedMimeType)
        ? wavDurationSeconds(buffer)
        : null
  };
}

export async function describeHolidayImageDimensions(
  buffer: Buffer,
  mimeType: string
) {
  if (mimeType === "image/svg+xml") {
    const source = buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
    const root = source.match(/<svg\b[^>]*>/i)?.[0];
    if (!root) throw new Error("The SVG dimensions could not be read.");

    const numericAttribute = (name: string) => {
      const value = root.match(
        new RegExp(`\\b${name}\\s*=\\s*["']\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(?:px)?\\s*["']`, "i")
      )?.[1];
      const parsed = value ? Number(value) : null;
      return parsed && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };
    let width = numericAttribute("width");
    let height = numericAttribute("height");
    if (!width || !height) {
      const viewBox = root
        .match(/\bviewBox\s*=\s*["']\s*([^"']+)\s*["']/i)?.[1]
        ?.trim()
        .split(/[\s,]+/)
        .map(Number);
      if (
        viewBox?.length === 4 &&
        viewBox.every(Number.isFinite) &&
        viewBox[2] > 0 &&
        viewBox[3] > 0
      ) {
        width ||= viewBox[2];
        height ||= viewBox[3];
      }
    }
    if (!width || !height) {
      throw new Error("The SVG must declare positive dimensions or a valid viewBox.");
    }
    if (width > 8192 || height > 8192) {
      throw new Error("Master login artwork may be up to 8192 by 8192 pixels.");
    }
    return { width, height, format: "svg" };
  }
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("The image dimensions could not be read.");
  }
  if (metadata.width > 8192 || metadata.height > 8192) {
    throw new Error("Master login artwork may be up to 8192 by 8192 pixels.");
  }
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format || null
  };
}

export async function validateHolidayHeaderOrnamentAsset(
  buffer: Buffer,
  mimeType: string
) {
  if (!["image/png", "image/webp", "image/svg+xml"].includes(mimeType)) {
    throw new Error(
      "Header ornaments must use transparent PNG, WebP or sanitised SVG."
    );
  }
  const validated = validateHolidayImageAsset(buffer, mimeType);
  if (mimeType === "image/svg+xml") return validated;

  const metadata = await sharp(validated).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 256 ||
    metadata.height < 256
  ) {
    throw new Error("Header ornaments must be at least 256 by 256 pixels.");
  }
  if (!metadata.hasAlpha) {
    throw new Error("Header ornaments require a transparent background.");
  }
  return validated;
}
