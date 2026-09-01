import "server-only";

import type { NextRequest } from "next/server";
import { ApiError, badRequest, forbidden } from "@/lib/api/response";
import { getAdminSessionFromRequest, type AdminSession } from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";

export const hiringDelegatedRoles = [
  "hr_admin",
  "hiring_manager",
  "assessor",
  "interviewer",
  "read_only_auditor"
] as const;
export type HiringDelegatedRole = (typeof hiringDelegatedRoles)[number];

export function getEffectiveHiringRole(session: AdminSession) {
  if (session.role === "super_admin") return "super_admin";
  return session.hiringRole || session.role;
}

export async function enrichAdminSessionWithHiringAccess(
  session: AdminSession
): Promise<AdminSession> {
  if (session.role === "super_admin" || !isDatabaseConfigured()) return session;
  try {
    const result = await dbQuery<{ hiring_role: string }>(
      `select hiring_role from hiring_access_grants
       where admin_user_id=$1 and status='ACTIVE' and revoked_at is null
       order by granted_at desc limit 1`,
      [session.adminUserId]
    );
    return { ...session, hiringRole: result.rows[0]?.hiring_role };
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return session;
    throw error;
  }
}

export async function getHiringAdminSessionFromRequest(request: NextRequest) {
  return enrichAdminSessionWithHiringAccess(getAdminSessionFromRequest(request));
}

export async function listHiringAccessGrants() {
  const result = await dbQuery<{
    id: string; admin_user_id: string; name: string; email: string;
    hiring_role: HiringDelegatedRole; status: string; granted_at: Date; revoked_at: Date | null;
  }>(`select g.id,g.admin_user_id,u.name,u.email,g.hiring_role,g.status,g.granted_at,g.revoked_at
      from hiring_access_grants g join admin_users u on u.id=g.admin_user_id
      order by (g.status='ACTIVE') desc,g.updated_at desc limit 250`);
  return result.rows.map((row) => ({
    id: row.id, adminUserId: row.admin_user_id, name: row.name, email: row.email,
    hiringRole: row.hiring_role, status: row.status,
    grantedAt: row.granted_at.toISOString(), revokedAt: row.revoked_at?.toISOString() || null
  }));
}

export async function listActiveHiringPeople() {
  const result=await dbQuery<{id:string;name:string;email:string;hiring_role:string}>(`select u.id,u.name,u.email,
    case when u.role='super_admin' then 'super_admin' else g.hiring_role end as hiring_role
    from admin_users u left join hiring_access_grants g on g.admin_user_id=u.id and g.status='ACTIVE' and g.revoked_at is null
    where u.is_active=true and (u.role='super_admin' or g.id is not null)
    order by u.name`);
  return result.rows.map(row=>({id:row.id,name:row.name,email:row.email,hiringRole:row.hiring_role}));
}

export async function grantHiringAccess(input: {
  email: string; hiringRole: HiringDelegatedRole; reason: string; actorAdminUserId: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) throw badRequest("Enter the existing Website Admin login email.");
  const admin = await dbQuery<{ id: string; name: string; email: string; is_active: boolean }>(
    "select id,name,email,is_active from admin_users where lower(email)=lower($1) limit 1", [email]
  );
  const target = admin.rows[0];
  if (!target) {
    let employeeRows: Array<{ display_name: string; employment_status: string }> = [];
    try {
      employeeRows=(await dbQuery<{ display_name: string; employment_status: string }>(
        "select display_name,employment_status from employees where lower(official_email)=lower($1) limit 1", [email]
      )).rows;
    } catch (error) {
      if ((error as { code?: string }).code !== "42P01") throw error;
    }
    if (employeeRows[0]) {
      throw new ApiError(409, "BAD_REQUEST", `${employeeRows[0].display_name} is an employee but has no Website Admin login. Provision their Admin login first, then grant Smart Hiring access.`);
    }
    throw new ApiError(404, "NOT_FOUND", "No active Website Admin or employee identity matches this email. Check the spelling or create the employee identity first.");
  }
  if (!target.is_active) throw forbidden("This Website Admin account is inactive. Reactivate the account before granting Smart Hiring access.");
  if (target.id === input.actorAdminUserId) throw badRequest("The Academy-wide Super Admin already has full Smart Hiring authority.");

  const current = await dbQuery<{ id: string; hiring_role: string }>(
    "select id,hiring_role from hiring_access_grants where admin_user_id=$1 and status='ACTIVE' limit 1", [target.id]
  );
  const previousRole = current.rows[0]?.hiring_role || null;
  if (current.rows[0]) {
    await dbQuery("update hiring_access_grants set hiring_role=$2,reason=$3,granted_by_admin_user_id=$4,granted_at=now(),updated_at=now() where id=$1", [current.rows[0].id,input.hiringRole,input.reason,input.actorAdminUserId]);
  } else {
    await dbQuery("insert into hiring_access_grants(admin_user_id,hiring_role,granted_by_admin_user_id,reason) values($1,$2,$3,$4)", [target.id,input.hiringRole,input.actorAdminUserId,input.reason]);
  }
  await dbQuery(`insert into hiring_access_audit(target_admin_user_id,actor_admin_user_id,action,previous_role,next_role,reason)
                 values($1,$2,$3,$4,$5,$6)`, [target.id,input.actorAdminUserId,previousRole?"ROLE_CHANGED":"GRANTED",previousRole,input.hiringRole,input.reason]);
  return { adminUserId: target.id, name: target.name, email: target.email, hiringRole: input.hiringRole, status: "ACTIVE" };
}

export async function revokeHiringAccess(input: { grantId: string; reason: string; actorAdminUserId: string }) {
  const grant = await dbQuery<{ id: string; admin_user_id: string; hiring_role: string }>(
    "select id,admin_user_id,hiring_role from hiring_access_grants where id=$1 and status='ACTIVE' limit 1", [input.grantId]
  );
  if (!grant.rows[0]) throw new ApiError(404,"NOT_FOUND","This active Smart Hiring grant no longer exists. Refresh the page.");
  await dbQuery("update hiring_access_grants set status='REVOKED',revoked_by_admin_user_id=$2,revoked_at=now(),reason=$3,updated_at=now() where id=$1", [input.grantId,input.actorAdminUserId,input.reason]);
  await dbQuery(`insert into hiring_access_audit(target_admin_user_id,actor_admin_user_id,action,previous_role,next_role,reason)
                 values($1,$2,'REVOKED',$3,null,$4)`, [grant.rows[0].admin_user_id,input.actorAdminUserId,grant.rows[0].hiring_role,input.reason]);
  return { revoked: true };
}
