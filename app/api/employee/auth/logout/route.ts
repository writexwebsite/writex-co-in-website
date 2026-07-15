import type { NextRequest } from "next/server";
import { apiOk } from "@/lib/api/response";
import { clearEmployeeSessionCookie, getEmployeeSessionFromRequest } from "@/lib/auth";
import { optionalDbQuery } from "@/lib/db";
export async function POST(request:NextRequest){try{const session=getEmployeeSessionFromRequest(request);if(session.sessionId)await optionalDbQuery("update employee_sessions set revoked_at=now() where id=$1",[session.sessionId]);}catch{}const response=apiOk({loggedOut:true});clearEmployeeSessionCookie(response);return response;}
