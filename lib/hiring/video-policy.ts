import "server-only";

import { z } from "zod";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const salesVideoPolicySchema = z.object({
  enabled: z.literal(true),
  targetMinSeconds: z.number().int().min(30).max(120),
  targetMaxSeconds: z.number().int().min(60).max(180),
  absoluteMaxSeconds: z.number().int().min(60).max(300),
  maxBytes: z.number().int().min(5 * 1024 * 1024).max(100 * 1024 * 1024),
  retentionDays: z.number().int().min(30).max(730),
  prompt: z.string().trim().min(40).max(1000)
}).superRefine((value, context) => {
  if (value.targetMinSeconds >= value.targetMaxSeconds) {
    context.addIssue({
      code: "custom",
      path: ["targetMinSeconds"],
      message: "The minimum duration must be lower than the maximum duration."
    });
  }
  if (value.targetMaxSeconds > value.absoluteMaxSeconds) {
    context.addIssue({
      code: "custom",
      path: ["absoluteMaxSeconds"],
      message: "The hard duration limit cannot be lower than the target maximum."
    });
  }
});

export type SalesVideoPolicy = z.infer<typeof salesVideoPolicySchema>;

export const defaultSalesVideoPolicy: SalesVideoPolicy = {
  enabled: true,
  targetMinSeconds: 60,
  targetMaxSeconds: 120,
  absoluteMaxSeconds: 180,
  maxBytes: 50 * 1024 * 1024,
  retentionDays: 365,
  prompt:
    "Please introduce yourself, explain why the Sales Executive role interests you, describe how you would make a new customer comfortable speaking with you, and share one example of how you would handle a hesitant customer."
};

export async function getSalesVideoPolicy(): Promise<SalesVideoPolicy> {
  if (!isDatabaseConfigured()) return defaultSalesVideoPolicy;
  try {
    const result = await dbQuery<{ setting_value: unknown }>(
      "select setting_value from hiring_settings where setting_key='sales_video_introduction_v1' limit 1"
    );
    const parsed = salesVideoPolicySchema.safeParse(result.rows[0]?.setting_value);
    return parsed.success ? parsed.data : defaultSalesVideoPolicy;
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return defaultSalesVideoPolicy;
    throw error;
  }
}

export async function updateSalesVideoPolicy(
  input: SalesVideoPolicy,
  adminUserId: string,
  reason: string
) {
  const policy = salesVideoPolicySchema.parse(input);
  await dbQuery(
    `insert into hiring_settings(setting_key,setting_value,updated_by_admin_user_id,updated_at)
     values('sales_video_introduction_v1',$1::jsonb,$2,now())
     on conflict(setting_key) do update set
       setting_value=excluded.setting_value,
       updated_by_admin_user_id=excluded.updated_by_admin_user_id,
       updated_at=now()`,
    [JSON.stringify(policy), adminUserId]
  );
  await dbQuery(
    `insert into hiring_audit_logs(actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
     values('admin',$1,'sales_video_policy_updated','hiring_settings','sales_video_introduction_v1',$2::jsonb)`,
    [
      adminUserId,
      JSON.stringify({
        reason,
        targetMinSeconds: policy.targetMinSeconds,
        targetMaxSeconds: policy.targetMaxSeconds,
        absoluteMaxSeconds: policy.absoluteMaxSeconds,
        maxBytes: policy.maxBytes,
        retentionDays: policy.retentionDays
      })
    ]
  );
  return policy;
}
