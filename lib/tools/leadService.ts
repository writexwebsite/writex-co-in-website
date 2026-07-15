import "server-only";

import type { NextRequest } from "next/server";
import { dbQuery, isDatabaseConfigured, withDbTransaction } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { createDownloadToken } from "./downloadToken";
import { scoreToolLead } from "./leadScoring";
import { validateAndNormalizePhone } from "./phone";
import { routeToolLead } from "./routing";
import type { ToolType, TemplateId } from "./config";

type CaptureInput = {
  anonymousSessionId: string;
  toolType: ToolType;
  templateId?: TemplateId;
  name: string;
  phone: string;
  phoneCountry: string;
  email?: string;
  country?: string;
  programmeOrRole?: string;
  deadline?: string;
  mainSupportNeed?: string;
  completionPercent: number;
  previewGenerated: boolean;
  completed: boolean;
  whatsappClicked?: boolean;
  document: Record<string, unknown>;
};

export async function upsertToolSession(input: {
  anonymousSessionId: string;
  toolType: ToolType;
  completionPercent: number;
  previewGenerated?: boolean;
  completed?: boolean;
  downloadRequested?: boolean;
  metadata?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured()) return null;
  const result = await dbQuery<{ id: string }>(`
    insert into tool_sessions (anonymous_session_id, tool_type, completion_percent, preview_generated_at, completed_at, download_requested_at, metadata_json)
    values ($1, $2, $3, case when $4 then now() end, case when $5 then now() end, case when $6 then now() end, $7::jsonb)
    on conflict (anonymous_session_id, tool_type) do update set
      completion_percent = greatest(tool_sessions.completion_percent, excluded.completion_percent),
      preview_generated_at = coalesce(tool_sessions.preview_generated_at, excluded.preview_generated_at),
      completed_at = coalesce(tool_sessions.completed_at, excluded.completed_at),
      download_requested_at = coalesce(tool_sessions.download_requested_at, excluded.download_requested_at),
      metadata_json = coalesce(tool_sessions.metadata_json, '{}'::jsonb) || coalesce(excluded.metadata_json, '{}'::jsonb)
    returning id
  `, [input.anonymousSessionId, input.toolType, input.completionPercent, Boolean(input.previewGenerated), Boolean(input.completed), Boolean(input.downloadRequested), JSON.stringify(input.metadata || {})]);
  return result.rows[0] || null;
}

