import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { leadStatuses, type LeadStatus } from "@/lib/admin/constants";

export { leadStatuses, type LeadStatus };

export type AdminLeadListItem = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string;
  country: string | null;
  service_required: string;
  academic_level: string | null;
  subject: string | null;
  word_count: number | null;
  deadline: string | Date | null;
  status: LeadStatus;
  created_at: string | Date;
  updated_at: string | Date;
  uploaded_file_asset_id: string | null;
  uploaded_file_name: string | null;
  assigned_to_admin_user_id: string | null;
  assigned_owner: string | null;
  lead_priority: string;
  lead_quality: string;
  next_follow_up_at: string | Date | null;
  last_contacted_at: string | Date | null;
  quoted_amount: string | number | null;
  quoted_currency: string | null;
  converted_amount: string | number | null;
  converted_currency: string | null;
  expected_close_date: string | Date | null;
  loss_reason: string | null;
  page_path: string | null;
  landing_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source_channel: string | null;
};

export type AdminLeadDetail = AdminLeadListItem & {
  instructions: string;
  document_condition: string | null;
  referencing_style: string | null;
  urgency: string | null;
  rubric_available: string | null;
  draft_available: string | null;
  supervisor_comments_available: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  source: string;
  lead_intelligence: unknown;
  tool_type: string | null;
  template_id: string | null;
  lead_score: number;
  phone_confidence: string | null;
  queue: string | null;
  main_support_need: string | null;
  recommended_service: string | null;
  suggested_first_contact_message: string | null;
  download_status: string | null;
  sla_due_at: string | Date | null;
};

export type AdminLeadNote = {
  id: string;
  note: string;
  visibility: string;
  created_at: string | Date;
  admin_name: string | null;
  admin_role: string | null;
};

export type AdminLeadActivity = {
  id: string;
  activity_type: string;
  note: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string | Date;
  admin_name: string | null;
};

export type AdminFileAsset = {
  id: string;
  asset_type: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string | Date;
};

export type AssignableAdminUser = {
  id: string;
  name: string;
  email: string;
};

function normalizeStatus(status?: string | null): LeadStatus | undefined {
  return leadStatuses.includes(status as LeadStatus)
    ? (status as LeadStatus)
    : undefined;
}

function buildLeadFilters({
  status,
  search
}: {
  status?: string | null;
  search?: string | null;
}) {
  const values: unknown[] = [];
  const where: string[] = [];
  const safeStatus = normalizeStatus(status);
  const cleanSearch = search?.trim();

  if (safeStatus) {
    values.push(safeStatus);
    where.push(`quote_leads.status = $${values.length}`);
  }

  if (cleanSearch) {
    values.push(`%${cleanSearch}%`);
    const position = values.length;
    where.push(`(
      quote_leads.name ilike $${position}
      or quote_leads.whatsapp ilike $${position}
      or quote_leads.email ilike $${position}
      or quote_leads.service_required ilike $${position}
      or quote_leads.subject ilike $${position}
      or quote_leads.source ilike $${position}
      or quote_leads.tool_type ilike $${position}
      or quote_leads.queue ilike $${position}
    )`);
  }

  return {
    whereSql: where.length ? `where ${where.join(" and ")}` : "",
    values,
    status: safeStatus,
    search: cleanSearch || ""
  };
}

export async function getAdminLeadList({
  page = 1,
  pageSize = 20,
  status,
  search
}: {
  page?: number;
  pageSize?: number;
  status?: string | null;
  search?: string | null;
}) {
  if (!isDatabaseConfigured()) {
    return {
      leads: [] as AdminLeadListItem[],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      status: normalizeStatus(status),
      search: search?.trim() || ""
    };
  }

  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(1, Math.floor(pageSize)), 100)
    : 20;
  const offset = (safePage - 1) * safePageSize;
  const filters = buildLeadFilters({ status, search });
  const countResult = await dbQuery<{ count: string }>(
    `select count(*)::text as count from quote_leads ${filters.whereSql}`,
    filters.values
  );
  const total = Number(countResult.rows[0]?.count || 0);
  const rows = await dbQuery<AdminLeadListItem>(
    `
      select
        quote_leads.id,
        quote_leads.name,
        quote_leads.email,
        quote_leads.whatsapp,
        quote_leads.country,
        quote_leads.service_required,
        quote_leads.academic_level,
        quote_leads.subject,
        quote_leads.word_count,
        quote_leads.deadline,
        quote_leads.status,
        quote_leads.created_at,
        quote_leads.updated_at,
        quote_leads.uploaded_file_asset_id,
        file_assets.file_name as uploaded_file_name,
        quote_leads.assigned_to_admin_user_id,
        admin_users.name as assigned_owner,
        quote_leads.lead_priority,
        quote_leads.lead_quality,
        quote_leads.next_follow_up_at,
        quote_leads.last_contacted_at,
        quote_leads.quoted_amount,
        quote_leads.quoted_currency,
        quote_leads.converted_amount,
        quote_leads.converted_currency,
        quote_leads.expected_close_date,
        quote_leads.loss_reason,
        quote_leads.page_path,
        quote_leads.landing_page,
        quote_leads.referrer,
        quote_leads.utm_source,
        quote_leads.utm_medium,
        quote_leads.utm_campaign,
        quote_leads.source_channel
      from quote_leads
      left join file_assets on file_assets.id = quote_leads.uploaded_file_asset_id
      left join admin_users on admin_users.id = quote_leads.assigned_to_admin_user_id
      ${filters.whereSql}
      order by quote_leads.created_at desc
      limit $${filters.values.length + 1}
      offset $${filters.values.length + 2}
    `,
    [...filters.values, safePageSize, offset]
  );

  return {
    leads: rows.rows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
    status: filters.status,
    search: filters.search
  };
}

