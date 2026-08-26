import "server-only";

import { ApiError, badRequest } from "@/lib/api/response";
import { dbQuery, withDbTransaction } from "@/lib/db";
import {
  FESTIVAL_ASSET_PLACEMENTS,
  PUBLIC_FESTIVAL_ASSET_PLACEMENTS,
  type FestivalAssetAssignment,
  type FestivalAssetAuditEvent,
  type FestivalAssetLibrarySnapshot,
  type FestivalAssetLifecycleState,
  type FestivalAssetPlacement,
  type FestivalAssetVersion,
  type FestivalLibraryAsset
} from "./asset-governance-types";

const RETENTION_DAYS = 30;
const REUSABLE_PLACEMENTS = new Set<FestivalAssetPlacement>([
  "private_reference",
  "palette_source",
  "motif_interpretation_source",
  "axo_theme_reference",
  "header_decoration_rail",
  "inner_page_accent"
]);

const toIso = (value: Date | string | null) =>
  value ? new Date(value).toISOString() : null;

type LibraryRow = {
  id: string;
  owner_theme_id: string | null;
  owner_theme_name: string | null;
  display_name: string;
  default_purpose: FestivalLibraryAsset["purpose"];
  asset_type: FestivalLibraryAsset["assetType"];
  approval_state: string;
  lifecycle_state: FestivalAssetLifecycleState;
  integrity_state: string;
  integrity_checked_at: Date | string | null;
  integrity_note: string | null;
  current_version_asset_id: string | null;
  current_version_number: number | string | null;
  current_file_name: string | null;
  current_mime_type: string | null;
  usage_count: number | string;
  archived_at: Date | string | null;
  trashed_at: Date | string | null;
  retention_until: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  assignments: Array<{
    id: string;
    themeId: string;
    themeName: string;
    placement: FestivalAssetPlacement;
    state: FestivalAssetAssignment["state"];
    versionAssetId: string;
    versionNumber: number | string;
    assignedAt: string;
    removedAt: string | null;
    isFallback: boolean;
  }>;
  versions: Array<{
    id: string;
    versionNumber: number | string;
    state: FestivalAssetVersion["state"];
    safeFileName: string;
    mimeType: string;
    fileSize: number | string;
    checksumSha256: string | null;
    reviewStatus: string;
    qualityStatus: string;
    createdAt: string;
    previousAssetId: string | null;
    assetRole: FestivalAssetVersion["assetRole"];
    variant: string;
    intendedFestival: string | null;
    assetCategory: string | null;
    usageLocations: string[];
    assetMetadata: Record<string, unknown>;
    integrityState: string;
    integrityCheckedAt: string | null;
    integrityNote: string | null;
  }>;
  audit: Array<{
    id: string;
    action: string;
    safeMetadata: Record<string, unknown>;
    actorName: string | null;
    createdAt: string;
  }>;
};

function mapLibraryAsset(row: LibraryRow): FestivalLibraryAsset {
  const assignments: FestivalAssetAssignment[] = (row.assignments || []).map(
    (assignment) => ({
      ...assignment,
      versionNumber: Number(assignment.versionNumber || 1),
      assignedAt: new Date(assignment.assignedAt).toISOString(),
      removedAt: assignment.removedAt
        ? new Date(assignment.removedAt).toISOString()
        : null
    })
  );
  const versions: FestivalAssetVersion[] = (row.versions || []).map(
    (version) => ({
      ...version,
      versionNumber: Number(version.versionNumber || 1),
      fileSize: Number(version.fileSize || 0),
      createdAt: new Date(version.createdAt).toISOString(),
      current: version.id === row.current_version_asset_id
    })
  );
  const audit: FestivalAssetAuditEvent[] = (row.audit || []).map((event) => ({
    ...event,
    createdAt: new Date(event.createdAt).toISOString()
  }));
  return {
    id: row.id,
    ownerThemeId: row.owner_theme_id,
    ownerThemeName: row.owner_theme_name,
    displayName: row.display_name,
    purpose: row.default_purpose,
    assetType: row.asset_type,
    approvalState: row.approval_state,
    lifecycleState: row.lifecycle_state,
    integrityState: row.integrity_state || "unchecked",
    integrityCheckedAt: toIso(row.integrity_checked_at),
    integrityNote: row.integrity_note,
    currentVersionId: row.current_version_asset_id,
    currentVersionNumber:
      row.current_version_number === null
        ? null
        : Number(row.current_version_number),
    currentFileName: row.current_file_name,
    currentMimeType: row.current_mime_type,
    usageCount: Number(row.usage_count || 0),
    archivedAt: toIso(row.archived_at),
    trashedAt: toIso(row.trashed_at),
    retentionUntil: toIso(row.retention_until),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    assignments,
    versions,
    audit
  };
}

