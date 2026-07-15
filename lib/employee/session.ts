import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEmployeeCookieName, verifySignedSessionToken, type EmployeeSession } from "@/lib/auth";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
export async function getEmployeeSessionFromCookies(){const store=await cookies();const session=verifySignedSessionToken<EmployeeSession>(store.get(getEmployeeCookieName())?.value);if(session?.kind!=="employee")return null;if(isDatabaseConfigured()&&session.sessionId){const result=await dbQuery<{id:string}>(`select id from employee_sessions where id=$1 and session_token_hash=$2 and revoked_at is null and expires_at>now() limit 1`,[session.sessionId,session.tokenHash]);if(!result.rows[0])return null;}return session;}
export async function requireEmployeeSession(){const session=await getEmployeeSessionFromCookies();if(!session)redirect("/employee-login");return session;}
