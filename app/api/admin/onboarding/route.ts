import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import { assertSameOrigin, parseJson } from "@/lib/security";

type OnboardingRow = {
  assigned_role: string;
  tutorial_version: string;
  current_step: number;
  completed_steps: string[];
  checklist_state: Record<string, boolean>;
  onboarding_completed: boolean;
  skipped_at: string | null;
  dismissed_checklist_at: string | null;
};

const patchSchema = z.object({
  action: z.enum([
    "progress",
    "complete",
    "skip",
    "restart",
    "checklist",
    "dismiss_checklist"
  ]),
  currentStep: z.number().int().min(0).max(50).optional(),
  completedStepId: z.string().trim().min(1).max(100).optional(),
  checklistKey: z.string().trim().min(1).max(100).optional(),
  checklistValue: z.boolean().optional()
});

async function getState(adminUserId: string, role: string) {
  const result = await dbQuery<OnboardingRow>(
    `insert into admin_onboarding_state (admin_user_id, assigned_role)
     values ($1,$2)
     on conflict (admin_user_id) do update set assigned_role=excluded.assigned_role
     returning assigned_role,tutorial_version,current_step,completed_steps,
       checklist_state,onboarding_completed,skipped_at,dismissed_checklist_at`,
    [adminUserId, role]
  );
  return result.rows[0];
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(request);
    return apiOk(await getState(admin.adminUserId, admin.role));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    const input = await parseJson(request, patchSchema);
    if (input.action === "restart") {
      await dbQuery(
        `update admin_onboarding_state set current_step=0,completed_steps='[]'::jsonb,
         onboarding_completed=false,skipped_at=null,completed_at=null,updated_at=now()
         where admin_user_id=$1`,
        [admin.adminUserId]
      );
    } else if (input.action === "complete") {
      await dbQuery(
        `update admin_onboarding_state set onboarding_completed=true,completed_at=now(),
         skipped_at=null,updated_at=now() where admin_user_id=$1`,
        [admin.adminUserId]
      );
    } else if (input.action === "skip") {
      await dbQuery(
        `update admin_onboarding_state set skipped_at=now(),updated_at=now()
         where admin_user_id=$1`,
        [admin.adminUserId]
      );
    } else if (input.action === "dismiss_checklist") {
      await dbQuery(
        `update admin_onboarding_state set dismissed_checklist_at=now(),updated_at=now()
         where admin_user_id=$1`,
        [admin.adminUserId]
      );
    } else if (input.action === "checklist" && input.checklistKey) {
      await dbQuery(
        `update admin_onboarding_state set checklist_state=
           jsonb_set(checklist_state,array[$2],to_jsonb($3::boolean),true),updated_at=now()
         where admin_user_id=$1`,
        [admin.adminUserId, input.checklistKey, input.checklistValue ?? true]
      );
    } else if (input.action === "progress") {
      await dbQuery(
        `update admin_onboarding_state set current_step=$2,
         completed_steps=case when $3::text is null then completed_steps
           else completed_steps || to_jsonb($3::text) end,
         updated_at=now() where admin_user_id=$1`,
        [
          admin.adminUserId,
          input.currentStep ?? 0,
          input.completedStepId ?? null
        ]
      );
    }
    await dbQuery(
      `insert into admin_guidance_audit (admin_user_id,action,tutorial_id,safe_metadata)
       values ($1,$2,'admin-guidance-v1',$3::jsonb)`,
      [
        admin.adminUserId,
        `onboarding_${input.action}`,
        JSON.stringify({ step: input.currentStep, checklistKey: input.checklistKey })
      ]
    );
    return apiOk(await getState(admin.adminUserId, admin.role));
  } catch (error) {
    return apiError(error);
  }
}
