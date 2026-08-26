import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { badRequest } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import {
  getPrivateObjectBuffer,
  getPrivateObjectMetadata,
  putPrivateObjectAtKey
} from "@/lib/storage/s3";

export type FestivalAssetIntegrityState =
  | "healthy"
  | "missing_source"
  | "checksum_mismatch"
  | "invalid_metadata";

type IntegrityCandidate = {
  library_asset_id: string;
  version_asset_id: string;
  display_name: string;
  approval_state: string;
  previous_integrity_state: string;
  s3_key: string;
  safe_file_name: string;
  mime_type: string;
  file_size: number | string;
  checksum_sha256: string | null;
  asset_category: string | null;
  usage_locations: string[] | null;
  asset_metadata: Record<string, unknown> | null;
  review_item_id: string | null;
  review_state: string | null;
  thumbnail_s3_key: string | null;
};

type SourceInspection = {
  state: FestivalAssetIntegrityState;
  note: string;
  buffer: Buffer | null;
  checksumSha256: string | null;
  mimeType: string | null;
  fileSize: number;
  storageMimeType: string | null;
};

const validSceneCategories = new Set([
  "header",
  "ground",
  "axo",
  "ambient",
  "feature"
]);

const compatibleRegions: Record<string, Set<string>> = {
  header: new Set(["navigation_rail"]),
  ground: new Set(["footer_decoration", "section_dividers"]),
  axo: new Set(["axo_area"]),
  ambient: new Set(["page_ambience", "floating_edges"]),
  feature: new Set([
    "page_ambience",
    "floating_edges",
    "hero_foreground",
    "fullscreen_intro"
  ])
};

function storageErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const candidate = error as {
    name?: unknown;
    Code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return String(
    candidate.name ||
      candidate.Code ||
      candidate.$metadata?.httpStatusCode ||
      ""
  );
}

function detectedMimeType(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE"
  ) return "audio/wav";
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS") {
    return "audio/ogg";
  }
  if (
    buffer.length >= 3 &&
    (buffer.toString("ascii", 0, 3) === "ID3" ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
  ) return "audio/mpeg";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 4, 8) === "ftyp" &&
    /avif|avis/.test(buffer.toString("ascii", 8, 12))
  ) return "image/avif";
  const prefix = buffer.subarray(0, Math.min(buffer.length, 2048)).toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();
  if ((prefix.startsWith("<svg") || prefix.startsWith("<?xml")) && /<svg[\s>]/i.test(prefix)) {
    return "image/svg+xml";
  }
  return null;
}

function isWebp(buffer: Buffer) {
  return buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
}

function metadataProblem(input: {
  assetCategory: string | null;
  usageLocations: string[];
  governedReviewAsset: boolean;
}) {
  if (!input.governedReviewAsset) return null;
  if (!input.assetCategory || !validSceneCategories.has(input.assetCategory)) {
    return "The governed review asset has an invalid scene category.";
  }
  const allowed = compatibleRegions[input.assetCategory];
  if (!allowed || !input.usageLocations.some((region) => allowed.has(region))) {
    return "The governed review asset has no compatible website region.";
  }
  return null;
}

async function inspectSource(input: {
  s3Key: string;
  expectedChecksum: string | null;
  expectedMimeType: string;
  assetCategory: string | null;
  usageLocations: string[];
  governedReviewAsset: boolean;
}): Promise<SourceInspection> {
  const invalidMetadata = metadataProblem(input);
  if (invalidMetadata) {
    return {
      state: "invalid_metadata",
      note: invalidMetadata,
      buffer: null,
      checksumSha256: null,
      mimeType: null,
      fileSize: 0,
      storageMimeType: null
    };
  }
  try {
    const metadata = await getPrivateObjectMetadata(input.s3Key);
    const maxBytes = Math.max(160 * 1024 * 1024, metadata.contentLength + 1);
    const buffer = await getPrivateObjectBuffer(input.s3Key, maxBytes);
    const mimeType = detectedMimeType(buffer);
    if (!mimeType) {
      return {
        state: "invalid_metadata",
        note: "The governed source MIME type could not be verified.",
        buffer,
        checksumSha256: null,
        mimeType: null,
        fileSize: buffer.byteLength,
        storageMimeType: metadata.contentType
      };
    }
    const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
    if (
      input.expectedChecksum &&
      checksumSha256.toLowerCase() !== input.expectedChecksum.toLowerCase()
    ) {
      return {
        state: "checksum_mismatch",
        note: "The governed source checksum does not match its approved version.",
        buffer,
        checksumSha256,
        mimeType,
        fileSize: buffer.byteLength,
        storageMimeType: metadata.contentType
      };
    }
    return {
      state: "healthy",
      note: "Source, MIME type, checksum and compatible regions verified.",
      buffer,
      checksumSha256,
      mimeType,
      fileSize: buffer.byteLength,
      storageMimeType: metadata.contentType
    };
  } catch (error) {
    const code = storageErrorCode(error);
    const missing = ["NoSuchKey", "NotFound", "404"].some((value) => code.includes(value));
    return {
      state: missing ? "missing_source" : "invalid_metadata",
      note: missing
        ? "The governed source object is missing."
        : "The governed source object could not be verified.",
      buffer: null,
      checksumSha256: null,
      mimeType: null,
      fileSize: 0,
      storageMimeType: null
    };
  }
}

