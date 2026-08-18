import type { AiPricingVersion } from "@/lib/ai-governance/domain";

export function pricingForInput(pricing: AiPricingVersion[], inputTokens: number) {
  const short = pricing.find((item) => item.active && item.contextTier === "SHORT");
  const long = pricing.find((item) => item.active && item.contextTier === "LONG");
  if (!short || !long) throw new Error("Both active Luna Standard pricing tiers are required.");
  return inputTokens > short.longContextThresholdTokens ? long : short;
}

export function localEstimatedCostUsd(input: {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}, pricing: AiPricingVersion) {
  const inputTokens = Math.max(0, input.inputTokens);
  const cachedTokens = Math.min(Math.max(0, input.cachedInputTokens), inputTokens);
  const uncachedTokens = Math.max(0, inputTokens - cachedTokens);
  return (
    uncachedTokens * pricing.inputUsdPerMillionTokens
    + cachedTokens * pricing.cachedInputUsdPerMillionTokens
    + Math.max(0, input.cacheWriteTokens) * pricing.cacheWriteUsdPerMillionTokens
    + Math.max(0, input.outputTokens) * pricing.outputUsdPerMillionTokens
  ) / 1_000_000;
}
