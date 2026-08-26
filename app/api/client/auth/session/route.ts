import type { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api/response";
import {
  getClientCookieName,
  getClientSessionMaxAgeSeconds,
  rotateClientSessionToken,
  setClientSessionCookie,
  verifyClientSessionFromRequest
} from "@/lib/auth";
import { getDemoClientSessionFromRequest } from "@/lib/demo/session";

export async function GET(request: NextRequest) {
  try {
    const demo = getDemoClientSessionFromRequest(request);
    if (demo) return apiOk({ authenticated: true, isDemo: true, invoiceId: demo.invoiceId, accessLevel: "demo", securityMode: "demo" });
    const session = await verifyClientSessionFromRequest(request);
    const response = apiOk({
      authenticated: true,
      isDemo: false,
      testSession: session.testSession,
      accessLevel: session.accessLevel,
      securityMode: session.securityMode
    });
    const rotatedToken = await rotateClientSessionToken(
      request.cookies.get(getClientCookieName())?.value
    );
    if (rotatedToken) {
      setClientSessionCookie(
        response,
        rotatedToken,
        getClientSessionMaxAgeSeconds()
      );
    }
    return response;
  } catch (error) { return apiError(error); }
}
