import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import { getAdminSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(request);

    return apiOk({
      admin: {
        id: session.adminUserId,
        email: session.email,
        role: session.role
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
