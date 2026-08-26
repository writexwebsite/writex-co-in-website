import "server-only";

import { dbQuery } from "@/lib/db";
import { deleteFile } from "@/lib/storage/s3";

type AbandonedAsset = {
  id: string;
  theme_id: string;
  s3_key: string;
  asset_role: string;
};

export async function cleanupAbandonedHolidayAssets({
  olderThanHours = 24,
  limit = 100
}: {
  olderThanHours?: number;
  limit?: number;
} = {}) {
  const safeHours = Math.min(168, Math.max(1, Math.trunc(olderThanHours)));
  const safeLimit = Math.min(250, Math.max(1, Math.trunc(limit)));
  const candidates = await dbQuery<AbandonedAsset>(
    `
      select id, theme_id, s3_key, asset_role
      from holiday_theme_assets
      where status = 'staged'
        and review_status = 'pending_review'
        and library_asset_id is null
        and created_at < now() - ($1::text || ' hours')::interval
      order by created_at
      limit $2
    `,
    [safeHours, safeLimit]
  );

  let archived = 0;
  let storageFailures = 0;
  for (const asset of candidates.rows) {
    try {
      await deleteFile(asset.s3_key);
    } catch {
      storageFailures += 1;
      continue;
    }
    const result = await dbQuery<{ id: string }>(
      `
        update holiday_theme_assets
        set status = 'archived',
            review_status = 'archived',
            archived_at = now(),
            updated_at = now()
        where id = $1
          and status = 'staged'
          and review_status = 'pending_review'
        returning id
      `,
      [asset.id]
    );
    if (!result.rows[0]) continue;
    archived += 1;
    await dbQuery(
      `
        insert into holiday_theme_audit (
          theme_id, actor_type, action, affected_scope, safe_metadata
        )
        select $1, 'system', 'abandoned_asset_cleaned', scope, $2::jsonb
        from holiday_themes
        where id = $1
      `,
      [
        asset.theme_id,
        JSON.stringify({
          assetId: asset.id,
          role: asset.asset_role,
          olderThanHours: safeHours
        })
      ]
    );
  }

  return {
    scanned: candidates.rows.length,
    archived,
    storageFailures
  };
}
