import type { NextRequest } from "next/server";
import { apiError, apiOk, badRequest } from "@/lib/api/response";
import { isMyWritexDevFixtureEnabled } from "@/lib/my-writex/dev-fixture";
import { safeNoteBody } from "@/lib/my-writex/request-api";
import { MY_WRITEX_REQUEST_STATUSES, type MyWritexRequestStatus } from "@/lib/my-writex/request-types";
import { updateRequestFromInspector } from "@/lib/my-writex/request-repository";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ requestRef: string }> }) {
  try {
    if (process.env.NODE_ENV === "production" || !isMyWritexDevFixtureEnabled()) return new Response("Not found", { status: 404 });
    const raw = await request.json() as { type?: unknown; status?: unknown; body?: unknown };
    let action;
    if (raw.type === "status" && MY_WRITEX_REQUEST_STATUSES.includes(raw.status as MyWritexRequestStatus)) action = { type: "status" as const, status: raw.status as MyWritexRequestStatus };
    else if (raw.type === "request_information") {
      const body = safeNoteBody(raw.body);
      if (body.length < 4) throw badRequest("Add a clear information request.");
      action = { type: "request_information" as const, body };
    } else if (raw.type === "internal_note") {
      const body = safeNoteBody(raw.body);
      if (body.length < 2) throw badRequest("Add an internal note.");
      action = { type: "internal_note" as const, body };
    } else throw badRequest();
    const record = await updateRequestFromInspector((await params).requestRef, action);
    return record ? apiOk({ request: record }) : new Response("Not found", { status: 404 });
  } catch (error) { return apiError(error); }
}