export async function getFestivalAssetLibrarySnapshot(): Promise<FestivalAssetLibrarySnapshot> {
  const [assets, themes] = await Promise.all([
    dbQuery<LibraryRow>(
      `
        select
          library.*,
          theme.name as owner_theme_name,
          current_version.version_number as current_version_number,
          current_version.safe_file_name as current_file_name,
          current_version.mime_type as current_mime_type,
          (
            select count(*)
            from festival_asset_assignments assignment
            where assignment.library_asset_id = library.id
              and assignment.state = 'active'
          ) as usage_count,
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id', assignment.id,
                  'themeId', assignment.theme_id,
                  'themeName', assigned_theme.name,
                  'placement', assignment.placement,
                  'state', assignment.state,
                  'versionAssetId', assignment.asset_version_id,
                  'versionNumber', version.version_number,
                  'assignedAt', assignment.assigned_at,
                  'removedAt', assignment.removed_at,
                  'isFallback', assignment.is_fallback
                )
                order by
                  case when assignment.state = 'active' then 0 else 1 end,
                  assignment.assigned_at desc
              )
              from festival_asset_assignments assignment
              join holiday_themes assigned_theme on assigned_theme.id = assignment.theme_id
              join holiday_theme_assets version on version.id = assignment.asset_version_id
              where assignment.library_asset_id = library.id
            ),
            '[]'::jsonb
          ) as assignments,
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id', version.id,
                  'versionNumber', version.version_number,
                  'state', version.version_state,
                  'safeFileName', version.safe_file_name,
                  'mimeType', version.mime_type,
                  'fileSize', version.file_size,
                  'checksumSha256', version.checksum_sha256,
                  'reviewStatus', version.review_status,
                  'qualityStatus', version.quality_status,
                  'createdAt', version.created_at,
                  'previousAssetId', version.previous_asset_id
                  ,'assetRole', version.asset_role
                  ,'variant', version.variant
                  ,'intendedFestival', version.intended_festival
                  ,'assetCategory', version.asset_category
                  ,'usageLocations', coalesce(version.usage_locations, array[]::text[])
                  ,'assetMetadata', coalesce(version.asset_metadata, '{}'::jsonb)
                  ,'integrityState', coalesce(version.integrity_state, 'unchecked')
                  ,'integrityCheckedAt', version.integrity_checked_at
                  ,'integrityNote', version.integrity_note
                )
                order by version.version_number desc, version.created_at desc
              )
              from holiday_theme_assets version
              where version.library_asset_id = library.id
            ),
            '[]'::jsonb
          ) as versions,
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id', audit.id,
                  'action', audit.action,
                  'safeMetadata', audit.safe_metadata,
                  'actorName', actor.name,
                  'createdAt', audit.created_at
                )
                order by audit.created_at desc
              )
              from (
                select *
                from festival_asset_audit
                where library_asset_id = library.id
                order by created_at desc
                limit 60
              ) audit
              left join admin_users actor on actor.id = audit.actor_admin_user_id
            ),
            '[]'::jsonb
          ) as audit
        from festival_asset_library library
        left join holiday_themes theme on theme.id = library.owner_theme_id
        left join holiday_theme_assets current_version
          on current_version.id = library.current_version_asset_id
        order by
          case library.lifecycle_state
            when 'active' then 1
            when 'archived' then 2
            when 'trash' then 3
            when 'deletion_pending' then 4
            else 5
          end,
          library.updated_at desc
      `
    ),
    dbQuery<{ id: string; name: string; status: string }>(
      `
        select id, name, status
        from holiday_themes
        where slug <> 'default'
          and status <> 'archived'
        order by name
      `
    )
  ]);
  return {
    assets: assets.rows.map(mapLibraryAsset),
    themes: themes.rows,
    retentionDays: RETENTION_DAYS,
    generatedAt: new Date().toISOString()
  };
}

