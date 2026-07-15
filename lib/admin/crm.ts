import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export type CrmLead = {
  id: string;
  name: string;
  service_required: string;
  status: string;
  lead_priority: string;
  lead_quality: string;
  next_follow_up_at: string | Date | null;
  assigned_owner: string | null;
  created_at: string | Date;
};

export async function getCrmQueues(adminUserId: string) {
  if (!isDatabaseConfigured()) {
    return {
      myLeads: [] as CrmLead[],
      unassigned: [] as CrmLead[],
      dueFollowUps: [] as CrmLead[],
      quotedNotConverted: [] as CrmLead[],
      highPriority: [] as CrmLead[]
    };
  }

  const baseSelect = `
    select
      quote_leads.id,
      quote_leads.name,
      quote_leads.service_required,
      quote_leads.status,
      quote_leads.lead_priority,
      quote_leads.lead_quality,
      quote_leads.next_follow_up_at,
      admin_users.name as assigned_owner,
      quote_leads.created_at
    from quote_leads
    left join admin_users on admin_users.id = quote_leads.assigned_to_admin_user_id
  `;

  const [myLeads, unassigned, dueFollowUps, quotedNotConverted, highPriority] =
    await Promise.all([
      dbQuery<CrmLead>(
        `${baseSelect} where quote_leads.assigned_to_admin_user_id = $1 order by quote_leads.created_at desc limit 20`,
        [adminUserId]
      ),
      dbQuery<CrmLead>(
        `${baseSelect} where quote_leads.assigned_to_admin_user_id is null and quote_leads.status not in ('converted','lost','spam') order by quote_leads.created_at desc limit 20`
      ),
      dbQuery<CrmLead>(
        `${baseSelect} where quote_leads.next_follow_up_at <= now() and quote_leads.status not in ('converted','lost','spam') order by quote_leads.next_follow_up_at asc limit 20`
      ),
      dbQuery<CrmLead>(
        `${baseSelect} where quote_leads.status = 'quoted' and quote_leads.converted_at is null order by quote_leads.updated_at desc limit 20`
      ),
      dbQuery<CrmLead>(
        `${baseSelect} where quote_leads.lead_priority in ('high','urgent') and quote_leads.status not in ('converted','lost','spam') order by quote_leads.created_at desc limit 20`
      )
    ]);

  return {
    myLeads: myLeads.rows,
    unassigned: unassigned.rows,
    dueFollowUps: dueFollowUps.rows,
    quotedNotConverted: quotedNotConverted.rows,
    highPriority: highPriority.rows
  };
}

export async function getCrmMetrics(adminUserId: string) {
  const queues = await getCrmQueues(adminUserId);

  return {
    myLeads: queues.myLeads.length,
    unassignedLeads: queues.unassigned.length,
    dueFollowUps: queues.dueFollowUps.length,
    overdueFollowUps: queues.dueFollowUps.filter((lead) => {
      if (!lead.next_follow_up_at) return false;
      return Date.now() - new Date(lead.next_follow_up_at).getTime() > 2 * 60 * 60 * 1000;
    }).length,
    quotedNotConverted: queues.quotedNotConverted.length,
    highPriority: queues.highPriority.length,
    teamLoad: [] as Array<Record<string, unknown>>,
    conversionByOwner: [] as Array<Record<string, unknown>>
  };
}
