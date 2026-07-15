import { NextRequest } from "next/server";
import { apiError, apiOk, forbidden, notConfigured } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured, withDbTransaction } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";
import { toolFeatureFlags } from "@/lib/tools/config";
import { scoreToolLead } from "@/lib/tools/leadScoring";
import { validateAndNormalizePhone } from "@/lib/tools/phone";
import { routeToolLead } from "@/lib/tools/routing";
import { termPlanInterestSchema } from "@/lib/tools/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!toolFeatureFlags.termPlans) throw forbidden("Term plan interest is not enabled.");
    if (!isDatabaseConfigured()) throw notConfigured("Term plan enquiries are temporarily unavailable.");
    assertSameOrigin(request);
    const context = getRequestContext(request);
    assertRateLimit({ key: `term-plan:${context.ipAddress}`, limit: 5, windowSeconds: 900 });
    const body = await parseJson(request, termPlanInterestSchema);
    const phone = validateAndNormalizePhone(body.phone, body.phoneCountry);
    if (!phone.valid) return apiOk({ accepted: false, message: "Enter a valid WhatsApp number." }, { status: 400 });
    const score = scoreToolLead({ phoneConfidence: phone.confidence, emailProvided: false, completed: true, previewGenerated: false, deadlineProvided: true, programmeOrCountryProvided: true, completionPercent: 100 });
    const route = routeToolLead({ toolType: "term_plan", category: score.category });
    const owner = await dbQuery<{ id: string }>(`select id from admin_users where is_active = true and role in ('super_admin','sales','support') order by coalesce(last_login_at, created_at) asc limit 1`);
    const ownerId = owner.rows[0]?.id || null;
    const result = await withDbTransaction(async (query) => {
      const leads = await query<{ id: string }>(`
        insert into quote_leads (name,email,whatsapp,country,service_required,academic_level,subject,deadline,instructions,source,status,lead_priority,lead_quality,phone_raw,phone_normalized,tool_type,lead_score,phone_confidence,queue,next_action_at,consent_timestamp,recommended_service,suggested_first_contact_message,assigned_to_admin_user_id,assigned_at,sla_due_at,page_path,landing_page,source_channel)
        values ($1,null,$2,$3,$4,'Term planning',$5,$6::date,$7,'term_plan_interest','new','high','high',$8,$2,'term_plan',$9,$10,$11,now(),now(),$4,$12,$13,case when $13::uuid is not null then now() end,now() + interval '10 minutes','/pricing','/pricing','term_plan') returning id
      `, [body.name, phone.normalized, body.country, route.recommendedService, body.supportAreas.join(", "), body.termStart, `Expected deadlines: ${body.expectedDeadlines}. Term: ${body.termStart} to ${body.termEnd}. Institution: ${body.institution || "Not provided"}.`, phone.raw, score.score, phone.confidence, ownerId ? route.queue : "Unassigned Priority", route.suggestedMessage, ownerId]);
      const leadId = leads[0].id;
      await query(`insert into term_plan_interests (lead_id,name,whatsapp,country,institution,expected_deadlines,term_start,term_end,support_areas,consent_timestamp) values ($1,$2,$3,$4,$5,$6,$7::date,$8::date,$9,now())`, [leadId, body.name, phone.normalized, body.country, body.institution || null, body.expectedDeadlines, body.termStart, body.termEnd, body.supportAreas]);
      return leadId;
    });
    await logAuditEvent({ actorType: "system", entityType: "term_plan_interest", entityId: result, action: "term_plan_interest_created", metadata: { queue: ownerId ? route.queue : "Unassigned Priority" }, request });
    return apiOk({ accepted: true, leadId: result }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
