import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyClientSessionFromRequest } from "@/lib/auth";
import { getClientProject } from "@/lib/client/portal-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyClientSessionFromRequest(request);
    return apiOk(await getClientProject(session), {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return apiError(error);
  }
}
