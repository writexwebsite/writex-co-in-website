export const salesAcademyProductKey = "SALES_ACADEMY" as const;

export type AiGovernanceStatus = "ACTIVE" | "PAUSED" | "BUDGET_PROTECTED";

export type AiPricingVersion = {
  id: string;
  versionKey: string;
  provider: "OPENAI";
  modelId: "gpt-5.6-luna";
  serviceTier: "STANDARD";
  contextTier: "SHORT" | "LONG";
  inputUsdPerMillionTokens: number;
  cachedInputUsdPerMillionTokens: number;
  cacheWriteUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  longContextThresholdTokens: number;
  currency: "USD";
  effectiveAt: string;
  verifiedAt: string;
  sourceUrl: string;
  modelSourceUrl: string;
  active: boolean;
  changeReason: string;
  changedBy: string | null;
};

export type AiTrainingCapacity = {
  settings: {
    plannedBdes: number;
    trainingDaysPerMonth: number;
    plannedTrainingMonths: number;
    sessionMinutesMin: number;
    sessionMinutesMax: number;
    monthlyTrainingHoursMin: number;
    monthlyTrainingHoursMax: number;
  };
  telemetry: {
    confidence: "LOW" | "MEDIUM" | "HIGH";
    sampleEvents: number;
    activeBdes: number;
    bdeMessagesSent: number;
    aiResponseEvents: number;
    visibleCustomerBubbles: number;
    trainingSessions: number;
    averageInputTokensPerEvent: number;
    averageCachedInputTokensPerEvent: number;
    averageOutputTokensPerEvent: number;
    averageTotalTokensPerEvent: number;
    averageCostInrPerEvent: number;
    averageAiEventsPerSession: number;
    averageBdeMessagesPerSession: number;
    averageCustomerBubblesPerSession: number;
    averageCostInrPerSession: number;
  };
  planning: {
    estimatedEventsSupportedAtTarget: number;
    estimatedEventsRemainingAtTarget: number;
    sustainableEventsPerBdeDayAtTarget: number;
    sustainableEventsPerBdeDayAtCeiling: number;
    estimatedTrainingSessionsSupported: number;
  };
  scenarios: Array<{
    label: "LIGHT" | "NORMAL" | "RIGOROUS";
    eventsPerBdeDay: number;
    monthlyEvents: number;
    estimatedMonthlyTokens: number;
    estimatedMonthlyCostInr: number;
    percentOfTarget: number;
    percentOfCeiling: number;
  }>;
};

export type AiGovernanceProduct = {
  id: string;
  productKey: string;
  displayName: string;
  provider: string;
  providerProjectId: string;
  providerProjectName: string;
  status: AiGovernanceStatus;
  modelId: string;
  reasoningEffort: "none";
  maxPrimaryCallsPerEvent: 1;
  inputUsdPerMillionTokens: number;
  cachedInputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  higherCapabilityFallbackEnabled: boolean;
  operatingTargetInr: number;
  internalSafetyStopInr: number;
  masterCeilingInr: number;
  providerHardLimitUsd: number;
  budgetFxRate: number;
  budgetFxSource: string;
  primarySuperadminEmployeeId: string | null;
  primarySuperadminName: string | null;
  lastProviderReconciledAt: string | null;
  reconciliationStatus: "PREPARED" | "ACTIVE" | "DEGRADED";
  updatedAt: string;
};

export type AiGovernanceSnapshot = {
  product: AiGovernanceProduct;
  alerts: number[];
  totals: {
    spendInr: number;
    spendUsd: number;
    providerReportedSpendInr: number | null;
    providerReportedSpendUsd: number | null;
    reconciliationVarianceUsd: number | null;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    visibleCustomerBubbles: number;
    events: number;
    paidEvents: number;
    failedEvents: number;
    projectedMonthEndInr: number;
    percentOfTarget: number;
    percentOfSafetyStop: number;
    percentOfCeiling: number;
  };
  daily: Array<{ day: string; events: number; spendInr: number; tokens: number }>;
  employees: Array<{ employeeId: string | null; name: string; events: number; spendInr: number; tokens: number }>;
  sessions: Array<{ sessionId: string; events: number; spendInr: number; tokens: number }>;
  models: Array<{ modelId: string; events: number; spendInr: number; tokens: number }>;
  pricing: { active: AiPricingVersion[]; history: AiPricingVersion[] };
  capacity: AiTrainingCapacity;
  candidates: Array<{ id: string; employeeCode: string; displayName: string; officialEmail: string }>;
  anomalies: string[];
  academySync: { status: "SYNCED" | "UNAVAILABLE"; message: string };
};
