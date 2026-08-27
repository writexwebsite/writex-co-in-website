import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { verifyCustomerClientSessionFromRequest } from "@/lib/auth";
import { getMyWritexCustomer, toMyWritexProjectView } from "@/lib/my-writex/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifyCustomerClientSessionFromRequest(request);
    return apiOk({ projects: getMyWritexCustomer(session).projects.map(toMyWritexProjectView) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
