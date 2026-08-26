import type {
  HolidayExperienceStudioConfig,
  HolidayStudioAssignmentSourceMode,
  HolidayStudioMotifAssignment,
  HolidayStudioRegion
} from "./types";

const sourcePriority: Record<HolidayStudioAssignmentSourceMode, number> = {
  custom: 3,
  recommended: 2,
  legacy_inactive: 0
};

export function festivalAssignmentSource(
  assignment: Pick<HolidayStudioMotifAssignment, "id" | "sourceMode">
): HolidayStudioAssignmentSourceMode {
  if (assignment.sourceMode) return assignment.sourceMode;
  return assignment.id.startsWith("recommended-")
    ? "recommended"
    : "custom";
}

export function normalizeFestivalStudioScene(
  studio: HolidayExperienceStudioConfig
): HolidayExperienceStudioConfig {
  const withSources = studio.motifAssignments.map((assignment) => ({
    ...assignment,
    sourceMode: festivalAssignmentSource(assignment)
  }));
  const winningSource = new Map<
    HolidayStudioRegion,
    HolidayStudioAssignmentSourceMode
  >();

  for (const assignment of withSources) {
    if (!assignment.enabled || assignment.sourceMode === "legacy_inactive") {
      continue;
    }
    const current = winningSource.get(assignment.region);
    if (!current || sourcePriority[assignment.sourceMode] > sourcePriority[current]) {
      winningSource.set(assignment.region, assignment.sourceMode);
    }
  }

  const motifAssignments = withSources.map((assignment) => {
    const winner = winningSource.get(assignment.region);
    const winningPack = withSources.find(
      (candidate) =>
        candidate.region === assignment.region &&
        candidate.enabled &&
        candidate.sourceMode === winner &&
        Boolean(candidate.decorationPackId)
    )?.decorationPackId;
    if (
      assignment.enabled &&
      (!winner ||
        assignment.sourceMode !== winner ||
        (winningPack && assignment.decorationPackId !== winningPack))
    ) {
      return { ...assignment, enabled: false };
    }
    return assignment;
  });
  const regions = Object.fromEntries(
    Object.entries(studio.regions).map(([region, config]) => {
      const regionKey = region as HolidayStudioRegion;
      const hasActiveAssignment = motifAssignments.some(
        (assignment) =>
          assignment.region === regionKey &&
          assignment.enabled &&
          assignment.sourceMode !== "legacy_inactive"
      );
      return [regionKey, { ...config, enabled: hasActiveAssignment }];
    })
  ) as HolidayExperienceStudioConfig["regions"];
  const deduplicatedMotions = studio.activeMotions.filter(
    (motion, index, motions) => motions.indexOf(motion) === index
  );
  const activeMotions = ["none", "legacy_inactive"].includes(
    studio.motionSourceMode || ""
  )
    ? deduplicatedMotions.filter((motion) => motion === "static")
    : deduplicatedMotions;

  return {
    ...studio,
    motifAssignments,
    regions,
    activeMotions,
    motionSourceMode:
      activeMotions.some((motion) => motion !== "static")
        ? studio.motionSourceMode || "custom"
        : "none"
  };
}

export function activeFestivalSceneAssignments(
  studio: HolidayExperienceStudioConfig,
  regions?: HolidayStudioRegion[]
) {
  const canonical = normalizeFestivalStudioScene(studio);
  return canonical.motifAssignments.filter(
    (assignment) =>
      assignment.enabled &&
      canonical.regions[assignment.region]?.enabled &&
      assignment.sourceMode !== "legacy_inactive" &&
      (!regions || regions.includes(assignment.region))
  );
}
