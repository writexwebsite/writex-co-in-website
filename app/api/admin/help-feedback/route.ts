import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";
import { dbQuery } from "@/lib/db";
import { assertSameOrigin, parseJson } from "@/lib/security";

const schema = z.object({
  articleId: z.string().trim().min(2).max(120),
  helpful: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = getAdminSessionFromRequest(request);
    const input = await parseJson(request, schema);
    await dbQuery(
      `insert into admin_help_feedback (
         admin_user_id,article_id,helpful,release_reference
       ) values ($1,$2,$3,$4)
       on conflict (admin_user_id,article_id) do update set
         helpful=excluded.helpful,
         release_reference=excluded.release_reference,
         created_at=now()`,
      [
        admin.adminUserId,
        input.articleId,
        input.helpful,
        process.env.RELEASE_ID || process.env.NEXT_PUBLIC_RELEASE_ID || null
      ]
    );
    return apiOk({ recorded: true });
  } catch (error) {
    return apiError(error);
  }
}