export async function getAdminLeadDetail(id: string) {
  if (!isDatabaseConfigured()) return null;

  const leadResult = await dbQuery<AdminLeadDetail>(
    `
      select
        quote_leads.id,
        quote_leads.name,
        quote_leads.email,
        quote_leads.whatsapp,
        quote_leads.country,
        quote_leads.service_required,
        quote_leads.academic_level,
        quote_leads.subject,
        quote_leads.word_count,
        quote_leads.deadline,
        quote_leads.instructions,
        quote_leads.document_condition,
        quote_leads.referencing_style,
        quote_leads.urgency,
        quote_leads.rubric_available,
        quote_leads.draft_available,
        quote_leads.supervisor_comments_available,
        quote_leads.file_name,
        quote_leads.file_size,
        quote_leads.file_type,
        quote_leads.lead_intelligence,
        quote_leads.tool_type,
        quote_leads.template_id,
        quote_leads.lead_score,
        quote_leads.phone_confidence,
        quote_leads.queue,
        quote_leads.main_support_need,
        quote_leads.recommended_service,
        quote_leads.suggested_first_contact_message,
        quote_leads.download_status,
        quote_leads.sla_due_at,
        quote_leads.uploaded_file_asset_id,
        quote_leads.assigned_to_admin_user_id,
        admin_users.name as assigned_owner,
        quote_leads.lead_priority,
        quote_leads.lead_quality,
        quote_leads.next_follow_up_at,
        quote_leads.last_contacted_at,
        quote_leads.quoted_amount,
        quote_leads.quoted_currency,
        quote_leads.converted_amount,
        quote_leads.converted_currency,
        quote_leads.expected_close_date,
        quote_leads.loss_reason,
        quote_leads.page_path,
        quote_leads.landing_page,
        quote_leads.referrer,
        quote_leads.utm_source,
        quote_leads.utm_medium,
        quote_leads.utm_campaign,
        quote_leads.source_channel,
        quote_leads.source,
        quote_leads.status,
        quote_leads.created_at,
        quote_leads.updated_at,
        file_assets.file_name as uploaded_file_name
      from quote_leads
      left join file_assets on file_assets.id = quote_leads.uploaded_file_asset_id
      left join admin_users on admin_users.id = quote_leads.assigned_to_admin_user_id
      where quote_leads.id = $1
      limit 1
    `,
    [id]
  );
  const lead = leadResult.rows[0];

  if (!lead) return null;

  const notesResult = await dbQuery<AdminLeadNote>(
    `
      select
        lead_notes.id,
        lead_notes.note,
        lead_notes.visibility,
        lead_notes.created_at,
        admin_users.name as admin_name,
        admin_users.role as admin_role
      from lead_notes
      left join admin_users on admin_users.id = lead_notes.admin_user_id
      where lead_notes.quote_lead_id = $1
      order by lead_notes.created_at desc
    `,
    [id]
  );
  const filesResult = await dbQuery<AdminFileAsset>(
    `
      select id, asset_type, file_name, mime_type, file_size, created_at
      from file_assets
      where quote_lead_id = $1 or id = $2
      order by created_at desc
    `,
    [id, lead.uploaded_file_asset_id]
  );
  const activityResult = await dbQuery<AdminLeadActivity>(
    `
      select
        lead_activity_logs.id,
        lead_activity_logs.activity_type,
        lead_activity_logs.note,
        lead_activity_logs.old_value,
        lead_activity_logs.new_value,
        lead_activity_logs.created_at,
        admin_users.name as admin_name
      from lead_activity_logs
      left join admin_users on admin_users.id = lead_activity_logs.admin_user_id
      where lead_activity_logs.lead_id = $1
      order by lead_activity_logs.created_at desc
      limit 100
    `,
    [id]
  );

  return {
    lead,
    notes: notesResult.rows,
    files: filesResult.rows,
    activity: activityResult.rows
  };
}

export async function getAdminDashboardMetrics() {
  if (!isDatabaseConfigured()) {
    return {
      today: 0,
      week: 0,
      byStatus: [] as Array<{ status: LeadStatus; count: number }>,
      latest: [] as AdminLeadListItem[]
    };
  }

  const today = await dbQuery<{ count: string }>(
    `
      select count(*)::text as count
      from quote_leads
      where created_at >= date_trunc('day', now())
    `
  );
  const week = await dbQuery<{ count: string }>(
    `
      select count(*)::text as count
      from quote_leads
      where created_at >= now() - interval '7 days'
    `
  );
  const byStatus = await dbQuery<{ status: LeadStatus; count: string }>(
    `
      select status, count(*)::text as count
      from quote_leads
      group by status
      order by status
    `
  );
  const latest = await getAdminLeadList({ page: 1, pageSize: 10 });

  return {
    today: Number(today.rows[0]?.count || 0),
    week: Number(week.rows[0]?.count || 0),
    byStatus: byStatus.rows.map((row) => ({
      status: row.status,
      count: Number(row.count)
    })),
    latest: latest.leads
  };
}

export async function getAssignableAdminUsers() {
  if (!isDatabaseConfigured()) return [] as AssignableAdminUser[];

  const result = await dbQuery<AssignableAdminUser>(
    `
      select id, name, email
      from admin_users
      where is_active = true
        and role in ('super_admin', 'sales', 'support')
      order by name asc
    `
  );

  return result.rows;
}
