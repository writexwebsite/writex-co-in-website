import "server-only";

import {
  adminGuidanceRoles,
  adminHelpArticles,
  type AdminGuidanceRole,
  type AdminHelpArticle
} from "@/lib/admin/guidance-content";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const protectedGuidanceArticleIds = new Set([
  "trust-centre-operations-v1",
  "hiring-assessments-v1",
  "verification-centre-v1",
  "system-health-v1"
]);

type ArticleOverrideRow = {
  article_id: string;
  title: string;
  module: string;
  roles: unknown;
  version: string;
  last_updated: string;
  owner: string;
  active: boolean;
  display_order: number;
  purpose: string;
  actions: unknown;
  mistakes: unknown;
  sensitive: string | null;
  href: string | null;
  is_custom: boolean;
};

export type GovernedHelpArticle = AdminHelpArticle & {
  displayOrder: number;
  isCustom: boolean;
  isProtected: boolean;
};

export type OnboardingCompletion = {
  adminUserId: string;
  name: string;
  email: string;
  assignedRole: string;
  completed: boolean;
  skippedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function roleArray(value: unknown): AdminGuidanceRole[] {
  return stringArray(value).filter((role): role is AdminGuidanceRole =>
    adminGuidanceRoles.includes(role as AdminGuidanceRole)
  );
}

function defaultArticles(): GovernedHelpArticle[] {
  return adminHelpArticles.map((article, index) => ({
    ...article,
    displayOrder: index * 10,
    isCustom: false,
    isProtected: protectedGuidanceArticleIds.has(article.id)
  }));
}

export async function getGovernedHelpArticles(): Promise<GovernedHelpArticle[]> {
  const defaults = defaultArticles();
  if (!isDatabaseConfigured()) return defaults;

  try {
    const result = await dbQuery<ArticleOverrideRow>(
      `select article_id,title,module,roles,version,last_updated,owner,active,
        display_order,purpose,actions,mistakes,sensitive,href,is_custom
       from admin_help_article_overrides
       order by display_order,article_id`
    );
    const overrides = new Map(result.rows.map((row) => [row.article_id, row]));
    const merged = defaults.map((article) => {
      const row = overrides.get(article.id);
      if (!row) return article;
      overrides.delete(article.id);
      return {
        id: row.article_id,
        title: row.title,
        module: row.module,
        roles: roleArray(row.roles),
        version: row.version,
        lastUpdated: row.last_updated,
        owner: row.owner,
        active: article.isProtected ? true : row.active,
        displayOrder: row.display_order,
        purpose: row.purpose,
        actions: stringArray(row.actions),
        mistakes: stringArray(row.mistakes),
        sensitive: row.sensitive || undefined,
        href: row.href || undefined,
        isCustom: row.is_custom,
        isProtected: article.isProtected
      };
    });

    for (const row of overrides.values()) {
      merged.push({
        id: row.article_id,
        title: row.title,
        module: row.module,
        roles: roleArray(row.roles),
        version: row.version,
        lastUpdated: row.last_updated,
        owner: row.owner,
        active: row.active,
        displayOrder: row.display_order,
        purpose: row.purpose,
        actions: stringArray(row.actions),
        mistakes: stringArray(row.mistakes),
        sensitive: row.sensitive || undefined,
        href: row.href || undefined,
        isCustom: true,
        isProtected: false
      });
    }

    return merged.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title)
    );
  } catch {
    return defaults;
  }
}

export async function saveGovernedHelpArticle(
  article: GovernedHelpArticle,
  actorId: string
) {
  const isProtected = protectedGuidanceArticleIds.has(article.id);
  await dbQuery(
    `insert into admin_help_article_overrides (
       article_id,title,module,roles,version,last_updated,owner,active,
       display_order,purpose,actions,mistakes,sensitive,href,is_custom,updated_by
     ) values (
       $1,$2,$3,$4::jsonb,$5,current_date,$6,$7,$8,$9,$10::jsonb,$11::jsonb,
       $12,$13,$14,$15
     )
     on conflict (article_id) do update set
       title=excluded.title,module=excluded.module,roles=excluded.roles,
       version=excluded.version,last_updated=current_date,owner=excluded.owner,
       active=excluded.active,display_order=excluded.display_order,
       purpose=excluded.purpose,actions=excluded.actions,mistakes=excluded.mistakes,
       sensitive=excluded.sensitive,href=excluded.href,is_custom=excluded.is_custom,
       updated_by=excluded.updated_by,updated_at=now()`,
    [
      article.id,
      article.title,
      article.module,
      JSON.stringify(article.roles),
      article.version,
      article.owner,
      isProtected ? true : article.active,
      article.displayOrder,
      article.purpose,
      JSON.stringify(article.actions),
      JSON.stringify(article.mistakes),
      article.sensitive || null,
      article.href || null,
      article.isCustom,
      actorId
    ]
  );
  await dbQuery(
    `insert into admin_guidance_audit
       (admin_user_id,action,tutorial_id,safe_metadata)
     values ($1,'help_article_saved',$2,$3::jsonb)`,
    [
      actorId,
      article.id,
      JSON.stringify({
        active: isProtected ? true : article.active,
        displayOrder: article.displayOrder,
        isCustom: article.isCustom
      })
    ]
  );
}

export async function getOnboardingCompletion(): Promise<OnboardingCompletion[]> {
  const result = await dbQuery<{
    admin_user_id: string;
    name: string;
    email: string;
    assigned_role: string;
    onboarding_completed: boolean;
    skipped_at: string | null;
    completed_at: string | null;
    updated_at: string;
  }>(
    `select s.admin_user_id,u.name,u.email,s.assigned_role,
      s.onboarding_completed,s.skipped_at,s.completed_at,s.updated_at
     from admin_onboarding_state s
     join admin_users u on u.id=s.admin_user_id
     order by s.updated_at desc
     limit 100`
  );
  return result.rows.map((row) => ({
    adminUserId: row.admin_user_id,
    name: row.name,
    email: row.email,
    assignedRole: row.assigned_role,
    completed: row.onboarding_completed,
    skippedAt: row.skipped_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at
  }));
}

export async function resetAdminOnboarding(
  targetAdminUserId: string,
  actorId: string
) {
  const result = await dbQuery<{ admin_user_id: string }>(
    `update admin_onboarding_state set
       current_step=0,completed_steps='[]'::jsonb,checklist_state='{}'::jsonb,
       onboarding_completed=false,skipped_at=null,dismissed_checklist_at=null,
       completed_at=null,updated_at=now()
     where admin_user_id=$1
     returning admin_user_id`,
    [targetAdminUserId]
  );
  if (!result.rows[0]) return false;
  await dbQuery(
    `insert into admin_guidance_audit
       (admin_user_id,action,tutorial_id,safe_metadata)
     values ($1,'onboarding_reset_by_super_admin','admin-guidance-v1',$2::jsonb)`,
    [actorId, JSON.stringify({ targetAdminUserId })]
  );
  return true;
}
