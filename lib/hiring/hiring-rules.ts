import "server-only";

import { z } from "zod";
import { dbQuery } from "@/lib/db";

export const smartHiringRulesSchema = z.object({
  version: z.string().trim().min(3).max(80),
  eligibilityPassThreshold: z.number().min(0).max(100),
  eligibilityReviewThreshold: z.number().min(0).max(100),
  assessmentAcceptThreshold: z.number().min(0).max(100),
  assessmentRejectThreshold: z.number().min(0).max(100),
  integrityFocusReviewCount: z.number().int().min(1).max(100),
  integrityPasteReviewCount: z.number().int().min(1).max(100),
  talentPoolThreshold: z.number().min(0).max(100),
  autoProgressToAdminReview: z.boolean(),
  writerVivaRequired: z.boolean(),
  salesInterviewRequired: z.boolean(),
  finalDecisionRequiresAdmin: z.literal(true)
}).superRefine((value, context) => {
  if (value.eligibilityReviewThreshold > value.eligibilityPassThreshold) {
    context.addIssue({ code: "custom", path: ["eligibilityReviewThreshold"], message: "The review threshold cannot exceed the pass threshold." });
  }
  if (value.assessmentRejectThreshold >= value.assessmentAcceptThreshold) {
    context.addIssue({ code: "custom", path: ["assessmentRejectThreshold"], message: "The reject threshold must be lower than the accept threshold." });
  }
});

export type SmartHiringRules = z.infer<typeof smartHiringRulesSchema>;

export const defaultSmartHiringRules: SmartHiringRules = {
  version: "smart-hiring-rules-v1",
  eligibilityPassThreshold: 70,
  eligibilityReviewThreshold: 55,
  assessmentAcceptThreshold: 75,
  assessmentRejectThreshold: 50,
  integrityFocusReviewCount: 4,
  integrityPasteReviewCount: 1,
  talentPoolThreshold: 60,
  autoProgressToAdminReview: true,
  writerVivaRequired: true,
  salesInterviewRequired: true,
  finalDecisionRequiresAdmin: true
};

export async function getSmartHiringRules() {
  const result = await dbQuery<{ setting_value: unknown }>(
    "select setting_value from hiring_settings where setting_key='smart_hiring_rules_v1' limit 1"
  );
  const parsed = smartHiringRulesSchema.safeParse(result.rows[0]?.setting_value);
  return parsed.success ? parsed.data : defaultSmartHiringRules;
}

export async function updateSmartHiringRules(
  input: SmartHiringRules,
  adminUserId: string,
  reason: string
) {
  const rules = smartHiringRulesSchema.parse(input);
  await dbQuery(
    `insert into hiring_settings(setting_key,setting_value,updated_by_admin_user_id,updated_at)
     values('smart_hiring_rules_v1',$1::jsonb,$2,now())
     on conflict(setting_key) do update set
       setting_value=excluded.setting_value,
       updated_by_admin_user_id=excluded.updated_by_admin_user_id,
       updated_at=now()`,
    [JSON.stringify(rules), adminUserId]
  );
  await dbQuery(
    `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
     values('admin',$1,'advanced_hiring_rules_updated','hiring_settings','smart_hiring_rules_v1',$2::jsonb)`,
    [adminUserId, JSON.stringify({ version: rules.version, reason })]
  );
  return rules;
}

