import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageWebsiteExperience } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  FESTIVAL_PACK_MODES,
  type FestivalPackMode
} from "@/lib/holiday/festival-pack-types";
import { scanFestivalZip, festivalPackZipLimits } from "@/lib/holiday/festival-pack-scanner";
import {
  createFestivalPackImport,
  getFestivalPackSnapshot
} from "@/lib/holiday/festival-pack-repository";
import {
  HOLIDAY_EXPERIENCE_LEVELS,
  HOLIDAY_THEME_CATEGORIES,
  type HolidayExperienceLevel,
  type HolidayThemeCategory
} from "@/lib/holiday/types";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext
} from "@/lib/security";
import { deleteFile, uploadFile } from "@/lib/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestReference(request: NextRequest) {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

function responseError(error: unknown, referenceId: string) {
  console.error("Festival pack import failed safely.", {
    referenceId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "Unknown request failure"
  });
  const response = apiError(error);
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("x-correlation-id", referenceId);
  return response;
}

function textField(form: FormData, name: string, maxLength = 180) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function booleanField(form: FormData, name: string, fallback: boolean) {
  const value = form.get(name);
  if (typeof value !== "string") return fallback;
  return ["true", "1", "on", "yes"].includes(value.toLowerCase());
}

export async function GET(request: NextRequest) {
  const referenceId = requestReference(request);
  try {
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    return apiOk(await getFestivalPackSnapshot(), {
      headers: {
        "cache-control": "private, no-store",
        "x-correlation-id": referenceId
      }
    });
  } catch (error) {
    return responseError(error, referenceId);
  }
}

export async function POST(request: NextRequest) {
  const referenceId = requestReference(request);
  const uploadedKeys: string[] = [];
  let persisted = false;
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `festival-pack-import:${admin.adminUserId}:${context.ipAddress}`,
      limit: 12,
      windowSeconds: 60 * 60
    });
    const contentLength = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > festivalPackZipLimits.maxZipBytes + 1024 * 1024
    ) {
      throw badRequest("Festival ZIP files must not exceed 80 MB.");
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw badRequest("The festival ZIP could not be read.");
    }
    const zip = form.get("package");
    if (!(zip instanceof File) || !zip.name.toLowerCase().endsWith(".zip")) {
      throw badRequest("Choose one ZIP package to import.");
    }
    const packageName = textField(form, "packageName", 160);
    if (!packageName) throw badRequest("Enter a festival pack name.");
    const requestedMode = textField(form, "packageMode", 40) as FestivalPackMode;
    if (!FESTIVAL_PACK_MODES.includes(requestedMode)) {
      throw badRequest("Choose a supported package mode.");
    }
    const category = textField(form, "category", 80) as HolidayThemeCategory;
    if (
      category === "system_default" ||
      !HOLIDAY_THEME_CATEGORIES.includes(
        category as (typeof HOLIDAY_THEME_CATEGORIES)[number]
      )
    ) {
      throw badRequest("Choose a supported festival or event category.");
    }
    const experienceLevel = textField(
      form,
      "experienceLevel",
      30
    ) as HolidayExperienceLevel;
    if (!HOLIDAY_EXPERIENCE_LEVELS.includes(experienceLevel)) {
      throw badRequest("Choose Accent Only, Standard or Enhanced.");
    }
    const buffer = Buffer.from(await zip.arrayBuffer());
    const scan = await scanFestivalZip({
      buffer,
      sourceFileName: zip.name,
      requestedMode
    });
    const importReference = crypto.randomUUID();
    const original = await uploadFile({
      buffer,
      fileName: zip.name,
      mimeType: "application/zip",
      assetType: "festival_pack_zip",
      invoiceId: importReference
    });
    uploadedKeys.push(original.s3Key);

    const uploadedFiles: Array<{ archivePath: string; s3Key: string }> = [];
    for (const file of scan.files) {
      if (!file.buffer || !file.mimeType || !["image", "audio"].includes(file.kind)) {
        continue;
      }
      const uploaded = await uploadFile({
        buffer: file.buffer,
        fileName: file.safeFileName,
        mimeType: file.mimeType,
        assetType: "holiday_theme_asset",
        invoiceId: importReference,
        holidayAssetRole: file.kind === "audio" ? "audio" : "supporting"
      });
      uploadedKeys.push(uploaded.s3Key);
      uploadedFiles.push({ archivePath: file.archivePath, s3Key: uploaded.s3Key });
    }
    const result = await createFestivalPackImport({
      packageName,
      category,
      experienceLevel,
      themeId: textField(form, "themeId", 80) || null,
      replacePackId: textField(form, "replacePackId", 80) || null,
      scan,
      originalFileName: original.fileName,
      originalZipS3Key: original.s3Key,
      originalZipSize: original.fileSize,
      originalZipChecksumSha256: createHash("sha256").update(buffer).digest("hex"),
      uploadedFiles,
      clientLoginEnabled: booleanField(form, "clientLoginEnabled", true),
      employeeLoginEnabled: booleanField(form, "employeeLoginEnabled", true),
      homepageEnabled: booleanField(form, "homepageEnabled", true),
      actorId: admin.adminUserId
    });
    persisted = true;
    return apiOk(result, {
      status: 201,
      headers: {
        "cache-control": "private, no-store",
        "x-correlation-id": referenceId
      }
    });
  } catch (error) {
    if (!persisted) {
      await Promise.allSettled(uploadedKeys.map((key) => deleteFile(key)));
    }
    return responseError(error, referenceId);
  }
}
