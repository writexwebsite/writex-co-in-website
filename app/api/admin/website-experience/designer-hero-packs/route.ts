import { createHash } from "node:crypto";
import sharp from "sharp";
import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageWebsiteExperience } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import { createFestivalPackImport, getFestivalPackSnapshot } from "@/lib/holiday/festival-pack-repository";
import type { FestivalPackMapping, FestivalPackScanResult, ScannedFestivalPackFile } from "@/lib/holiday/festival-pack-types";
import { assertRateLimit, assertSameOrigin, getRequestContext } from "@/lib/security";
import { deleteFile, uploadFile } from "@/lib/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const widths = [5120, 3840, 2560, 1920, 1536, 1280, 1024, 768, 480] as const;
const formats = ["avif", "webp", "jpeg"] as const;

function cleanText(form: FormData, key: string, max: number) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function mappingFor(width: number, target: string): FestivalPackMapping[] {
  const variant = width <= 480 ? "mobile" : width <= 1024 ? "tablet" : "desktop";
  return [
    ...(target !== "employee" ? [{ location: "client_login_hero", variant } as const] : []),
    ...(target !== "client" ? [{ location: "employee_login_hero", variant } as const] : [])
  ];
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const [packs, festivalSnapshot] = await Promise.all([
      dbQuery(`select id,festival_pack_id,theme_id,festival_slug,variant_slug,display_name,target_support,source_width,source_height,overlay_mode,form_placement,status,notes,created_at,updated_at from designer_hero_packs order by created_at desc limit 100`),
      getFestivalPackSnapshot()
    ]);
    return apiOk({ packs: packs.rows, festivalSnapshot }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const uploadedKeys: string[] = [];
  let canonicalPackCreated = false;
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    await assertActiveAdminActor(admin.adminUserId);
    assertCanManageWebsiteExperience(admin);
    const context = getRequestContext(request);
    assertRateLimit({ key: `designer-hero-pack:${admin.adminUserId}:${context.ipAddress}`, limit: 4, windowSeconds: 3600 });
    const form = await request.formData();
    const festivalName = cleanText(form, "festivalName", 100);
    const variantName = cleanText(form, "variantName", 100);
    const target = cleanText(form, "target", 12);
    const themeId = cleanText(form, "themeId", 80) || null;
    const main = form.get("mainHero");
    const mobile = form.get("mobileHero");
    if (!festivalName || !variantName) throw badRequest("Enter the Festival and Variant names.");
    if (!['client','employee','both'].includes(target)) throw badRequest("Choose Client, Employee or Both.");
    if (!(main instanceof File)) throw badRequest("Choose one clean 8K Hero image.");
    if (!['image/png','image/jpeg','image/webp'].includes(main.type)) throw badRequest("Use PNG, JPEG or WebP artwork.");
    if (form.get("artworkOnlyConfirmed") !== "true") throw badRequest("Confirm that the artwork contains no logo, form, fields, buttons or fake UI.");
    const source = Buffer.from(await main.arrayBuffer());
    const metadata = await sharp(source, { limitInputPixels: 120_000_000 }).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 7000 || metadata.height < 3000) throw badRequest("The main artwork must be a genuine high-resolution 8K-class image (at least 7000 x 3000). ");
    const sourceUpload = await uploadFile({ buffer: source, fileName: main.name, mimeType: main.type, assetType: "holiday_theme_asset", invoiceId: crypto.randomUUID(), holidayAssetRole: "hero_art" });
    uploadedKeys.push(sourceUpload.s3Key);
    let mobileUpload: Awaited<ReturnType<typeof uploadFile>> | null = null;
    let mobileSource: Buffer | null = null;
    if (mobile instanceof File && mobile.size > 0) {
      if (!['image/png','image/jpeg','image/webp'].includes(mobile.type)) throw badRequest("Use PNG, JPEG or WebP mobile artwork.");
      mobileSource = Buffer.from(await mobile.arrayBuffer());
      const mobileMetadata = await sharp(mobileSource, { limitInputPixels: 120_000_000 }).metadata();
      if (!mobileMetadata.width || !mobileMetadata.height || mobileMetadata.width < 1080 || mobileMetadata.height < 1600) throw badRequest("The optional mobile artwork must be at least 1080 x 1600.");
      mobileUpload = await uploadFile({ buffer: mobileSource, fileName: mobile.name, mimeType: mobile.type, assetType: "holiday_theme_asset", invoiceId: crypto.randomUUID(), holidayAssetRole: "hero_art" });
      uploadedKeys.push(mobileUpload.s3Key);
    }
    const derivativeRows: Array<{ width: number; format: string; key: string; size: number; checksum: string }> = [];
    const rendererFiles: ScannedFestivalPackFile[] = [];
    const rendererUploads: Array<{ archivePath: string; s3Key: string }> = [];
    for (const width of widths) {
      for (const format of formats) {
        const derivativeSource = mobileSource && width <= 768 ? mobileSource : source;
        let pipeline = sharp(derivativeSource).rotate().resize({ width, withoutEnlargement: true, fit: "inside" });
        pipeline = format === "avif" ? pipeline.avif({ quality: 72, effort: 5 }) : format === "webp" ? pipeline.webp({ quality: 82, effort: 5 }) : pipeline.jpeg({ quality: 86, progressive: true });
        const buffer = await pipeline.toBuffer();
        const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
        const archivePath = `designer-hero/${width}.${format}`;
        const upload = await uploadFile({ buffer, fileName: `${slugify(festivalName)}-${slugify(variantName)}-${width}.${format === 'jpeg' ? 'jpg' : format}`, mimeType: mime, assetType: "holiday_theme_asset", invoiceId: crypto.randomUUID(), holidayAssetRole: "hero_art" });
        uploadedKeys.push(upload.s3Key);
        derivativeRows.push({ width, format, key: upload.s3Key, size: buffer.length, checksum: createHash("sha256").update(buffer).digest("hex") });
        if (format === "webp" && [3840, 1024, 480].includes(width)) {
          const mappings = mappingFor(width, target);
          rendererUploads.push({ archivePath, s3Key: upload.s3Key });
          rendererFiles.push({ archivePath, safeFileName: upload.fileName, kind: "image", mimeType: mime, compressedSize: buffer.length, uncompressedSize: buffer.length, width, height: null, hasAlpha: false, responsiveVariant: width === 480 ? "mobile" : width === 1024 ? "tablet" : "desktop", detectedClassification: "clean_designer_hero", confidence: 1, reasons: ["Founder-confirmed clean background artwork", "Generated responsive derivative"], suggestedMappings: mappings, inspectionStatus: "validated", rejectionReason: null, checksumSha256: createHash("sha256").update(buffer).digest("hex"), embeddedUiState: "no_embedded_ui" });
        }
      }
    }
    const festivalSlug = slugify(festivalName);
    const variantSlug = slugify(variantName);
    const scan: FestivalPackScanResult = { mode: "standard_writex", manifest: { packType: "responsive_festival_hero", sourceType: "designer_hero_pack", festivalSlug, festivalName, variantSlug, variantName, formPlacement: cleanText(form, "formPlacement", 8) || "right", overlayMode: cleanText(form, "overlayMode", 12) || "auto", originalImmutable: true }, files: rendererFiles, entryCount: rendererFiles.length, safeAssetCount: rendererFiles.length, blockedEntryCount: 0, manualMappingCount: 0, completenessFlags: ["complete", "ready_to_activate"] };
    const created = await createFestivalPackImport({ packageName: `${festivalName} - ${variantName}`, category: "custom_one_time_event", experienceLevel: "standard", themeId, replacePackId: null, scan, originalFileName: main.name, originalZipS3Key: sourceUpload.s3Key, originalZipSize: source.length, originalZipChecksumSha256: createHash("sha256").update(source).digest("hex"), uploadedFiles: rendererUploads, clientLoginEnabled: target !== "employee", employeeLoginEnabled: target !== "client", homepageEnabled: false, actorId: admin.adminUserId });
    canonicalPackCreated = true;
    const pack = created.snapshot.packs.find((item) => item.id === created.packId)!;
    const inserted = await dbQuery<{ id: string }>(`insert into designer_hero_packs (festival_pack_id,theme_id,festival_slug,variant_slug,display_name,target_support,source_s3_key,source_file_name,source_checksum_sha256,source_width,source_height,mobile_source_s3_key,overlay_mode,form_placement,status,notes,artwork_only_confirmed,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'ready',$15,true,$16) returning id`, [created.packId, pack.themeId, festivalSlug, variantSlug, variantName, target, sourceUpload.s3Key, sourceUpload.fileName, createHash("sha256").update(source).digest("hex"), metadata.width, metadata.height, mobileUpload?.s3Key || null, cleanText(form,"overlayMode",12) || "auto", cleanText(form,"formPlacement",8) || "right", cleanText(form,"notes",1000) || null, admin.adminUserId]);
    for (const row of derivativeRows) await dbQuery(`insert into designer_hero_pack_derivatives (designer_hero_pack_id,width,format,s3_key,file_size,checksum_sha256) values ($1,$2,$3,$4,$5,$6)`, [inserted.rows[0].id,row.width,row.format,row.key,row.size,row.checksum]);
    return apiOk({ id: inserted.rows[0].id, festivalPackId: created.packId, status: "ready", publicActive: false }, { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    // Once canonical rows exist, retain their private objects so no record can
    // ever point at a deleted source. The failed request remains non-public.
    if (!canonicalPackCreated) await Promise.allSettled(uploadedKeys.map((key) => deleteFile(key)));
    return apiError(error);
  }
}
