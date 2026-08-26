import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import {
  getGovernedHelpArticles,
  getOnboardingCompletion,
  resetAdminOnboarding,
  saveGovernedHelpArticle
} from "@/lib/admin/guidance-store";
import { adminGuidanceRoles } from "@/lib/admin/guidance-content";
import { getAdminSessionFromRequest } from "@/lib/auth";
import {
  assertRateLimit,
  assertSameOrigin,
  getRequestContext,
  parseJson
} from "@/lib/security";

const safeText = z.string().trim().refine((value) => !/[<>]/.test(value));
const articleSchema = z.object({
  action: z.literal("save_article"),
  article: z.object({
    id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    title: safeText.min(2).max(120),
    module: safeText.min(2).max(80),
    roles: z.array(z.enum(adminGuidanceRoles)).min(1),
    version: safeText.min(1).max(20),
    owner: safeText.min(2).max(100),
    active: z.boolean(),
    displayOrder: z.number().int().min(0).max(1000),
    purpose: safeText.min(10).max(1000),
    actions: z.array(safeText.min(2).max(240)).min(1).max(20),
    mistakes: z.array(safeText.min(2).max(240)).min(1).max(20),
    sensitive: safeText.max(500).optional(),
    href: z.string().trim().max(200).refine((value) => !value || value.startsWith("/")).optional(),
    isCustom: z.boolean()
  })
});

const resetSchema = z.object({
  action: z.literal("reset_onboarding"),
  adminUserId: z.string().uuid()
});

const mutationSchema = z.discriminatedUnion("action", [articleSchema, resetSchema]);

function requireSuperAdmin(request: NextRequest) {
  const admin = getAdminSessionFromRequest(request);
  if (admin.role !== "super_admin") {
    throw badRequest("Only a Super Admin can manage tutorial governance.");
  }
  return admin;
}

export async function GET(request: NextRequest) {
  try {
    requireSuperAdmin(request);
    const [articles, onboarding] = await Promise.all([
      getGovernedHelpArticles(),
      getOnboardingCompletion()
    ]);
    return apiOk({ articles, onboarding });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = requireSuperAdmin(request);
    const context = getRequestContext(request);
    assertRateLimit({
      key: `help-governance:${admin.adminUserId}:${context.ipAddress}`,
      limit: 80,
      windowSeconds: 3600
    });
    const input = await parseJson(request, mutationSchema);
    if (input.action === "reset_onboarding") {
      const reset = await resetAdminOnboarding(input.adminUserId, admin.adminUserId);
      if (!reset) throw badRequest("The selected onboarding record was not found.");
      return apiOk({ reset: true });
    }
    await saveGovernedHelpArticle(
      {
        ...input.article,
        lastUpdated: new Date().toISOString().slice(0, 10),
        isProtected: false
      },
      admin.adminUserId
    );
    return apiOk({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
