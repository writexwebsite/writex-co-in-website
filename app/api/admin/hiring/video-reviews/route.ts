import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { assertHiringPermission } from "@/lib/admin/permissions";
import { getHiringAdminSessionFromRequest } from "@/lib/hiring/access";
import { dbQuery, withDbTransaction } from "@/lib/db";
import { assertRateLimit, assertSameOrigin, getRequestContext, parseJson } from "@/lib/security";

const dimension=z.enum(["needs_development","acceptable","strong"]);
const schema=z.object({
  applicationReference:z.string().trim().min(6).max(80),candidateFileId:z.uuid(),
  clarity:dimension,roleMotivation:dimension,communicationStructure:dimension,customerOrientation:dimension,
  recommendation:z.enum(["continue","hold","decline"]),notes:z.string().trim().min(10).max(3000)
});

export async function POST(request:NextRequest){
  try{
    assertSameOrigin(request);const admin=await getHiringAdminSessionFromRequest(request);
    assertHiringPermission(admin,"hiring.applications.manage");
    const context=getRequestContext(request);assertRateLimit({key:`hiring-video-review:${admin.adminUserId}:${context.ipAddress}`,limit:40,windowSeconds:3600});
    const input=await parseJson(request,schema);
    const application=await dbQuery<{id:string}>("select id from hiring_applications where application_reference=$1 and role_key='sales_executive' limit 1",[input.applicationReference.toUpperCase()]);
    if(!application.rows[0])throw badRequest("This Sales application no longer exists. Refresh the candidate workspace.");
    const file=await dbQuery<{id:string}>("select id from hiring_candidate_files where id=$1 and application_id=$2 and file_type='video_introduction' and revoked_at is null and deleted_at is null limit 1",[input.candidateFileId,application.rows[0].id]);
    if(!file.rows[0])throw badRequest("The private Sales video is unavailable or no longer linked to this candidate.");
    const review=await withDbTransaction(async query=>{
      await query("update hiring_video_reviews set superseded_at=now() where application_id=$1 and superseded_at is null",[application.rows[0].id]);
      const rows=await query<{id:string}>(`insert into hiring_video_reviews(application_id,candidate_file_id,reviewer_admin_user_id,clarity,role_motivation,communication_structure,customer_orientation,recommendation,notes)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,[application.rows[0].id,input.candidateFileId,admin.adminUserId,input.clarity,input.roleMotivation,input.communicationStructure,input.customerOrientation,input.recommendation,input.notes]);
      await query(`insert into hiring_audit_logs(application_id,actor_type,actor_reference,action,entity_type,entity_reference,safe_metadata)
        values($1,'admin',$2,'sales_video_human_reviewed','video_review',$3,$4::jsonb)`,[application.rows[0].id,admin.adminUserId,rows[0].id,JSON.stringify({recommendation:input.recommendation,automatedInference:false})]);
      return rows[0];
    });
    return apiOk({...review,recorded:true},{status:201,headers:{"cache-control":"private, no-store"}});
  }catch(error){return apiError(error);}
}
