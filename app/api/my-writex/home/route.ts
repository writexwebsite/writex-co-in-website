import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyCustomerClientSessionFromRequest } from "@/lib/auth";
import { getMyWritexCustomer, toMyWritexProjectView } from "@/lib/my-writex/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyCustomerClientSessionFromRequest(request);
    const customer = getMyWritexCustomer(session);
    return apiOk({
      customer: {
        writeXId: customer.writeXId,
        name: customer.name,
        preferredName: customer.preferredName,
        relationshipSince: customer.relationshipSince,
        clientStatus: customer.clientStatus,
        manager: customer.manager
      },
      summary: customer.summary,
      activeProjects: customer.projects.filter(
        (project) => project.phase === "active"
      ).map(toMyWritexProjectView),
      relationshipTimeline: customer.relationshipTimeline,
      upcomingWork: customer.upcomingWork
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