async function repairThumbnail(candidate: IntegrityCandidate, source: Buffer) {
  if (!candidate.review_item_id || !candidate.thumbnail_s3_key) {
    return { state: "healthy" as const, repaired: false };
  }
  try {
    const thumbnail = await getPrivateObjectBuffer(candidate.thumbnail_s3_key, 8 * 1024 * 1024);
    if (isWebp(thumbnail)) return { state: "healthy" as const, repaired: false };
  } catch {
    // The immutable source below is used to rebuild only the review derivative.
  }
  const thumbnail = await sharp(source, { limitInputPixels: false })
    .resize(960, 540, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true
    })
    .webp({ quality: 88, smartSubsample: true })
    .toBuffer();
  await putPrivateObjectAtKey({
    s3Key: candidate.thumbnail_s3_key,
    buffer: thumbnail,
    mimeType: "image/webp"
  });
  return { state: "repaired" as const, repaired: true };
}

function publicApprovalState(state: FestivalAssetIntegrityState) {
  if (state === "missing_source") return "missing_source";
  if (state === "healthy") return "approved";
  return "integrity_failed";
}

async function saveInspection({
  candidate,
  inspection,
  actorId,
  thumbnailState,
  thumbnailRepaired
}: {
  candidate: IntegrityCandidate;
  inspection: SourceInspection;
  actorId: string;
  thumbnailState: "healthy" | "repaired" | "missing_source";
  thumbnailRepaired: boolean;
}) {
  return withDbTransaction(async (query) => {
    const locked = await query<{
      current_version_asset_id: string | null;
      approval_state: string;
      integrity_state: string;
    }>(
      `select current_version_asset_id,approval_state,integrity_state
       from festival_asset_library where id=$1 for update`,
      [candidate.library_asset_id]
    );
    if (!locked[0] || locked[0].current_version_asset_id !== candidate.version_asset_id) {
      return { skipped: true, hidden: false, restored: false };
    }
    const nextApprovalState = inspection.state === "healthy"
      ? ["missing_source", "integrity_failed"].includes(locked[0].approval_state)
        ? "approved"
        : locked[0].approval_state
      : publicApprovalState(inspection.state);
    const checksumRepair = inspection.state === "healthy" &&
      !candidate.checksum_sha256 && Boolean(inspection.checksumSha256);
    const mimeRepair = inspection.state === "healthy" &&
      Boolean(inspection.mimeType) && candidate.mime_type !== inspection.mimeType;
    const sizeRepair = inspection.state === "healthy" &&
      Number(candidate.file_size || 0) !== inspection.fileSize;

    await query(
      `update holiday_theme_assets
       set integrity_state=$2,integrity_checked_at=now(),integrity_note=$3,
           checksum_sha256=case when $2='healthy' then coalesce(checksum_sha256,$4) else checksum_sha256 end,
           mime_type=case when $2='healthy' then coalesce($5,mime_type) else mime_type end,
           file_size=case when $2='healthy' and $6>0 then $6 else file_size end,
           updated_at=case when integrity_state is distinct from $2 or $7 or $8 or $9 then now() else updated_at end
       where id=$1`,
      [
        candidate.version_asset_id,
        inspection.state,
        inspection.note,
        inspection.checksumSha256,
        inspection.mimeType,
        inspection.fileSize,
        checksumRepair,
        mimeRepair,
        sizeRepair
      ]
    );
    await query(
      `update festival_asset_library
       set integrity_state=$2,integrity_checked_at=now(),integrity_note=$3,
           approval_state=$4,updated_by=$5,
           updated_at=case when integrity_state is distinct from $2 or approval_state is distinct from $4 then now() else updated_at end
       where id=$1`,
      [
        candidate.library_asset_id,
        inspection.state,
        inspection.note,
        nextApprovalState,
        actorId
      ]
    );
    if (candidate.review_item_id) {
      await query(
        `update festival_asset_review_items
         set review_state=case
               when $2='healthy' and review_state='source_required' then 'approved'
               when $2<>'healthy' then 'source_required'
               else review_state
             end,
             review_note=case when $2<>'healthy' then coalesce(review_note,$3) else review_note end,
             thumbnail_integrity_state=$4,integrity_checked_at=now(),
             updated_at=case
               when ($2='healthy' and review_state='source_required')
                 or ($2<>'healthy' and review_state<>'source_required')
                 or thumbnail_integrity_state is distinct from $4
               then now() else updated_at end
         where id=$1 and promoted_version_asset_id=$5`,
        [
          candidate.review_item_id,
          inspection.state,
          inspection.note,
          thumbnailState,
          candidate.version_asset_id
        ]
      );
    }
    const changed =
      locked[0].integrity_state !== inspection.state ||
      locked[0].approval_state !== nextApprovalState ||
      checksumRepair || mimeRepair || sizeRepair || thumbnailRepaired;
    if (changed) {
      await query(
        `insert into festival_asset_audit (
           library_asset_id,asset_version_id,actor_admin_user_id,action,safe_metadata
         ) values ($1,$2,$3,'asset_integrity_verified',$4::jsonb)`,
        [
          candidate.library_asset_id,
          candidate.version_asset_id,
          actorId,
          JSON.stringify({
            previousIntegrityState: locked[0].integrity_state,
            integrityState: inspection.state,
            checksumRepaired: checksumRepair,
            mimeRepaired: mimeRepair,
            sizeRepaired: sizeRepair,
            thumbnailRepaired,
            publicSelectable: nextApprovalState === "approved"
          })
        ]
      );
    }
    return {
      skipped: false,
      hidden: locked[0].approval_state === "approved" && nextApprovalState !== "approved",
      restored: locked[0].approval_state !== "approved" && nextApprovalState === "approved",
      checksumRepair,
      mimeRepair,
      sizeRepair
    };
  });
}

