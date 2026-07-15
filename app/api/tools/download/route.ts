import { NextRequest } from "next/server";
import { ApiError, apiError } from "@/lib/api/response";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import { assertRateLimit, getRequestContext } from "@/lib/security";
import { hashDownloadToken } from "@/lib/tools/downloadToken";

export const runtime = "nodejs";

type TokenRow = {
  id: string;
  lead_id: string;
  tool_type: string;
  template_id: string | null;
  document_payload: Record<string, unknown>;
  expires_at: string | Date;
  download_count: number;
};

type DocumentPayload = {
  title: string;
  subtitle?: string;
  sections?: Array<{ heading: string; lines: string[] }>;
  templateId?: string;
};

function filename(row: TokenRow) {
  if (row.template_id) return `writex-${row.template_id}.pdf`;
  return row.tool_type === "cv_builder" ? "writex-cv.pdf" : "writex-sop-framework.pdf";
}

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) throw new ApiError(503, "NOT_CONFIGURED", "Downloads are temporarily unavailable.");
    const context = getRequestContext(request);
    assertRateLimit({ key: `tool-download:${context.ipAddress}`, limit: 20, windowSeconds: 900 });
    const token = request.nextUrl.searchParams.get("token") || "";
    if (token.length < 30) throw new ApiError(400, "BAD_REQUEST", "The download link is invalid.");
    const result = await dbQuery<TokenRow>(`
      select id, lead_id, tool_type, template_id, document_payload, expires_at, download_count
      from tool_download_tokens
      where token_hash = $1 and expires_at > now() and download_count < 5
      limit 1
    `, [hashDownloadToken(token)]);
    const row = result.rows[0];
    if (!row) throw new ApiError(404, "NOT_FOUND", "This download link has expired or is no longer available.");
    const { generateToolPdf } = await import("@/lib/tools/pdf");
    const bytes = await generateToolPdf(row.document_payload as DocumentPayload);
    await Promise.all([
      dbQuery("update tool_download_tokens set downloaded_at = now(), download_count = download_count + 1 where id = $1", [row.id]),
      dbQuery("update quote_leads set download_status = 'downloaded' where id = $1", [row.lead_id])
    ]);
    if (row.template_id) {
      await dbQuery(`insert into template_downloads (template_id, lead_id) values ($1,$2)`, [row.template_id, row.lead_id]);
    }
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename(row)}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
