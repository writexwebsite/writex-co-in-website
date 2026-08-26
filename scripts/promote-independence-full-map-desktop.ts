import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { getDatabasePool, withDbTransaction } from "../lib/db";
import {
  describeHolidayImageDimensions,
  validateHolidayMediaAsset
} from "../lib/holiday/assets";
import { deleteFile, uploadFile } from "../lib/storage/s3";

const PACK_ID = "02de05c6-ad35-4378-8d5b-6e09bd0bae82";
const PACK_FILE_ID = "0d8eac78-8a6d-4715-91db-85c305321dda";
const PREVIOUS_ASSET_ID = "ef07a4e0-797e-485f-a029-4e1855078a81";
const EXPECTED_CHECKSUM =
  "680511f00712741e95fed772ac6524b87e6f00272809a307d786816baf984f7d";
const SOURCE_MASTER_CHECKSUM =
  "6586ff3b96632f5108a36ff0cf266670e822bc81b85081c2ed436a76a198ce3b";

type ExistingAsset = {
  id: string;
  theme_id: string;
  asset_role: string;
  variant: string;
  library_asset_id: string;
  version_number: number;
};

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error(
      "Usage: pnpm exec tsx scripts/promote-independence-full-map-desktop.ts <corrected-desktop.webp>"
    );
  }

  const filePath = resolve(fileArg);
  const raw = await readFile(filePath);
  const checksum = createHash("sha256").update(raw).digest("hex");
  if (checksum !== EXPECTED_CHECKSUM) {
    throw new Error("The correction file checksum does not match the verified master derivative.");
  }

  const mimeType = "image/webp";
  const buffer = validateHolidayMediaAsset(raw, mimeType, "login_desktop");
  const dimensions = await describeHolidayImageDimensions(buffer, mimeType);
  if (dimensions.width !== 2560 || dimensions.height !== 1707) {
    throw new Error("The correction must preserve the full 3:2 master at 2560x1707.");
  }

  const current = await getDatabasePool().query<{
    asset_version_id: string | null;
    checksum_sha256: string | null;
  }>(
    `select asset_version_id, checksum_sha256
       from festival_pack_files
      where id = $1 and pack_id = $2`,
    [PACK_FILE_ID, PACK_ID]
  );
  if (current.rows[0]?.checksum_sha256 === EXPECTED_CHECKSUM) {
    process.stdout.write(
      `${JSON.stringify({ status: "already_applied", assetId: current.rows[0].asset_version_id })}\n`
    );
    return;
  }
  if (current.rows[0]?.asset_version_id !== PREVIOUS_ASSET_ID) {
    throw new Error("The desktop pack mapping changed after verification; refusing to overwrite it.");
  }

  let uploaded: Awaited<ReturnType<typeof uploadFile>> | null = null;
  let committed = false;
  try {
    const previous = await getDatabasePool().query<ExistingAsset>(
      `select id, theme_id, asset_role, variant, library_asset_id, version_number
         from holiday_theme_assets
        where id = $1 and library_asset_id is not null`,
      [PREVIOUS_ASSET_ID]
    );
    const source = previous.rows[0];
    if (
      !source ||
      !["login_desktop", "login_background"].includes(source.asset_role)
    ) {
      throw new Error("The verified desktop source asset was not found.");
    }

    const actor = await getDatabasePool().query<{ id: string }>(
      "select id from admin_users where is_active is true order by created_at asc limit 1"
    );
    const actorId = actor.rows[0]?.id;
    if (!actorId) throw new Error("No active company Admin actor is available for audit.");

    const uploadedFile = await uploadFile({
      buffer,
      fileName: basename(filePath),
      mimeType,
      assetType: "holiday_theme_asset",
      invoiceId: source.theme_id,
      holidayAssetRole: source.asset_role
    });
    uploaded = uploadedFile;

    const result = await withDbTransaction(async (query) => {
      const lockedFile = await query<{
        asset_version_id: string | null;
        checksum_sha256: string | null;
      }>(
        `select asset_version_id, checksum_sha256
           from festival_pack_files
          where id = $1 and pack_id = $2
          for update`,
        [PACK_FILE_ID, PACK_ID]
      );
      if (lockedFile[0]?.checksum_sha256 === EXPECTED_CHECKSUM) {
        return { status: "already_applied", assetId: lockedFile[0].asset_version_id };
      }
      if (lockedFile[0]?.asset_version_id !== PREVIOUS_ASSET_ID) {
        throw new Error("The desktop pack mapping changed while the correction was uploading.");
      }

      await query(
        `update holiday_theme_assets
            set status = 'replaced', version_state = 'previous',
                replaced_at = now(), updated_at = now()
          where id = $1`,
        [PREVIOUS_ASSET_ID]
      );

      const created = await query<{ id: string; version_number: number }>(
        `insert into holiday_theme_assets (
           theme_id, asset_role, variant, s3_key, safe_file_name, mime_type,
           file_size, checksum_sha256, duration_seconds, asset_metadata,
           status, review_status, quality_status, version_number,
           previous_asset_id, library_asset_id, version_state, is_fallback,
           approved_at, approved_by, clarity_confirmation_at,
           clarity_confirmation_by, intended_object, intended_festival,
           asset_category, visual_style, size_restrictions, usage_locations,
           uploaded_by, integrity_state, integrity_checked_at, integrity_note
         )
         select
           old.theme_id, old.asset_role, old.variant, $2, $3, $4,
           $5, $6, old.duration_seconds,
           old.asset_metadata || jsonb_build_object(
             'sourceDimensions', jsonb_build_object(
               'width', $7::integer,
               'height', $8::integer,
               'format', $9::text
             ),
             'sourceMasterChecksumSha256', $10::text,
             'nationalMapIntegrity', 'verified_full_master_no_crop',
             'correction', 'desktop_derivative_restored_from_verified_uncropped_master'
           ),
           'active', 'approved', 'approved', old.version_number + 1,
           old.id, old.library_asset_id, 'current', old.is_fallback,
           now(), $11, now(), $11, old.intended_object, old.intended_festival,
           old.asset_category, old.visual_style, old.size_restrictions,
           old.usage_locations, $11, 'healthy', now(),
           'Full national map restored from checksum-verified clean master; no artwork redrawn.'
         from holiday_theme_assets old
         where old.id = $1
         returning id, version_number`,
        [
          PREVIOUS_ASSET_ID,
          uploadedFile.s3Key,
          uploadedFile.fileName,
          uploadedFile.mimeType,
          uploadedFile.fileSize,
          checksum,
          dimensions.width,
          dimensions.height,
          dimensions.format,
          SOURCE_MASTER_CHECKSUM,
          actorId
        ]
      );
      const replacement = created[0];
      if (!replacement) throw new Error("The corrected asset version was not created.");
      await query(
        `update festival_asset_library
            set current_version_asset_id = $2, approval_state = 'approved',
                lifecycle_state = 'active', updated_by = $3, updated_at = now()
          where id = $1`,
        [source.library_asset_id, replacement.id, actorId]
      );
      await query(
        `update festival_asset_assignments
            set asset_version_id = $2, updated_at = now()
          where library_asset_id = $1 and state = 'active'`,
        [source.library_asset_id, replacement.id]
      );
      await query(
        `update festival_pack_files
            set safe_file_name = $2, compressed_size = $3,
                uncompressed_size = $3, width = $4, height = $5,
                extracted_s3_key = $6, checksum_sha256 = $7,
                asset_version_id = $8, updated_at = now()
          where id = $1`,
        [
          PACK_FILE_ID,
          uploadedFile.fileName,
          uploadedFile.fileSize,
          dimensions.width,
          dimensions.height,
          uploadedFile.s3Key,
          checksum,
          replacement.id
        ]
      );
      await query(
        `insert into festival_asset_audit (
           library_asset_id, asset_version_id, actor_admin_user_id, action, safe_metadata
         ) values ($1, $2, $3, 'version_approved', $4::jsonb)`,
        [
          source.library_asset_id,
          replacement.id,
          actorId,
          JSON.stringify({
            reason: "restore_full_national_map_from_verified_master",
            previousAssetId: PREVIOUS_ASSET_ID,
            sourceMasterChecksumSha256: SOURCE_MASTER_CHECKSUM,
            responsiveVariant: "wide"
          })
        ]
      );
      await query(
        `insert into festival_pack_audit (
           pack_id, actor_admin_user_id, action, safe_metadata
         ) values ($1, $2, 'desktop_map_derivative_corrected', $3::jsonb)`,
        [
          PACK_ID,
          actorId,
          JSON.stringify({
            packFileId: PACK_FILE_ID,
            previousAssetId: PREVIOUS_ASSET_ID,
            correctedAssetId: replacement.id,
            correctedVersion: replacement.version_number,
            checksumSha256: checksum,
            sourceMasterChecksumSha256: SOURCE_MASTER_CHECKSUM,
            dimensions: { width: dimensions.width, height: dimensions.height }
          })
        ]
      );

      return {
        status: "applied",
        assetId: replacement.id,
        version: replacement.version_number
      };
    });
    committed = result.status === "applied";
    process.stdout.write(
      `${JSON.stringify({
        ...result,
        previousAssetId: PREVIOUS_ASSET_ID,
        packId: PACK_ID,
        packFileId: PACK_FILE_ID,
        checksumSha256: checksum,
        sourceMasterChecksumSha256: SOURCE_MASTER_CHECKSUM,
        width: dimensions.width,
        height: dimensions.height
      })}\n`
    );
  } finally {
    if (uploaded && !committed) {
      await deleteFile(uploaded.s3Key).catch(() => undefined);
    }
  }
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Desktop map correction failed."}\n`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDatabasePool().end();
  });