async function inspectCandidate(candidate: IntegrityCandidate, actorId: string) {
  const inspection = await inspectSource({
    s3Key: candidate.s3_key,
    expectedChecksum: candidate.checksum_sha256,
    expectedMimeType: candidate.mime_type,
    assetCategory: candidate.asset_category,
    usageLocations: candidate.usage_locations || [],
    governedReviewAsset: Boolean(candidate.asset_metadata?.batchStableAssetId)
  });
  let thumbnailState: "healthy" | "repaired" | "missing_source" =
    inspection.state === "missing_source" ? "missing_source" : "healthy";
  let thumbnailRepaired = false;
  if (inspection.state === "healthy" && inspection.buffer) {
    const thumbnail = await repairThumbnail(candidate, inspection.buffer);
    thumbnailState = thumbnail.state;
    thumbnailRepaired = thumbnail.repaired;
    if (
      inspection.mimeType &&
      inspection.storageMimeType !== inspection.mimeType
    ) {
      await putPrivateObjectAtKey({
        s3Key: candidate.s3_key,
        buffer: inspection.buffer,
        mimeType: inspection.mimeType
      });
    }
  }
  const saved = await saveInspection({
    candidate,
    inspection,
    actorId,
    thumbnailState,
    thumbnailRepaired
  });
  return { inspection, thumbnailRepaired, ...saved };
}

export async function auditApprovedFestivalAssetIntegrity({
  actorId
}: {
  actorId: string;
}) {
  const candidates = await dbQuery<IntegrityCandidate>(
    `select library.id library_asset_id,asset.id version_asset_id,
       library.display_name,library.approval_state,
       coalesce(library.integrity_state,'unchecked') previous_integrity_state,
       asset.s3_key,asset.safe_file_name,asset.mime_type,asset.file_size,
       asset.checksum_sha256,asset.asset_category,
       coalesce(asset.usage_locations,array[]::text[]) usage_locations,
       coalesce(asset.asset_metadata,'{}'::jsonb) asset_metadata,
       review.id review_item_id,review.review_state,review.thumbnail_s3_key
     from festival_asset_library library
     join holiday_theme_assets asset on asset.id=library.current_version_asset_id
     left join festival_asset_review_items review
       on review.promoted_version_asset_id=asset.id
     where library.lifecycle_state='active'
       and library.approval_state in ('approved','missing_source','integrity_failed')
     order by library.id`
  );
  const results: Array<Awaited<ReturnType<typeof inspectCandidate>>> = [];
  for (let index = 0; index < candidates.rows.length; index += 4) {
    const batch = candidates.rows.slice(index, index + 4);
    results.push(...await Promise.all(batch.map((candidate) => inspectCandidate(candidate, actorId))));
  }
  return {
    audited: results.length,
    healthy: results.filter((item) => item.inspection.state === "healthy").length,
    missingSource: results.filter((item) => item.inspection.state === "missing_source").length,
    checksumMismatch: results.filter((item) => item.inspection.state === "checksum_mismatch").length,
    invalidMetadata: results.filter((item) => item.inspection.state === "invalid_metadata").length,
    repairedChecksums: results.filter((item) => item.checksumRepair).length,
    repairedMimeTypes: results.filter((item) => item.mimeRepair).length,
    repairedFileSizes: results.filter((item) => item.sizeRepair).length,
    repairedThumbnails: results.filter((item) => item.thumbnailRepaired).length,
    hiddenFromSelectors: results.filter((item) => item.hidden).length,
    restoredToSelectors: results.filter((item) => item.restored).length,
    skippedConcurrentChanges: results.filter((item) => item.skipped).length
  };
}

