import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { getSmartHiringRules, smartHiringRulesSchema, updateSmartHiringRules } from "@/lib/hiring/hiring-rules";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

export const runtime="nodejs";export const dynamic="force-dynamic";
const updateSchema=z.object({rules:smartHiringRulesSchema,reason:z.string().trim().min(3).max(500)});

export async function GET(request:NextRequest){try{const admin=getAdminSessionFromRequest(request);if(admin.role!=="super_admin")throw forbidden("Only a Super Admin can view advanced hiring rules.");return apiOk(await getSmartHiringRules(),{headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
export async function PATCH(request:NextRequest){try{assertSameOrigin(request);const admin=getAdminSessionFromRequest(request);if(admin.role!=="super_admin")throw forbidden("Only a Super Admin can change advanced hiring rules.");const context=getRequestContext(request);assertRateLimit({key:`hiring-rules:${admin.adminUserId}:${context.ipAddress}`,limit:20,windowSeconds:3600});const input=await parseJson(request,updateSchema);return apiOk(await updateSmartHiringRules(input.rules,admin.adminUserId,input.reason));}catch(error){return apiError(error);}}
