import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { dbQuery, getDatabasePool } from "../lib/db";
import {
  reviewHolidayThemeAsset,
  saveHolidayThemeAsset
} from "../lib/holiday/repository";
import {
  describeHolidayImageDimensions,
  describeHolidayMediaAsset,
  validateHolidayMediaAsset
} from "../lib/holiday/assets";
import { deleteFile, uploadFile } from "../lib/storage/s3";

type ExistingAsset = {
  id: string;
  theme_id: string;
  asset_role: "login_desktop" | "login_mobile" | "login_background";
  library_asset_id: string;
  variant: string;
  version_number: number;
  is_fallback: boolean;
};

async function main() {
  const [, , existingAssetId, fileArg] = process.argv;
  if (!existingAssetId || !fileArg) {
    throw new Error(
      "Usage: pnpm exec tsx scripts/promote-login-hero-8k-version.ts <existing-asset-id> <8k-file.webp>"
    );
  }

  const actor = await dbQuery<{ id: string }>(
    "select id from admin_users where is_active is true order by created_at asc limit 1"
  );
  const existing = await dbQuery<ExistingAsset>(
    `
      select
        id,
        theme_id,
        asset_role,
        library_asset_id,
        variant,
        version_number,
        is_fallback
      from holiday_theme_assets
      where id = $1
        and asset_role in ('login_desktop', 'login_mobile', 'login_background')
        and library_asset_id is not null
      limit 1
    `,
    [existingAssetId]
  );
  const actorId = actor.rows[0]?.id;
  const source = existing.rows[0];
  if (!actorId || !source) {
    throw new Error("The approved admin actor or existing login asset was not found.");
  }

  const filePath = resolve(fileArg);
  const raw = await readFile(filePath);
  const mimeType = "image/webp";
  const buffer = validateHolidayMediaAsset(raw, mimeType, source.asset_role);
  const dimensions = await describeHolidayImageDimensions(buffer, mimeType);
  if (dimensions.width !== 7680) {
    throw new Error("The replacement is not a 7680-pixel 8K master.");
  }
  const media = describeHolidayMediaAsset(buffer, mimeType, source.asset_role);

  let uploaded: Awaited<ReturnType<typeof uploadFile>> | null = null;
  let saved = false;
  try {
    uploaded = await uploadFile({
      buffer,
      fileName: basename(filePath),
      mimeType,
      assetType: "holiday_theme_asset",
      invoiceId: source.theme_id,
      holidayAssetRole: source.asset_role
    });
    const created = await saveHolidayThemeAsset({
      themeId: source.theme_id,
      role: source.asset_role,
      variant: source.variant,
      s3Key: uploaded.s3Key,
      safeFileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.fileSize,
      checksumSha256: media.checksumSha256,
      durationSeconds: null,
      actorId,
      purpose: "client_login_background",
      placements: [],
      libraryAssetId: source.library_asset_id,
      replacementMode: "replace_everywhere",
      sourceDimensions: dimensions,
      embeddedUiState: "contains_embedded_ui"
    });
    saved = true;
    await reviewHolidayThemeAsset({
      assetId: created.id,
      decision: "approved",
      reason:
        "Founder-requested 8K optimisation of the existing uploaded login artwork; content unchanged.",
      isFallback: source.is_fallback,
      clarityConfirmed: true,
      actorId
    });

    const assignment = await dbQuery<{
      active_assignments: string;
      current_asset_id: string | null;
    }>(
      `
        select
          (
            select count(*)::text
            from festival_asset_assignments
            where library_asset_id = $1
              and asset_version_id = $2
              and state = 'active'
          ) as active_assignments,
          (
            select current_version_asset_id::text
            from festival_asset_library
            where id = $1
          ) as current_asset_id
      `,
      [source.library_asset_id, created.id]
    );

    process.stdout.write(
      `${JSON.stringify({
        libraryAssetId: source.library_asset_id,
        previousAssetId: source.id,
        newAssetId: created.id,
        previousVersion: Number(source.version_number),
        newVersion: Number(created.version_number),
        width: dimensions.width,
        height: dimensions.height,
        bytes: uploaded.fileSize,
        activeAssignments: Number(
          assignment.rows[0]?.active_assignments || 0
        ),
        promoted:
          assignment.rows[0]?.current_asset_id === created.id
      })}\n`
    );
  } catch (error) {
    if (uploaded && !saved) {
      await deleteFile(uploaded.s3Key).catch(() => undefined);
    }
    throw error;
  }
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "8K promotion failed."}\n`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDatabasePool().end();
  });