export async function assertFestivalReviewSourceIntegrity(input: {
  reviewItemId: string;
  sourceS3Key: string;
  checksumSha256: string;
  mimeType: string;
  category: string;
  usageLocations: string[];
}) {
  const inspection = await inspectSource({
    s3Key: input.sourceS3Key,
    expectedChecksum: input.checksumSha256,
    expectedMimeType: input.mimeType,
    assetCategory: input.category,
    usageLocations: input.usageLocations,
    governedReviewAsset: true
  });
  if (inspection.state === "healthy") return;
  await withDbTransaction(async (query) => {
    const rows = await query<{
      promoted_library_asset_id: string | null;
      promoted_version_asset_id: string | null;
      review_state: string;
    }>(
      `select promoted_library_asset_id,promoted_version_asset_id,review_state
       from festival_asset_review_items where id=$1 for update`,
      [input.reviewItemId]
    );
    if (!rows[0]) return;
    await query(
      `update festival_asset_review_items
       set review_state='source_required',review_note=coalesce(review_note,$2),
           integrity_checked_at=now(),thumbnail_integrity_state='missing_source',
           updated_at=case when review_state<>'source_required' then now() else updated_at end
       where id=$1`,
      [input.reviewItemId, inspection.note]
    );
    if (rows[0].promoted_library_asset_id && rows[0].promoted_version_asset_id) {
      await query(
        `update festival_asset_library
         set approval_state=$2,integrity_state=$3,integrity_note=$4,
             integrity_checked_at=now(),updated_at=now()
         where id=$1 and current_version_asset_id=$5`,
        [
          rows[0].promoted_library_asset_id,
          publicApprovalState(inspection.state),
          inspection.state,
          inspection.note,
          rows[0].promoted_version_asset_id
        ]
      );
    }
  });
  if (inspection.state === "missing_source") {
    throw badRequest("This asset cannot be approved because its source file is missing.");
  }
  if (inspection.state === "checksum_mismatch") {
    throw badRequest("This asset cannot be approved because its source checksum no longer matches the reviewed version.");
  }
  throw badRequest("This asset cannot be approved because its file metadata or website region is invalid.");
}

export async function getFestivalAssetIntegritySummary() {
  const result = await dbQuery<{
    total: number | string;
    unchecked: number | string;
    healthy: number | string;
    missing_source: number | string;
    checksum_mismatch: number | string;
    invalid_metadata: number | string;
    broken_derivative: number | string;
  }>(
    `select count(*)::int total,
       count(*) filter(where integrity_state='unchecked')::int unchecked,
       count(*) filter(where integrity_state='healthy')::int healthy,
       count(*) filter(where integrity_state='missing_source')::int missing_source,
       count(*) filter(where integrity_state='checksum_mismatch')::int checksum_mismatch,
       count(*) filter(where integrity_state='invalid_metadata')::int invalid_metadata,
       count(*) filter(where integrity_state='broken_derivative')::int broken_derivative
     from festival_asset_library
     where lifecycle_state='active'
       and approval_state in ('approved','missing_source','integrity_failed')`
  );
  const row = result.rows[0];
  return {
    total: Number(row?.total || 0),
    unchecked: Number(row?.unchecked || 0),
    healthy: Number(row?.healthy || 0),
    missingSource: Number(row?.missing_source || 0),
    checksumMismatch: Number(row?.checksum_mismatch || 0),
    invalidMetadata: Number(row?.invalid_metadata || 0),
    brokenDerivative: Number(row?.broken_derivative || 0)
  };
}
