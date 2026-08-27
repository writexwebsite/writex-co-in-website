import type { NextRequest } from "next/server";
import { apiError, apiOk, forbidden } from "@/lib/api/response";
import { verifyCustomerClientSessionFromRequest } from "@/lib/auth";
import { getMyWritexProject, toMyWritexProjectView } from "@/lib/my-writex/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await verifyCustomerClientSessionFromRequest(request);
    const { projectId } = await params;
    const project = getMyWritexProject(session, decodeURIComponent(projectId));
    if (!project) throw forbidden("This project is not available.");
    return apiOk({ project: toMyWritexProjectView(project) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