export async function captureToolLead(input: CaptureInput, request: NextRequest) {
  const phone = validateAndNormalizePhone(input.phone, input.phoneCountry);
  const duplicateResult = await dbQuery<{ count: string }>(`
    select count(*)::text as count from quote_leads
    where phone_normalized = $1 and created_at >= now() - interval '30 days'
  `, [phone.normalized]);
  const duplicateCount = Number(duplicateResult.rows[0]?.count || 0);
  const score = scoreToolLead({
    phoneConfidence: phone.confidence,
    emailProvided: Boolean(input.email),
    completed: input.completed,
    previewGenerated: input.previewGenerated,
    deadlineProvided: Boolean(input.deadline),
    programmeOrCountryProvided: Boolean(input.programmeOrRole || input.country),
    whatsappClicked: input.whatsappClicked,
    duplicateCount,
    completionPercent: input.completionPercent
  });
  const route = routeToolLead({
    toolType: input.toolType,
    templateId: input.templateId,
    deadline: input.deadline,
    category: score.category,
    programmeOrRole: input.programmeOrRole
  });
  const deadline = input.deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const { token, hash } = createDownloadToken();
  const configuredExpiry = Number(process.env.TOOL_DOWNLOAD_EXPIRY_SECONDS || 3600);
  const downloadExpirySeconds = Number.isFinite(configuredExpiry)
    ? Math.min(7200, Math.max(300, Math.floor(configuredExpiry)))
    : 3600;
  const quality = score.category === "hot" ? "premium" : score.category === "qualified" ? "high" : score.category === "nurture" ? "medium" : "low";
  const result = await withDbTransaction(async (query) => {
    const owners = await query<{ id: string }>(`
      select id from admin_users
      where is_active = true and role in ('super_admin', 'sales', 'support')
      order by coalesce(last_login_at, created_at) asc limit 1
    `);
    const ownerId = owners[0]?.id || null;
    const leads = await query<{ id: string }>(`
      insert into quote_leads (
        name, email, whatsapp, country, service_required, academic_level, subject,
        deadline, instructions, source, status, lead_priority, lead_quality,
        phone_raw, phone_normalized, tool_type, template_id, lead_score,
        phone_confidence, queue, next_action_at, consent_timestamp, main_support_need,
        recommended_service, suggested_first_contact_message, download_status,
        assigned_to_admin_user_id, assigned_at, sla_due_at, lead_intelligence,
        page_path, landing_page, source_channel
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8::date,$9,'free_tools','new',$10,$11,
        $12,$13,$14,$15,$16,$17,$18,now(),now(),$19,$20,$21,'unlocked',
        $22,case when $22::uuid is not null then now() end,now() + ($23 || ' minutes')::interval,$24::jsonb,
        $25,$25,'free_tools'
      ) returning id
    `, [
      input.name, input.email || null, phone.normalized, input.country || "", route.recommendedService,
      "Planning tool user", input.programmeOrRole || input.toolType, deadline,
      input.mainSupportNeed || `Completed ${input.toolType.replace(/_/g, " ")}`,
      score.category === "hot" ? "urgent" : score.category === "qualified" ? "high" : "normal",
      quality, phone.raw, phone.normalized, input.toolType, input.templateId || null, score.score,
      phone.confidence, ownerId ? route.queue : "Unassigned Priority", input.mainSupportNeed || route.nextAction,
      route.recommendedService, route.suggestedMessage, ownerId, route.slaMinutes,
      JSON.stringify({ scoreReasons: score.reasons, completionPercent: input.completionPercent, previewGenerated: input.previewGenerated, duplicateCount, toolType: input.toolType, templateId: input.templateId }),
      `/tools/${input.toolType === "cv_builder" ? "cv-builder" : input.toolType === "sop_builder" ? "sop-builder" : "templates"}`
    ]);
    const leadId = leads[0].id;
    await query(`
      insert into tool_sessions (anonymous_session_id, tool_type, completion_percent, preview_generated_at, completed_at, download_requested_at, lead_id, metadata_json)
      values ($1,$2,$3,case when $4 then now() end,case when $5 then now() end,now(),$6,$7::jsonb)
      on conflict (anonymous_session_id, tool_type) do update set
        completion_percent = greatest(tool_sessions.completion_percent, excluded.completion_percent),
        preview_generated_at = coalesce(tool_sessions.preview_generated_at, excluded.preview_generated_at),
        completed_at = coalesce(tool_sessions.completed_at, excluded.completed_at),
        download_requested_at = now(), lead_id = excluded.lead_id
    `, [input.anonymousSessionId, input.toolType, input.completionPercent, input.previewGenerated, input.completed, leadId, JSON.stringify({ templateId: input.templateId || null })]);
    await query(`insert into tool_download_tokens (token_hash, lead_id, tool_type, template_id, document_payload, expires_at) values ($1,$2,$3,$4,$5::jsonb,now() + ($6 || ' seconds')::interval)`, [hash, leadId, input.toolType, input.templateId || null, JSON.stringify(input.document), downloadExpirySeconds]);
    await query(`insert into lead_activity_logs (lead_id, admin_user_id, activity_type, new_value, metadata) values ($1,$2,'lead_assigned',$2,$3::jsonb)`, [leadId, ownerId, JSON.stringify({ queue: ownerId ? route.queue : "Unassigned Priority", slaMinutes: route.slaMinutes })]);
    if (!ownerId) {
      await query(`insert into sla_alerts (entity_type, entity_id, alert_type, severity, message, recommended_action, sla_deadline, metadata) values ('tool_lead',$1,'unassigned_tool_lead','critical',$2,'Assign an eligible sales owner',now(),$3::jsonb) on conflict do nothing`, [leadId, `Tool lead requires assignment: ${input.toolType}`, JSON.stringify({ queue: route.queue })]);
    }
    return { leadId, ownerId };
  });
  await logAuditEvent({ actorType: "system", entityType: "tool_lead", entityId: result.leadId, action: "tool_lead_created", metadata: { toolType: input.toolType, queue: route.queue, leadScore: score.score, phoneConfidence: phone.confidence }, request });
  return { ...result, token, score: score.score, category: score.category, queue: result.ownerId ? route.queue : "Unassigned Priority", phoneConfidence: phone.confidence };
}
