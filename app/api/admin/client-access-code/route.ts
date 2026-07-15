import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit/logAuditEvent";
import { createOrRotateClientAccessCode } from "@/lib/client/credentials";
import { parseJson } from "@/lib/security";
const schema=z.object({invoiceId:z.string().trim().min(3),whatsapp:z.string().trim().min(8)});
export async function POST(request:NextRequest){try{const admin=getAdminSessionFromRequest(request);const body=await parseJson(request,schema);const accessCode=await createOrRotateClientAccessCode(body.invoiceId,body.whatsapp,admin.adminUserId);await logAuditEvent({actorType:"admin",actorId:admin.adminUserId,actorEmail:admin.email,entityType:"client_portal_credential",entityId:body.invoiceId,action:"client_access_code_rotated",request});return apiOk({invoiceId:body.invoiceId,accessCode,notice:"Show this code once through the approved client communication channel. It cannot be retrieved later."});}catch(error){return apiError(error);}}
