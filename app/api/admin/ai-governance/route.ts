import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertActiveAdminActor } from "@/lib/admin/active-admin";
import { assertCanManageAiGovernance } from "@/lib/admin/permissions";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  createAndActivateAiPricingVersion,
  getAiGovernanceSnapshot,
  setAiGovernanceStatus,
  updateAiTrainingCapacity
} from "@/lib/ai-governance/repository";
import { assertSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const officialSource = z.url().refine((value) => new URL(value).hostname === "developers.openai.com", "Use an official OpenAI developer source URL.");
const rates = z.object({ input: z.number().nonnegative(), cachedInput: z.number().nonnegative(), cacheWrite: z.number().nonnegative(), output: z.number().nonnegative() });

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("set_status"), status: z.enum(["ACTIVE", "PAUSED"]) }),
  z.object({
    action: z.literal("activate_pricing"), versionKey: z.string().regex(/^[a-z0-9-]{8,80}$/),
    short: rates, long: rates, longContextThresholdTokens: z.number().int().min(1000).max(2_000_000),
    effectiveAt: z.iso.datetime(), verifiedAt: z.iso.datetime(), sourceUrl: officialSource,
    modelSourceUrl: officialSource, changeReason: z.string().trim().min(12).max(500)
  }),
  z.object({
    action: z.literal("update_capacity"), plannedBdes: z.number().int().min(1).max(10000),
    trainingDaysPerMonth: z.number().int().min(1).max(31), plannedTrainingMonths: z.number().int().min(1).max(60),
    sessionMinutesMin: z.number().int().min(5).max(480), sessionMinutesMax: z.number().int().min(5).max(480),
    changeReason: z.string().trim().min(8).max(500)
  }).refine((input) => input.sessionMinutesMax >= input.sessionMinutesMin, { message: "Maximum session minutes must be at least the minimum." })
]);

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    assertCanManageAiGovernance(admin);
    await assertActiveAdminActor(admin.adminUserId);
    return apiOk(await getAiGovernanceSnapshot(), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    assertCanManageAiGovernance(admin);
    await assertActiveAdminActor(admin.adminUserId);
    const input = actionSchema.parse(await request.json());
    if (input.action === "set_status") await setAiGovernanceStatus(input.status, admin);
    if (input.action === "activate_pricing") await createAndActivateAiPricingVersion(input, admin);
    if (input.action === "update_capacity") await updateAiTrainingCapacity(input, admin);
    return apiOk(await getAiGovernanceSnapshot({ refresh: true }), { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError(badRequest("Choose a valid AI governance action."));
    return apiError(error);
  }
}