function assertPlacements(values: string[]): FestivalAssetPlacement[] {
  const unique = [...new Set(values)];
  if (
    unique.length === 0 ||
    unique.some(
      (value) =>
        !FESTIVAL_ASSET_PLACEMENTS.includes(value as FestivalAssetPlacement)
    )
  ) {
    throw badRequest("Choose at least one supported asset placement.");
  }
  return unique as FestivalAssetPlacement[];
}

async function insertAssetAudit(
  query: Parameters<Parameters<typeof withDbTransaction>[0]>[0],
  {
    libraryAssetId,
    versionAssetId = null,
    assignmentId = null,
    actorId,
    action,
    safeMetadata
  }: {
    libraryAssetId: string;
    versionAssetId?: string | null;
    assignmentId?: string | null;
    actorId: string;
    action: string;
    safeMetadata: Record<string, unknown>;
  }
) {
  await query(
    `
      insert into festival_asset_audit (
        library_asset_id,
        asset_version_id,
        assignment_id,
        actor_admin_user_id,
        action,
        safe_metadata
      )
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      libraryAssetId,
      versionAssetId,
      assignmentId,
      actorId,
      action,
      JSON.stringify(safeMetadata)
    ]
  );
}

export async function assignFestivalAsset({
  libraryAssetId,
  versionAssetId,
  themeId,
  placements,
  actorId
}: {
  libraryAssetId: string;
  versionAssetId?: string | null;
  themeId: string;
  placements: string[];
  actorId: string;
}) {
  const safePlacements = assertPlacements(placements);
  return withDbTransaction(async (query) => {
    const libraries = await query<{
      id: string;
      lifecycle_state: FestivalAssetLifecycleState;
      current_version_asset_id: string | null;
    }>(
      `
        select id, lifecycle_state, current_version_asset_id
        from festival_asset_library
        where id = $1
        for update
      `,
      [libraryAssetId]
    );
    const library = libraries[0];
    if (!library || library.lifecycle_state !== "active") {
      throw badRequest("Restore the asset before assigning it.");
    }
    const selectedVersionId =
      versionAssetId || library.current_version_asset_id;
    if (!selectedVersionId) throw badRequest("The asset has no usable version.");
    const versions = await query<{
      id: string;
      review_status: string;
      quality_status: string;
      library_asset_id: string;
    }>(
      `
        select id, review_status, quality_status, library_asset_id
        from holiday_theme_assets
        where id = $1 and library_asset_id = $2
        for update
      `,
      [selectedVersionId, libraryAssetId]
    );
    const version = versions[0];
    if (
      !version ||
      version.review_status !== "approved" ||
      !["approved", "approved_with_size_restrictions"].includes(
        version.quality_status
      )
    ) {
      throw badRequest("Approve the selected asset version before assignment.");
    }
    const theme = await query<{ id: string; status: string }>(
      `
        select id, status
        from holiday_themes
        where id = $1 and status <> 'archived'
        for update
      `,
      [themeId]
    );
    if (!theme[0]) throw badRequest("The selected theme was not found.");

    const createdIds: string[] = [];
    for (const placement of safePlacements) {
      const replaced = REUSABLE_PLACEMENTS.has(placement)
        ? []
        : await query<{ id: string; library_asset_id: string }>(
            `
              update festival_asset_assignments
              set state = 'replaced',
                  removed_by = $3,
                  removed_at = now(),
                  removal_reason = 'Replaced by a new explicit assignment.',
                  updated_at = now()
              where theme_id = $1
                and placement = $2
                and state = 'active'
              returning id, library_asset_id
            `,
            [themeId, placement, actorId]
          );
      for (const previous of replaced) {
        await insertAssetAudit(query, {
          libraryAssetId: previous.library_asset_id,
          assignmentId: previous.id,
          actorId,
          action: "assignment_replaced",
          safeMetadata: { themeId, placement, replacementLibraryAssetId: libraryAssetId }
        });
      }
      const assigned = await query<{ id: string }>(
        `
          insert into festival_asset_assignments (
            library_asset_id,
            asset_version_id,
            theme_id,
            placement,
            assigned_by
          )
          values ($1, $2, $3, $4, $5)
          returning id
        `,
        [libraryAssetId, selectedVersionId, themeId, placement, actorId]
      );
      const assignmentId = assigned[0]?.id;
      if (!assignmentId) throw new ApiError(500, "SERVER_ERROR", "The asset assignment could not be stored.");
      createdIds.push(assignmentId);
      await insertAssetAudit(query, {
        libraryAssetId,
        versionAssetId: selectedVersionId,
        assignmentId,
        actorId,
        action: "asset_assigned",
        safeMetadata: {
          themeId,
          placement,
          publicPlacement: PUBLIC_FESTIVAL_ASSET_PLACEMENTS.has(placement)
        }
      });
    }
    await query(
      `
        update festival_asset_library
        set updated_at = now()
        where id = $1
      `,
      [libraryAssetId]
    );
    return createdIds;
  });
}

export async function removeFestivalAssetAssignment({
  assignmentId,
  actorId,
  reason = "Removed from one selected location."
}: {
  assignmentId: string;
  actorId: string;
  reason?: string;
}) {
  return withDbTransaction(async (query) => {
    const removed = await query<{
      id: string;
      library_asset_id: string;
      asset_version_id: string;
      theme_id: string;
      placement: FestivalAssetPlacement;
    }>(
      `
        update festival_asset_assignments
        set state = 'removed',
            removed_by = $2,
            removed_at = now(),
            removal_reason = $3,
            updated_at = now()
        where id = $1 and state = 'active'
        returning id, library_asset_id, asset_version_id, theme_id, placement
      `,
      [assignmentId, actorId, reason.slice(0, 240)]
    );
    if (!removed[0]) throw badRequest("The active assignment was not found.");
    await insertAssetAudit(query, {
      libraryAssetId: removed[0].library_asset_id,
      versionAssetId: removed[0].asset_version_id,
      assignmentId: removed[0].id,
      actorId,
      action: "assignment_removed",
      safeMetadata: {
        themeId: removed[0].theme_id,
        placement: removed[0].placement,
        reasonProvided: Boolean(reason)
      }
    });
    return removed[0];
  });
}

export async function setFestivalAssetLifecycle({
  libraryAssetId,
  action,
  actorId
}: {
  libraryAssetId: string;
  action: "archive" | "restore" | "trash" | "restore_trash";
  actorId: string;
}) {
  return withDbTransaction(async (query) => {
    const rows = await query<{
      id: string;
      lifecycle_state: FestivalAssetLifecycleState;
    }>(
      `
        select id, lifecycle_state
        from festival_asset_library
        where id = $1 and lifecycle_state <> 'deleted'
        for update
      `,
      [libraryAssetId]
    );
    const asset = rows[0];
    if (!asset) throw badRequest("The festival asset was not found.");
    let next: FestivalAssetLifecycleState;
    if (action === "archive") {
      if (asset.lifecycle_state !== "active") {
        throw badRequest("Only active assets can be archived.");
      }
      next = "archived";
      await query(
        `
          update festival_asset_library
          set lifecycle_state = 'archived',
              archived_at = now(),
              updated_at = now()
          where id = $1
        `,
        [libraryAssetId]
      );
    } else if (action === "restore") {
      if (asset.lifecycle_state !== "archived") {
        throw badRequest("Only archived assets can be restored.");
      }
      next = "active";
      await query(
        `
          update festival_asset_library
          set lifecycle_state = 'active',
              archived_at = null,
              updated_at = now()
          where id = $1
        `,
        [libraryAssetId]
      );
    } else if (action === "trash") {
      if (!["active", "archived"].includes(asset.lifecycle_state)) {
        throw badRequest("The asset cannot be moved to Trash from its current state.");
      }
      next = "trash";
      const removed = await query<{ id: string; asset_version_id: string; theme_id: string; placement: string }>(
        `
          update festival_asset_assignments
          set state = 'removed',
              removed_by = $2,
              removed_at = now(),
              removal_reason = 'Asset moved to Trash.',
              updated_at = now()
          where library_asset_id = $1 and state = 'active'
          returning id, asset_version_id, theme_id, placement
        `,
        [libraryAssetId, actorId]
      );
      await query(
        `
          update festival_asset_library
          set lifecycle_state = 'trash',
              trashed_at = now(),
              retention_until = now() + ($2::text || ' days')::interval,
              updated_at = now()
          where id = $1
        `,
        [libraryAssetId, RETENTION_DAYS]
      );
      for (const assignment of removed) {
        await insertAssetAudit(query, {
          libraryAssetId,
          versionAssetId: assignment.asset_version_id,
          assignmentId: assignment.id,
          actorId,
          action: "assignment_removed_for_trash",
          safeMetadata: {
            themeId: assignment.theme_id,
            placement: assignment.placement
          }
        });
      }
    } else {
      if (asset.lifecycle_state !== "trash") {
        throw badRequest("Only trashed assets can be restored.");
      }
      next = "active";
      await query(
        `
          update festival_asset_library
          set lifecycle_state = 'active',
              trashed_at = null,
              retention_until = null,
              updated_at = now()
          where id = $1
        `,
        [libraryAssetId]
      );
    }
    await insertAssetAudit(query, {
      libraryAssetId,
      actorId,
      action: `asset_${action}`,
      safeMetadata: {
        previousState: asset.lifecycle_state,
        nextState: next,
        assignmentsRestored: false
      }
    });
    return next;
  });
}

export async function restoreFestivalAssetVersion({
  libraryAssetId,
  versionAssetId,
  actorId
}: {
  libraryAssetId: string;
  versionAssetId: string;
  actorId: string;
}) {
  return withDbTransaction(async (query) => {
    const library = await query<{
      current_version_asset_id: string | null;
      lifecycle_state: FestivalAssetLifecycleState;
    }>(
      `
        select current_version_asset_id, lifecycle_state
        from festival_asset_library
        where id = $1
        for update
      `,
      [libraryAssetId]
    );
    if (!library[0] || library[0].lifecycle_state === "deleted") {
      throw badRequest("The festival asset was not found.");
    }
    const versions = await query<{
      id: string;
      review_status: string;
      quality_status: string;
      version_number: number;
    }>(
      `
        select id, review_status, quality_status, version_number
        from holiday_theme_assets
        where id = $1 and library_asset_id = $2
        for update
      `,
      [versionAssetId, libraryAssetId]
    );
    const version = versions[0];
    if (
      !version ||
      version.review_status !== "approved" ||
      !["approved", "approved_with_size_restrictions"].includes(
        version.quality_status
      )
    ) {
      throw badRequest("Only an approved historical version can be restored.");
    }
    await query(
      `
        update holiday_theme_assets
        set version_state = case
              when id = $2 then 'restored'
              when id = $3 then 'previous'
              else version_state
            end,
            updated_at = now()
        where library_asset_id = $1
      `,
      [libraryAssetId, versionAssetId, library[0].current_version_asset_id]
    );
    await query(
      `
        update festival_asset_assignments
        set asset_version_id = $2,
            updated_at = now()
        where library_asset_id = $1 and state = 'active'
      `,
      [libraryAssetId, versionAssetId]
    );
    await query(
      `
        update festival_asset_library
        set current_version_asset_id = $2,
            approval_state = 'approved',
            updated_at = now()
        where id = $1
      `,
      [libraryAssetId, versionAssetId]
    );
    await insertAssetAudit(query, {
      libraryAssetId,
      versionAssetId,
      actorId,
      action: "asset_version_restored",
      safeMetadata: {
        previousVersionAssetId: library[0].current_version_asset_id,
        restoredVersionNumber: version.version_number
      }
    });
    return version;
  });
}

export async function copyFestivalLoginAssignments({
  themeId,
  direction,
  actorId
}: {
  themeId: string;
  direction: "client_to_employee" | "employee_to_client";
  actorId: string;
}) {
  const sourcePrefix =
    direction === "client_to_employee" ? "client_login_" : "employee_login_";
  const targetPrefix =
    direction === "client_to_employee" ? "employee_login_" : "client_login_";
  const current = await dbQuery<{
    library_asset_id: string;
    asset_version_id: string;
    placement: FestivalAssetPlacement;
  }>(
    `
      select library_asset_id, asset_version_id, placement
      from festival_asset_assignments
      where theme_id = $1
        and state = 'active'
        and placement in ($2, $3)
      order by placement
    `,
    [
      themeId,
      `${sourcePrefix}desktop`,
      `${sourcePrefix}mobile`
    ]
  );
  if (!current.rows.length) {
    throw badRequest("The source login channel has no asset assignment to copy.");
  }
  for (const assignment of current.rows) {
    const targetPlacement = assignment.placement.replace(
      sourcePrefix,
      targetPrefix
    ) as FestivalAssetPlacement;
    await assignFestivalAsset({
      libraryAssetId: assignment.library_asset_id,
      versionAssetId: assignment.asset_version_id,
      themeId,
      placements: [targetPlacement],
      actorId
    });
  }
  return current.rows.length;
}

export async function prepareFestivalAssetPermanentDeletion({
  libraryAssetId,
  actorId,
  retentionOverride
}: {
  libraryAssetId: string;
  actorId: string;
  retentionOverride: boolean;
}) {
  return withDbTransaction(async (query) => {
    const library = await query<{
      lifecycle_state: FestivalAssetLifecycleState;
      retention_until: Date | string | null;
    }>(
      `
        select lifecycle_state, retention_until
        from festival_asset_library
        where id = $1
        for update
      `,
      [libraryAssetId]
    );
    if (!library[0] || library[0].lifecycle_state !== "trash") {
      throw badRequest("Move the asset to Trash before permanent deletion.");
    }
    const activeAssignments = await query<{ count: string }>(
      `
        select count(*)::text as count
        from festival_asset_assignments
        where library_asset_id = $1 and state = 'active'
      `,
      [libraryAssetId]
    );
    if (Number(activeAssignments[0]?.count || 0) > 0) {
      throw badRequest("Remove every active assignment before permanent deletion.");
    }
    const retentionUntil = library[0].retention_until
      ? new Date(library[0].retention_until)
      : null;
    if (
      !retentionOverride &&
      (!retentionUntil || retentionUntil.getTime() > Date.now())
    ) {
      throw badRequest("The Trash retention period has not ended.");
    }
    const versions = await query<{ id: string; s3_key: string }>(
      `
        update holiday_theme_assets
        set version_state = 'deleted_pending_retention',
            storage_delete_status = 'pending',
            updated_at = now()
        where library_asset_id = $1
          and storage_delete_status <> 'deleted'
        returning id, s3_key
      `,
      [libraryAssetId]
    );
    await query(
      `
        update festival_asset_library
        set lifecycle_state = 'deletion_pending',
            deletion_requested_at = now(),
            updated_at = now()
        where id = $1
      `,
      [libraryAssetId]
    );
    await insertAssetAudit(query, {
      libraryAssetId,
      actorId,
      action: "permanent_deletion_prepared",
      safeMetadata: {
        versionCount: versions.length,
        retentionOverride
      }
    });
    return versions;
  });
}

export async function finalizeFestivalAssetPermanentDeletion({
  libraryAssetId,
  actorId
}: {
  libraryAssetId: string;
  actorId: string;
}) {
  return withDbTransaction(async (query) => {
    await query(
      `
        update holiday_theme_assets
        set version_state = 'deleted',
            storage_delete_status = 'deleted',
            status = 'archived',
            archived_at = coalesce(archived_at, now()),
            deleted_at = now(),
            updated_at = now()
        where library_asset_id = $1
      `,
      [libraryAssetId]
    );
    const result = await query<{ id: string }>(
      `
        update festival_asset_library
        set lifecycle_state = 'deleted',
            current_version_asset_id = null,
            deleted_at = now(),
            updated_at = now()
        where id = $1 and lifecycle_state = 'deletion_pending'
        returning id
      `,
      [libraryAssetId]
    );
    if (!result[0]) throw badRequest("Permanent deletion was not prepared.");
    await insertAssetAudit(query, {
      libraryAssetId,
      actorId,
      action: "asset_permanently_deleted",
      safeMetadata: { storageDeleted: true }
    });
  });
}

export async function cancelFestivalAssetPermanentDeletion({
  libraryAssetId,
  actorId
}: {
  libraryAssetId: string;
  actorId: string;
}) {
  await withDbTransaction(async (query) => {
    await query(
      `
        update holiday_theme_assets
        set version_state = case
              when id = (
                select current_version_asset_id
                from festival_asset_library
                where id = $1
              ) then 'current'
              else 'previous'
            end,
            storage_delete_status = 'failed',
            updated_at = now()
        where library_asset_id = $1
          and storage_delete_status = 'pending'
      `,
      [libraryAssetId]
    );
    await query(
      `
        update festival_asset_library
        set lifecycle_state = 'trash',
            deletion_requested_at = null,
            updated_at = now()
        where id = $1 and lifecycle_state = 'deletion_pending'
      `,
      [libraryAssetId]
    );
    await insertAssetAudit(query, {
      libraryAssetId,
      actorId,
      action: "permanent_deletion_failed",
      safeMetadata: { returnedToTrash: true }
    });
  });
}
