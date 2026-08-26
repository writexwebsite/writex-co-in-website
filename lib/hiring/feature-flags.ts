export type HiringFeature =
  | "foundation"
  | "applications"
  | "assessments"
  | "antiCheat"
  | "admin"
  | "connectedCandidates"
  | "trustPublishing";

const envByFeature: Record<HiringFeature, string> = {
  foundation: "SMART_HIRING_ENABLED",
  applications: "HIRING_APPLICATIONS_ENABLED",
  assessments: "HIRING_ASSESSMENTS_ENABLED",
  antiCheat: "HIRING_ANTI_CHEAT_ENABLED",
  admin: "HIRING_ADMIN_ENABLED",
  connectedCandidates: "HIRING_CONNECTED_CANDIDATES_ENABLED",
  trustPublishing: "HIRING_TRUST_PUBLISHING_ENABLED"
};

export function isHiringFeatureEnabled(feature: HiringFeature) {
  return (
    process.env.SMART_HIRING_ENABLED === "true" &&
    process.env[envByFeature[feature]] === "true"
  );
}

export function getHiringFeatureState() {
  return {
    foundation: process.env.SMART_HIRING_ENABLED === "true",
    applications: isHiringFeatureEnabled("applications"),
    assessments: isHiringFeatureEnabled("assessments"),
    antiCheat: isHiringFeatureEnabled("antiCheat"),
    admin: isHiringFeatureEnabled("admin"),
    connectedCandidates: isHiringFeatureEnabled("connectedCandidates"),
    trustPublishing: isHiringFeatureEnabled("trustPublishing"),
    hrmsProvider:
      process.env.HIRING_HRMS_PROVIDER === "api" ? "api" : "unavailable"
  } as const;
}

