import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const required = [
  "DATABASE_URL",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET"
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing runtime configuration: ${missing.join(", ")}`);
}

const database = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "require"
      ? { rejectUnauthorized: false }
      : undefined
});
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN || undefined
  }
});

await database.connect();
try {
  const result = await database.query(`
    select
      asset.id,
      asset.library_asset_id,
      asset.safe_file_name,
      asset.version_number,
      asset.version_state,
      asset.status,
      asset.review_status,
      asset.s3_key,
      library.lifecycle_state,
      library.current_version_asset_id = asset.id as is_current,
      (
        select count(*)::int
        from festival_asset_assignments assignment
        where assignment.asset_version_id = asset.id
          and assignment.state = 'active'
      ) as active_assignments
    from holiday_theme_assets asset
    left join festival_asset_library library
      on library.id = asset.library_asset_id
    order by asset.created_at, asset.version_number
  `);

  const records = [];
  for (const row of result.rows) {
    let storageState = "missing_or_inaccessible";
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: row.s3_key
        })
      );
      storageState = "available";
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (
        status !== 403 &&
        status !== 404 &&
        error?.name !== "NotFound" &&
        error?.name !== "Unknown"
      ) {
        throw error;
      }
    }
    records.push({
      assetId: row.id,
      libraryAssetId: row.library_asset_id,
      safeFileName: row.safe_file_name,
      version: Number(row.version_number || 1),
      versionState: row.version_state,
      recordStatus: row.status,
      reviewStatus: row.review_status,
      lifecycleState: row.lifecycle_state,
      current: row.is_current,
      activeAssignments: Number(row.active_assignments || 0),
      storageState
    });
  }

  const libraryIds = new Set(
    records.map((record) => record.libraryAssetId).filter(Boolean)
  );
  const missingObjects = records.filter(
    (record) => record.storageState !== "available"
  );
  const recoveredPreviousVersions = records.filter(
    (record) =>
      record.storageState === "available" &&
      ["previous", "restored", "archived"].includes(record.versionState)
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          libraryAssets: libraryIds.size,
          versionRecords: records.length,
          currentVersions: records.filter((record) => record.current).length,
          recoveredPreviousVersions: recoveredPreviousVersions.length,
          missingStorageObjects: missingObjects.length,
          activeAssignments: records.reduce(
            (sum, record) => sum + record.activeAssignments,
            0
          )
        },
        records
      },
      null,
      2
    )}\n`
  );
} finally {
  await database.end();
}
